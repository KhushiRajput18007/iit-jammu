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
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const rooms = await query(
      `SELECT cr.* FROM chat_rooms cr
       INNER JOIN chat_room_members crm ON cr.id = crm.room_id
       WHERE cr.workspace_id = ? AND crm.user_id = ? AND cr.is_archived = false
       ORDER BY cr.created_at DESC`,
      [workspaceId, payload.id]
    );

    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    console.error('Fetch chat rooms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
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
    const { workspace_id, name, type, description, member_ids } = body;

    if (!workspace_id || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is member of workspace
    const members = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspace_id, payload.id]
    );

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Create chat room
    const result = await query(
      `INSERT INTO chat_rooms (workspace_id, name, type, description, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [workspace_id, name, type, description || null, payload.id]
    );

    const insertResult = result as any;
    const roomId = insertResult.insertId;

    // Add creator as member
    await query(
      'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
      [roomId, payload.id]
    );

    // Add other members if provided
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const memberId of member_ids) {
        await query(
          'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
          [roomId, memberId]
        );
      }
    }

    return NextResponse.json(
      {
        message: 'Chat room created successfully',
        roomId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create chat room error:', error);
    return NextResponse.json(
      { error: 'Failed to create chat room' },
      { status: 500 }
    );
  }
}
