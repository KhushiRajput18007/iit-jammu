'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function EmployeeDashboardContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="w-full md:pl-64 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome, {user?.first_name}!</h1>
          <p className="text-muted-foreground">Your personal workspace for assigned tasks</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">My Tasks</h3>
            <p className="text-sm text-muted-foreground mt-1">
              View tasks assigned to you in your current project.
            </p>
            <div className="mt-4">
              <Link href="/tasks">
                <Button className="btn-hover-lift">Open Tasks</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">Chat</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Collaborate with your team.
            </p>
            <div className="mt-4">
              <Link href="/chat">
                <Button variant="outline" className="bg-transparent btn-hover-lift">
                  Open Chat
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <ProtectedRoute requiredRole="employee">
      <EmployeeDashboardContent />
    </ProtectedRoute>
  );
}
