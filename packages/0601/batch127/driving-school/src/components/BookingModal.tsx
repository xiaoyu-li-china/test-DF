import { useState, useEffect, useMemo } from 'react';
import type { Student, Instructor, Vehicle, TrainingGround, Booking } from '../types';
import { Calendar, Clock, UserCheck, Car, MapPin, X, Check, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  date: string;
  hour: number;
  instructors: Instructor[];
  vehicles: Vehicle[];
  trainingGrounds: TrainingGround[];
  bookings: Booking[];
  onCreate: (data: Omit<Booking, 'id'>) => Promise<{ success: boolean; error?: string }>;
  onCancel: (bookingId: string) => Promise<boolean>;
  existingBooking?: Booking | null;
}

interface BookingModalContentProps extends BookingModalProps {
  onClose: () => void;
}

function BookingModalContent(props: BookingModalContentProps) {
  const {
    isOpen,
    onClose,
    student,
    date,
    hour,
    instructors,
    vehicles,
    trainingGrounds,
    bookings,
    onCreate,
    onCancel,
    existingBooking,
  } = props;

  const isEditing = !!existingBooking;

  const filteredInstructors = useMemo(() => {
    if (!student) return [];

    const bookedInstructorIds = bookings
      .filter((b) => b.date === date && b.hour === hour && (!existingBooking || b.id !== existingBooking.id))
      .map((b) => b.instructorId);

    let available = instructors.filter(
      (inst) =>
        !inst.isOnLeave &&
        !bookedInstructorIds.includes(inst.id) &&
        inst.subjects.includes(student.subject)
    );

    if (student.preferredInstructorId) {
      available = available.sort((a, b) => {
        if (a.id === student.preferredInstructorId) return -1;
        if (b.id === student.preferredInstructorId) return 1;
        return 0;
      });
    }

    return available;
  }, [instructors, bookings, date, hour, student, existingBooking]);

  const filteredVehicles = useMemo(() => {
    if (!student) return [];

    const bookedVehicleIds = bookings
      .filter((b) => b.date === date && b.hour === hour && (!existingBooking || b.id !== existingBooking.id))
      .map((b) => b.vehicleId);

    const subject = student.subject;
    return vehicles.filter(
      (v) =>
        !bookedVehicleIds.includes(v.id) &&
        (v.type === subject || v.type === '通用')
    );
  }, [vehicles, bookings, date, hour, student, existingBooking]);

  const initialInstructorId = existingBooking
    ? existingBooking.instructorId
    : filteredInstructors.length > 0
    ? filteredInstructors[0].id
    : '';

  const initialVehicleId = existingBooking
    ? existingBooking.vehicleId
    : filteredVehicles.length > 0
    ? filteredVehicles[0].id
    : '';

  const initialGroundId = existingBooking
    ? existingBooking.groundId
    : trainingGrounds.length > 0
    ? trainingGrounds[0].id
    : '';

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(initialInstructorId);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId);
  const [selectedGroundId, setSelectedGroundId] = useState<string>(initialGroundId);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const timeSlot = `${hour}:00-${hour + 1}:00`;

  if (!isOpen || !student) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    const data: Omit<Booking, 'id'> = {
      studentId: student.id,
      instructorId: selectedInstructorId,
      vehicleId: selectedVehicleId,
      groundId: selectedGroundId,
      date,
      hour,
      subject: student.subject,
    };

    const result = await onCreate(data);
    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || '预约失败，请重试');
    }
  };

  const handleCancel = async () => {
    if (!existingBooking) return;
    setLoading(true);
    const success = await onCancel(existingBooking.id);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  const getInstructorName = (id: string) => {
    const inst = instructors.find((i) => i.id === id);
    if (!inst) return '';
    const isPreferred = student?.preferredInstructorId === id;
    return `${inst.name}${isPreferred ? ' (指定教练)' : ''}`;
  };

  const getVehiclePlate = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v?.plate || '';
  };

  const getGroundName = (id: string) => {
    const g = trainingGrounds.find((g) => g.id === id);
    return g?.name || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            {isEditing ? '预约详情' : '预约确认'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {student.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{student.name}</p>
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    student.subject === '科目二'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {student.subject}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{timeSlot}</span>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  选择教练
                </label>
                <select
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {filteredInstructors.length === 0 ? (
                    <option value="">暂无可用教练</option>
                  ) : (
                    filteredInstructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {getInstructorName(inst.id)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Car className="w-4 h-4 text-gray-400" />
                  选择车辆
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {filteredVehicles.length === 0 ? (
                    <option value="">暂无可用车辆</option>
                  ) : (
                    filteredVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} ({v.type})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  选择训练场
                </label>
                <select
                  value={selectedGroundId}
                  onChange={(e) => setSelectedGroundId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {trainingGrounds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  培训科目
                </label>
                <div
                  className={`w-full px-4 py-2.5 rounded-lg font-medium ${
                    student.subject === '科目二'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}
                >
                  {student.subject}
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  <span>教练</span>
                </div>
                <span className="font-medium text-gray-900">
                  {getInstructorName(existingBooking.instructorId)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span>车辆</span>
                </div>
                <span className="font-medium text-gray-900">
                  {getVehiclePlate(existingBooking.vehicleId)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>训练场</span>
                </div>
                <span className="font-medium text-gray-900">
                  {getGroundName(existingBooking.groundId)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
          {isEditing && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-4 h-4" />
              取消预约
            </button>
          )}
          {!isEditing && (
            <button
              onClick={handleCreate}
              disabled={
                loading ||
                !selectedInstructorId ||
                !selectedVehicleId ||
                !selectedGroundId
              }
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              确认预约
            </button>
          )}
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookingModal(props: BookingModalProps) {
  const { isOpen } = props;
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setMountKey((k) => k + 1);
    }
  }, [isOpen]);

  return <BookingModalContent key={mountKey} {...props} />;
}
