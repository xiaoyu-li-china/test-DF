import type { Student, Instructor, Vehicle, TrainingGround, Booking, Notification } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const students: Student[] = [
  { id: 's001', name: '张伟', subject: '科目二', phone: '13800138001', noShowCount: 0, isRestricted: false, preferredInstructorId: 'i001' },
  { id: 's002', name: '李娜', subject: '科目三', phone: '13800138002', noShowCount: 1, isRestricted: false },
  { id: 's003', name: '王磊', subject: '科目二', phone: '13800138003', noShowCount: 3, isRestricted: true, preferredInstructorId: 'i003' },
  { id: 's004', name: '赵敏', subject: '科目三', phone: '13800138004', noShowCount: 0, isRestricted: false, preferredInstructorId: 'i002' },
  { id: 's005', name: '刘洋', subject: '科目二', phone: '13800138005', noShowCount: 4, isRestricted: true },
  { id: 's006', name: '陈静', subject: '科目三', phone: '13800138006', noShowCount: 2, isRestricted: false },
  { id: 's007', name: '杨帆', subject: '科目二', phone: '13800138007', noShowCount: 0, isRestricted: false, preferredInstructorId: 'i001' },
  { id: 's008', name: '黄丽', subject: '科目三', phone: '13800138008', noShowCount: 5, isRestricted: true },
  { id: 's009', name: '周强', subject: '科目二', phone: '13800138009', noShowCount: 1, isRestricted: false },
  { id: 's010', name: '吴芳', subject: '科目三', phone: '13800138010', noShowCount: 0, isRestricted: false, preferredInstructorId: 'i005' },
  { id: 's011', name: '孙鹏', subject: '科目二', phone: '13800138011', noShowCount: 3, isRestricted: true },
  { id: 's012', name: '马婷', subject: '科目三', phone: '13800138012', noShowCount: 0, isRestricted: false },
];

export const initialNotifications: Notification[] = [];

export const instructors: Instructor[] = [
  { id: 'i001', name: '刘教练', subjects: ['科目二'], isOnLeave: false },
  { id: 'i002', name: '张教练', subjects: ['科目三'], isOnLeave: false },
  { id: 'i003', name: '王教练', subjects: ['科目二', '科目三'], isOnLeave: false },
  { id: 'i004', name: '李教练', subjects: ['科目二'], isOnLeave: true },
  { id: 'i005', name: '赵教练', subjects: ['科目三'], isOnLeave: false },
];

export const vehicles: Vehicle[] = [
  { id: 'v001', plate: '京A·12345', type: '科目二' },
  { id: 'v002', plate: '京A·23456', type: '科目二' },
  { id: 'v003', plate: '京A·34567', type: '科目三' },
  { id: 'v004', plate: '京A·45678', type: '科目三' },
  { id: 'v005', plate: '京A·56789', type: '通用' },
  { id: 'v006', plate: '京A·67890', type: '通用' },
];

export const trainingGrounds: TrainingGround[] = [
  { id: 'g001', name: '东方驾校训练场', address: '北京市朝阳区东四环南路88号' },
  { id: 'g002', name: '金龙驾校训练场', address: '北京市海淀区西三旗北路12号' },
  { id: 'g003', name: '通达驾校训练场', address: '北京市丰台区南三环西路36号' },
];

export const initialBookings: Booking[] = [
  { id: 'b001', studentId: 's001', instructorId: 'i001', vehicleId: 'v001', groundId: 'g001', date: '2026-06-01', hour: 9, subject: '科目二' },
  { id: 'b002', studentId: 's002', instructorId: 'i002', vehicleId: 'v003', groundId: 'g001', date: '2026-06-01', hour: 10, subject: '科目三' },
  { id: 'b003', studentId: 's004', instructorId: 'i003', vehicleId: 'v005', groundId: 'g002', date: '2026-06-02', hour: 14, subject: '科目三' },
  { id: 'b004', studentId: 's007', instructorId: 'i001', vehicleId: 'v002', groundId: 'g003', date: '2026-06-03', hour: 8, subject: '科目二' },
  { id: 'b005', studentId: 's010', instructorId: 'i005', vehicleId: 'v004', groundId: 'g002', date: '2026-06-04', hour: 15, subject: '科目三' },
  { id: 'b006', studentId: 's009', instructorId: 'i003', vehicleId: 'v006', groundId: 'g001', date: '2026-06-05', hour: 9, subject: '科目二' },
];
