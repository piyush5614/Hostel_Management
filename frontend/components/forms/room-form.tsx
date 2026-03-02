import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Room } from '../../types';
import { addRoom, updateRoom } from '../../store/mock-data';
import { toast } from 'sonner';

interface RoomFormProps {
  room?: Room;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RoomForm({ room, onSuccess, onCancel }: RoomFormProps) {
  const [formData, setFormData] = useState({
    number: room?.number || '',
    floor: room?.floor?.toString() || '1',
    capacity: room?.capacity?.toString() || '2',
    type: room?.type || 'AC',
    gender: room?.gender || 'male',
    status: room?.status || 'available',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const roomData = {
        number: formData.number,
        floor: parseInt(formData.floor),
        capacity: parseInt(formData.capacity),
        type: formData.type as 'AC' | 'Non-AC',
        gender: formData.gender as 'male' | 'female' | 'any',
        status: formData.status as 'available' | 'full' | 'maintenance',
      };

      if (room) {
        // Update existing room
        updateRoom(room.id, roomData);
        toast.success('Room updated successfully!');
      } else {
        // Add new room
        addRoom(roomData);
        toast.success('Room added successfully!');
      }

      onSuccess();
    } catch (error) {
      toast.error('Failed to save room. Please try again.');
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
        label="Room Number"
        value={formData.number}
        onChange={(e) => handleChange('number', e.target.value)}
        placeholder="e.g., A101, B202"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Floor"
          options={[
            { value: '1', label: 'Floor 1' },
            { value: '2', label: 'Floor 2' },
            { value: '3', label: 'Floor 3' },
          ]}
          value={formData.floor}
          onChange={(e) => handleChange('floor', e.target.value)}
        />

        <Select
          label="Capacity"
          options={[
            { value: '3', label: '3 Beds' },
          ]}
          value={formData.capacity}
          onChange={(e) => handleChange('capacity', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Room Type"
          options={[
            { value: 'AC', label: 'AC' },
            { value: 'Non-AC', label: 'Non-AC' },
          ]}
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value)}
        />

        <Select
          label="Gender"
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'any', label: 'Any' },
          ]}
          value={formData.gender}
          onChange={(e) => handleChange('gender', e.target.value)}
        />
      </div>

      <Select
        label="Status"
        options={[
          { value: 'available', label: 'Available' },
          { value: 'full', label: 'Full' },
          { value: 'maintenance', label: 'Maintenance' },
        ]}
        value={formData.status}
        onChange={(e) => handleChange('status', e.target.value)}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {room ? 'Update Room' : 'Add Room'}
        </Button>
      </div>
    </form>
  );
}