import type { Student, Instructor, Vehicle, TrainingGround, Booking, Notification } from './types';
import { students as initialStudents, instructors as initialInstructors, vehicles as initialVehicles, trainingGrounds as initialTrainingGrounds, initialBookings, initialNotifications } from './mockData';

let bookings: Booking[] = [...initialBookings];
let instructors: Instructor[] = [...initialInstructors];
let students: Student[] = [...initialStudents];
let notifications: Notification[] = [...initialNotifications];

function randomDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 101) + 50;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export async function fetchStudents(): Promise<Student[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return students;
}

export async function fetchInstructors(): Promise<Instructor[]> {
  await randomDelay();
  return instructors;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  await randomDelay();
  return initialVehicles;
}

export async function fetchTrainingGrounds(): Promise<TrainingGround[]> {
  await randomDelay();
  return initialTrainingGrounds;
}

export async function fetchBookings(): Promise<Booking[]> {
  await randomDelay();
  return bookings;
}

export async function fetchNotifications(studentId: string): Promise<Notification[]> {
  await randomDelay();
  return notifications.filter(n => n.studentId === studentId);
}

export async function createBooking(booking: Omit<Booking, 'id'>): Promise<{ success: boolean; error?: string }> {
  await randomDelay();

  const instructorBooked = bookings.some(
    b => b.instructorId === booking.instructorId && b.date === booking.date && b.hour === booking.hour
  );
  if (instructorBooked) {
    return { success: false, error: '该教练此时段已有预约' };
  }

  const vehicleBooked = bookings.some(
    b => b.vehicleId === booking.vehicleId && b.date === booking.date && b.hour === booking.hour
  );
  if (vehicleBooked) {
    return { success: false, error: '该车辆此时段已有预约' };
  }

  const studentBooked = bookings.some(
    b => b.studentId === booking.studentId && b.date === booking.date && b.hour === booking.hour
  );
  if (studentBooked) {
    return { success: false, error: '该学员此时段已有预约' };
  }

  const student = students.find(s => s.id === booking.studentId);
  if (student && student.isRestricted) {
    return { success: false, error: '该学员因爽约次数过多，已被限制预约' };
  }

  const instructor = instructors.find(i => i.id === booking.instructorId);
  if (instructor && instructor.isOnLeave) {
    return { success: false, error: '该教练正在休假' };
  }

  const vehicle = initialVehicles.find(v => v.id === booking.vehicleId);
  if (vehicle) {
    if (booking.subject === '科目二' && vehicle.type !== '科目二' && vehicle.type !== '通用') {
      return { success: false, error: '车辆类型与科目不匹配' };
    }
    if (booking.subject === '科目三' && vehicle.type !== '科目三' && vehicle.type !== '通用') {
      return { success: false, error: '车辆类型与科目不匹配' };
    }
  }

  const newBooking: Booking = {
    ...booking,
    id: `b${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  bookings.push(newBooking);
  return { success: true };
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean }> {
  await randomDelay();
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    bookings.splice(index, 1);
    return { success: true };
  }
  return { success: false };
}

export async function setInstructorLeave(
  instructorId: string,
  isOnLeave: boolean
): Promise<{ releasedBookings: Booking[]; notifiedStudents: string[] }> {
  await randomDelay();

  const instructor = instructors.find(i => i.id === instructorId);
  if (!instructor) {
    return { releasedBookings: [], notifiedStudents: [] };
  }

  instructor.isOnLeave = isOnLeave;

  const releasedBookings: Booking[] = [];
  const notifiedStudentIds: string[] = [];

  if (isOnLeave) {
    const toRemove = bookings.filter(b => b.instructorId === instructorId);
    for (const booking of toRemove) {
      const index = bookings.findIndex(b => b.id === booking.id);
      if (index !== -1) {
        bookings.splice(index, 1);
      }
      releasedBookings.push(booking);
      if (!notifiedStudentIds.includes(booking.studentId)) {
        notifiedStudentIds.push(booking.studentId);
      }
    }

    for (const studentId of notifiedStudentIds) {
      notifications.push({
        id: `n${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        studentId,
        message: `教练${instructor.name}已休假，您的预约已自动取消`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  }

  return { releasedBookings, notifiedStudents: notifiedStudentIds };
}

export async function reportNoShow(studentId: string): Promise<Student> {
  await randomDelay();

  const student = students.find(s => s.id === studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  student.noShowCount = (student.noShowCount ?? 0) + 1;
  if (student.noShowCount >= 3) {
    student.isRestricted = true;
  }

  return student;
}

export async function exportWeeklySchedule(dateRange: { start: string; end: string }): Promise<Booking[]> {
  await randomDelay();
  return bookings.filter(b => b.date >= dateRange.start && b.date <= dateRange.end);
}
