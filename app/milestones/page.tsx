'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import useSWR from 'swr';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Workspace = { id: number; name: string };

type Project = { id: number; name: string; workspace_id: number };

type Milestone = {
  id: number;
  project_id: number;
  workspace_id: number;
  title: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress_percentage: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  project_name?: string;
  first_name?: string;
  last_name?: string;
};

const authFetcher = async (url: string) => {
  const token = sessionStorage.getItem('auth_token');
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
};

function MilestonesContent() {
  const { data: workspaces } = useSWR<Workspace[]>('/api/workspaces', authFetcher);
  const workspaceList = useMemo(() => workspaces || [], [workspaces]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [activeProjectId, setActiveProjectId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('active_workspace_id');
    if (stored) {
      setActiveWorkspaceId(stored);
      return;
    }
    if (workspaceList.length > 0) setActiveWorkspaceId(String(workspaceList[0].id));
  }, [workspaceList]);

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem('active_workspace_id', activeWorkspaceId);
  }, [activeWorkspaceId]);

  const projectsKey = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : null;
  const { data: projects } = useSWR<Project[]>(projectsKey, authFetcher);
  const projectList = useMemo(() => projects || [], [projects]);

  useEffect(() => {
    if (!activeProjectId && projectList.length > 0) setActiveProjectId(String(projectList[0].id));
  }, [projectList, activeProjectId]);

  const milestonesKey = activeWorkspaceId
    ? `/api/milestones?workspaceId=${activeWorkspaceId}${activeProjectId ? `&projectId=${activeProjectId}` : ''}`
    : null;

  const {
    data: milestones,
    error: milestonesError,
    isLoading: milestonesLoading,
    mutate,
  } = useSWR<Milestone[]>(milestonesKey, authFetcher);

  const milestoneList = useMemo(() => milestones || [], [milestones]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending' as Milestone['status'],
    progress_percentage: 0,
  });

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    if (!activeWorkspaceId) return setFormError('Select a workspace first');
    if (!activeProjectId) return setFormError('Select a project first');

    setIsCreating(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: Number(activeWorkspaceId),
          project_id: Number(activeProjectId),
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date,
          status: formData.status,
          progress_percentage: formData.progress_percentage,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to create milestone');

      setIsCreateOpen(false);
      setFormData({ title: '', description: '', due_date: '', status: 'pending', progress_percentage: 0 });
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create milestone');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: number, patch: Partial<Milestone>) => {
    const token = sessionStorage.getItem('auth_token');
    const res = await fetch('/api/milestones', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, ...patch }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Failed to update milestone');
    await mutate();
  };

  const handleDelete = async (id: number) => {
    const token = sessionStorage.getItem('auth_token');
    const res = await fetch('/api/milestones', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Failed to delete milestone');
    await mutate();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <main className="w-full md:pl-64 p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Milestones</h1>
            <p className="text-muted-foreground">Track milestone-based progress per project</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Select value={activeWorkspaceId} onValueChange={setActiveWorkspaceId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaceList.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeProjectId} onValueChange={setActiveProjectId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projectList.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!activeWorkspaceId || !activeProjectId}>
                  <Plus className="w-4 h-4" />
                  New Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create milestone</DialogTitle>
                  <DialogDescription>Create a milestone for the selected project.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  {formError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="ms_title">Title</Label>
                    <Input id="ms_title" value={formData.title} onChange={(e) => setFormData((s) => ({ ...s, title: e.target.value }))} required disabled={isCreating} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ms_desc">Description</Label>
                    <textarea id="ms_desc" value={formData.description} onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))} rows={3} disabled={isCreating} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground transition-smooth" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ms_due">Due date</Label>
                      <Input id="ms_due" type="date" value={formData.due_date} onChange={(e) => setFormData((s) => ({ ...s, due_date: e.target.value }))} required disabled={isCreating} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData((s) => ({ ...s, status: v as any }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="in_progress">in_progress</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ms_prog">Progress %</Label>
                    <Input id="ms_prog" type="number" min={0} max={100} value={formData.progress_percentage} onChange={(e) => setFormData((s) => ({ ...s, progress_percentage: Number(e.target.value) }))} disabled={isCreating} />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating} className="gap-2">
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {milestonesLoading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading milestones...</p>
          </Card>
        ) : milestonesError ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{(milestonesError as Error).message}</p>
          </Card>
        ) : milestoneList.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No milestones found.</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestoneList.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.title}</div>
                      {m.description && <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>}
                    </TableCell>
                    <TableCell>{new Date(m.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select value={m.status} onValueChange={(v) => handleUpdate(m.id, { status: v as any }).catch(console.error)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="in_progress">in_progress</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={m.progress_percentage}
                        onBlur={(e) => {
                          const value = Number(e.target.value);
                          handleUpdate(m.id, { progress_percentage: value }).catch(console.error);
                        }}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(m.id).catch(console.error)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function MilestonesPage() {
  return (
    <ProtectedRoute>
      <MilestonesContent />
    </ProtectedRoute>
  );
}
