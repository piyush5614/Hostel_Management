import { useMemo, useState } from 'react';
import { mockStudents, mockRooms, mockBeds } from '../../store/mock-data';
import { useDataRefresh } from '../../utils/use-data-refresh';
import { EVENTS } from '../../utils/event-bus';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Users, Search, Phone, Mail, Building2, GraduationCap } from 'lucide-react';

export function StaffStudentView() {
  const [searchQuery, setSearchQuery] = useState('');
  const refreshKey = useDataRefresh([EVENTS.STUDENT_UPDATED, EVENTS.ROOM_UPDATED]);

  const students = useMemo(() => {
    let list = [...mockStudents];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.enrollmentNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [searchQuery, refreshKey]);

  const getRoomLabel = (roomId?: string, bedId?: string) => {
    if (!roomId) return 'Not Assigned';
    const room = mockRooms.find(r => r.id === roomId);
    const bed = bedId ? mockBeds.find(b => b.id === bedId) : null;
    return room ? `Room ${room.number}${bed ? `, Bed ${bed.number}` : ''}` : 'Not Assigned';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Directory</h1>
          <p className="text-muted-foreground">View student information (read-only)</p>
        </div>
        <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
          <Users className="mr-1 h-4 w-4" />
          {students.length} Students
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, enrollment number, email or course..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map(student => (
          <Card key={student.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{student.name}</span>
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${student.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{student.enrollmentNumber}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.course && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>{student.course} — Year {student.year}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{getRoomLabel(student.roomId, student.bedId)}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{student.contactNumber}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{student.email}</span>
              </div>
              {student.guardianName && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Guardian: {student.guardianName} ({student.guardianContact})</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {students.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No students found</p>
            <p className="text-sm">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
