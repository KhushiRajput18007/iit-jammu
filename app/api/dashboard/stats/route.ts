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
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            // If no workspace selected, maybe return global stats or error. 
            // For now, let's requiring workspaceId for specific stats, or just user stats if not.
            // Let's assume user wants stats for the *active* workspace usually.
            return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
        }

        // Task Counts
        const taskStats = await query(
            `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         COUNT(CASE WHEN status IN ('in_progress', 'in_review') THEN 1 END) as in_progress,
         COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo
       FROM tasks 
       WHERE workspace_id = ?`,
            [workspaceId]
        );

        // Member Count
        const memberStats = await query(
            `SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND is_active = true`,
            [workspaceId]
        );

        const stats = {
            total_tasks: (taskStats as any)[0].total,
            completed_tasks: (taskStats as any)[0].completed,
            in_progress_tasks: (taskStats as any)[0].in_progress,
            todo_tasks: (taskStats as any)[0].todo,
            team_members: (memberStats as any)[0].count
        };

        return NextResponse.json(stats, { status: 200 });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
