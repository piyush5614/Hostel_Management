import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { StaffTask } from '../../types';
import { createStaffTask, updateStaffTask } from '../../store/mock-data';
import { mockStaff } from '../../store/mock-data';
import { toast } from 'sonner';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { sendTaskAssignmentNotification } from '../../services/email-notification';

interface TaskFormProps {
  task?: StaffTask;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const user = useAuthStore(s => s.user);
  const activeStaffList = mockStaff.filter(s => s.isActive);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    category: task?.category || 'maintenance',
    assignedTo: task?.assignedTo || activeStaffList[0]?.id || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0],
    estimatedHours: task?.estimatedHours?.toString() || '',
    notes: task?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(task?.voiceMessage || null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceMessage(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch {
      toast.error('Microphone access denied. Please allow microphone access.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const removeRecording = () => {
    setVoiceMessage(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!voiceMessage) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(voiceMessage);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const activeStaff = activeStaffList;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        assignedBy: user?.id || 'admin-1',
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority as StaffTask['priority'],
        category: formData.category as StaffTask['category'],
        status: (task?.status || 'pending') as StaffTask['status'],
        voiceMessage: voiceMessage || undefined,
      };

      if (task) {
        updateStaffTask(task.id, taskData);
        toast.success('Task updated successfully!');
      } else {
        createStaffTask(taskData);
        toast.success('Task assigned successfully!');

        // Send email notification to the assigned staff (fire-and-forget)
        const assignedStaff = mockStaff.find(s => s.id === formData.assignedTo);
        if (assignedStaff?.email) {
          sendTaskAssignmentNotification({
            staffId: assignedStaff.id,
            staffEmail: assignedStaff.email,
            staffName: assignedStaff.name,
            taskTitle: formData.title,
            taskDescription: formData.description,
            taskPriority: formData.priority,
            taskCategory: formData.category,
            taskDueDate: new Date(formData.dueDate).toISOString(),
            assignedByName: user?.name || 'Admin',
          })
            .then(sent => {
              if (sent) toast.success('Email notification sent to ' + assignedStaff.name);
              else toast.info('Task created but email notification could not be sent');
            })
            .catch(() => toast.info('Task created but email notification could not be sent'));
        }
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Task Title"
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Enter task title"
        required
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Detailed task description..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white min-h-[80px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Assign To"
          options={activeStaff.map(s => ({ value: s.id, label: `${s.name} (${s.position})` }))}
          value={formData.assignedTo}
          onChange={(e) => handleChange('assignedTo', e.target.value)}
        />
        <Select
          label="Priority"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
          value={formData.priority}
          onChange={(e) => handleChange('priority', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          options={[
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'cleaning', label: 'Cleaning' },
            { value: 'security', label: 'Security' },
            { value: 'administrative', label: 'Administrative' },
            { value: 'other', label: 'Other' },
          ]}
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
        />
        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate}
          onChange={(e) => handleChange('dueDate', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Estimated Hours"
          type="number"
          value={formData.estimatedHours}
          onChange={(e) => handleChange('estimatedHours', e.target.value)}
          placeholder="e.g., 3"
        />
        <Input
          label="Additional Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any special instructions"
        />
      </div>

      {/* Voice Recording Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Mic className="h-4 w-4 text-primary-500" />
          Voice Message <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>

        {!voiceMessage ? (
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-muted-foreground hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all w-full justify-center group"
              >
                <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-2 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                  <Mic className="h-4 w-4" />
                </div>
                Click to record a voice message for the staff
              </button>
            ) : (
              <div className="flex items-center gap-3 w-full rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-400 animate-ping" />
                </div>
                <span className="text-sm font-medium text-red-700 dark:text-red-400 flex-1">
                  Recording... {formatTime(recordingDuration)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-lg bg-red-500 hover:bg-red-600 text-white p-2 transition-colors shadow-md"
                  title="Stop recording"
                >
                  <Square className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 px-4 py-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="rounded-full bg-primary-500 hover:bg-primary-600 text-white p-2.5 shadow-md transition-all hover:scale-105"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Voice message recorded</p>
              <p className="text-xs text-muted-foreground">Click play to preview</p>
            </div>
            <button
              type="button"
              onClick={removeRecording}
              className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
              title="Remove recording"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {task ? 'Update Task' : 'Assign Task'}
        </Button>
      </div>
    </form>
  );
}
