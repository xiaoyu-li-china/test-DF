export type Subject = '科目二' | '科目三';

export interface Student {
  id: string;
  name: string;
  subject: Subject;
  phone: string;
  noShowCount: number;
  isRestricted: boolean;
  preferredInstructorId?: string;
}

export interface Instructor {
  id: string;
  name: string;
  subjects: Subject[];
  isOnLeave: boolean;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: '科目二' | '科目三' | '通用';
}

export interface TrainingGround {
  id: string;
  name: string;
  address: string;
}

export interface Booking {
  id: string;
  studentId: string;
  instructorId: string;
  vehicleId: string;
  groundId: string;
  date: string;
  hour: number;
  subject: Subject;
}

export interface Notification {
  id: string;
  studentId: string;
  message: string;
  timestamp: string;
  read: boolean;
}
