"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionService = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const utils_1 = require("../utils");
const mock_1 = require("../mock");
class InspectionService {
    constructor() {
        this.inspections = [...mock_1.MOCK_INSPECTIONS];
        this.stores = [...mock_1.MOCK_STORES];
        this.auditRecords = [];
        this.listeners = [];
        this.initAuditRecords();
    }
    initAuditRecords() {
        this.inspections.forEach((inspection) => {
            if (inspection.status === 'completed') {
                this.auditRecords.push({
                    id: (0, utils_1.generateId)(),
                    inspectionId: inspection.id,
                    storeId: inspection.storeId,
                    storeName: inspection.storeName,
                    inspectorId: inspection.inspectorId,
                    inspectorName: inspection.inspectorName,
                    action: 'submit',
                    beforeScore: 0,
                    afterScore: inspection.totalScore,
                    timestamp: inspection.endTime || inspection.updatedAt,
                    version: 1,
                });
            }
        });
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
    getInspections() {
        return [...this.inspections];
    }
    getInspectionById(id) {
        return this.inspections.find((i) => i.id === id);
    }
    getInspectionsByDate(date) {
        return this.inspections.filter((i) => i.scheduledDate === date);
    }
    getInspectionsByStoreAndDate(storeId, date) {
        return this.inspections.filter((i) => i.storeId === storeId && i.scheduledDate === date);
    }
    canSubmitInspection(storeId, date) {
        const existing = this.getInspectionsByStoreAndDate(storeId, date).filter((i) => i.status === 'completed');
        if (existing.length > 0) {
            const lastAudit = this.getAuditRecordsByInspection(existing[0].id)
                .filter((a) => a.action === 'submit' || a.action === 'resubmit')
                .sort((a, b) => b.version - a.version)[0];
            return {
                allowed: false,
                reason: `该门店今日已完成巡检（版本 ${lastAudit?.version || 1}），如需修改请使用重新提交功能`,
                existingVersion: lastAudit?.version || 1,
            };
        }
        return { allowed: true };
    }
    submitInspection(data) {
        const inspection = this.inspections.find((i) => i.id === data.inspectionId);
        if (!inspection) {
            return { success: false, message: '巡检记录不存在' };
        }
        const today = (0, utils_1.formatDate)(new Date().toISOString());
        const checkResult = this.canSubmitInspection(inspection.storeId, inspection.scheduledDate);
        if (!checkResult.allowed && inspection.status === 'completed') {
            return { success: false, message: checkResult.reason || '该门店今日已完成巡检' };
        }
        const beforeScore = inspection.totalScore;
        const version = this.getNextVersion(inspection.id);
        inspection.status = 'completed';
        inspection.result = data.totalScore >= 60 ? 'pass' : 'fail';
        inspection.totalScore = data.totalScore;
        inspection.scores = data.scores;
        inspection.photos = data.photos;
        inspection.endTime = new Date().toISOString();
        inspection.updatedAt = new Date().toISOString();
        inspection.remark = data.remark || inspection.remark;
        this.updateStoreAverageScore(inspection.storeId);
        const auditRecord = {
            id: (0, utils_1.generateId)(),
            inspectionId: inspection.id,
            storeId: inspection.storeId,
            storeName: inspection.storeName,
            inspectorId: mock_1.MOCK_INSPECTOR.id,
            inspectorName: mock_1.MOCK_INSPECTOR.name,
            action: beforeScore > 0 ? 'resubmit' : 'submit',
            beforeScore,
            afterScore: data.totalScore,
            timestamp: new Date().toISOString(),
            remark: data.remark,
            version,
        };
        this.auditRecords.push(auditRecord);
        console.log('[InspectionService] 提交巡检:', {
            inspectionId: data.inspectionId,
            storeName: inspection.storeName,
            score: data.totalScore,
            version,
            beforeScore,
        });
        this.notify('inspection');
        this.notify('audit');
        this.notify('store');
        return { success: true, message: '提交成功', auditRecord };
    }
    getNextVersion(inspectionId) {
        const records = this.auditRecords.filter((r) => r.inspectionId === inspectionId && (r.action === 'submit' || r.action === 'resubmit'));
        return records.length + 1;
    }
    updateStoreAverageScore(storeId) {
        const storeInspections = this.inspections.filter((i) => i.storeId === storeId && i.status === 'completed');
        const store = this.stores.find((s) => s.id === storeId);
        if (store && storeInspections.length > 0) {
            const totalScore = storeInspections.reduce((sum, i) => sum + i.totalScore, 0);
            store.averageScore = Math.round(totalScore / storeInspections.length);
            store.inspectionCount = storeInspections.length;
        }
    }
    getAuditRecords() {
        return [...this.auditRecords].sort((a, b) => (0, dayjs_1.default)(b.timestamp).isAfter((0, dayjs_1.default)(a.timestamp)) ? 1 : -1);
    }
    getAuditRecordsByStore(storeId) {
        return this.auditRecords
            .filter((r) => r.storeId === storeId)
            .sort((a, b) => (0, dayjs_1.default)(b.timestamp).isAfter((0, dayjs_1.default)(a.timestamp)) ? 1 : -1);
    }
    getAuditRecordsByInspection(inspectionId) {
        return this.auditRecords
            .filter((r) => r.inspectionId === inspectionId)
            .sort((a, b) => a.version - b.version);
    }
    getStoreRankings() {
        const sortedStores = [...this.stores].sort((a, b) => b.averageScore - a.averageScore);
        return sortedStores.map((store, index) => {
            const prevRanking = [...this.stores]
                .sort((a, b) => b.averageScore - 1 - a.averageScore)
                .findIndex((s) => s.id === store.id);
            let trend = 'stable';
            if (index < prevRanking)
                trend = 'up';
            else if (index > prevRanking)
                trend = 'down';
            return {
                rank: index + 1,
                storeId: store.id,
                storeName: store.name,
                area: store.area,
                averageScore: store.averageScore,
                inspectionCount: store.inspectionCount,
                trend,
            };
        });
    }
    getMonthlyReport(month) {
        const monthInspections = this.inspections.filter((i) => i.scheduledDate.startsWith(month));
        const completedInspections = monthInspections.filter((i) => i.status === 'completed');
        const totalScore = completedInspections.reduce((sum, i) => sum + i.totalScore, 0);
        const averageScore = completedInspections.length > 0
            ? Math.round((totalScore / completedInspections.length) * 10) / 10
            : 0;
        const passCount = completedInspections.filter((i) => i.result === 'pass').length;
        const passRate = completedInspections.length > 0
            ? Math.round((passCount / completedInspections.length) * 1000) / 10
            : 0;
        const areaMap = new Map();
        this.stores.forEach((store) => {
            if (!areaMap.has(store.area)) {
                areaMap.set(store.area, { stores: new Set(), inspections: [] });
            }
            areaMap.get(store.area).stores.add(store.id);
        });
        completedInspections.forEach((inspection) => {
            const store = this.stores.find((s) => s.id === inspection.storeId);
            if (store && areaMap.has(store.area)) {
                areaMap.get(store.area).inspections.push(inspection);
            }
        });
        const areaStatistics = [];
        areaMap.forEach((data, area) => {
            const areaTotalScore = data.inspections.reduce((sum, i) => sum + i.totalScore, 0);
            const areaPassCount = data.inspections.filter((i) => i.result === 'pass').length;
            areaStatistics.push({
                area,
                storeCount: data.stores.size,
                inspectionCount: data.inspections.length,
                averageScore: data.inspections.length > 0
                    ? Math.round(areaTotalScore / data.inspections.length)
                    : 0,
                passRate: data.inspections.length > 0
                    ? Math.round((areaPassCount / data.inspections.length) * 100)
                    : 0,
            });
        });
        return {
            month,
            totalInspections: monthInspections.length,
            completedInspections: completedInspections.length,
            averageScore,
            passRate,
            storeRankings: this.getStoreRankings(),
            areaStatistics: areaStatistics.sort((a, b) => b.inspectionCount - a.inspectionCount),
        };
    }
    exportReportToCSV(month) {
        const report = this.getMonthlyReport(month);
        const BOM = '\uFEFF';
        let csv = `${BOM}${month} 月度巡检报告\n\n`;
        csv += '数据概览\n';
        csv += `巡检总数,${report.totalInspections}\n`;
        csv += `完成数,${report.completedInspections}\n`;
        csv += `平均分,${report.averageScore}\n`;
        csv += `通过率,${report.passRate}%\n\n`;
        csv += '门店排名\n';
        csv += '排名,门店名称,区域,平均分,巡检次数\n';
        report.storeRankings.slice(0, 10).forEach((store) => {
            csv += `${store.rank},${store.storeName},${store.area},${store.averageScore},${store.inspectionCount}\n`;
        });
        csv += '\n';
        csv += '各区域统计\n';
        csv += '区域,门店数,巡检次数,平均分,通过率\n';
        report.areaStatistics.forEach((area) => {
            csv += `${area.area},${area.storeCount},${area.inspectionCount},${area.averageScore},${area.passRate}%\n`;
        });
        console.log('[InspectionService] 导出CSV报告，包含中文店名:', report.storeRankings[0]?.storeName);
        return csv;
    }
    downloadReport(month, format = 'csv') {
        if (format === 'csv') {
            const csv = this.exportReportToCSV(month);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `巡检报告_${month}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        else {
            console.log('[InspectionService] PDF导出将调用后端服务');
        }
    }
    getStores() {
        return [...this.stores];
    }
    getStoreById(id) {
        return this.stores.find((s) => s.id === id);
    }
}
exports.inspectionService = new InspectionService();
//# sourceMappingURL=inspectionService.js.map