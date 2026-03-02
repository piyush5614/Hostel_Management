import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useAuthStore } from '../store/auth-store';
import { mockUserSettings } from '../store/mock-data';
import { UserSettings } from '../types';
import { Settings, Bell, Shield, Globe, Palette, MessageSquare, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  
  // Find or create user settings
  const existingSettings = mockUserSettings.find(s => s.userId === user?.id);
  const [settings, setSettings] = useState<UserSettings>(existingSettings || {
    id: Date.now().toString(),
    userId: user?.id || '',
    notifications: {
      email: true,
      push: true,
      sms: false,
      announcements: true,
      events: true,
      maintenance: true,
      fees: true,
    },
    privacy: {
      profileVisibility: 'students-only',
      showContactInfo: true,
      showAcademicInfo: true,
    },
    display: {
      theme: 'light',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: 30,
    },
    communication: {
      allowMessages: true,
      allowGroupMessages: true,
      autoReply: false,
      autoReplyMessage: '',
    },
  });

  const handleSave = () => {
    const index = mockUserSettings.findIndex(s => s.userId === user?.id);
    if (index !== -1) {
      mockUserSettings[index] = settings;
    } else {
      mockUserSettings.push(settings);
    }
    toast.success('Settings saved successfully!');
  };

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updatePrivacySetting = (key: keyof UserSettings['privacy'], value: any) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }));
  };

  const updateDisplaySetting = (key: keyof UserSettings['display'], value: any) => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }));
  };

  const updateSecuritySetting = (key: keyof UserSettings['security'], value: any) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  const updateCommunicationSetting = (key: keyof UserSettings['communication'], value: any) => {
    setSettings(prev => ({
      ...prev,
      communication: { ...prev.communication, [key]: value }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Email Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => updateNotificationSetting('email', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Push Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) => updateNotificationSetting('push', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">SMS Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.sms}
                  onChange={(e) => updateNotificationSetting('sms', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Announcements</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.announcements}
                  onChange={(e) => updateNotificationSetting('announcements', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Events</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.events}
                  onChange={(e) => updateNotificationSetting('events', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Maintenance Updates</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.maintenance}
                  onChange={(e) => updateNotificationSetting('maintenance', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Fee Reminders</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.fees}
                  onChange={(e) => updateNotificationSetting('fees', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Privacy Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Profile Visibility"
              options={[
                { value: 'public', label: 'Public' },
                { value: 'students-only', label: 'Students Only' },
                { value: 'private', label: 'Private' },
              ]}
              value={settings.privacy.profileVisibility}
              onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Contact Information</label>
                <input
                  type="checkbox"
                  checked={settings.privacy.showContactInfo}
                  onChange={(e) => updatePrivacySetting('showContactInfo', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Academic Information</label>
                <input
                  type="checkbox"
                  checked={settings.privacy.showAcademicInfo}
                  onChange={(e) => updatePrivacySetting('showAcademicInfo', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Display Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Theme"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' },
              ]}
              value={settings.display.theme}
              onChange={(e) => updateDisplaySetting('theme', e.target.value)}
            />

            <Select
              label="Language"
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' },
                { value: 'te', label: 'Telugu' },
              ]}
              value={settings.display.language}
              onChange={(e) => updateDisplaySetting('language', e.target.value)}
            />

            <Select
              label="Date Format"
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
              value={settings.display.dateFormat}
              onChange={(e) => updateDisplaySetting('dateFormat', e.target.value)}
            />

            <Select
              label="Time Format"
              options={[
                { value: '12h', label: '12 Hour' },
                { value: '24h', label: '24 Hour' },
              ]}
              value={settings.display.timeFormat}
              onChange={(e) => updateDisplaySetting('timeFormat', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Two-Factor Authentication</label>
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) => updateSecuritySetting('twoFactorEnabled', e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Login Notifications</label>
                <input
                  type="checkbox"
                  checked={settings.security.loginNotifications}
                  onChange={(e) => updateSecuritySetting('loginNotifications', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>

            <Select
              label="Session Timeout (minutes)"
              options={[
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 hour' },
                { value: '120', label: '2 hours' },
              ]}
              value={settings.security.sessionTimeout.toString()}
              onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value))}
            />
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Communication Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Allow Direct Messages</label>
                  <input
                    type="checkbox"
                    checked={settings.communication.allowMessages}
                    onChange={(e) => updateCommunicationSetting('allowMessages', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Allow Group Messages</label>
                  <input
                    type="checkbox"
                    checked={settings.communication.allowGroupMessages}
                    onChange={(e) => updateCommunicationSetting('allowGroupMessages', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto Reply</label>
                  <input
                    type="checkbox"
                    checked={settings.communication.autoReply}
                    onChange={(e) => updateCommunicationSetting('autoReply', e.target.checked)}
                    className="rounded"
                  />
                </div>
              </div>
              
              {settings.communication.autoReply && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Auto Reply Message</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                    value={settings.communication.autoReplyMessage}
                    onChange={(e) => updateCommunicationSetting('autoReplyMessage', e.target.value)}
                    placeholder="Enter your auto reply message..."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}