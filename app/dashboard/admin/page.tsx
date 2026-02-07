'use client';

import { ProtectedRoute } from '@/components/protected-route';
import DashboardPage from '@/app/dashboard/page';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardPage />
    </ProtectedRoute>
  );
}
