import { User, Store, Inspection, WorkOrder } from '../types';
declare class AuthService {
    private currentUser;
    login(userId: string): User | null;
    logout(): void;
    getCurrentUser(): User | null;
    getUsers(): User[];
    getUserById(userId: string): User | undefined;
    hasPermission(resource: string, action: string): boolean;
    canAccessStore(store: Store): boolean;
    canAccessArea(area: string): boolean;
    filterStoresByArea(stores: Store[]): Store[];
    filterInspectionsByArea(inspections: Inspection[]): Inspection[];
    filterWorkOrdersByArea(workOrders: WorkOrder[]): WorkOrder[];
    getAccessibleAreas(): string[];
}
export declare const authService: AuthService;
export {};
