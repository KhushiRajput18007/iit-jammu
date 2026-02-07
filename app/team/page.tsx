'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, ChevronDown, UserPlus, Loader2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Workspace = { id: number; name: string };

type WorkspaceMember = {
  id: number;
  workspace_id: number;
  user_id: number;
  role: 'admin' | 'manager' | 'member' | 'viewer'; // Keep for internal logic if needed, but display designation
  designation?: string;
  joined_at: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  app_role: 'admin' | 'manager' | 'employee';
};

type UserSearchResult = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'employee';
};

type CreatedEmployee = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'employee';
  designation?: string;
  temporary_password: string;
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

function TeamContent() {
  const { user } = useAuth();
  const { data: workspaces } = useSWR<Workspace[]>('/api/workspaces', authFetcher);
  const workspaceList = useMemo(() => workspaces || [], [workspaces]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('active_workspace_id');
    if (stored) {
      setActiveWorkspaceId(stored);
      return;
    }
    if (workspaceList.length > 0) {
      setActiveWorkspaceId(String(workspaceList[0].id));
    }
  }, [workspaceList]);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem('active_workspace_id', activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const membersKey = activeWorkspaceId
    ? `/api/workspace-members?workspaceId=${activeWorkspaceId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<WorkspaceMember[]>(membersKey, authFetcher);
  const members = useMemo(() => data || [], [data]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployee | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    designation: '',
    add_to_workspace: true,
  });

  const userSearchKey =
    activeWorkspaceId && inviteQuery.trim().length >= 2
      ? `/api/users/search?q=${encodeURIComponent(inviteQuery.trim())}&workspaceId=${encodeURIComponent(activeWorkspaceId)}`
      : null;

  const {
    data: searchResults,
    error: searchError,
    isLoading: searchLoading,
  } = useSWR<UserSearchResult[]>(userSearchKey, authFetcher);

  const results = useMemo(() => searchResults || [], [searchResults]);

  const handleCreateEmployee = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError('');
    setCreatedEmployee(null);

    if (!createForm.email || !createForm.first_name || !createForm.last_name) {
      setCreateError('Missing required fields');
      return;
    }

    setIsCreatingEmployee(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: createForm.email.trim(),
          first_name: createForm.first_name.trim(),
          last_name: createForm.last_name.trim(),
          designation: createForm.designation.trim(),
          workspace_id:
            createForm.add_to_workspace && activeWorkspaceId ? Number(activeWorkspaceId) : undefined,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to create employee');

      setCreatedEmployee(payload.employee as CreatedEmployee);
      await mutate();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError('');

    if (!activeWorkspaceId) {
      setInviteError('Select a workspace first');
      return;
    }
    if (!selectedUser) {
      setInviteError('Select a user');
      return;
    }

    setIsInviting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/workspace-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: Number(activeWorkspaceId),
          user_id: selectedUser.id,
          role: 'member', // Hardcoded as per user request to remove role dropdown
          designation: inviteDesignation,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to add member');

      setIsInviteOpen(false);
      setInviteQuery('');
      setSelectedUser(null);
      setInviteDesignation('');
      await mutate();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <main className="w-full md:pl-64 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Team</h1>
            <p className="text-muted-foreground">Workspace members and roles</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="h-10 pl-3 pr-10 rounded-lg border border-input bg-background text-foreground"
                disabled={workspaceList.length === 0}
              >
                {workspaceList.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {user?.role === 'admin' && (
              <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                  setIsCreateOpen(open);
                  if (!open) {
                    setCreateError('');
                    setCreatedEmployee(null);
                    setCreateForm((s) => ({
                      ...s,
                      email: '',
                      first_name: '',
                      last_name: '',
                      designation: '',
                      add_to_workspace: true,
                    }));
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-transparent gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create employee</DialogTitle>
                    <DialogDescription>
                      Create employee credentials and optionally add them to the selected workspace.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateEmployee} className="space-y-4">
                    {createError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                        {createError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ce_first">First name</Label>
                        <Input
                          id="ce_first"
                          value={createForm.first_name}
                          onChange={(e) => setCreateForm((s) => ({ ...s, first_name: e.target.value }))}
                          disabled={isCreatingEmployee}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ce_last">Last name</Label>
                        <Input
                          id="ce_last"
                          value={createForm.last_name}
                          onChange={(e) => setCreateForm((s) => ({ ...s, last_name: e.target.value }))}
                          disabled={isCreatingEmployee}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ce_email">Email</Label>
                      <Input
                        id="ce_email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                        disabled={isCreatingEmployee}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ce_designation">Designation</Label>
                      <Input
                        id="ce_designation"
                        value={createForm.designation}
                        onChange={(e) => setCreateForm((s) => ({ ...s, designation: e.target.value }))}
                        disabled={isCreatingEmployee}
                        placeholder="e.g. Frontend Developer"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">Add to this workspace</p>
                        <p className="text-xs text-muted-foreground">
                          Adds the employee to the selected workspace immediately.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateForm((s) => ({ ...s, add_to_workspace: !s.add_to_workspace }))}
                        className={`h-6 w-11 rounded-full transition-smooth relative ${createForm.add_to_workspace ? 'bg-primary' : 'bg-secondary'
                          }`}
                        aria-pressed={createForm.add_to_workspace}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${createForm.add_to_workspace ? 'translate-x-5' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {createdEmployee && (
                      <Card className="p-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Credentials</p>
                        <div className="space-y-2">
                          <div>
                            <Label>Email</Label>
                            <Input value={createdEmployee.email} readOnly />
                          </div>
                          <div>
                            <Label>Temporary password</Label>
                            <Input value={createdEmployee.temporary_password} readOnly />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Share these credentials securely. The employee can login and change later.
                        </p>
                      </Card>
                    )}

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => setIsCreateOpen(false)}
                        disabled={isCreatingEmployee}
                      >
                        Close
                      </Button>
                      <Button type="submit" disabled={isCreatingEmployee} className="gap-2">
                        {isCreatingEmployee ? (
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
            )}

            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 btn-hover-lift">
                  <UserPlus className="w-4 h-4" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite member</DialogTitle>
                  <DialogDescription>
                    Search users and add them to this workspace with a designation.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInvite} className="space-y-4">
                  {(inviteError || searchError) && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {inviteError || (searchError as Error).message}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="invite_search">Search users</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="invite_search"
                        value={inviteQuery}
                        onChange={(e) => {
                          setInviteQuery(e.target.value);
                          setSelectedUser(null);
                        }}
                        placeholder="Type name or email..."
                        className="pl-9"
                        disabled={!activeWorkspaceId || isInviting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type at least 2 characters to search.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Pick user</Label>
                    <Card className="p-2 max-h-56 overflow-auto">
                      {searchLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : results.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No users found
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {results.map((u) => {
                            const isSelected = selectedUser?.id === u.id;
                            return (
                              <button
                                type="button"
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-smooth ${isSelected ? 'bg-primary text-white' : 'hover:bg-secondary'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                      {u.first_name} {u.last_name}
                                    </p>
                                    <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                                      {u.email}
                                    </p>
                                  </div>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isSelected ? 'bg-white/20' : 'bg-secondary'
                                    }`}>
                                    {u.role}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite_designation">Designation</Label>
                    <Input
                      id="invite_designation"
                      value={inviteDesignation}
                      onChange={(e) => setInviteDesignation(e.target.value)}
                      placeholder="e.g. Project Manager"
                      required
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => setIsInviteOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting || !selectedUser} className="gap-2">
                      {isInviting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add member'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-5 w-1/2 rounded bg-secondary skeleton" />
                <div className="h-4 w-2/3 rounded bg-secondary skeleton mt-3" />
                <div className="h-4 w-3/4 rounded bg-secondary skeleton mt-2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-10 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </Card>
        ) : members.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-60" />
            <p className="text-muted-foreground">No members found in this workspace.</p>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {members.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="p-6 hover:shadow-lg transition-smooth">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold">
                      {m.first_name?.charAt(0)}
                      {m.last_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-secondary text-foreground capitalize">
                      {m.designation || 'Member'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  );
}
