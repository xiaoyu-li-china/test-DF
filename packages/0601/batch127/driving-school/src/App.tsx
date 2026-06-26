import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Bell, Car, User, Calendar, MapPin } from 'lucide-react';
import type { Student, Instructor, Vehicle, TrainingGround, Booking } from './types';
import { fetchStudents, fetchInstructors, fetchVehicles, fetchTrainingGrounds, fetchBookings, createBooking, cancelBooking, setInstructorLeave, exportWeeklySchedule } from './mockApi';
import { getWeekDates, formatDate, getWeekRangeStr, formatDateDisplay } from './utils/dateUtils';
import { Header } from './components/Header';
import { StudentList } from './components/StudentList';
import { WeeklyView } from './components/WeeklyView';
import './index.css';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ModalState {
  isOpen: boolean;
  modalDate: string;
  modalHour: number;
  existingBooking?: Booking;
}

function App() {
  const [weekStart, setWeekStart] = useState<Date>(new Date(2026, 5, 1));
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trainingGrounds, setTrainingGrounds] = useState<TrainingGround[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    modalDate: '',
    modalHour: 0,
  });
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedGroundId, setSelectedGroundId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const weekDates = getWeekDates(new Date(weekStart));
  const weekRangeStr = getWeekRangeStr(weekDates);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, instructorsRes, vehiclesRes, groundsRes, bookingsRes] = await Promise.all([
        fetchStudents(),
        fetchInstructors(),
        fetchVehicles(),
        fetchTrainingGrounds(),
        fetchBookings(),
      ]);
      setStudents(studentsRes);
      setInstructors(instructorsRes);
      setVehicles(vehiclesRes);
      setTrainingGrounds(groundsRes);
      setBookings(bookingsRes);
    } catch (error) {
      showToast('error', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshBookings = async () => {
    try {
      const bookingsRes = await fetchBookings();
      setBookings(bookingsRes);
    } catch (error) {
      showToast('error', '刷新预约数据失败');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const handleCellClick = (date: string, hour: number, booking?: Booking) => {
    if (booking) {
      setModal({
        isOpen: true,
        modalDate: date,
        modalHour: hour,
        existingBooking: booking,
      });
      return;
    }
    if (selectedStudent) {
      const availableInstructors = instructors.filter(
        (i) => !i.isOnLeave && i.subjects.includes(selectedStudent.subject)
      );
      const availableVehicles = vehicles.filter(
        (v) => v.type === selectedStudent.subject || v.type === '通用'
      );
      setSelectedInstructorId(availableInstructors[0]?.id || '');
      setSelectedVehicleId(availableVehicles[0]?.id || '');
      setSelectedGroundId(trainingGrounds[0]?.id || '');
      setModal({
        isOpen: true,
        modalDate: date,
        modalHour: hour,
      });
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedStudent || submitting) return;

    setSubmitting(true);
    try {
      const result = await createBooking({
        studentId: selectedStudent.id,
        instructorId: selectedInstructorId,
        vehicleId: selectedVehicleId,
        groundId: selectedGroundId,
        date: modal.modalDate,
        hour: modal.modalHour,
        subject: selectedStudent.subject,
      });

      if (result.success) {
        showToast('success', '预约创建成功');
        await refreshBookings();
        setModal({ isOpen: false, modalDate: '', modalHour: 0 });
      } else {
        showToast('error', result.error || '创建预约失败');
      }
    } catch (error) {
      showToast('error', '创建预约失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!modal.existingBooking || submitting) return;

    setSubmitting(true);
    try {
      const result = await cancelBooking(modal.existingBooking.id);
      if (result.success) {
        showToast('success', '预约已取消');
        await refreshBookings();
        setModal({ isOpen: false, modalDate: '', modalHour: 0 });
      } else {
        showToast('error', '取消预约失败');
      }
    } catch (error) {
      showToast('error', '取消预约失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (weekDates.length < 7) return;

    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await exportWeeklySchedule({ start: startDate, end: endDate });

      const headers = ['日期', '时段', '学员', '科目', '教练', '车辆', '训练场'];
      const rows = data.map((b) => [
        b.date,
        `${b.hour}:00-${b.hour + 1}:00`,
        students.find((s) => s.id === b.studentId)?.name || '',
        b.subject,
        instructors.find((i) => i.id === b.instructorId)?.name || '',
        vehicles.find((v) => v.id === b.vehicleId)?.plate || '',
        trainingGrounds.find((g) => g.id === b.groundId)?.name || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `排班表_${startDate}_${endDate}.csv`;
      link.click();
      showToast('success', '导出成功');
    } catch (error) {
      showToast('error', '导出失败');
    }
  };

  const handleInstructorLeaveToggle = async (instructorId: string, isOnLeave: boolean) => {
    try {
      const result = await setInstructorLeave(instructorId, isOnLeave);
      const instructor = instructors.find((i) => i.id === instructorId);

      if (isOnLeave) {
        showToast(
          'info',
          `教练${instructor?.name}已休假，已释放 ${result.releasedBookings.length} 个预约，通知 ${result.notifiedStudents.length} 位学员`
        );
      } else {
        showToast('success', `教练${instructor?.name}已恢复上班`);
      }

      await Promise.all([refreshBookings(), fetchInstructors().then(setInstructors)]);
    } catch (error) {
      showToast('error', '操作失败');
    }
  };

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name || '';
  const getInstructorName = (id: string) => instructors.find((i) => i.id === id)?.name || '';
  const getVehiclePlate = (id: string) => vehicles.find((v) => v.id === id)?.plate || '';
  const getGroundName = (id: string) => trainingGrounds.find((g) => g.id === id)?.name || '';

  const availableInstructors = selectedStudent
    ? instructors.filter((i) => !i.isOnLeave && i.subjects.includes(selectedStudent.subject))
    : [];
  const availableVehicles = selectedStudent
    ? vehicles.filter((v) => v.type === selectedStudent.subject || v.type === '通用')
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        weekRangeStr={weekRangeStr}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onExport={handleExport}
        onOpenInstructors={() => setInstructorModalOpen(true)}
      />

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">加载数据中...</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="w-72 flex-shrink-0">
              <StudentList
                students={students}
                selectedStudent={selectedStudent}
                onSelect={setSelectedStudent}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <div className="flex-1">
              <WeeklyView
                weekDates={weekDates}
                bookings={bookings}
                students={students}
                instructors={instructors}
                vehicles={vehicles}
                trainingGrounds={trainingGrounds}
                selectedStudent={selectedStudent}
                onCellClick={handleCellClick}
              />
            </div>
          </div>
        )}
      </main>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {modal.existingBooking ? '预约详情' : '创建预约'}
                </h2>
                <button
                  onClick={() => setModal({ isOpen: false, modalDate: '', modalHour: 0 })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">
                    {formatDateDisplay(new Date(modal.modalDate))}
                  </div>
                  <div className="text-sm text-gray-500">{modal.modalHour}:00 - {modal.modalHour + 1}:00</div>
                </div>
              </div>

              {modal.existingBooking ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">学员</div>
                      <div className="font-medium text-gray-900">
                        {getStudentName(modal.existingBooking.studentId)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${modal.existingBooking.subject === '科目二' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                      <span className={`text-xs font-bold ${modal.existingBooking.subject === '科目二' ? 'text-blue-700' : 'text-orange-700'}`}>
                        {modal.existingBooking.subject === '科目二' ? '2' : '3'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">科目</div>
                      <div className="font-medium text-gray-900">{modal.existingBooking.subject}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">教练</div>
                      <div className="font-medium text-gray-900">
                        {getInstructorName(modal.existingBooking.instructorId)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">车辆</div>
                      <div className="font-medium text-gray-900">
                        {getVehiclePlate(modal.existingBooking.vehicleId)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">训练场</div>
                      <div className="font-medium text-gray-900">
                        {getGroundName(modal.existingBooking.groundId)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                selectedStudent && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          {selectedStudent.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{selectedStudent.name}</div>
                          <div className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${selectedStudent.subject === '科目二' ? 'bg-blue-200 text-blue-800' : 'bg-orange-200 text-orange-800'}`}>
                            {selectedStudent.subject}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">选择教练</label>
                      <select
                        value={selectedInstructorId}
                        onChange={(e) => setSelectedInstructorId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {availableInstructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">选择车辆</label>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {availableVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate} ({v.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">选择训练场</label>
                      <select
                        value={selectedGroundId}
                        onChange={(e) => setSelectedGroundId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {trainingGrounds.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setModal({ isOpen: false, modalDate: '', modalHour: 0 })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
                >
                  取消
                </button>
                {modal.existingBooking ? (
                  <button
                    onClick={handleCancelBooking}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {submitting ? '取消中...' : '取消预约'}
                  </button>
                ) : (
                  <button
                    onClick={handleCreateBooking}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {submitting ? '创建中...' : '确认预约'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {instructorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">教练管理</h2>
                <button
                  onClick={() => setInstructorModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {instructors.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{inst.name}</div>
                      <div className="text-sm text-gray-500">
                        {inst.subjects.join('、')}
                        {inst.isOnLeave && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            休假中
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inst.isOnLeave}
                        onChange={(e) => handleInstructorLeaveToggle(inst.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        {inst.isOnLeave ? '休假' : '上班'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
          >
            {toast.type === 'success' && <Check className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Bell className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
