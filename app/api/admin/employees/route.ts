import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';

const getAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const checkAdminRole = async (userId: number): Promise<boolean> => {
  const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
  if (Array.isArray(users) && users.length > 0) {
    return (users[0] as any).role === 'admin';
  }
  return false;
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

    // Check admin role
    const isAdmin = await checkAdminRole(payload.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    const employees = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.role, u.is_active, u.created_at,
              wm.role as workspace_role, wm.designation
       FROM users u
       LEFT JOIN workspace_members wm ON u.id = wm.user_id AND wm.workspace_id = ?
       WHERE u.is_active = true
       ORDER BY u.created_at DESC`,
      [workspaceId]
    );

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
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

    // Check admin role
    const isAdmin = await checkAdminRole(payload.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      email,
      first_name,
      last_name,
      workspace_role,
      workspace_id,
      designation,
    } = body as {
      email?: string;
      first_name?: string;
      last_name?: string;
      workspace_role?: 'admin' | 'manager' | 'member' | 'viewer';
      workspace_id?: number;
      designation?: string;
    };

    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [
      email,
    ]);
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create temporary password
    const tempPassword = Math.random().toString(36).slice(-10);
    const password_hash = await hashPassword(tempPassword);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, password_hash, first_name, last_name, 'employee']
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

    // Add to workspace if provided
    if (workspace_id) {
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, designation, invited_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [workspace_id, userId, workspace_role || 'member', designation || null, payload.id]
      );
    }

    if (workspace_id) {
      await query(
        `INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [workspace_id, payload.id, 'employee_created', 'user', userId]
      );
    }

    return NextResponse.json(
      {
        message: 'Employee created successfully',
        employee: {
          id: userId,
          email,
          first_name,
          last_name,
          role: 'employee',
          workspace_role: workspace_role || (workspace_id ? 'member' : undefined),
          temporary_password: tempPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
