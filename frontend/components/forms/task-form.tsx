import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { StaffTask } from '../../types';
import { createStaffTask, updateStaffTask } from '../../store/mock-data';
import { mockStaff } from '../../store/mock-data';
import { toast } from 'sonner';

interface TaskFormProps {
  task?: StaffTask;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    category: task?.category || 'maintenance',
    assignedTo: task?.assignedTo || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0],
    estimatedHours: task?.estimatedHours?.toString() || '',
    notes: task?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStaff = mockStaff.filter(s => s.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        ...formData,
        assignedBy: 'admin-1', // Current user
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority as StaffTask['priority'],
        category: formData.category as StaffTask['category'],
        status: (task?.status || 'pending') as StaffTask['status'],
      };

      if (task) {
        updateStaffTask(task.id, taskData);
        toast.success('Task updated successfully!');
      } else {
        createStaffTask(taskData);
        toast.success('Task assigned successfully!');
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
