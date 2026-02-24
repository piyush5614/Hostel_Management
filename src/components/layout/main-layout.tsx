import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { User, UserRole } from '../../types';
import { Toaster } from 'sonner';

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
}

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await onLogout();
    }
  };

  // Mock notifications for demo
  const [notifications] = useState([
    {
      id: '1',
      title: 'New maintenance request has been assigned to you',
      isRead: false,
    },
    {
      id: '2',
      title: 'Reminder: Submit monthly attendance report',
      isRead: true,
    },
    {
      id: '3',
      title: 'New student has been allocated to Room 302',
      isRead: false,
    },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar userRole={user.role as UserRole} />
      <Header user={user} onLogout={handleLogout} notifications={notifications} />
      
      <main className="transition-all duration-300 lg:pl-64">
        <div className="container mx-auto p-4 pt-20">
          <Outlet />
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
}