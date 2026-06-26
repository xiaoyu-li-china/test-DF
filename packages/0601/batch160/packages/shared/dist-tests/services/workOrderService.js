"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workOrderService = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const utils_1 = require("../utils");
const mock_1 = require("../mock");
const inspectionService_1 = require("./inspectionService");
class WorkOrderService {
    constructor() {
        this.workOrders = [];
        this.actions = [];
        this.listeners = [];
        this.initMockWorkOrders();
    }
    initMockWorkOrders() {
        const failedInspections = mock_1.MOCK_INSPECTOR ? [] : [];
        const mockOrder = {
            id: (0, utils_1.generateId)(),
            inspectionId: (0, utils_1.generateId)(),
            storeId: 's005',
            storeName: '茶百道(三里屯店)',
            storeAddress: '北京市朝阳区三里屯太古里',
            area: '朝阳区',
            creatorId: 'admin001',
            creatorName: '系统管理员',
            assigneeId: 'i001',
            assigneeName: '王督导',
            assigneePhone: '13900000004',
            status: 'in_progress',
            priority: 'high',
            title: '三里屯店环境卫生整改',
            description: '店面清洁不达标，需在3日内完成整改',
            items: [
                {
                    id: (0, utils_1.generateId)(),
                    inspectionItemId: 's1',
                    inspectionItemName: '店面整体清洁',
                    category: '环境卫生',
                    description: '店面内外有垃圾和污渍',
                    originalScore: 4,
                    maxScore: 10,
                    deadline: (0, dayjs_1.default)().add(3, 'day').format('YYYY-MM-DD'),
                    photos: [],
                    rectificationPhotos: [],
                    status: 'pending',
                },
            ],
            createdAt: (0, dayjs_1.default)().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
            deadline: (0, dayjs_1.default)().add(3, 'day').format('YYYY-MM-DD'),
        };
        this.workOrders.push(mockOrder);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify(type) {
        this.listeners.forEach((listener) => listener(type));
    }
    createWorkOrder(data) {
        const store = mock_1.MOCK_STORES.find((s) => s.id === data.storeId);
        const inspection = inspectionService_1.inspectionService.getInspectionById(data.inspectionId);
        const workOrder = {
            id: (0, utils_1.generateId)(),
            inspectionId: data.inspectionId,
            storeId: data.storeId,
            storeName: store?.name || '',
            storeAddress: store?.address || '',
            area: store?.area || '',
            creatorId: data.creatorId,
            creatorName: data.creatorName,
            assigneeId: data.assigneeId,
            assigneeName: data.assigneeName,
            assigneePhone: data.assigneePhone,
            status: 'assigned',
            priority: data.priority,
            title: data.title,
            description: data.description,
            items: data.items.map((item) => ({
                ...item,
                id: (0, utils_1.generateId)(),
                rectificationPhotos: [],
                status: 'pending',
            })),
            createdAt: new Date().toISOString(),
            deadline: (0, dayjs_1.default)().add(data.deadlineDays || 3, 'day').format('YYYY-MM-DD'),
        };
        this.workOrders.push(workOrder);
        this.addAction({
            workOrderId: workOrder.id,
            userId: data.creatorId,
            userName: data.creatorName,
            action: 'create',
            newStatus: 'assigned',
        });
        console.log('[WorkOrderService] 创建整改工单:', workOrder.id, workOrder.title);
        this.notify('workOrder');
        return workOrder;
    }
    getWorkOrders() {
        return [...this.workOrders].sort((a, b) => (0, dayjs_1.default)(b.createdAt).isAfter((0, dayjs_1.default)(a.createdAt)) ? 1 : -1);
    }
    getWorkOrderById(id) {
        return this.workOrders.find((wo) => wo.id === id);
    }
    getWorkOrdersByStore(storeId) {
        return this.workOrders
            .filter((wo) => wo.storeId === storeId)
            .sort((a, b) => (0, dayjs_1.default)(b.createdAt).isAfter((0, dayjs_1.default)(a.createdAt)) ? 1 : -1);
    }
    getWorkOrdersByAssignee(assigneeId) {
        return this.workOrders
            .filter((wo) => wo.assigneeId === assigneeId)
            .sort((a, b) => (0, dayjs_1.default)(b.createdAt).isAfter((0, dayjs_1.default)(a.createdAt)) ? 1 : -1);
    }
    getWorkOrdersByStatus(status) {
        return this.workOrders
            .filter((wo) => wo.status === status)
            .sort((a, b) => (0, dayjs_1.default)(b.createdAt).isAfter((0, dayjs_1.default)(a.createdAt)) ? 1 : -1);
    }
    updateWorkOrderStatus(workOrderId, newStatus, userId, userName, remark) {
        const workOrder = this.workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder)
            return false;
        const oldStatus = workOrder.status;
        workOrder.status = newStatus;
        workOrder.updatedAt = new Date().toISOString();
        if (newStatus === 'submitted') {
            workOrder.rectifiedAt = new Date().toISOString();
        }
        else if (newStatus === 'verified') {
            workOrder.verifiedAt = new Date().toISOString();
        }
        else if (newStatus === 'closed') {
            workOrder.closedAt = new Date().toISOString();
        }
        const actionMap = {
            pending: null,
            assigned: 'assign',
            in_progress: 'start',
            submitted: 'submit',
            verified: 'verify',
            closed: 'close',
        };
        const action = actionMap[newStatus];
        if (action) {
            this.addAction({
                workOrderId,
                userId,
                userName,
                action,
                oldStatus,
                newStatus,
                remark,
            });
        }
        console.log('[WorkOrderService] 工单状态变更:', workOrderId, oldStatus, '→', newStatus);
        this.notify('workOrder');
        this.notify('action');
        return true;
    }
    submitRectification(workOrderId, userId, userName, itemUpdates) {
        const workOrder = this.workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder)
            return false;
        itemUpdates.forEach((update) => {
            const item = workOrder.items.find((i) => i.id === update.itemId);
            if (item) {
                item.rectificationPhotos = [...item.rectificationPhotos, ...update.photos];
                item.remark = update.remark || item.remark;
                item.status = 'rectified';
            }
        });
        return this.updateWorkOrderStatus(workOrderId, 'submitted', userId, userName, '提交整改完成');
    }
    verifyRectification(workOrderId, userId, userName, passed, remark) {
        const workOrder = this.workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder)
            return false;
        if (passed) {
            workOrder.items.forEach((item) => {
                item.status = 'verified';
            });
            return this.updateWorkOrderStatus(workOrderId, 'verified', userId, userName, remark);
        }
        else {
            workOrder.items.forEach((item) => {
                item.status = 'pending';
            });
            this.addAction({
                workOrderId,
                userId,
                userName,
                action: 'reject',
                oldStatus: workOrder.status,
                newStatus: 'in_progress',
                remark: remark || '复检不通过，需重新整改',
            });
            workOrder.status = 'in_progress';
            this.notify('workOrder');
            return true;
        }
    }
    addAction(data) {
        const action = {
            id: (0, utils_1.generateId)(),
            workOrderId: data.workOrderId,
            userId: data.userId,
            userName: data.userName,
            action: data.action,
            timestamp: new Date().toISOString(),
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
            remark: data.remark,
        };
        this.actions.push(action);
    }
    getActionsByWorkOrder(workOrderId) {
        return this.actions
            .filter((a) => a.workOrderId === workOrderId)
            .sort((a, b) => (0, dayjs_1.default)(a.timestamp).isAfter((0, dayjs_1.default)(b.timestamp)) ? 1 : -1);
    }
    getOverdueWorkOrders() {
        const today = (0, utils_1.formatDate)(new Date().toISOString());
        return this.workOrders.filter((wo) => wo.deadline < today && wo.status !== 'closed' && wo.status !== 'verified');
    }
}
exports.workOrderService = new WorkOrderService();
//# sourceMappingURL=workOrderService.js.map