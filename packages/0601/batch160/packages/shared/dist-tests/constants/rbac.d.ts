import { RolePermission, UserRole } from '../types';
export declare const ROLE_PERMISSIONS: RolePermission[];
export declare const hasPermission: (userRole: UserRole, resource: string, action: string) => boolean;
export declare const canAccessArea: (userAreas: string[], targetArea: string) => boolean;
export declare const WORK_ORDER_STATUS_LABELS: Record<string, string>;
export declare const WORK_ORDER_PRIORITY_LABELS: Record<string, string>;
export declare const WORK_ORDER_STATUS_COLORS: Record<string, string>;
