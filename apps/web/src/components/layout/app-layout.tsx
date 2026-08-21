import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LogOut, School, X } from 'lucide-react';
import { Button } from '../ui/button';
import { User, UserRole } from '../../types';
import { cn } from '../../lib/utils';
import { MobileBottomNav } from './mobile-bottom-nav';
import { SidebarNav, getNavItemsForRole } from './sidebar-nav';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
}

export function AppLayout({ user, onLogout }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const userRole = user.role as UserRole;

  const title = useMemo(() => {
    const navItems = getNavItemsForRole(userRole);
    const current = navItems.find((item) =>
      location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
    );

    if (current) return current.title;
    return 'TC Hostel Connect';
  }, [location.pathname, userRole]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{userRole} portal</p>
            <h1 className="truncate text-base font-semibold">{title}</h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Logout"
            className="shrink-0"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-3 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)]">
        <div className="mx-auto w-full max-w-4xl">
          <Outlet />
        </div>
      </main>

      <MobileBottomNav userRole={userRole} onOpenMenu={() => setIsMenuOpen(true)} />

      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity',
          isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[88%] max-w-xs transform overflow-y-auto border-r border-border bg-card pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-transform duration-200 ease-out',
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Application menu"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setIsMenuOpen(false)}>
            <School className="h-5 w-5 text-primary-600" />
            <span className="truncate">TC Hostel Connect</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-2">
          <SidebarNav userRole={userRole} onNavigate={() => setIsMenuOpen(false)} />
        </div>
      </aside>
    </div>
  );
}
