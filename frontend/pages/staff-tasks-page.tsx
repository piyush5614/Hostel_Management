import { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import {
  mockStaffTasks, mockStaff, updateStaffTask, deleteStaffTask,
  addTaskComment, reassignTask, getStaffWorkload, getLinkedStaffId,
} from '../store/mock-data';
import { mockPhotoSubmissions, PhotoSubmission } from '../store/enhanced-mock-data';
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
  const myStaffId = isStaff && user?.id ? getLinkedStaffId(user.id) : null;
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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

      {/* Workload Panel */}
      {showWorkload && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary-500" /> Staff Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {workload.map(w => (
                <div key={w.staffId} className="rounded-xl border p-3 text-center hover:shadow-md transition-shadow">
                  <p className="text-sm font-semibold truncate">{w.name}</p>
                  <div className="flex justify-center gap-4 mt-2">
                    <div>
                      <p className="text-lg font-bold text-amber-600">{w.activeTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{w.completedTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Done</p>
                    </div>
                  </div>
                  {/* Workload bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        w.activeTasks > 3 ? 'bg-red-500' : w.activeTasks > 1 ? 'bg-amber-500' : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min((w.activeTasks / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
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

        {/* Task List */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tasks ({filteredTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <div className="py-12 text-center text-muted-foreground">
                    <ListChecks className="mx-auto mb-2 h-12 w-12 opacity-30" />
                    <p>No tasks found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Detail */}
        <div className="lg:col-span-5">
          {selectedTask ? (
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
          ) : (
            <Card className="flex h-full min-h-[400px] items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <ListChecks className="mx-auto mb-3 h-16 w-16 opacity-20" />
                <p className="text-lg font-medium">Select a Task</p>
                <p className="text-sm mt-1">Click on a task to view details</p>
              </div>
            </Card>
          )}
        </div>
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
// Stats Card
// ============================================================
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800',
    amber: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800',
    green: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800',
    red: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800',
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-800 dark:text-blue-200',
    amber: 'text-amber-800 dark:text-amber-200',
    green: 'text-green-800 dark:text-green-200',
    red: 'text-red-800 dark:text-red-200',
    indigo: 'text-indigo-800 dark:text-indigo-200',
  };

  return (
    <Card className={cn('bg-gradient-to-br', colors[color])}>
      <CardContent className="p-3 text-center">
        <p className={cn('text-2xl font-bold', textColors[color])}>{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
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
  const proofInputRef = useRef<HTMLInputElement>(null);
  const staff = mockStaff.find(s => s.id === task.assignedTo);
  const assignedByStaff = mockStaff.find(s => s.userId === task.assignedBy || s.id === task.assignedBy);
  const overdue = task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date();

  const StatusIcon = statusConfig[task.status]?.icon;

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newPhotos: string[] = [];
    let processed = 0;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newPhotos.push(ev.target.result as string);
        }
        processed++;
        if (processed === files.length) {
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
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    if (proofInputRef.current) proofInputRef.current.value = '';
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
    <Card className="overflow-hidden">
      {/* Header */}
      <div className={cn(
        'p-5',
        task.priority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          : task.priority === 'high' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
          : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
      )}>
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

        {/* Work Photos & Proof Upload */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Image className="h-3.5 w-3.5" /> Photos & Proof
          </h4>
          
          {/* Existing photos */}
          {(task.workInProgressPhotos?.length || task.attachments?.length) ? (
            <div className="flex gap-2 flex-wrap mb-3">
              {[...(task.workInProgressPhotos || []), ...(task.attachments || [])].map((url, i) => {
                const isVideo = url.startsWith('data:video');
                return isVideo ? (
                  <video key={i} src={url} className="h-24 w-24 rounded-lg object-cover border cursor-pointer hover:scale-105 transition-transform" controls />
                ) : (
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover border cursor-pointer hover:scale-105 transition-transform" />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">No proof uploaded yet</p>
          )}
          
          {/* Photo submission status */}
          {task.photoSubmissionStatus && (
            <div className="mb-3">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                task.photoSubmissionStatus === 'approved' && 'bg-green-100 text-green-700',
                task.photoSubmissionStatus === 'pending' && 'bg-amber-100 text-amber-700',
                task.photoSubmissionStatus === 'rejected' && 'bg-red-100 text-red-700',
              )}>
                Proof Status: {task.photoSubmissionStatus.charAt(0).toUpperCase() + task.photoSubmissionStatus.slice(1)}
              </span>
            </div>
          )}
          
          {/* Staff: Upload proof button */}
          {isStaff && (task.status === 'in-progress' || task.status === 'completed') && (
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
                onClick={() => proofInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload Proof (Image/Video)
              </Button>
            </div>
          )}
          
          {/* Admin/Warden: Approve/Reject proof buttons */}
          {(userRole === 'admin' || userRole === 'warden') && task.photoSubmissionStatus === 'pending' && (task.workInProgressPhotos?.length || 0) > 0 && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApproveProof}
              >
                <ThumbsUp className="mr-2 h-3.5 w-3.5" /> Approve Proof
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleRejectProof}
              >
                <ThumbsDown className="mr-2 h-3.5 w-3.5" /> Reject Proof
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

        {/* Comments */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" /> Comments ({task.comments?.length || 0})
          </h4>
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
            {(task.comments || []).map(c => (
              <div key={c.id} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{c.userName}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDateTime(c.timestamp)}</span>
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600"
              onKeyDown={(e) => e.key === 'Enter' && onAddComment(task.id)}
            />
            <Button size="sm" onClick={() => onAddComment(task.id)} disabled={!commentText.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Status Actions — staff can update their own task status, admin/warden can manage all */}
        {(canManage || isStaff) && task.status !== 'cancelled' && (
          <div className="flex gap-2 pt-2 border-t">
            {task.status === 'pending' && (
              <Button className="flex-1" onClick={() => onStatusUpdate(task, 'in-progress')}>
                <ArrowRight className="mr-2 h-3.5 w-3.5" /> Start Task
              </Button>
            )}
            {task.status === 'in-progress' && (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onStatusUpdate(task, 'completed')}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark Complete
              </Button>
            )}
            {canManage && (task.status === 'pending' || task.status === 'in-progress') && (
              <Button variant="outline" className="flex-1" onClick={() => onStatusUpdate(task, 'cancelled')}>
                <XCircle className="mr-2 h-3.5 w-3.5" /> Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
