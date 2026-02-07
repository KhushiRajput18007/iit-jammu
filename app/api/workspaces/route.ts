import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const getAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's workspaces
    const workspaces = await query(
      `SELECT w.* FROM workspaces w 
       INNER JOIN workspace_members wm ON w.id = wm.workspace_id 
       WHERE wm.user_id = ? AND w.is_active = true
       ORDER BY w.created_at DESC`,
      [payload.id]
    );

    return NextResponse.json(workspaces, { status: 200 });
  } catch (error) {
    console.error('Fetch workspaces error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    // Create workspace
    const result = await query(
      'INSERT INTO workspaces (owner_id, name, description) VALUES (?, ?, ?)',
      [payload.id, name, description || null]
    );

    const insertResult = result as any;
    const workspaceId = insertResult.insertId;

    // Add owner as admin member
    await query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, payload.id, 'admin']
    );

    // Fetch created workspace
    const workspaces = await query(
      'SELECT * FROM workspaces WHERE id = ?',
      [workspaceId]
    );

    return NextResponse.json(
      {
        message: 'Workspace created successfully',
        workspace: workspaces[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
