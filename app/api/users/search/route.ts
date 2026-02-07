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

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const membership = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND is_active = true',
      [workspaceId, payload.id]
    );

    if (!Array.isArray(membership) || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    if (q.length < 2) {
      return NextResponse.json([], { status: 200 });
    }

    const users = await query(
      `SELECT id, email, first_name, last_name, avatar_url, role
       FROM users
       WHERE is_active = true
         AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
