/**
 * Dashboard Layout — Auth-protected shell for all admin pages.
 *
 * AuthGuard prevents protected content flash by rendering children only
 * after session bootstrap confirms an authenticated user.
 */
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth_guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
