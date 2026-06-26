import { WorkOrder, WorkOrderStatus, WorkOrderPriority, RectificationItem, WorkOrderAction } from '../types';
declare class WorkOrderService {
    private workOrders;
    private actions;
    private listeners;
    constructor();
    private initMockWorkOrders;
    subscribe(listener: (type: 'workOrder' | 'action') => void): () => void;
    private notify;
    createWorkOrder(data: {
        inspectionId: string;
        storeId: string;
        title: string;
        description: string;
        priority: WorkOrderPriority;
        items: Omit<RectificationItem, 'id' | 'status' | 'rectificationPhotos'>[];
        assigneeId: string;
        assigneeName: string;
        assigneePhone: string;
        creatorId: string;
        creatorName: string;
        deadlineDays?: number;
    }): WorkOrder;
    getWorkOrders(): WorkOrder[];
    getWorkOrderById(id: string): WorkOrder | undefined;
    getWorkOrdersByStore(storeId: string): WorkOrder[];
    getWorkOrdersByAssignee(assigneeId: string): WorkOrder[];
    getWorkOrdersByStatus(status: WorkOrderStatus): WorkOrder[];
    updateWorkOrderStatus(workOrderId: string, newStatus: WorkOrderStatus, userId: string, userName: string, remark?: string): boolean;
    submitRectification(workOrderId: string, userId: string, userName: string, itemUpdates: Array<{
        itemId: string;
        photos: string[];
        remark?: string;
    }>): boolean;
    verifyRectification(workOrderId: string, userId: string, userName: string, passed: boolean, remark?: string): boolean;
    private addAction;
    getActionsByWorkOrder(workOrderId: string): WorkOrderAction[];
    getOverdueWorkOrders(): WorkOrder[];
}
export declare const workOrderService: WorkOrderService;
export {};
