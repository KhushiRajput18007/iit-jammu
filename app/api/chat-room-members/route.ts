import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const getAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

async function isWorkspaceAdminOrManager(userId: number, workspaceId: number) {
  const rows = await query(
    `SELECT wm.role AS workspace_role, u.role AS user_role
     FROM users u
     LEFT JOIN workspace_members wm ON wm.user_id = u.id AND wm.workspace_id = ?
     WHERE u.id = ?`,
    [workspaceId, userId]
  );

  if (!Array.isArray(rows) || rows.length === 0) return false;
  const row = rows[0] as any;
  if (row.user_role === 'admin') return true;
  if (row.workspace_role && ['admin', 'manager'].includes(row.workspace_role)) return true;
  return false;
}

async function getRoomContext(roomId: number) {
  const rows = await query(
    'SELECT workspace_id, created_by FROM chat_rooms WHERE id = ?',
    [roomId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as any;
}

async function isRoomMember(roomId: number, userId: number) {
  const rows = await query(
    'SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?',
    [roomId, userId]
  );
  return Array.isArray(rows) && rows.length > 0;
}

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
    const roomIdParam = searchParams.get('roomId');

    if (!roomIdParam) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    const roomId = parseInt(roomIdParam, 10);

    const room = await getRoomContext(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Only room members can view members list
    const member = await isRoomMember(roomId, payload.id);
    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    const members = await query(
      `SELECT crm.id, u.id AS user_id, u.first_name, u.last_name, u.email, u.avatar_url
       FROM chat_room_members crm
       INNER JOIN users u ON crm.user_id = u.id
       WHERE crm.room_id = ?
       ORDER BY crm.joined_at ASC`,
      [roomId]
    );

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error('Fetch chat room members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room members' },
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
    const { room_id, user_id } = body;

    if (!room_id || !user_id) {
      return NextResponse.json(
        { error: 'room_id and user_id are required' },
        { status: 400 }
      );
    }

    const room = await getRoomContext(room_id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const canManage =
      (await isWorkspaceAdminOrManager(payload.id, room.workspace_id)) ||
      room.created_by === payload.id;

    if (!canManage) {
      return NextResponse.json(
        { error: 'Not allowed to manage room members' },
        { status: 403 }
      );
    }

    // Ensure target user is in the same workspace
    const workspaceMember = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [room.workspace_id, user_id]
    );

    if (!Array.isArray(workspaceMember) || workspaceMember.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of this workspace' },
        { status: 400 }
      );
    }

    await query(
      'INSERT IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
      [room_id, user_id]
    );

    return NextResponse.json(
      { message: 'Member added to room' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add chat room member error:', error);
    return NextResponse.json(
      { error: 'Failed to add member to room' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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
    const { room_id, user_id } = body;

    if (!room_id || !user_id) {
      return NextResponse.json(
        { error: 'room_id and user_id are required' },
        { status: 400 }
      );
    }

    const room = await getRoomContext(room_id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const canManage =
      (await isWorkspaceAdminOrManager(payload.id, room.workspace_id)) ||
      room.created_by === payload.id;

    if (!canManage) {
      return NextResponse.json(
        { error: 'Not allowed to manage room members' },
        { status: 403 }
      );
    }

    await query('DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?', [
      room_id,
      user_id,
    ]);

    return NextResponse.json(
      { message: 'Member removed from room' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Remove chat room member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member from room' },
      { status: 500 }
    );
  }
}
