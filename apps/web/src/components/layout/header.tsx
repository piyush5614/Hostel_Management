import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { User } from '../../types';
import { LogOut, Moon, Settings, Sun, User as UserIcon } from 'lucide-react';
import { NotificationCenter } from '../dashboard/notification-center';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center border-b border-border bg-background px-4 md:left-64">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center">
          <span className="hidden text-xl font-semibold md:block">
            Welcome, {user.name}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <NotificationCenter userId={user.id} />

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
              }}
              aria-label="User menu"
              className="relative"
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg">
                <div className="border-b border-border p-2">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
                <button
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    onLogout();
                    setIsUserMenuOpen(false);
                  }}
                  disabled={false}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}