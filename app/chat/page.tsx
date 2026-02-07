'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Plus, Search, MoreVertical, Smile, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatRoom {
  id: number;
  name: string;
  type: 'direct' | 'group' | 'channel';
  description?: string;
  created_at?: string;
}

interface RoomMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

type Workspace = { id: number; name: string };

const authFetcher = async (url: string) => {
  const token = localStorage.getItem('auth_token');
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

function ChatContent() {
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
    if (activeWorkspaceId) localStorage.setItem('active_workspace_id', activeWorkspaceId);
  }, [activeWorkspaceId]);

  const roomsKey = activeWorkspaceId ? `/api/chat-rooms?workspaceId=${activeWorkspaceId}` : null;
  const {
    data: rooms,
    error: roomsError,
    isLoading: roomsLoading,
    mutate: mutateRooms,
  } = useSWR<ChatRoom[]>(roomsKey, authFetcher);

  const roomList = useMemo(() => rooms || [], [rooms]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedRoomId) return;
    if (roomList.length > 0) setSelectedRoomId(roomList[0].id);
  }, [roomList, selectedRoomId]);

  const selectedRoom = useMemo(
    () => roomList.find((r) => r.id === selectedRoomId) || null,
    [roomList, selectedRoomId]
  );

  const messagesKey = selectedRoomId ? `/api/messages?roomId=${selectedRoomId}&limit=100` : null;
  const {
    data: messages,
    error: messagesError,
    isLoading: messagesLoading,
    mutate: mutateMessages,
  } = useSWR<Message[]>(messagesKey, authFetcher);

  const messageList = useMemo(() => messages || [], [messages]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [createRoomForm, setCreateRoomForm] = useState<{
    name: string;
    type: 'direct' | 'group' | 'channel';
    description: string;
  }>({
    name: '',
    type: 'channel',
    description: '',
  });

  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);

  const membersKey = selectedRoomId ? `/api/chat-room-members?roomId=${selectedRoomId}` : null;
  const {
    data: roomMembers,
    isLoading: membersLoading,
    error: membersError,
    mutate: mutateMembers,
  } = useSWR<RoomMember[]>(membersKey, authFetcher);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList.length]);

  const handleSearchUsersForRoom = async () => {
    if (!activeWorkspaceId || !memberSearch.trim()) return;
    setMemberError('');
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        workspaceId: activeWorkspaceId,
        q: memberSearch.trim(),
      });
      const res = await fetch(`/api/users/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search users');
      setMemberSearchResults(data);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to search users');
    }
  };

  const handleAddMember = async (userId: number) => {
    if (!selectedRoomId) return;
    setIsUpdatingMembers(true);
    setMemberError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/chat-room-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room_id: selectedRoomId, user_id: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      setMemberSearch('');
      setMemberSearchResults([]);
      await mutateMembers();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedRoomId) return;
    setIsUpdatingMembers(true);
    setMemberError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/chat-room-members', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room_id: selectedRoomId, user_id: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      await mutateMembers();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!messageInput.trim()) return;
    if (!selectedRoomId) return;

    const token = localStorage.getItem('auth_token');
    const optimistic: Message = {
      id: Date.now(),
      sender_id: user?.id || 0,
      content: messageInput,
      created_at: new Date().toISOString(),
      first_name: user?.first_name,
      last_name: user?.last_name,
      avatar_url: user?.avatar_url,
    };

    setMessageInput('');
    await mutateMessages(async (current) => [...(current || []), optimistic], { revalidate: false });

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: selectedRoomId,
          content: optimistic.content,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to send message');

      await mutateMessages();
    } catch (err) {
      console.error(err);
      await mutateMessages();
    }
  };

  const handleCreateRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateRoomError('');
    if (!activeWorkspaceId) {
      setCreateRoomError('Select a workspace first');
      return;
    }

    setIsCreatingRoom(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/chat-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: Number(activeWorkspaceId),
          name: createRoomForm.name,
          type: createRoomForm.type,
          description: createRoomForm.description || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to create room');

      setIsCreateRoomOpen(false);
      setCreateRoomForm({ name: '', type: 'channel', description: '' });

      await mutateRooms();
      if (payload.roomId) setSelectedRoomId(payload.roomId);
    } catch (err) {
      setCreateRoomError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const filteredRooms = roomList.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />

      <main className="w-full md:pl-64 flex">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex w-80 bg-card border-r border-border flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Messages</h2>
              <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create chat room</DialogTitle>
                    <DialogDescription>
                      Create a new channel or group in this workspace.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    {createRoomError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                        {createRoomError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="room_name">Room name</Label>
                      <Input
                        id="room_name"
                        value={createRoomForm.name}
                        onChange={(e) =>
                          setCreateRoomForm((s) => ({ ...s, name: e.target.value }))
                        }
                        placeholder="e.g. General"
                        required
                        disabled={isCreatingRoom}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={createRoomForm.type}
                        onValueChange={(value) =>
                          setCreateRoomForm((s) => ({
                            ...s,
                            type: value as 'direct' | 'group' | 'channel',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="channel">Channel</SelectItem>
                          <SelectItem value="group">Group</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="room_desc">Description (optional)</Label>
                      <textarea
                        id="room_desc"
                        value={createRoomForm.description}
                        onChange={(e) =>
                          setCreateRoomForm((s) => ({
                            ...s,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        disabled={isCreatingRoom}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground transition-smooth"
                        placeholder="Short description"
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => setIsCreateRoomOpen(false)}
                        disabled={isCreatingRoom}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreatingRoom} className="gap-2">
                        {isCreatingRoom ? (
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

            {/* Workspace */}
            <div className="relative mb-4">
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="w-full h-9 pl-3 pr-10 rounded-lg border border-input bg-background text-foreground text-sm"
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {roomsLoading ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading rooms...
                </div>
              ) : roomsError ? (
                <div className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-60" />
                  {(roomsError as Error).message}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No rooms found
                </div>
              ) : (
                filteredRooms.map((room, index) => (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left p-4 border-b border-border hover:bg-secondary transition-colors ${
                      selectedRoomId === room.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/50 to-accent/50 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                        {room.type === 'direct' ? '👤' : room.type === 'group' ? '👥' : '#'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {room.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {room.type === 'channel' ? '#' : ''}
                          {room.type}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Chat Header */}
          <div className="bg-card border-b border-border p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {selectedRoom?.name || 'Select a room'}
              </h3>
              <p className="text-sm text-muted-foreground capitalize flex items-center gap-3">
                <span>
                  {selectedRoom?.type === 'channel' ? '#' : ''}
                  {selectedRoom?.type || ''}
                </span>
                {selectedRoomId && (
                  <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="xs" className="h-7 px-2 text-xs">
                        Members
                        {Array.isArray(roomMembers) && roomMembers.length > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-secondary px-1.5 text-[10px]">
                            {roomMembers.length}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Room members</DialogTitle>
                        <DialogDescription>
                          View and manage members in this chat room.
                        </DialogDescription>
                      </DialogHeader>

                      {memberError && (
                        <div className="mb-3 p-2 rounded-md border border-destructive/40 bg-destructive/10 text-xs text-destructive">
                          {memberError}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Current members
                          </p>
                          <div className="max-h-52 overflow-y-auto border rounded-md divide-y">
                            {membersLoading ? (
                              <div className="p-3 text-xs text-muted-foreground">Loading members...</div>
                            ) : membersError ? (
                              <div className="p-3 text-xs text-muted-foreground">
                                Failed to load members
                              </div>
                            ) : !roomMembers || roomMembers.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground">No members yet.</div>
                            ) : (
                              roomMembers.map((m) => {
                                const initials = `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}` || 'U';
                                const isSelf = m.user_id === user?.id;
                                return (
                                  <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold">
                                        {initials}
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium">
                                          {m.first_name} {m.last_name}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">{m.email}</div>
                                      </div>
                                    </div>
                                    {!isSelf && (
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        disabled={isUpdatingMembers}
                                        onClick={() => handleRemoveMember(m.user_id)}
                                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Add members from workspace
                          </p>
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder="Search by name or email"
                              value={memberSearch}
                              onChange={(e) => setMemberSearch(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              disabled={isUpdatingMembers || !memberSearch.trim()}
                              onClick={handleSearchUsersForRoom}
                              className="h-8 px-3 text-[11px]"
                            >
                              Search
                            </Button>
                          </div>
                          {memberSearchResults.length > 0 && (
                            <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                              {memberSearchResults.map((u) => {
                                const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}` || 'U';
                                const alreadyMember = roomMembers?.some((m) => m.user_id === u.id);
                                return (
                                  <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold">
                                        {initials}
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium">
                                          {u.first_name} {u.last_name}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="xs"
                                      disabled={isUpdatingMembers || alreadyMember}
                                      onClick={() => handleAddMember(u.id)}
                                      className="h-7 px-2 text-[11px]"
                                    >
                                      {alreadyMember ? 'Already in room' : 'Add'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <DialogFooter className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsMembersDialogOpen(false)}
                          className="bg-transparent"
                        >
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messagesLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading messages...
                </div>
              ) : messagesError ? (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-60" />
                  {(messagesError as Error).message}
                </div>
              ) : !selectedRoomId ? (
                <div className="text-center text-muted-foreground py-8">
                  Select a room to start chatting
                </div>
              ) : messageList.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Say hi.
                </div>
              ) : (
                messageList.map((msg, index) => {
                  const isMine = msg.sender_id === user?.id;
                  const senderName =
                    msg.first_name || msg.last_name
                      ? `${msg.first_name || ''} ${msg.last_name || ''}`.trim()
                      : 'Unknown';

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {(msg.first_name?.charAt(0) || 'U') + (msg.last_name?.charAt(0) || '')}
                        </div>
                      )}

                      <div className={`max-w-xs lg:max-w-md ${isMine ? 'order-2' : 'order-1'}`}>
                        {!isMine && (
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {senderName}
                          </p>
                        )}

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className={`px-4 py-3 rounded-2xl transition-smooth ${
                            isMine
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-secondary text-foreground rounded-bl-none'
                          }`}
                        >
                          <p className="break-words text-sm">{msg.content}</p>
                        </motion.div>

                        <p className="text-xs text-muted-foreground mt-1 px-2">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {isMine && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                          {(user?.first_name?.charAt(0) || 'Y') + (user?.last_name?.charAt(0) || '')}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border-t border-border p-6"
          >
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Button variant="ghost" size="sm" type="button">
                <Plus className="w-4 h-4" />
              </Button>

              <Input
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />

              <Button variant="ghost" size="sm" type="button">
                <Smile className="w-4 h-4" />
              </Button>

              <Button
                type="submit"
                disabled={!messageInput.trim() || !selectedRoomId}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}
