import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { AutoAssignCriteria } from '../../types';
import { mockStudents } from '../../store/mock-data';

interface AutoAssignModalProps {
  onSubmit: (criteria: AutoAssignCriteria) => void;
  onCancel: () => void;
}

export function AutoAssignModal({ onSubmit, onCancel }: AutoAssignModalProps) {
  const [criteria, setCriteria] = useState<AutoAssignCriteria>({
    gender: 'any',
    priority: 'year'
  });

  const unassignedStudents = mockStudents.filter(s => !s.roomId && !s.bedId);
  const availableStudentsByGender = {
    male: unassignedStudents.filter(s => s.gender === 'male').length,
    female: unassignedStudents.filter(s => s.gender === 'female').length,
    any: unassignedStudents.length
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(criteria);
  };

  const handleChange = (field: keyof AutoAssignCriteria, value: any) => {
    setCriteria(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
        <h3 className="font-semibold mb-2">Available Students</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Male:</span> {availableStudentsByGender.male}
          </div>
          <div>
            <span className="font-medium">Female:</span> {availableStudentsByGender.female}
          </div>
          <div>
            <span className="font-medium">Total:</span> {availableStudentsByGender.any}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Select
          label="Gender Preference"
          options={[
            { value: 'any', label: 'Any Gender' },
            { value: 'male', label: 'Male Only' },
            { value: 'female', label: 'Female Only' },
          ]}
          value={criteria.gender}
          onChange={(e) => handleChange('gender', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Year Filter (Optional)"
            options={[
              { value: '', label: 'All Years' },
              { value: '1', label: '1st Year' },
              { value: '2', label: '2nd Year' },
              { value: '3', label: '3rd Year' },
              { value: '4', label: '4th Year' },
            ]}
            value={criteria.year?.toString() || ''}
            onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <Select
            label="Floor Preference (Optional)"
            options={[
              { value: '', label: 'Any Floor' },
              { value: '1', label: 'Floor 1' },
              { value: '2', label: 'Floor 2' },
              { value: '3', label: 'Floor 3' },
            ]}
            value={criteria.floor?.toString() || ''}
            onChange={(e) => handleChange('floor', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Course Filter (Optional)"
            value={criteria.course || ''}
            onChange={(e) => handleChange('course', e.target.value || undefined)}
            placeholder="e.g., Computer Science"
          />

          <Select
            label="Room Type Preference (Optional)"
            options={[
              { value: '', label: 'Any Type' },
              { value: 'AC', label: 'AC Rooms' },
              { value: 'Non-AC', label: 'Non-AC Rooms' },
            ]}
            value={criteria.roomType || ''}
            onChange={(e) => handleChange('roomType', e.target.value as 'AC' | 'Non-AC' | undefined)}
          />
        </div>

        <Select
          label="Assignment Priority"
          options={[
            { value: 'year', label: 'By Academic Year' },
            { value: 'course', label: 'By Course' },
            { value: 'random', label: 'Random Assignment' },
          ]}
          value={criteria.priority}
          onChange={(e) => handleChange('priority', e.target.value as 'year' | 'course' | 'random')}
        />
      </div>

      <div className="rounded-lg bg-warning-50 p-4 dark:bg-warning-900/20">
        <h4 className="font-medium text-warning-800 dark:text-warning-200 mb-1">
          Assignment Rules
        </h4>
        <ul className="text-sm text-warning-700 dark:text-warning-300 space-y-1">
          <li>• Students will only be assigned to rooms matching their gender</li>
          <li>• Only available rooms with empty beds will be used</li>
          <li>• Assignment follows the selected priority order</li>
          <li>• Students already assigned to rooms will be skipped</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Auto Assign Students
        </Button>
      </div>
    </form>
  );
}