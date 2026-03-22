import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import {
  Building2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Settings,
  Users,
  Wrench,
  FileText,
  CalendarDays,
  User,
  UserCheck,
  Clock,
  Shield,
  Key,
  ScanLine,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
  submenu?: NavItem[];
}

// Enhanced navigation items with role-based filtering
export const getNavItemsForRole = (role: UserRole): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ['admin', 'warden', 'staff', 'student'],
    },
  ];

  // Admin-specific navigation (removed interkey functionality as requested)
  if (role === 'admin') {
    return [
      ...baseItems,
      {
        title: 'Room Management',
        href: '/rooms',
        icon: <Building2 className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Students',
        href: '/students',
        icon: <Users className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Staff Management',
        href: '/staff',
        icon: <UserCheck className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Staff Tasks',
        href: '/staff-tasks',
        icon: <ListChecks className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Leave Management',
        href: '/leave',
        icon: <Clock className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'QR Scanner',
        href: '/scan',
        icon: <ScanLine className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Attendance',
        href: '/attendance',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Applications',
        href: '/applications',
        icon: <FileText className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Events',
        href: '/events',
        icon: <CalendarDays className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Maintenance',
        href: '/maintenance',
        icon: <Wrench className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Visitor Management',
        href: '/visitors',
        icon: <UserCheck className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Messages',
        href: '/messages',
        icon: <MessageCircle className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: <Settings className="h-5 w-5" />,
        roles: ['admin'],
      },
      {
        title: 'Credentials',
        href: '/credentials',
        icon: <Key className="h-5 w-5" />,
        roles: ['admin'],
      },
    ];
  }

  // Warden-specific navigation (removed reports as requested)
  if (role === 'warden') {
    return [
      ...baseItems,
      {
        title: 'Room Management',
        href: '/rooms',
        icon: <Building2 className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Students',
        href: '/students',
        icon: <Users className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Staff Management',
        href: '/staff',
        icon: <UserCheck className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Staff Tasks',
        href: '/staff-tasks',
        icon: <ListChecks className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Leave Management',
        href: '/leave',
        icon: <Clock className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'QR Scanner',
        href: '/scan',
        icon: <ScanLine className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Attendance',
        href: '/attendance',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Applications',
        href: '/applications',
        icon: <FileText className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Events',
        href: '/events',
        icon: <CalendarDays className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Maintenance',
        href: '/maintenance',
        icon: <Wrench className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Visitor Management',
        href: '/visitors',
        icon: <UserCheck className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Messages',
        href: '/messages',
        icon: <MessageCircle className="h-5 w-5" />,
        roles: ['warden'],
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: <Settings className="h-5 w-5" />,
        roles: ['warden'],
      },
    ];
  }

  // Staff-specific navigation
  if (role === 'staff') {
    return [
      ...baseItems,
      {
        title: 'My Profile',
        href: '/profile',
        icon: <User className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Staff Portal',
        href: '/staff/dashboard',
        icon: <Shield className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'My Tasks',
        href: '/staff-tasks',
        icon: <ListChecks className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Student View',
        href: '/staff/students',
        icon: <Users className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Leave Management',
        href: '/leave',
        icon: <Clock className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Attendance',
        href: '/attendance',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Visitor Management',
        href: '/visitors',
        icon: <UserCheck className="h-5 w-5" />,
        roles: ['staff'],
      },
      {
        title: 'Messages',
        href: '/messages',
        icon: <MessageCircle className="h-5 w-5" />,
        roles: ['staff'],
      },
    ];
  }

  // Student-specific navigation (removed reports and settings as requested)
  if (role === 'student') {
    return [
      ...baseItems,
      {
        title: 'My Profile',
        href: '/profile',
        icon: <User className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'Leave Requests',
        href: '/leave',
        icon: <Clock className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'My Attendance',
        href: '/attendance',
        icon: <Calendar className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'Applications',
        href: '/applications',
        icon: <FileText className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'Events',
        href: '/events',
        icon: <CalendarDays className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'Maintenance',
        href: '/maintenance',
        icon: <Wrench className="h-5 w-5" />,
        roles: ['student'],
      },
      {
        title: 'Messages',
        href: '/messages',
        icon: <MessageCircle className="h-5 w-5" />,
        roles: ['student'],
      },
    ];
  }

  return baseItems;
};

interface SidebarNavProps {
  userRole: UserRole;
  onNavigate?: () => void;
}

export function SidebarNav({ userRole, onNavigate }: SidebarNavProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navItems = getNavItemsForRole(userRole);

  return (
    <nav className="space-y-2 p-2">
      {/* Role-specific section header */}
      <div className="px-3 py-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Shield className="h-4 w-4" />
          <span>{userRole} Portal</span>
        </div>
      </div>

      {navItems.map((item) => {
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isExpanded = expandedItems[item.title];
        
        return (
          <React.Fragment key={item.title}>
            {hasSubmenu ? (
              <button
                onClick={() => toggleSubmenu(item.title)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group',
                  'hover:bg-gradient-to-r hover:from-primary-100 hover:to-primary-50 hover:text-primary-900 hover:shadow-md hover:scale-[1.02]',
                  'dark:hover:from-primary-800 dark:hover:to-primary-900/50 dark:hover:text-primary-100',
                  'btn-textured border border-transparent hover:border-primary-200',
                  isExpanded && 'bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-md scale-[1.02] border-primary-200',
                  isExpanded && 'dark:from-primary-800 dark:to-primary-900/50 dark:text-primary-100 dark:border-primary-700'
                )}
              >
                <span className="flex items-center">
                  <span className="mr-3 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                  <span className="font-semibold">{item.title}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-300',
                    isExpanded ? 'rotate-180' : '',
                    'group-hover:scale-110'
                  )}
                />
              </button>
            ) : (
              <NavLink
                to={item.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group',
                    'hover:bg-gradient-to-r hover:from-primary-100 hover:to-primary-50 hover:text-primary-900 hover:shadow-md hover:scale-[1.02]',
                    'dark:hover:from-primary-800 dark:hover:to-primary-900/50 dark:hover:text-primary-100',
                    'btn-textured border border-transparent hover:border-primary-200',
                    isActive &&
                      'bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-md scale-[1.02] border-primary-200',
                    isActive &&
                      'dark:from-primary-800 dark:to-primary-900/50 dark:text-primary-100 dark:border-primary-700'
                  )
                }
              >
                <span className="mr-3 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                <span className="font-semibold">{item.title}</span>
              </NavLink>
            )}
            
            {hasSubmenu && isExpanded && (
              <div className="ml-4 mt-2 space-y-1 border-l-2 border-primary-200 pl-4 dark:border-primary-700">
                {item.submenu
                  ?.filter((subItem) => subItem.roles.includes(userRole))
                  .map((subItem) => (
                    <NavLink
                      key={subItem.href}
                      to={subItem.href}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300',
                          'hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-25 hover:text-primary-800 hover:shadow-sm',
                          'dark:hover:from-primary-900/30 dark:hover:to-primary-800/30 dark:hover:text-primary-200',
                          isActive &&
                            'bg-gradient-to-r from-primary-50 to-primary-25 text-primary-800 shadow-sm',
                          isActive &&
                            'dark:from-primary-900/30 dark:to-primary-800/30 dark:text-primary-200'
                        )
                      }
                    >
                      <span className="mr-3">{subItem.icon}</span>
                      <span>{subItem.title}</span>
                    </NavLink>
                  ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}