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
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Check if user is member of room
    const membership = await query(
      'SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, payload.id]
    );

    if (!Array.isArray(membership) || membership.length === 0) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    const messages = await query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [roomId, limit, offset]
    );

    return NextResponse.json(messages.reverse(), { status: 200 });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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
    const { room_id, content, message_type, attachment_url } = body;

    if (!room_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is member of room
    const membership = await query(
      'SELECT id FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [room_id, payload.id]
    );

    if (!Array.isArray(membership) || membership.length === 0) {
      return NextResponse.json(
        { error: 'Not a member of this room' },
        { status: 403 }
      );
    }

    const result = await query(
      `INSERT INTO messages (room_id, sender_id, content, message_type, attachment_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [room_id, payload.id, content, message_type || 'text', attachment_url || null]
    );

    const insertResult = result as any;
    const messageId = insertResult.insertId;

    // Fetch created message with user details
    const messages = await query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url
       FROM messages m
       INNER JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        data: messages[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
