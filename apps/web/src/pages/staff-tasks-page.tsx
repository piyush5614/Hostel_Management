import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TaskForm } from '../components/forms/task-form';
import {
  ListChecks, Search, Plus, Clock, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, UserCircle,
  MessageSquare, Image, BarChart3, Filter, RefreshCw,
  Send, Loader2, Trash2, Upload, ThumbsUp, ThumbsDown,
  Download, FileSpreadsheet, FileText, Mic, Play, Pause, Volume2,
} from 'lucide-react';
import {
  mockStaffTasks, mockStaff, updateStaffTask, deleteStaffTask,
  addTaskComment, reassignTask, getStaffWorkload, getLinkedStaffId,
} from '../store/mock-data';
import { mockPhotoSubmissions, PhotoSubmission } from '../store/enhanced-mock-data';
import { exportService } from '../services/export';
import { StaffTask } from '../types';
import { cn, formatDate, formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/auth-store';
import { useDataRefresh } from '../utils/use-data-refresh';
import { EVENTS } from '../utils/event-bus';

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: null },
  medium: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: null },
  high: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
};

const statusConfig = {
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  'in-progress': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export function StaffTasksPage() {
  const user = useAuthStore(s => s.user);
  const refreshKey = useDataRefresh([EVENTS.TASK_UPDATED, EVENTS.STAFF_UPDATED]);
  const isStaff = user?.role === 'staff';
  const myStaffId = isStaff && user?.id ? getLinkedStaffId(user.id, user.email) : null;
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
  });

  const filteredTasks = useMemo(() => {
    let result = [...mockStaffTasks];

    // Staff can only see their own tasks
    if (isStaff && myStaffId) {
      result = result.filter(t => t.assignedTo === myStaffId);
    }

    if (filter.status) result = result.filter(t => t.status === filter.status);
    if (filter.priority) result = result.filter(t => t.priority === filter.priority);
    if (filter.category) result = result.filter(t => t.category === filter.category);
    if (filter.assignedTo) result = result.filter(t => t.assignedTo === filter.assignedTo);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    // Sort: urgent first, then by due date
    result.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return result;
  }, [searchQuery, filter, refreshKey, isStaff, myStaffId]);

  const workload = useMemo(() => getStaffWorkload(), []);

  const getStaffName = (id: string) => mockStaff.find(s => s.id === id)?.name || 'Unknown';
  const getStaff = (id: string) => mockStaff.find(s => s.id === id);

  const isOverdue = (task: StaffTask) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
  };

  const handleStatusUpdate = (task: StaffTask, newStatus: StaffTask['status']) => {
    const updates: Partial<StaffTask> = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    updateStaffTask(task.id, updates);
    toast.success(`Task marked as ${newStatus}`);
    // Refresh selected
    const updated = mockStaffTasks.find(t => t.id === task.id);
    if (updated) setSelectedTask({ ...updated });
  };

  const handleAddComment = (taskId: string) => {
    if (!commentText.trim()) return;
    addTaskComment(taskId, {
      taskId,
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userRole: user?.role || 'admin',
      content: commentText,
    });
    setCommentText('');
    toast.success('Comment added');
    const updated = mockStaffTasks.find(t => t.id === taskId);
    if (updated) setSelectedTask({ ...updated });
  };

  const handleReassign = (taskId: string, newStaffId: string) => {
    reassignTask(taskId, newStaffId);
    toast.success('Task reassigned');
    const updated = mockStaffTasks.find(t => t.id === taskId);
    if (updated) setSelectedTask({ ...updated });
  };

  const handleDeleteTask = (task: StaffTask) => {
    if (window.confirm(`Cancel task "${task.title}"?`)) {
      deleteStaffTask(task.id);
      toast.success('Task cancelled');
      if (selectedTask?.id === task.id) setSelectedTask(null);
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'warden';

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const data = filteredTasks.map(t => ({
      Title: t.title,
      Description: t.description,
      'Assigned To': getStaffName(t.assignedTo),
      Category: t.category,
      Priority: t.priority,
      Status: t.status,
      'Due Date': formatDate(t.dueDate),
      'Created': formatDate(t.createdAt),
      'Completed': t.completedAt ? formatDate(t.completedAt) : '-',
      'Est. Hours': t.estimatedHours?.toString() || '-',
      'Actual Hours': t.actualHours?.toString() || '-',
    }));
    exportService.generateReport('Staff Tasks Report', data, format);
    setShowExportMenu(false);
    toast.success(`Tasks exported as ${format.toUpperCase()}`);
  };

  // Stats - for staff, show only their tasks; for admin/warden show all
  const taskSource = isStaff && myStaffId ? mockStaffTasks.filter(t => t.assignedTo === myStaffId) : mockStaffTasks;
  const stats = useMemo(() => ({
    total: taskSource.length,
    pending: taskSource.filter(t => t.status === 'pending').length,
    inProgress: taskSource.filter(t => t.status === 'in-progress').length,
    completed: taskSource.filter(t => t.status === 'completed').length,
    overdue: taskSource.filter(t => isOverdue(t)).length,
  }), [refreshKey, isStaff, myStaffId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            {isStaff ? 'My Tasks' : 'Task Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStaff ? 'View and update your assigned tasks' : 'Assign, track, and manage staff tasks'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Export Dropdown */}
          {canManage && (
            <div className="relative">
              <Button variant="outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl border shadow-xl py-1 min-w-[160px] animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => handleExport('excel')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (.xls)
                  </button>
                  <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <FileText className="h-4 w-4 text-red-600" /> PDF
                  </button>
                  <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="h-4 w-4 text-blue-600" /> CSV
                  </button>
                </div>
              )}
            </div>
          )}
          {!isStaff && (
            <Button variant="outline" onClick={() => setShowWorkload(!showWorkload)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Workload
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color="blue" />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="In Progress" value={stats.inProgress} color="indigo" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Overdue" value={stats.overdue} color="red" />
      </div>

      {/* Workload Panel — Enhanced */}
      {showWorkload && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <BarChart3 className="h-4 w-4" /> Staff Workload Overview
            </CardTitle>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {workload.map(w => {
                const loadPct = Math.min((w.activeTasks / 5) * 100, 100);
                const loadColor = w.activeTasks > 3 ? 'text-red-500' : w.activeTasks > 1 ? 'text-amber-500' : 'text-green-500';
                const barColor = w.activeTasks > 3 ? 'bg-red-500' : w.activeTasks > 1 ? 'bg-amber-500' : 'bg-green-500';
                return (
                  <div key={w.staffId} className="rounded-2xl border bg-white dark:bg-gray-800/50 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                        {w.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <p className="text-sm font-semibold truncate flex-1">{w.name}</p>
                    </div>
                    <div className="flex justify-between gap-3 mb-3">
                      <div className="text-center flex-1">
                        <p className={cn('text-xl font-extrabold', loadColor)}>{w.activeTasks}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Active</p>
                      </div>
                      <div className="w-px bg-gray-200 dark:bg-gray-700" />
                      <div className="text-center flex-1">
                        <p className="text-xl font-extrabold text-green-600">{w.completedTasks}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Done</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{Math.round(loadPct)}% capacity</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Filters */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <Select
              label="Status"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={filter.status}
              onChange={(e) => setFilter(p => ({ ...p, status: e.target.value }))}
            />

            <Select
              label="Priority"
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              value={filter.priority}
              onChange={(e) => setFilter(p => ({ ...p, priority: e.target.value }))}
            />

            <Select
              label="Category"
              options={[
                { value: '', label: 'All Categories' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'security', label: 'Security' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'other', label: 'Other' },
              ]}
              value={filter.category}
              onChange={(e) => setFilter(p => ({ ...p, category: e.target.value }))}
            />

            {!isStaff && (
              <Select
                label="Assigned To"
                options={[
                  { value: '', label: 'All Staff' },
                  ...mockStaff.filter(s => s.isActive).map(s => ({ value: s.id, label: s.name })),
                ]}
                value={filter.assignedTo}
                onChange={(e) => setFilter(p => ({ ...p, assignedTo: e.target.value }))}
              />
            )}

            <Button variant="outline" className="w-full" onClick={() => {
              setFilter({ status: '', priority: '', category: '', assignedTo: '' });
              setSearchQuery('');
            }}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Task List — Enhanced */}
        <div className={selectedTask ? 'lg:col-span-4' : 'lg:col-span-9'}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50 px-5 py-3 border-b">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary-500" />
                  Tasks
                </span>
                <span className="text-xs font-normal bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-0.5 rounded-full">
                  {filteredTasks.length}
                </span>
              </CardTitle>
            </div>
            <CardContent className="p-3">
              <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                {filteredTasks.map(task => {
                  const staff = getStaff(task.assignedTo);
                  const overdue = isOverdue(task);
                  const StatusIcon = statusConfig[task.status]?.icon;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'group rounded-xl border p-3 cursor-pointer transition-all duration-200',
                        selectedTask?.id === task.id
                          ? 'border-primary-500 bg-primary-50 shadow-md dark:bg-primary-900/20'
                          : 'hover:border-primary-300 hover:shadow-sm',
                        overdue && 'border-red-300 dark:border-red-700'
                      )}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {StatusIcon && <StatusIcon className={cn('h-3.5 w-3.5', task.status === 'in-progress' && 'animate-spin')} />}
                            <h4 className="text-sm font-semibold truncate">{task.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', priorityConfig[task.priority].color)}>
                              {task.priority}
                            </span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusConfig[task.status].color)}>
                              {task.status}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                              {task.category}
                            </span>
                            {overdue && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold animate-pulse">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              {staff?.profileImage ? (
                                <img src={staff.profileImage} alt="" className="h-4 w-4 rounded-full object-cover" />
                              ) : (
                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-[10px] text-muted-foreground">{getStaffName(task.assignedTo)}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Due {formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <ListChecks className="h-10 w-10 opacity-40" />
                    </div>
                    <p className="text-base font-medium">No tasks found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Detail */}
        {selectedTask && (
          <div className="lg:col-span-5">
            <TaskDetailPanel
              task={selectedTask}
              canManage={canManage}
              isStaff={isStaff}
              userRole={user?.role || 'staff'}
              onStatusUpdate={handleStatusUpdate}
              onReassign={handleReassign}
              commentText={commentText}
              setCommentText={setCommentText}
              onAddComment={handleAddComment}
              onEdit={() => {
                setEditingTask(selectedTask);
                setIsEditModalOpen(true);
              }}
              onTaskRefresh={(taskId: string) => {
                const updated = mockStaffTasks.find(t => t.id === taskId);
                if (updated) setSelectedTask({ ...updated });
              }}
            />
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Task" size="xl">
        <TaskForm
          onSuccess={() => { setIsAddModalOpen(false); }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Task" size="xl">
        {editingTask && (
          <TaskForm
            task={editingTask}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setEditingTask(null);
              const updated = mockStaffTasks.find(t => t.id === editingTask.id);
              if (updated) setSelectedTask({ ...updated });
            }}
            onCancel={() => setIsEditModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// Stats Card — Enhanced with icons and animated accents
// ============================================================
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const configs: Record<string, { border: string; text: string; icon: typeof ListChecks; iconBg: string; iconColor: string }> = {
    blue: {
      border: 'border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900',
      text: 'text-blue-700 dark:text-blue-300',
      icon: ListChecks,
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Clock,
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    green: {
      border: 'border-green-200 dark:border-green-800 bg-white dark:bg-gray-900',
      text: 'text-green-700 dark:text-green-300',
      icon: CheckCircle2,
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    red: {
      border: 'border-red-200 dark:border-red-800 bg-white dark:bg-gray-900',
      text: 'text-red-700 dark:text-red-300',
      icon: AlertTriangle,
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    indigo: {
      border: 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900',
      text: 'text-indigo-700 dark:text-indigo-300',
      icon: Loader2,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  };
  const c = configs[color] || configs.blue;
  const Icon = c.icon;

  return (
    <Card className={cn('shadow-sm hover:shadow-md transition-all duration-200', c.border)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('rounded-xl p-2.5', c.iconBg)}>
          <Icon className={cn('h-5 w-5', c.iconColor)} />
        </div>
        <div>
          <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Task Detail Panel
// ============================================================
function TaskDetailPanel({
  task,
  canManage,
  isStaff,
  userRole,
  onStatusUpdate,
  onReassign,
  commentText,
  setCommentText,
  onAddComment,
  onEdit,
  onTaskRefresh,
}: {
  task: StaffTask;
  canManage: boolean;
  isStaff: boolean;
  userRole: string;
  onStatusUpdate: (task: StaffTask, status: StaffTask['status']) => void;
  onReassign: (taskId: string, staffId: string) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  onAddComment: (taskId: string) => void;
  onEdit: () => void;
  onTaskRefresh: (taskId: string) => void;
}) {
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const staff = mockStaff.find(s => s.id === task.assignedTo);
  const assignedByStaff = mockStaff.find(s => s.userId === task.assignedBy || s.id === task.assignedBy);
  const overdue = task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date();

  const StatusIcon = statusConfig[task.status]?.icon;

  // Compress image using Canvas to keep base64 small enough for localStorage
  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // For videos, just use a small placeholder (videos are too large for localStorage)
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read video'));
        // Only accept small videos (< 500KB)
        if (file.size > 500_000) {
          reject(new Error('Video too large. Please use a video under 500KB or upload an image instead.'));
          return;
        }
        reader.readAsDataURL(file);
        return;
      }

      const img = new window.Image();
      const reader = new FileReader();

      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.onload = (ev) => {
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800; // max width/height in pixels
          let w = img.width;
          let h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
            else       { w = Math.round(w * (MAX / h)); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          // Compress to JPEG at 60% quality — typically 30-80KB
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressed);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    // Reset file input immediately so re-selection works
    if (proofInputRef.current) proofInputRef.current.value = '';

    try {
      const compressed = await Promise.all(fileArray.map(f => compressImage(f)));
      const newPhotos = compressed.filter(Boolean);

      if (newPhotos.length === 0) {
        toast.error('No valid files could be processed');
        setIsUploading(false);
        return;
      }

      const existing = task.workInProgressPhotos || [];
      const allPhotos = [...existing, ...newPhotos];
      updateStaffTask(task.id, {
        workInProgressPhotos: allPhotos,
        photoSubmissionStatus: 'pending',
      });

      // Also create a PhotoSubmission record so warden/admin dashboard can see it
      const staffMember = mockStaff.find(s => s.id === task.assignedTo);
      mockPhotoSubmissions.push({
        id: `photo-${Date.now()}`,
        taskId: task.id,
        staffId: task.assignedTo,
        photos: allPhotos,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        taskTitle: task.title,
        staffName: staffMember?.name || 'Unknown Staff',
      });

      toast.success(`${newPhotos.length} proof file(s) uploaded — awaiting approval`);
      onTaskRefresh(task.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload file(s)');
      console.error('Photo upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveProof = () => {
    updateStaffTask(task.id, { photoSubmissionStatus: 'approved' });
    toast.success('Task proof approved');
    onTaskRefresh(task.id);
  };

  const handleRejectProof = () => {
    updateStaffTask(task.id, { photoSubmissionStatus: 'rejected' });
    toast.error('Task proof rejected');
    onTaskRefresh(task.id);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Header — Enhanced with pattern */}
      <div className={cn(
        'p-5 relative overflow-hidden',
        task.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white'
          : task.priority === 'high' ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white'
          : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white'
      )}>
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {StatusIcon && <StatusIcon className="h-5 w-5" />}
              <h3 className="text-lg font-bold">{task.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                {task.priority.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                {task.category}
              </span>
              {overdue && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/30 font-bold animate-pulse">
                  OVERDUE
                </span>
              )}
            </div>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={onEdit} className="text-white border-white/30 hover:bg-white/10">
              Edit
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</h4>
          <p className="text-sm">{task.description}</p>
        </div>

        {/* Assignment Info */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</h4>
            {canManage && (
              <button
                onClick={() => setShowReassign(!showReassign)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reassign
              </button>
            )}
          </div>
          {staff && (
            <div className="flex items-center gap-3">
              {staff.profileImage ? (
                <img src={staff.profileImage} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{staff.name}</p>
                <p className="text-xs text-muted-foreground">{staff.position} &bull; {staff.department}</p>
              </div>
            </div>
          )}
          {showReassign && (
            <div className="mt-3 flex gap-2">
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Select staff...</option>
                {mockStaff.filter(s => s.isActive && s.id !== task.assignedTo).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.position})</option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!reassignTo}
                onClick={() => {
                  onReassign(task.id, reassignTo);
                  setShowReassign(false);
                  setReassignTo('');
                }}
              >
                Assign
              </Button>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className={cn('font-medium', overdue && 'text-red-600')}>{formatDate(task.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(task.createdAt)}</p>
          </div>
          {task.estimatedHours && (
            <div>
              <p className="text-xs text-muted-foreground">Est. Hours</p>
              <p className="font-medium">{task.estimatedHours}h</p>
            </div>
          )}
          {task.actualHours && (
            <div>
              <p className="text-xs text-muted-foreground">Actual Hours</p>
              <p className="font-medium">{task.actualHours}h</p>
            </div>
          )}
          {task.completedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-medium">{formatDate(task.completedAt)}</p>
            </div>
          )}
          {assignedByStaff && (
            <div>
              <p className="text-xs text-muted-foreground">Assigned By</p>
              <p className="font-medium">{assignedByStaff.name}</p>
            </div>
          )}
        </div>

        {/* Work Photos & Proof Upload — Enhanced Gallery */}
        <div className="rounded-2xl border bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-primary-100 dark:bg-primary-900/30 p-1.5">
              <Image className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
            </div>
            Photos & Work Proof
          </h4>
          
          {/* Existing photos — gallery grid */}
          {(task.workInProgressPhotos?.length || task.attachments?.length) ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[...(task.workInProgressPhotos || []), ...(task.attachments || [])].map((url, i) => {
                const isVideo = url.startsWith('data:video');
                return isVideo ? (
                  <div key={i} className="relative group/media rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700 aspect-square">
                    <video src={url} className="h-full w-full object-cover" controls />
                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors" />
                  </div>
                ) : (
                  <div key={i} className="relative group/media rounded-xl overflow-hidden border-2 border-transparent hover:border-primary-400 transition-all aspect-square shadow-sm hover:shadow-md">
                    <img src={url} alt="" className="h-full w-full object-cover group-hover/media:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 mb-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <Image className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-muted-foreground">No proof uploaded yet</p>
              </div>
            </div>
          )}
          
          {/* Photo submission status — enhanced badge */}
          {task.photoSubmissionStatus && (
            <div className="mb-3">
              <span className={cn(
                'text-xs px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5',
                task.photoSubmissionStatus === 'approved' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                task.photoSubmissionStatus === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                task.photoSubmissionStatus === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              )}>
                {task.photoSubmissionStatus === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                {task.photoSubmissionStatus === 'pending' && <Clock className="h-3 w-3" />}
                {task.photoSubmissionStatus === 'rejected' && <XCircle className="h-3 w-3" />}
                Proof: {task.photoSubmissionStatus.charAt(0).toUpperCase() + task.photoSubmissionStatus.slice(1)}
              </span>
            </div>
          )}
          
          {/* Upload proof button — staff (in-progress/completed) or admin/warden */}
          {((isStaff && (task.status === 'in-progress' || task.status === 'completed')) || userRole === 'admin' || userRole === 'warden') && (
            <div>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleProofUpload}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => proofInputRef.current?.click()}
                className="w-full border-dashed border-2 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
              >
                {isUploading ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Processing...</>
                ) : (
                  <><Upload className="mr-2 h-3.5 w-3.5" /> Upload Photo / Video Proof</>
                )}
              </Button>
            </div>
          )}
          
          {/* Admin/Warden: Approve/Reject proof buttons — enhanced */}
          {(userRole === 'admin' || userRole === 'warden') && task.photoSubmissionStatus === 'pending' && (task.workInProgressPhotos?.length || 0) > 0 && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md"
                onClick={handleApproveProof}
              >
                <ThumbsUp className="mr-2 h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleRejectProof}
              >
                <ThumbsDown className="mr-2 h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          )}
        </div>

        {/* Notes */}
        {task.notes && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</h4>
            <p className="text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">{task.notes}</p>
          </div>
        )}

        {/* Voice Message from Admin/Warden */}
        {task.voiceMessage && (
          <VoiceMessagePlayer audioSrc={task.voiceMessage} />
        )}

        {/* Comments — Enhanced */}
        <div className="rounded-2xl border bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            Comments
            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{task.comments?.length || 0}</span>
          </h4>
          <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
            {(task.comments || []).map(c => (
              <div key={c.id} className="rounded-xl bg-white dark:bg-gray-800 p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-[8px] text-white font-bold">
                    {c.userName.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold">{c.userName}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDateTime(c.timestamp)}</span>
                </div>
                <p className="text-sm pl-7">{c.content}</p>
              </div>
            ))}
            {(!task.comments || task.comments.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-3">No comments yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 focus:border-primary-400 focus:outline-none transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && onAddComment(task.id)}
            />
            <Button size="sm" onClick={() => onAddComment(task.id)} disabled={!commentText.trim()} className="rounded-xl px-3">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Status Actions — Enhanced with gradients */}
        {(canManage || isStaff) && task.status !== 'cancelled' && (
          <div className="flex gap-2 pt-3 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
            {task.status === 'pending' && (
              <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md rounded-xl" onClick={() => onStatusUpdate(task, 'in-progress')}>
                <ArrowRight className="mr-2 h-3.5 w-3.5" /> Start Task
              </Button>
            )}
            {task.status === 'in-progress' && (
              <Button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md rounded-xl" onClick={() => onStatusUpdate(task, 'completed')}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark Complete
              </Button>
            )}
            {canManage && (task.status === 'pending' || task.status === 'in-progress') && (
              <Button variant="outline" className="flex-1 rounded-xl hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20" onClick={() => onStatusUpdate(task, 'cancelled')}>
                <XCircle className="mr-2 h-3.5 w-3.5" /> Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Voice Message Player Component
// ============================================================
function VoiceMessagePlayer({ audioSrc }: { audioSrc: string }) {
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const initAudio = () => {
    if (!voiceAudioRef.current) {
      const audio = new Audio(audioSrc);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onended = () => {
        setIsVoicePlaying(false);
        setProgress(0);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
      voiceAudioRef.current = audio;
    }
    return voiceAudioRef.current;
  };

  const updateProgress = () => {
    const audio = voiceAudioRef.current;
    if (audio && audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const toggle = () => {
    const audio = initAudio();
    if (isVoicePlaying) {
      audio.pause();
      setIsVoicePlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      audio.play();
      setIsVoicePlaying(true);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-1.5">
          <Volume2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        Voice Message from Admin
      </h4>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={cn(
            'rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 flex-shrink-0',
            isVoicePlaying
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
          )}
        >
          {isVoicePlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          {/* Waveform-style progress bar */}
          <div className="relative h-8 flex items-center gap-[2px]">
            {Array.from({ length: 40 }).map((_, i) => {
              const barHeight = 20 + Math.sin(i * 0.8) * 40 + Math.cos(i * 1.3) * 20;
              const filled = (i / 40) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-150',
                    filled ? 'bg-violet-500 dark:bg-violet-400' : 'bg-violet-200 dark:bg-violet-800'
                  )}
                  style={{ height: `${Math.max(barHeight, 15)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              {voiceAudioRef.current ? fmt(voiceAudioRef.current.currentTime) : '0:00'}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {fmt(duration)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
        <Mic className="h-3 w-3" /> Listen to the recorded instructions for this task
      </p>
    </div>
  );
}