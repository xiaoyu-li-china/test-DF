export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type InspectionResult = 'pass' | 'fail' | 'pending';

export type ScoreLevel = 'excellent' | 'good' | 'average' | 'poor';

export type UserRole = 'admin' | 'area_manager' | 'inspector';

export type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'submitted' | 'verified' | 'closed';

export type WorkOrderPriority = 'high' | 'medium' | 'low';

export type EmailScheduleStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
  areas: string[];
  avatar?: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  area: string;
  joinDate: string;
  avatar?: string;
  averageScore: number;
  inspectionCount: number;
}

export interface Inspector {
  id: string;
  name: string;
  avatar?: string;
  role: 'inspector' | 'admin';
  phone: string;
  area: string;
  todayCompleted: number;
  todayTotal: number;
}

export interface InspectionItem {
  id: string;
  category: string;
  name: string;
  description: string;
  maxScore: number;
  required: boolean;
  needPhoto: boolean;
}

export interface InspectionCategory {
  id: string;
  name: string;
  items: InspectionItem[];
}

export interface InspectionPhoto {
  id: string;
  itemId: string;
  url: string;
  thumbnail?: string;
  uploadTime: string;
  remark?: string;
}

export interface InspectionScore {
  itemId: string;
  score: number;
  remark?: string;
  photos: InspectionPhoto[];
}

export interface Inspection {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  inspectorId: string;
  inspectorName: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  status: InspectionStatus;
  result: InspectionResult;
  totalScore: number;
  maxScore: number;
  categories: InspectionCategory[];
  scores: InspectionScore[];
  photos: InspectionPhoto[];
  createdAt: string;
  updatedAt: string;
  remark?: string;
}

export interface InspectionSummary {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  inspectorName: string;
  scheduledDate: string;
  status: InspectionStatus;
  totalScore: number;
  maxScore: number;
  scoreLevel: ScoreLevel;
}

export interface StoreRanking {
  rank: number;
  storeId: string;
  storeName: string;
  area: string;
  averageScore: number;
  inspectionCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MonthlyReport {
  month: string;
  totalInspections: number;
  completedInspections: number;
  averageScore: number;
  passRate: number;
  storeRankings: StoreRanking[];
  areaStatistics: AreaStatistic[];
}

export interface AreaStatistic {
  area: string;
  storeCount: number;
  inspectionCount: number;
  averageScore: number;
  passRate: number;
}

export interface AuditRecord {
  id: string;
  inspectionId: string;
  storeId: string;
  storeName: string;
  inspectorId: string;
  inspectorName: string;
  action: 'create' | 'update' | 'submit' | 'reject' | 'resubmit';
  beforeScore?: number;
  afterScore?: number;
  timestamp: string;
  remark?: string;
  version: number;
}

export interface InspectionSubmissionData {
  inspectionId: string;
  scores: InspectionScore[];
  photos: InspectionPhoto[];
  totalScore: number;
  remark?: string;
}

export interface RectificationItem {
  id: string;
  inspectionItemId: string;
  inspectionItemName: string;
  category: string;
  description: string;
  originalScore: number;
  maxScore: number;
  deadline: string;
  photos: string[];
  rectificationPhotos: string[];
  remark?: string;
  status: 'pending' | 'rectified' | 'verified';
}

export interface WorkOrder {
  id: string;
  inspectionId: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  area: string;
  creatorId: string;
  creatorName: string;
  assigneeId: string;
  assigneeName: string;
  assigneePhone: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  title: string;
  description: string;
  items: RectificationItem[];
  createdAt: string;
  updatedAt?: string;
  deadline: string;
  rectifiedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
  remark?: string;
}

export interface WorkOrderAction {
  id: string;
  workOrderId: string;
  userId: string;
  userName: string;
  action: 'create' | 'assign' | 'start' | 'submit' | 'verify' | 'close' | 'reject';
  timestamp: string;
  remark?: string;
  oldStatus?: WorkOrderStatus;
  newStatus?: WorkOrderStatus;
}

export interface EmailSchedule {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  subject: string;
  enabled: boolean;
  lastSentAt?: string;
  nextSendAt: string;
  createdAt: string;
  createdBy: string;
}

export interface EmailLog {
  id: string;
  scheduleId: string;
  subject: string;
  recipients: string[];
  status: EmailScheduleStatus;
  sentAt: string;
  errorMessage?: string;
  reportMonth?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}
