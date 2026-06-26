import { Plus } from 'lucide-react';
import type { Booking, Student, Instructor, Vehicle, TrainingGround } from '../types';
import { formatDate, formatDateDisplay, HOURS, WEEK_DAYS } from '../utils/dateUtils';

interface WeeklyViewProps {
  weekDates: Date[];
  bookings: Booking[];
  students: Student[];
  instructors: Instructor[];
  vehicles: Vehicle[];
  trainingGrounds: TrainingGround[];
  selectedStudent: Student | null;
  onCellClick: (date: string, hour: number, booking?: Booking) => void;
}

export function WeeklyView({
  weekDates,
  bookings,
  students,
  instructors,
  vehicles,
  trainingGrounds,
  selectedStudent,
  onCellClick,
}: WeeklyViewProps) {
  const getBookingForCell = (dateStr: string, hour: number) => {
    return bookings.find((b) => b.date === dateStr && b.hour === hour);
  };

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name || '';
  const getInstructorName = (id: string) => instructors.find((i) => i.id === id)?.name || '';
  const getVehiclePlate = (id: string) => vehicles.find((v) => v.id === id)?.plate || '';
  const getGroundName = (id: string) => trainingGrounds.find((g) => g.id === id)?.name || '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="sticky left-0 z-30 bg-white w-20 min-w-20 border-b border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-500">
                时段
              </th>
              {weekDates.map((date, idx) => (
                <th
                  key={idx}
                  className="border-b border-r border-gray-200 p-3 text-center min-w-[140px]"
                >
                  <div className="text-sm font-medium text-gray-500">{WEEK_DAYS[idx]}</div>
                  <div className="text-lg font-bold text-gray-900">{formatDateDisplay(date).replace(/月/, '/').replace('日', '')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="hover:bg-gray-50/50 transition-colors">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-600">
                  {hour}:00
                </td>
                {weekDates.map((date, dateIdx) => {
                  const dateStr = formatDate(date);
                  const booking = getBookingForCell(dateStr, hour);

                  if (booking) {
                    const isSubjectTwo = booking.subject === '科目二';
                    return (
                      <td
                        key={dateIdx}
                        className={`border-b border-r border-gray-200 p-1 ${isSubjectTwo ? 'bg-blue-50' : 'bg-orange-50'}`}
                      >
                        <div
                          onClick={() => onCellClick(dateStr, hour, booking)}
                          className={`rounded-lg p-2 cursor-pointer transition-all hover:shadow-md h-full border-l-4 ${isSubjectTwo ? 'border-blue-400 hover:bg-blue-100' : 'border-orange-400 hover:bg-orange-100'}`}
                        >
                          <div className="font-semibold text-gray-900 text-sm">
                            {getStudentName(booking.studentId)}
                          </div>
                          <div className={`inline-block px-1.5 py-0.5 text-xs rounded-full mt-1 font-medium ${isSubjectTwo ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'}`}>
                            {booking.subject}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {getInstructorName(booking.instructorId)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getVehiclePlate(booking.vehicleId)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {getGroundName(booking.groundId)}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  if (selectedStudent) {
                    return (
                      <td
                        key={dateIdx}
                        className="border-b border-r border-gray-200 p-1"
                      >
                        <div
                          onClick={() => onCellClick(dateStr, hour)}
                          className="rounded-lg p-2 h-full min-h-[100px] border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer transition-all duration-200 flex items-center justify-center group"
                        >
                          <Plus className="w-6 h-6 text-gray-300 group-hover:text-green-500 transition-colors" />
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={dateIdx}
                      className="border-b border-r border-gray-200 p-1"
                    >
                      <div
                        className="group relative rounded-lg p-2 h-full min-h-[100px] border-2 border-dashed border-gray-100 hover:border-gray-300 hover:bg-gray-50 cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                        title="请先选择学员"
                      >
                        <Plus className="w-5 h-5 text-gray-200 group-hover:text-gray-400 transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          请先选择学员
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
