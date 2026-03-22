import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import { NavItem, getNavItemsForRole } from './sidebar-nav';

interface MobileBottomNavProps {
  userRole: UserRole;
  onOpenMenu: () => void;
}

const TAB_GROUPS: string[][] = [
  ['/dashboard'],
  ['/staff-tasks', '/leave', '/attendance', '/applications'],
  ['/messages', '/events'],
  ['/profile', '/students', '/rooms', '/staff'],
];

const pickTabItems = (items: NavItem[]) => {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const selected: NavItem[] = [];
  const used = new Set<string>();

  for (const group of TAB_GROUPS) {
    const candidate = group
      .map((href) => byHref.get(href))
      .find((item): item is NavItem => Boolean(item) && !used.has(item!.href));

    if (!candidate) continue;

    selected.push(candidate);
    used.add(candidate.href);
  }

  if (selected.length < 4) {
    for (const item of items) {
      if (used.has(item.href)) continue;
      selected.push(item);
      used.add(item.href);
      if (selected.length === 4) break;
    }
  }

  return selected.slice(0, 4);
};

export function MobileBottomNav({ userRole, onOpenMenu }: MobileBottomNavProps) {
  const navItems = useMemo(() => getNavItemsForRole(userRole), [userRole]);
  const tabItems = useMemo(() => pickTabItems(navItems), [navItems]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="grid h-16 grid-cols-5">
        {tabItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary-700 dark:text-primary-300' : 'text-muted-foreground'
              )
            }
          >
            <span className="h-5 w-5">{item.icon}</span>
            <span className="truncate">{item.title}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Open all sections"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
