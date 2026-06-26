export const ROLE_PERMISSIONS = [
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
export const hasPermission = (userRole, resource, action) => {
    const rolePerm = ROLE_PERMISSIONS.find(p => p.role === userRole);
    if (!rolePerm)
        return false;
    const resourcePerm = rolePerm.permissions.find(p => p.resource === resource);
    if (!resourcePerm)
        return false;
    return resourcePerm.actions.includes(action);
};
export const canAccessArea = (userAreas, targetArea) => {
    if (userAreas.includes('*'))
        return true;
    return userAreas.includes(targetArea);
};
export const WORK_ORDER_STATUS_LABELS = {
    pending: '待分配',
    assigned: '已分配',
    in_progress: '整改中',
    submitted: '待复检',
    verified: '已复检',
    closed: '已关闭',
};
export const WORK_ORDER_PRIORITY_LABELS = {
    high: '高',
    medium: '中',
    low: '低',
};
export const WORK_ORDER_STATUS_COLORS = {
    pending: '#FF7D00',
    assigned: '#165DFF',
    in_progress: '#722ED1',
    submitted: '#FF7D00',
    verified: '#00B42A',
    closed: '#86909C',
};
//# sourceMappingURL=rbac.js.map