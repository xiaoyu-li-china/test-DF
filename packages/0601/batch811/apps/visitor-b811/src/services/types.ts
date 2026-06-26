export interface Visitor {
  id: string;
  name: string;
  idNumber: string;
  phone: string;
  visitType: string;
  hostName: string;
  hostDepartment: string;
  visitPurpose: string;
  visitDate: string;
  visitStartTime: string;
  visitEndTime: string;
  queueNumber: string;
  createdAt: Date;
}

export interface VisitorFormData {
  name: string;
  idNumber: string;
  phone: string;
  visitType: string;
  hostName: string;
  hostDepartment: string;
  visitPurpose: string;
  visitStartTime: string;
  visitEndTime: string;
}

export interface FormErrors {
  name?: string;
  idNumber?: string;
  phone?: string;
  visitType?: string;
  hostName?: string;
  hostDepartment?: string;
  visitPurpose?: string;
  visitStartTime?: string;
  visitEndTime?: string;
  conflict?: string;
}

export interface IdCardInfo {
  name: string;
  idNumber: string;
  gender: string;
  birth: string;
  address: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingVisitors: Visitor[];
  message: string;
}
