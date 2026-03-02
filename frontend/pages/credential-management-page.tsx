import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import {
  Key, Search, Copy, Check, RefreshCw, Shield,
  UserCircle, Download, Clock, AlertCircle,
} from 'lucide-react';
import { mockCredentials, mockStaff, resetCredentialPassword, mockActivityLogs } from '../store/mock-data';
import { GeneratedCredential } from '../types';
import { cn, formatDate, formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/auth-store';

export function CredentialManagementPage() {
  const user = useAuthStore(s => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [activeTab, setActiveTab] = useState<'credentials' | 'activity'>('credentials');

  // Build credential list from existing staff/students + generated ones
  const allCredentials = useMemo(() => {
    const creds: GeneratedCredential[] = [...mockCredentials];

    // Add existing staff members that have credentials
    mockStaff.forEach(s => {
      if (!creds.find(c => c.generatedId === s.employeeId)) {
        creds.push({
          id: `staff-cred-${s.id}`,
          userId: s.userId,
          name: s.name,
          email: s.email,
          role: 'staff',
          generatedId: s.employeeId,
          generatedPassword: s.generatedPassword || '••••••••',
          createdAt: s.joiningDate,
          isActive: s.isActive,
        });
      }
    });

    return creds;
  }, []);

  const filteredCredentials = useMemo(() => {
    let result = [...allCredentials];
    if (roleFilter) result = result.filter(c => c.role === roleFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.generatedId.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allCredentials, roleFilter, searchQuery]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
    toast.success('Copied to clipboard');
  };

  const handleResetPassword = (credential: GeneratedCredential) => {
    if (!window.confirm(`Reset password for ${credential.name}?`)) return;
    const newPassword = resetCredentialPassword(credential.id);
    if (newPassword) {
      toast.success(`Password reset for ${credential.name}. New password: ${newPassword}`);
    } else {
      toast.error('Failed to reset password');
    }
  };

  const handleExportCSV = () => {
    const csv = [
      'Name,Email,Role,ID,Password,Created',
      ...filteredCredentials.map(c =>
        `${c.name},${c.email},${c.role},${c.generatedId},${c.generatedPassword},${formatDate(c.createdAt)}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials exported');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access credential management.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Credential Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage auto-generated IDs and passwords for staff & students
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{allCredentials.length}</p>
            <p className="text-xs text-muted-foreground">Total Credentials</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{allCredentials.filter(c => c.role === 'staff').length}</p>
            <p className="text-xs text-muted-foreground">Staff</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{allCredentials.filter(c => c.role === 'student').length}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('credentials')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'credentials' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <Key className="inline h-4 w-4 mr-2" />Credentials
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'activity' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <Clock className="inline h-4 w-4 mr-2" />Activity Log
        </button>
      </div>

      {activeTab === 'credentials' ? (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="w-48">
              <Select
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'staff', label: 'Staff' },
                  { value: 'student', label: 'Student' },
                ]}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Credentials Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Generated ID</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Password</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCredentials.map(cred => (
                      <tr key={cred.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{cred.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{cred.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            cred.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          )}>
                            {cred.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">{cred.generatedId}</code>
                            <button onClick={() => handleCopy(cred.generatedId, `id-${cred.id}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                              {copiedField === `id-${cred.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">{cred.generatedPassword}</code>
                            <button onClick={() => handleCopy(cred.generatedPassword, `pw-${cred.id}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                              {copiedField === `pw-${cred.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(cred.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleResetPassword(cred)}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <RefreshCw className="h-3 w-3" /> Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCredentials.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Key className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No credentials found</p>
                  <p className="text-xs mt-1">Add new staff or students to generate credentials</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Activity Log Tab */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {mockActivityLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                [...mockActivityLogs].reverse().map(log => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800">
                      <AlertCircle className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{log.userName}</span>
                        <span className="text-xs text-muted-foreground">&bull;</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {log.resourceType}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
