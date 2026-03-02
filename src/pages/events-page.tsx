import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { mockEvents, mockEventRegistrations } from '../store/mock-data';
import { Event, EventRegistration } from '../types';
import { Calendar, Plus, Edit, Trash2, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function EventsPage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    category: 'academic' as Event['category'],
    visibility: 'public' as Event['visibility'],
    maxParticipants: '',
    registrationRequired: false,
    registrationDeadline: '',
  });

  const canManageEvents = user?.role === 'admin' || user?.role === 'warden';
  
  // Filter events based on visibility and user role
  const visibleEvents = mockEvents.filter(event => {
    if (event.visibility === 'public') return true;
    if (event.visibility === 'students-only' && user?.role === 'student') return true;
    if (event.visibility === 'staff-only' && (user?.role === 'admin' || user?.role === 'warden' || user?.role === 'staff')) return true;
    if (canManageEvents) return true;
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
      organizer: user?.name || '',
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published' as const,
    };

    if (editingEvent) {
      // Update existing event
      const index = mockEvents.findIndex(e => e.id === editingEvent.id);
      if (index !== -1) {
        mockEvents[index] = { ...editingEvent, ...eventData, updatedAt: new Date().toISOString() };
        toast.success('Event updated successfully!');
      }
      setIsEditModalOpen(false);
      setEditingEvent(null);
    } else {
      // Create new event
      const newEvent: Event = {
        id: Date.now().toString(),
        ...eventData,
      };
      mockEvents.push(newEvent);
      toast.success('Event created successfully!');
      setIsCreateModalOpen(false);
    }

    // Reset form
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      category: 'academic',
      visibility: 'public',
      maxParticipants: '',
      registrationRequired: false,
      registrationDeadline: '',
    });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      startDate: event.startDate.split('T')[0],
      endDate: event.endDate.split('T')[0],
      location: event.location,
      category: event.category,
      visibility: event.visibility,
      maxParticipants: event.maxParticipants?.toString() || '',
      registrationRequired: event.registrationRequired,
      registrationDeadline: event.registrationDeadline?.split('T')[0] || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (event: Event) => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      const index = mockEvents.findIndex(e => e.id === event.id);
      if (index !== -1) {
        mockEvents.splice(index, 1);
        toast.success('Event deleted successfully!');
        if (selectedEvent?.id === event.id) {
          setSelectedEvent(null);
        }
      }
    }
  };

  const handleRegister = (event: Event) => {
    const existingRegistration = mockEventRegistrations.find(
      reg => reg.eventId === event.id && reg.studentId === user?.id
    );

    if (existingRegistration) {
      toast.error('You are already registered for this event!');
      return;
    }

    const newRegistration: EventRegistration = {
      id: Date.now().toString(),
      eventId: event.id,
      studentId: user?.id || '',
      registeredAt: new Date().toISOString(),
      status: 'registered',
    };

    mockEventRegistrations.push(newRegistration);
    toast.success('Successfully registered for the event!');
  };

  const isRegistered = (eventId: string) => {
    return mockEventRegistrations.some(
      reg => reg.eventId === eventId && reg.studentId === user?.id
    );
  };

  const getRegistrationCount = (eventId: string) => {
    return mockEventRegistrations.filter(reg => reg.eventId === eventId).length;
  };

  const getCategoryColor = (category: Event['category']) => {
    switch (category) {
      case 'academic': return 'text-primary-600 bg-primary-50';
      case 'cultural': return 'text-secondary-600 bg-secondary-50';
      case 'sports': return 'text-success-600 bg-success-50';
      case 'social': return 'text-warning-600 bg-warning-50';
      case 'official': return 'text-error-600 bg-error-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Events</h1>
        {canManageEvents && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Events List */}
        <div className="md:col-span-2">
          <div className="grid gap-4">
            {visibleEvents.map((event) => (
              <Card
                key={event.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent',
                  selectedEvent?.id === event.id && 'border-primary-500 bg-primary-50'
                )}
                onClick={() => setSelectedEvent(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          getCategoryColor(event.category)
                        )}>
                          {event.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description.substring(0, 100)}...
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(event.startDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3" />
                          {event.location}
                        </div>
                        {event.registrationRequired && (
                          <div className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {getRegistrationCount(event.id)}
                            {event.maxParticipants && `/${event.maxParticipants}`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {canManageEvents && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(event);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(event);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {visibleEvents.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
                  <p>No events available at this time.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div>
          {selectedEvent ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedEvent.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    getCategoryColor(selectedEvent.category)
                  )}>
                    {selectedEvent.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedEvent.visibility}
                  </span>
                </div>

                <p className="text-sm">{selectedEvent.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>
                      {new Date(selectedEvent.startDate).toLocaleDateString()} - {' '}
                      {new Date(selectedEvent.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Organized by {selectedEvent.organizer}</span>
                  </div>
                </div>

                {selectedEvent.registrationRequired && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Registrations:</span>
                      <span>
                        {getRegistrationCount(selectedEvent.id)}
                        {selectedEvent.maxParticipants && `/${selectedEvent.maxParticipants}`}
                      </span>
                    </div>
                    {selectedEvent.registrationDeadline && (
                      <div className="text-xs text-muted-foreground">
                        Deadline: {new Date(selectedEvent.registrationDeadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}

                {user?.role === 'student' && selectedEvent.registrationRequired && (
                  <Button
                    className="w-full"
                    onClick={() => handleRegister(selectedEvent)}
                    disabled={isRegistered(selectedEvent.id)}
                  >
                    {isRegistered(selectedEvent.id) ? 'Already Registered' : 'Register for Event'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Calendar className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select an event to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingEvent(null);
        }}
        title={editingEvent ? 'Edit Event' : 'Create New Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { value: 'academic', label: 'Academic' },
                { value: 'cultural', label: 'Cultural' },
                { value: 'sports', label: 'Sports' },
                { value: 'social', label: 'Social' },
                { value: 'official', label: 'Official' },
              ]}
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Event['category'] }))}
            />
            <Select
              label="Visibility"
              options={[
                { value: 'public', label: 'Public' },
                { value: 'students-only', label: 'Students Only' },
                { value: 'staff-only', label: 'Staff Only' },
                { value: 'private', label: 'Private' },
              ]}
              value={formData.visibility}
              onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as Event['visibility'] }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="registrationRequired"
              checked={formData.registrationRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationRequired: e.target.checked }))}
            />
            <label htmlFor="registrationRequired" className="text-sm font-medium">
              Registration Required
            </label>
          </div>

          {formData.registrationRequired && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Participants (Optional)"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
              />
              <Input
                label="Registration Deadline"
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setEditingEvent(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}