import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { RoomForm } from '../components/forms/room-form';
import { RoomAllocationForm } from '../components/forms/room-allocation-form';
import { AutoAssignModal } from '../components/forms/auto-assign-modal';
import { Building2, CheckCircle2, Circle, Search, SquareAsterisk, Plus, Edit, Trash2, Users, Zap } from 'lucide-react';
import { mockRooms, mockBeds, mockStudents, deleteRoom, autoAssignStudents } from '../store/mock-data';
import { Room, Bed, Student, AutoAssignCriteria } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function RoomsPage() {
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(mockRooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [allocatingRoom, setAllocatingRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState({
    floor: '',
    type: '',
    gender: '',
    status: '',
  });

  // Get beds for the selected room
  const roomBeds = selectedRoom
    ? mockBeds.filter((bed) => bed.roomId === selectedRoom.id)
    : [];

  // Get student info for each occupied bed
  const getStudentForBed = (bedId: string): Student | undefined => {
    const bed = mockBeds.find((b) => b.id === bedId);
    if (bed?.studentId) {
      return mockStudents.find((student) => student.id === bed.studentId);
    }
    return undefined;
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);

    // Apply filters
    let result = [...mockRooms];

    if (newFilter.floor) {
      result = result.filter((room) => room.floor.toString() === newFilter.floor);
    }

    if (newFilter.type) {
      result = result.filter((room) => room.type === newFilter.type);
    }

    if (newFilter.gender) {
      result = result.filter((room) => room.gender === newFilter.gender);
    }

    if (newFilter.status) {
      result = result.filter((room) => room.status === newFilter.status);
    }

    if (searchQuery) {
      result = result.filter((room) =>
        room.number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRooms(result);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    let result = [...mockRooms];
    
    // Apply existing filters
    if (filter.floor) {
      result = result.filter((room) => room.floor.toString() === filter.floor);
    }
    
    if (filter.type) {
      result = result.filter((room) => room.type === filter.type);
    }
    
    if (filter.gender) {
      result = result.filter((room) => room.gender === filter.gender);
    }
    
    if (filter.status) {
      result = result.filter((room) => room.status === filter.status);
    }
    
    // Apply search query
    if (query) {
      result = result.filter((room) =>
        room.number.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setFilteredRooms(result);
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      floor: '',
      type: '',
      gender: '',
      status: '',
    });
    setSearchQuery('');
    setFilteredRooms(mockRooms);
  };

  const handleAddRoom = () => {
    setIsAddModalOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsEditModalOpen(true);
  };

  const handleDeleteRoom = (room: Room) => {
    if (window.confirm(`Are you sure you want to delete room ${room.number}?`)) {
      const result = deleteRoom(room.id);
      if (result.success) {
        toast.success(result.message);
        setFilteredRooms(mockRooms);
        if (selectedRoom?.id === room.id) {
          setSelectedRoom(null);
        }
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleAllocateRoom = (room: Room) => {
    setAllocatingRoom(room);
    setIsAllocationModalOpen(true);
  };

  const handleAutoAssign = () => {
    setIsAutoAssignModalOpen(true);
  };

  const handleAutoAssignSubmit = (criteria: AutoAssignCriteria) => {
    const result = autoAssignStudents(criteria);
    if (result.success) {
      toast.success(result.message);
      setFilteredRooms([...mockRooms]);
      if (selectedRoom) {
        const updatedRoom = mockRooms.find(r => r.id === selectedRoom.id);
        setSelectedRoom(updatedRoom || null);
      }
    } else {
      toast.error(result.message);
    }
    setIsAutoAssignModalOpen(false);
  };

  const handleFormSuccess = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsAllocationModalOpen(false);
    setEditingRoom(null);
    setAllocatingRoom(null);
    setFilteredRooms([...mockRooms]);
    // Refresh the selected room if it was edited
    if (selectedRoom && editingRoom?.id === selectedRoom.id) {
      const updatedRoom = mockRooms.find(r => r.id === selectedRoom.id);
      setSelectedRoom(updatedRoom || null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Room Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleAutoAssign}>
            <Zap className="mr-2 h-4 w-4" />
            Auto Assign
          </Button>
          <Button onClick={handleAddRoom}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Room
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Filters */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by room number"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <Select
              label="Floor"
              options={[
                { value: '', label: 'All Floors' },
                { value: '1', label: 'Floor 1' },
                { value: '2', label: 'Floor 2' },
                { value: '3', label: 'Floor 3' },
              ]}
              value={filter.floor}
              onChange={(e) => handleFilterChange('floor', e.target.value)}
            />

            <Select
              label="Room Type"
              options={[
                { value: '', label: 'All Types' },
                { value: 'AC', label: 'AC' },
                { value: 'Non-AC', label: 'Non-AC' },
              ]}
              value={filter.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            />

            <Select
              label="Gender"
              options={[
                { value: '', label: 'All' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'any', label: 'Any' },
              ]}
              value={filter.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
            />

            <Select
              label="Status"
              options={[
                { value: '', label: 'All' },
                { value: 'available', label: 'Available' },
                { value: 'full', label: 'Full' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
              value={filter.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />

            <Button variant="outline" className="w-full" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Room Grid */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rooms ({filteredRooms.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    className={cn(
                      'group relative flex flex-col items-center rounded-md border p-3 text-center transition-colors',
                      selectedRoom?.id === room.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/10',
                      room.status === 'maintenance' && 'border-warning-500 bg-warning-50 dark:bg-warning-900/20',
                      room.status === 'full' && 'border-error-300 bg-error-50 dark:bg-error-900/10'
                    )}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {/* Action buttons */}
                    <div className="absolute right-1 top-1 flex space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRoom(room);
                        }}
                        className="rounded bg-primary-600 p-1 text-white hover:bg-primary-700"
                        title="Edit room"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room);
                        }}
                        className="rounded bg-error-600 p-1 text-white hover:bg-error-700"
                        title="Delete room"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <Building2 className={cn(
                      'mb-1 h-6 w-6',
                      room.status === 'available' && 'text-success-500',
                      room.status === 'full' && 'text-error-500',
                      room.status === 'maintenance' && 'text-warning-500'
                    )} />
                    <span className="font-medium">Room {room.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {room.type} | Floor {room.floor}
                    </span>
                    <span className="mt-1 text-xs">
                      {room.occupiedBeds}/{room.totalBeds} beds
                    </span>
                  </button>
                ))}
              </div>
              
              {filteredRooms.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No rooms match your search criteria
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Room Details */}
        <div className="md:col-span-2">
          {selectedRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room {selectedRoom.number} Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Floor</p>
                    <p>{selectedRoom.floor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p>{selectedRoom.type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p className="capitalize">{selectedRoom.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="capitalize">{selectedRoom.status}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Amenities</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRoom.amenities?.map((amenity, index) => (
                      <span key={index} className="rounded-full bg-primary-100 px-2 py-1 text-xs">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="mb-3 font-semibold">Beds</h3>
                  <div className="space-y-3">
                    {roomBeds.map((bed) => {
                      const student = getStudentForBed(bed.id);
                      return (
                        <div
                          key={bed.id}
                          className={cn(
                            'rounded-md border p-3',
                            bed.status === 'available' && 'border-success-200 bg-success-50 dark:bg-success-900/10',
                            bed.status === 'occupied' && 'border-primary-200 bg-primary-50 dark:bg-primary-900/10',
                            bed.status === 'maintenance' && 'border-warning-200 bg-warning-50 dark:bg-warning-900/10'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {bed.status === 'available' && <Circle className="h-4 w-4 text-success-500" />}
                              {bed.status === 'occupied' && <CheckCircle2 className="h-4 w-4 text-primary-500" />}
                              {bed.status === 'maintenance' && <SquareAsterisk className="h-4 w-4 text-warning-500" />}
                              <span className="font-medium">Bed {bed.number}</span>
                            </div>
                            <span className="text-xs capitalize">{bed.status}</span>
                          </div>
                          
                          {student && (
                            <div className="mt-2 rounded-md bg-background p-2">
                              <div className="flex items-center space-x-2">
                                {student.profileImage ? (
                                  <img
                                    src={student.profileImage}
                                    alt={student.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                                    {student.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">{student.enrollmentNumber}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleAllocateRoom(selectedRoom)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Allocate Students
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => handleEditRoom(selectedRoom)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Building2 className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select a room to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Room"
        size="lg"
      >
        <RoomForm
          onSuccess={handleFormSuccess}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Room"
        size="lg"
      >
        {editingRoom && (
          <RoomForm
            room={editingRoom}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsEditModalOpen(false)}
          />
        )}
      </Modal>

      {/* Room Allocation Modal */}
      <Modal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        title="Allocate Students to Room"
        size="xl"
      >
        {allocatingRoom && (
          <RoomAllocationForm
            room={allocatingRoom}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsAllocationModalOpen(false)}
          />
        )}
      </Modal>

      {/* Auto Assign Modal */}
      <Modal
        isOpen={isAutoAssignModalOpen}
        onClose={() => setIsAutoAssignModalOpen(false)}
        title="Auto Assign Students"
        size="lg"
      >
        <AutoAssignModal
          onSubmit={handleAutoAssignSubmit}
          onCancel={() => setIsAutoAssignModalOpen(false)}
        />
      </Modal>
    </div>
  );
}