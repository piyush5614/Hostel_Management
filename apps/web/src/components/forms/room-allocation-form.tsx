import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Room, Student, Bed } from '../../types';
import { mockStudents, mockBeds, mockRooms, updateStudent, updateBed, updateRoom } from '../../store/mock-data';
import { toast } from 'sonner';
import { UserCircle, CheckCircle2 } from 'lucide-react';

interface RoomAllocationFormProps {
  room: Room;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RoomAllocationForm({ room, onSuccess, onCancel }: RoomAllocationFormProps) {
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get beds for this room
  const roomBeds = mockBeds.filter(bed => bed.roomId === room.id);
  
  // Get available students (not allocated to any room)
  const availableStudents = mockStudents.filter(student => 
    !student.roomId && !student.bedId && student.gender === room.gender
  );

  // Get currently allocated students for this room
  const allocatedStudents = mockStudents.filter(student => student.roomId === room.id);

  const handleStudentSelect = (bedId: string, studentId: string) => {
    setSelectedStudents(prev => ({
      ...prev,
      [bedId]: studentId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Process each bed allocation
      Object.entries(selectedStudents).forEach(([bedId, studentId]) => {
        if (studentId && studentId !== '') {
          // Update student with room and bed assignment
          updateStudent(studentId, {
            roomId: room.id,
            bedId: bedId
          });

          // Update bed status
          updateBed(bedId, {
            status: 'occupied',
            studentId: studentId
          });
        }
      });

      // Update room occupancy
      const occupiedBeds = roomBeds.filter(bed => 
        bed.status === 'occupied' || selectedStudents[bed.id]
      ).length;
      
      const newStatus = occupiedBeds === room.totalBeds ? 'full' : 'available';
      
      updateRoom(room.id, {
        occupiedBeds: occupiedBeds,
        status: newStatus
      });

      toast.success('Room allocation updated successfully!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to allocate room. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeallocate = (studentId: string, bedId: string) => {
    // Remove student from room and bed
    updateStudent(studentId, {
      roomId: undefined,
      bedId: undefined
    });

    // Update bed status
    updateBed(bedId, {
      status: 'available',
      studentId: undefined
    });

    // Update room occupancy
    const occupiedBeds = roomBeds.filter(bed => 
      bed.status === 'occupied' && bed.id !== bedId
    ).length;
    
    updateRoom(room.id, {
      occupiedBeds: occupiedBeds,
      status: occupiedBeds === 0 ? 'available' : 'available'
    });

    toast.success('Student deallocated successfully!');
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Room Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Room:</span> {room.number}</p>
            <p><span className="font-medium">Floor:</span> {room.floor}</p>
            <p><span className="font-medium">Type:</span> {room.type}</p>
            <p><span className="font-medium">Gender:</span> {room.gender}</p>
            <p><span className="font-medium">Capacity:</span> {room.totalBeds} beds</p>
            <p><span className="font-medium">Occupied:</span> {room.occupiedBeds} beds</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Students</h3>
          <div className="text-sm text-muted-foreground">
            {availableStudents.length} students available for allocation
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Bed Allocation</h3>
        
        <div className="space-y-4">
          {roomBeds.map((bed) => {
            const currentStudent = allocatedStudents.find(s => s.bedId === bed.id);
            
            return (
              <Card key={bed.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Bed {bed.number}</span>
                    {bed.status === 'occupied' && <CheckCircle2 className="h-4 w-4 text-success-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentStudent ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {currentStudent.profileImage ? (
                          <img
                            src={currentStudent.profileImage}
                            alt={currentStudent.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                            <UserCircle className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{currentStudent.name}</p>
                          <p className="text-sm text-muted-foreground">{currentStudent.enrollmentNumber}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeallocate(currentStudent.id, bed.id)}
                      >
                        Deallocate
                      </Button>
                    </div>
                  ) : (
                    <Select
                      options={[
                        { value: '', label: 'Select a student' },
                        ...availableStudents.map(student => ({
                          value: student.id,
                          label: `${student.name} (${student.enrollmentNumber})`
                        }))
                      ]}
                      value={selectedStudents[bed.id] || ''}
                      onChange={(e) => handleStudentSelect(bed.id, e.target.value)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availableStudents.length === 0 && Object.keys(selectedStudents).length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            No available students to allocate to this room.
            {room.gender !== 'any' && (
              <p className="text-sm mt-1">
                Only {room.gender} students can be allocated to this room.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            disabled={Object.keys(selectedStudents).length === 0}
          >
            Allocate Students
          </Button>
        </div>
      </form>
    </div>
  );
}