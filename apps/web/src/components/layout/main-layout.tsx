import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { User, UserRole } from '../../types';
import { Toaster } from 'sonner';
import { useDisplayMode } from '../../lib/display-mode';
import { AppLayout } from './app-layout';

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
}

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const { uiMode } = useDisplayMode();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await onLogout();
    }
  };

  if (uiMode === 'app') {
    return (
      <>
        <AppLayout user={user} onLogout={onLogout} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar userRole={user.role as UserRole} />
        <Header user={user} onLogout={handleLogout} />

        <main className="transition-all duration-300 md:pl-64">
          <div className="container mx-auto p-4 pt-20 md:p-6 md:pt-24">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster position="top-right" />
    </>
  );
}