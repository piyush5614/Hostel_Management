import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SidebarNav } from './sidebar-nav';
import { Button } from '../ui/button';
import { UserRole } from '../../types';
import { School, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu toggle */}
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Link to="/dashboard" className="flex items-center">
          <School className="h-8 w-8 text-primary-600" />
          <span className="ml-2 text-xl font-bold">TC Hostel Connect</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          className="md:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden border-r border-border bg-card md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/dashboard" className="flex items-center">
            <School className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold">TC Hostel Connect</span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          <SidebarNav userRole={userRole} />
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden',
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-background transition-transform duration-300 ease-in-out md:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link to="/dashboard" className="flex items-center">
            <School className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold">TC Hostel Connect</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="p-4">
          <SidebarNav userRole={userRole} />
        </div>
      </div>
    </>
  );
}