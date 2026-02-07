import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const getAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

async function requireAuth(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const payload = verifyToken(token);
  if (!payload) return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };

  return { payload };
}

async function requireWorkspaceMember(workspaceId: number, userId: number) {
  const rows = await query(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND is_active = true',
    [workspaceId, userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (rows[0] as any).role as string;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get('workspaceId');
    const projectIdParam = searchParams.get('projectId');

    if (!workspaceIdParam) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const workspaceId = Number(workspaceIdParam);
    const role = await requireWorkspaceMember(workspaceId, auth.payload.id);
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    const params: any[] = [workspaceId];
    let sql =
      `SELECT m.*,
              p.name AS project_name,
              u.first_name, u.last_name
       FROM milestones m
       LEFT JOIN projects p ON m.project_id = p.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.workspace_id = ?`;

    if (projectIdParam) {
      sql += ' AND m.project_id = ?';
      params.push(Number(projectIdParam));
    }

    sql += ' ORDER BY m.due_date DESC, m.created_at DESC';

    const rows = await query(sql, params);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Fetch milestones error:', error);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const {
      workspace_id,
      project_id,
      title,
      description,
      due_date,
      status,
      progress_percentage,
    } = body;

    if (!workspace_id || !project_id || !title || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const role = await requireWorkspaceMember(Number(workspace_id), auth.payload.id);
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO milestones (project_id, workspace_id, title, description, due_date, status, progress_percentage, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        workspace_id,
        title,
        description || null,
        due_date,
        status || 'pending',
        progress_percentage ?? 0,
        auth.payload.id,
      ]
    );

    const insertResult = result as any;
    const milestoneId = insertResult.insertId;

    await query(
      `INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?)`,
      [workspace_id, auth.payload.id, 'milestone_created', 'milestone', milestoneId]
    );

    return NextResponse.json({ message: 'Milestone created', milestoneId }, { status: 201 });
  } catch (error) {
    console.error('Create milestone error:', error);
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { id, status, progress_percentage, title, description, due_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const rows = await query('SELECT workspace_id FROM milestones WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const workspaceId = (rows[0] as any).workspace_id as number;
    const role = await requireWorkspaceMember(workspaceId, auth.payload.id);
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (progress_percentage !== undefined) {
      updates.push('progress_percentage = ?');
      values.push(progress_percentage);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await query(`UPDATE milestones SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    await query(
      `INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?)`,
      [workspaceId, auth.payload.id, 'milestone_updated', 'milestone', id]
    );

    return NextResponse.json({ message: 'Milestone updated' }, { status: 200 });
  } catch (error) {
    console.error('Update milestone error:', error);
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const rows = await query('SELECT workspace_id FROM milestones WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const workspaceId = (rows[0] as any).workspace_id as number;
    const role = await requireWorkspaceMember(workspaceId, auth.payload.id);
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await query('DELETE FROM milestones WHERE id = ?', [id]);

    await query(
      `INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?)`,
      [workspaceId, auth.payload.id, 'milestone_deleted', 'milestone', id]
    );

    return NextResponse.json({ message: 'Milestone deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete milestone error:', error);
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
}
