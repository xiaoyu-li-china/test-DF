"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const rbac_1 = require("../constants/rbac");
const mock_1 = require("../mock");
const MOCK_USERS = [
    {
        id: 'admin001',
        name: '系统管理员',
        role: 'admin',
        phone: '13900000001',
        email: 'admin@example.com',
        areas: ['*'],
    },
    {
        id: 'am001',
        name: '朝阳区张经理',
        role: 'area_manager',
        phone: '13900000002',
        email: 'zhang.manager@example.com',
        areas: ['朝阳区'],
    },
    {
        id: 'am002',
        name: '海淀区李经理',
        role: 'area_manager',
        phone: '13900000003',
        email: 'li.manager@example.com',
        areas: ['海淀区'],
    },
    {
        id: 'i001',
        name: '王督导',
        role: 'inspector',
        phone: '13900000004',
        email: 'wang.inspector@example.com',
        areas: ['朝阳区', '海淀区', '东城区', '西城区'],
    },
];
class AuthService {
    constructor() {
        this.currentUser = null;
    }
    login(userId) {
        const user = MOCK_USERS.find((u) => u.id === userId) || null;
        if (user) {
            this.currentUser = user;
            console.log('[AuthService] 登录成功:', user.name, '角色:', user.role);
        }
        return user;
    }
    logout() {
        this.currentUser = null;
        console.log('[AuthService] 已登出');
    }
    getCurrentUser() {
        return this.currentUser;
    }
    getUsers() {
        return [...MOCK_USERS];
    }
    getUserById(userId) {
        return MOCK_USERS.find((u) => u.id === userId);
    }
    hasPermission(resource, action) {
        if (!this.currentUser)
            return false;
        return (0, rbac_1.hasPermission)(this.currentUser.role, resource, action);
    }
    canAccessStore(store) {
        if (!this.currentUser)
            return false;
        if (this.currentUser.role === 'admin')
            return true;
        return (0, rbac_1.canAccessArea)(this.currentUser.areas, store.area);
    }
    canAccessArea(area) {
        if (!this.currentUser)
            return false;
        if (this.currentUser.role === 'admin')
            return true;
        return (0, rbac_1.canAccessArea)(this.currentUser.areas, area);
    }
    filterStoresByArea(stores) {
        if (!this.currentUser)
            return [];
        if (this.currentUser.role === 'admin')
            return stores;
        return stores.filter((store) => (0, rbac_1.canAccessArea)(this.currentUser.areas, store.area));
    }
    filterInspectionsByArea(inspections) {
        if (!this.currentUser)
            return [];
        if (this.currentUser.role === 'admin')
            return inspections;
        return inspections.filter((inspection) => {
            const store = mock_1.MOCK_STORES.find((s) => s.id === inspection.storeId);
            return store ? (0, rbac_1.canAccessArea)(this.currentUser.areas, store.area) : false;
        });
    }
    filterWorkOrdersByArea(workOrders) {
        if (!this.currentUser)
            return [];
        if (this.currentUser.role === 'admin')
            return workOrders;
        return workOrders.filter((wo) => (0, rbac_1.canAccessArea)(this.currentUser.areas, wo.area));
    }
    getAccessibleAreas() {
        if (!this.currentUser)
            return [];
        if (this.currentUser.role === 'admin') {
            return ['朝阳区', '海淀区', '东城区', '西城区'];
        }
        return this.currentUser.areas;
    }
}
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map