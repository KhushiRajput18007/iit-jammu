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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const membership = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND is_active = true',
      [workspaceId, auth.payload.id]
    );

    if (!Array.isArray(membership) || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    const members = await query(
      `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role as workspace_role, wm.designation, wm.joined_at, wm.is_active,
              u.email, u.first_name, u.last_name, u.avatar_url, u.role as app_role
       FROM workspace_members wm
       INNER JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = ? AND wm.is_active = true
       ORDER BY wm.joined_at DESC`,
      [workspaceId]
    );

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error('Fetch workspace members error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { workspace_id, user_id, role, designation } = body as {
      workspace_id?: number;
      user_id?: number;
      role?: 'admin' | 'manager' | 'member' | 'viewer';
      designation?: string;
    };

    if (!workspace_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requester = await query(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND is_active = true',
      [workspace_id, auth.payload.id]
    );

    if (!Array.isArray(requester) || requester.length === 0) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    const requesterRole = (requester[0] as any).role as string;
    if (requesterRole !== 'admin' && requesterRole !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, designation, invited_by, is_active)
       VALUES (?, ?, ?, ?, ?, true)
       ON DUPLICATE KEY UPDATE role = VALUES(role), designation = VALUES(designation), invited_by = VALUES(invited_by), is_active = true`,
      [workspace_id, user_id, role || 'member', designation || null, auth.payload.id]
    );

    return NextResponse.json({ message: 'Member added successfully' }, { status: 201 });
  } catch (error) {
    console.error('Add workspace member error:', error);
    return NextResponse.json({ error: 'Failed to add workspace member' }, { status: 500 });
  }
}
