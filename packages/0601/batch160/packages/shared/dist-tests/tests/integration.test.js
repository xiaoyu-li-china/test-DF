"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTest = void 0;
exports.runTests = runTests;
const index_1 = require("../index");
class IntegrationTest {
    constructor() {
        this.results = [];
        const store = index_1.MOCK_STORES[0];
        this.storeId = store.id;
        this.storeName = store.name;
        const today = (0, index_1.formatDate)(new Date().toISOString());
        const inspection = index_1.inspectionService.getInspectionsByStoreAndDate(this.storeId, today)[0];
        if (inspection) {
            this.inspectionId = inspection.id;
        }
        else {
            this.inspectionId = (0, index_1.generateId)();
        }
    }
    assert(name, condition, message, details) {
        this.results.push({
            name,
            passed: condition,
            message,
            details,
        });
        const status = condition ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${name}`);
        if (!condition) {
            console.log(`   原因: ${message}`);
            if (details)
                console.log(`   详情:`, JSON.stringify(details, null, 2));
        }
        return condition;
    }
    logStep(step, title) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📍 步骤 ${step}: ${title}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
    async run() {
        console.log(`\n
╔══════════════════════════════════════════════════════════════════╗
║           门店巡检系统 - 跨模块集成测试                          ║
║  测试场景: 小程序提交 → 后台排名更新 → 报表数据一致性 + 重复提交  ║
╚══════════════════════════════════════════════════════════════════╝
`);
        console.log(`测试门店: ${this.storeName} (${this.storeId})`);
        console.log(`巡检ID: ${this.inspectionId}`);
        console.log(`测试时间: ${new Date().toISOString()}`);
        // ──────────────────────────────────────────────────────────
        // E2E Happy Path
        // ──────────────────────────────────────────────────────────
        this.logStep(1, '模拟小程序端 - 提交巡检结果');
        const allInspections = index_1.inspectionService.getInspections();
        const targetInspection = allInspections.find(i => i.storeId === this.storeId) || allInspections[0];
        this.inspectionId = targetInspection.id;
        const beforeScore = targetInspection.totalScore;
        console.log(`提交前得分: ${beforeScore}`);
        const scores = index_1.INSPECTION_CATEGORIES.flatMap(cat => cat.items.map(item => ({
            itemId: item.id,
            score: item.maxScore,
            remark: '测试提交 - 全部满分',
            photos: [],
        })));
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        console.log(`提交得分: ${totalScore} (满分)`);
        const submitResult = index_1.inspectionService.submitInspection({
            inspectionId: this.inspectionId,
            scores,
            photos: [],
            totalScore,
            remark: '集成测试 - 小程序端提交',
        });
        this.assert('1.1 小程序提交巡检成功', submitResult.success, submitResult.message, { submitResult });
        this.assert('1.2 提交后生成审计记录', submitResult.auditRecord !== undefined, '应返回审计记录', { auditRecord: submitResult.auditRecord });
        if (submitResult.auditRecord) {
            this.assert('1.3 审计记录版本号正确', submitResult.auditRecord.version >= 1, `版本号应为>=1，实际为${submitResult.auditRecord.version}`, { version: submitResult.auditRecord.version });
            this.assert('1.4 审计记录包含前后得分', submitResult.auditRecord.afterScore === totalScore, `后得分应为${totalScore}，实际为${submitResult.auditRecord.afterScore}`, { before: submitResult.auditRecord.beforeScore, after: submitResult.auditRecord.afterScore });
        }
        this.logStep(2, '验证服务层数据更新');
        const updatedInspection = index_1.inspectionService.getInspectionById(this.inspectionId);
        this.assert('2.1 巡检记录得分已更新', updatedInspection?.totalScore === totalScore, `巡检记录得分应为${totalScore}，实际为${updatedInspection?.totalScore}`, { expected: totalScore, actual: updatedInspection?.totalScore });
        this.assert('2.2 巡检状态为已完成', updatedInspection?.status === 'completed', `状态应为completed，实际为${updatedInspection?.status}`, { status: updatedInspection?.status });
        this.assert('2.3 巡检结果为通过', updatedInspection?.result === 'pass', `结果应为pass，实际为${updatedInspection?.result}`, { result: updatedInspection?.result });
        this.logStep(3, '验证后台管理 - 门店排名更新');
        const rankings = index_1.inspectionService.getStoreRankings();
        const storeRanking = rankings.find(r => r.storeId === this.storeId);
        this.assert('3.1 门店在排名列表中', storeRanking !== undefined, '门店应出现在排名列表中', { rankingsCount: rankings.length });
        if (storeRanking) {
            this.assert('3.2 门店平均分已更新', storeRanking.averageScore >= 90, `提交后平均分应>=90，实际为${storeRanking.averageScore}`, { averageScore: storeRanking.averageScore, inspectionCount: storeRanking.inspectionCount });
            console.log(`   门店排名: 第${storeRanking.rank}名 / 共${rankings.length}家`);
            console.log(`   平均得分: ${storeRanking.averageScore}分`);
            console.log(`   巡检次数: ${storeRanking.inspectionCount}次`);
        }
        this.logStep(4, '验证报表模块 - 数据一致性');
        const testMonth = (0, index_1.formatDate)(new Date().toISOString(), 'YYYY-MM');
        const report = index_1.inspectionService.getMonthlyReport(testMonth);
        this.assert('4.1 月度报表包含该门店排名', report.storeRankings.some(r => r.storeId === this.storeId), '月度报表排名应包含该门店');
        const reportStoreRanking = report.storeRankings.find(r => r.storeId === this.storeId);
        if (reportStoreRanking && storeRanking) {
            this.assert('4.2 报表排名与实时排名一致', reportStoreRanking.rank === storeRanking.rank &&
                reportStoreRanking.averageScore === storeRanking.averageScore, '报表数据应与实时排名数据一致', {
                report: { rank: reportStoreRanking.rank, score: reportStoreRanking.averageScore },
                realtime: { rank: storeRanking.rank, score: storeRanking.averageScore }
            });
        }
        this.assert('4.3 报表统计数据正确', report.totalInspections > 0 && report.completedInspections > 0, '报表统计数据应有效', {
            totalInspections: report.totalInspections,
            completedInspections: report.completedInspections,
            averageScore: report.averageScore,
            passRate: report.passRate
        });
        const emailContent = index_1.emailService.getReportEmailContent(testMonth);
        this.assert('4.4 邮件模板包含该门店名称', emailContent.html.includes(this.storeName), '邮件内容应包含测试门店名称', { storeName: this.storeName });
        this.assert('4.5 邮件模板包含报表数据', emailContent.html.includes(`${report.averageScore}`) &&
            emailContent.html.includes(`${report.passRate}%`), '邮件内容应包含报表统计数据', { averageScore: report.averageScore, passRate: report.passRate });
        this.logStep(5, '测试重复提交场景 - 版本控制和审计');
        const newScores = index_1.INSPECTION_CATEGORIES.flatMap(cat => cat.items.map(item => ({
            itemId: item.id,
            score: Math.floor(item.maxScore * 0.8),
            remark: '测试重复提交 - 80%分',
            photos: [],
        })));
        const newTotalScore = newScores.reduce((sum, s) => sum + s.score, 0);
        console.log(`重复提交得分: ${newTotalScore}分 (80%)`);
        const canSubmit = index_1.inspectionService.canSubmitInspection(this.storeId, (0, index_1.formatDate)(new Date().toISOString()));
        this.assert('5.1 重复提交检测生效', !canSubmit.allowed, '同一门店同一天重复提交应被拦截', { canSubmit });
        this.assert('5.2 返回版本号和提示信息', canSubmit.existingVersion !== undefined && canSubmit.reason !== undefined, '应返回现有版本号和提示信息', { existingVersion: canSubmit.existingVersion, reason: canSubmit.reason });
        const secondSubmit = index_1.inspectionService.submitInspection({
            inspectionId: this.inspectionId,
            scores: newScores,
            photos: [],
            totalScore: newTotalScore,
            remark: '集成测试 - 重复提交（重新提交）',
        });
        this.assert('5.3 重新提交成功（生成新版本）', secondSubmit.success, '重新提交（覆盖）应成功', { secondSubmit });
        this.assert('5.4 新版本号递增', secondSubmit.auditRecord?.version === 2, `版本号应递增为2，实际为${secondSubmit.auditRecord?.version}`, { version: secondSubmit.auditRecord?.version });
        if (secondSubmit.auditRecord) {
            this.assert('5.5 审计记录action为resubmit', secondSubmit.auditRecord.action === 'resubmit', `action应为resubmit，实际为${secondSubmit.auditRecord.action}`, { action: secondSubmit.auditRecord.action });
            this.assert('5.6 审计记录正确记录前后得分', secondSubmit.auditRecord.beforeScore === totalScore &&
                secondSubmit.auditRecord.afterScore === newTotalScore, '应正确记录得分变更', {
                beforeScore: secondSubmit.auditRecord.beforeScore,
                afterScore: secondSubmit.auditRecord.afterScore,
                expected: { before: totalScore, after: newTotalScore }
            });
        }
        this.logStep(6, '验证审计历史完整性');
        const auditRecords = index_1.inspectionService.getAuditRecordsByInspection(this.inspectionId);
        this.assert('6.1 审计记录数量正确', auditRecords.length >= 2, `至少应有2条审计记录，实际为${auditRecords.length}`, { count: auditRecords.length });
        this.assert('6.2 审计记录版本号连续', auditRecords[0].version === 1 && auditRecords[1].version === 2, '版本号应从1开始连续递增', { versions: auditRecords.map(r => r.version) });
        auditRecords.forEach((record, index) => {
            console.log(`   版本${record.version}: ${record.action} - ${record.beforeScore}→${record.afterScore}`);
        });
        this.logStep(7, '验证最终数据一致性');
        const finalInspection = index_1.inspectionService.getInspectionById(this.inspectionId);
        const finalRankings = index_1.inspectionService.getStoreRankings();
        const finalReport = index_1.inspectionService.getMonthlyReport(testMonth);
        const finalStoreRanking = finalRankings.find(r => r.storeId === this.storeId);
        const finalReportRanking = finalReport.storeRankings.find(r => r.storeId === this.storeId);
        this.assert('7.1 巡检最终得分正确', finalInspection?.totalScore === newTotalScore, `巡检得分应为${newTotalScore}，实际为${finalInspection?.totalScore}`, { expected: newTotalScore, actual: finalInspection?.totalScore });
        if (finalStoreRanking && finalReportRanking) {
            this.assert('7.2 实时排名与报表排名一致', finalStoreRanking.averageScore === finalReportRanking.averageScore, '实时排名和报表排名的平均分应一致', {
                realtime: finalStoreRanking.averageScore,
                report: finalReportRanking.averageScore
            });
            this.assert('7.3 排名位次一致', finalStoreRanking.rank === finalReportRanking.rank, '实时排名和报表排名的位次应一致', {
                realtimeRank: finalStoreRanking.rank,
                reportRank: finalReportRanking.rank
            });
        }
        // ──────────────────────────────────────────────────────────
        // RBAC 权限测试
        // ──────────────────────────────────────────────────────────
        this.logStep(8, 'RBAC 权限控制测试');
        index_1.authService.login('am001');
        const areaManager = index_1.authService.getCurrentUser();
        const areaStores = index_1.authService.filterStoresByArea(index_1.MOCK_STORES);
        this.assert('8.1 区域经理登录成功', areaManager?.role === 'area_manager', '登录后角色应为area_manager', { role: areaManager?.role, name: areaManager?.name });
        this.assert('8.2 区域经理只能看辖区门店', areaStores.every(s => s.area === '朝阳区'), '朝阳区经理应只能看到朝阳区门店', {
            totalStores: index_1.MOCK_STORES.length,
            accessibleStores: areaStores.length,
            areas: [...new Set(areaStores.map(s => s.area))]
        });
        this.assert('8.3 区域经理无权限删除门店', !index_1.authService.hasPermission('stores', 'delete'), '区域经理不应有删除门店权限');
        index_1.authService.login('admin001');
        this.assert('8.4 管理员有全部权限', index_1.authService.hasPermission('stores', 'delete') &&
            index_1.authService.hasPermission('reports', 'schedule') &&
            index_1.authService.hasPermission('emailSchedules', 'create'), '管理员应有全部权限');
        const adminStores = index_1.authService.filterStoresByArea(index_1.MOCK_STORES);
        this.assert('8.5 管理员能看所有门店', adminStores.length === index_1.MOCK_STORES.length, '管理员应能看到所有门店', { count: adminStores.length });
        // ──────────────────────────────────────────────────────────
        // 输出测试报告
        // ──────────────────────────────────────────────────────────
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        console.log(`

╔══════════════════════════════════════════════════════════════════╗
║                         测试报告                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  总计: ${this.results.length.toString().padEnd(2)}  |  ✅ 通过: ${passed.toString().padEnd(2)}  |  ❌ 失败: ${failed.toString().padEnd(2)}                        ║
║  通过率: ${failed === 0 ? '100.0%' : ((passed / this.results.length) * 100).toFixed(1) + '%'.padEnd(6)}                                               ║
╠══════════════════════════════════════════════════════════════════╣
`);
        if (failed > 0) {
            console.log('║  ❌ 失败项:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`║     - ${r.name}`);
                console.log(`║       ${r.message}`);
            });
        }
        else {
            console.log('║  ✅ 所有测试通过！数据流验证完整：');
            console.log('║');
            console.log('║  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐');
            console.log('║  │  小程序提交  │───▶│  后台排名   │───▶│  报表导出   │');
            console.log('║  │   得分一致   │    │   实时更新  │    │   数据一致  │');
            console.log('║  └─────────────┘    └─────────────┘    └─────────────┘');
            console.log('║         │                    │                    │');
            console.log('║         └────────────────────┴────────────────────┘');
            console.log('║                              ✅  版本控制 + 审计追踪');
        }
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');
        return { passed, failed, results: this.results };
    }
}
exports.IntegrationTest = IntegrationTest;
async function runTests() {
    const test = new IntegrationTest();
    const result = await test.run();
    if (result.failed > 0) {
        console.log('\n❌ 存在失败的测试，请检查');
        process.exit(1);
    }
    else {
        console.log('\n🎉 所有集成测试通过！系统数据一致性验证完成。');
        process.exit(0);
    }
}
if (require.main === module) {
    runTests();
}
//# sourceMappingURL=integration.test.js.map