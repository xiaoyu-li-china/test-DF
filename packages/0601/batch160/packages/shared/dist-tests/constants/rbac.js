"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORK_ORDER_STATUS_COLORS = exports.WORK_ORDER_PRIORITY_LABELS = exports.WORK_ORDER_STATUS_LABELS = exports.canAccessArea = exports.hasPermission = exports.ROLE_PERMISSIONS = void 0;
exports.ROLE_PERMISSIONS = [
    {
        role: 'admin',
        permissions: [
            { resource: 'stores', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'inspections', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'workOrders', actions: ['read', 'create', 'update', 'delete', 'assign', 'verify'] },
            { resource: 'reports', actions: ['read', 'export', 'schedule'] },
            { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'emailSchedules', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'allAreas', actions: ['read'] }
        ]
    },
    {
        role: 'area_manager',
        permissions: [
            { resource: 'stores', actions: ['read'] }
        ]
    },
    {
        role: 'inspector',
        permissions: [
            { resource: 'stores', actions: ['read'] },
            { resource: 'inspections', actions: ['read', 'create', 'update'] },
            { resource: 'workOrders', actions: ['read', 'update'] },
            { resource: 'reports', actions: ['read'] }
        ]
    }
];
const hasPermission = (userRole, resource, action) => {
    const rolePerm = exports.ROLE_PERMISSIONS.find(p => p.role === userRole);
    if (!rolePerm)
        return false;
    const resourcePerm = rolePerm.permissions.find(p => p.resource === resource);
    if (!resourcePerm)
        return false;
    return resourcePerm.actions.includes(action);
};
exports.hasPermission = hasPermission;
const canAccessArea = (userAreas, targetArea) => {
    if (userAreas.includes('*'))
        return true;
    return userAreas.includes(targetArea);
};
exports.canAccessArea = canAccessArea;
exports.WORK_ORDER_STATUS_LABELS = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '整改中',
    submitted: '待复检',
    verified: '已复检',
    closed: '已关闭',
};
exports.WORK_ORDER_PRIORITY_LABELS = {
    high: '高',
    medium: '中',
    low: '低',
};
exports.WORK_ORDER_STATUS_COLORS = {
    pending: '#FF7D00',
    assigned: '#165DFF',
    in_progress: '#722ED1',
    submitted: '#FF7D00',
    verified: '#00B42A',
    closed: '#86909C',
};
//# sourceMappingURL=rbac.js.map