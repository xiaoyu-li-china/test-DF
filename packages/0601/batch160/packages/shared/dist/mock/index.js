import dayjs from 'dayjs';
import { generateId } from '../utils';
import { INSPECTION_CATEGORIES, getMaxTotalScore } from '../constants';
export const MOCK_STORES = [
    { id: 's001', name: '茶百道(中关村店)', address: '北京市海淀区中关村大街1号', manager: '张三', phone: '13800138001', area: '海淀区', joinDate: '2023-01-15', averageScore: 92, inspectionCount: 24 },
    { id: 's002', name: '茶百道(望京店)', address: '北京市朝阳区望京SOHO', manager: '李四', phone: '13800138002', area: '朝阳区', joinDate: '2023-03-20', averageScore: 88, inspectionCount: 20 },
    { id: 's003', name: '茶百道(国贸店)', address: '北京市朝阳区国贸商城', manager: '王五', phone: '13800138003', area: '朝阳区', joinDate: '2023-05-10', averageScore: 95, inspectionCount: 18 },
    { id: 's004', name: '茶百道(西单店)', address: '北京市西城区西单大悦城', manager: '赵六', phone: '13800138004', area: '西城区', joinDate: '2023-06-18', averageScore: 85, inspectionCount: 16 },
    { id: 's005', name: '茶百道(三里屯店)', address: '北京市朝阳区三里屯太古里', manager: '钱七', phone: '13800138005', area: '朝阳区', joinDate: '2023-08-05', averageScore: 78, inspectionCount: 14 },
    { id: 's006', name: '茶百道(五道口店)', address: '北京市海淀区五道口购物中心', manager: '孙八', phone: '13800138006', area: '海淀区', joinDate: '2023-09-22', averageScore: 91, inspectionCount: 12 },
    { id: 's007', name: '茶百道(崇文门店)', address: '北京市东城区崇文门新世界', manager: '周九', phone: '13800138007', area: '东城区', joinDate: '2023-11-30', averageScore: 82, inspectionCount: 10 },
    { id: 's008', name: '茶百道(王府井店)', address: '北京市东城区王府井大街', manager: '吴十', phone: '13800138008', area: '东城区', joinDate: '2024-01-08', averageScore: 89, inspectionCount: 8 },
];
export const MOCK_INSPECTOR = {
    id: 'i001',
    name: '王督导',
    role: 'inspector',
    phone: '13900139001',
    area: '北京市',
    todayCompleted: 2,
    todayTotal: 5,
};
const generateMockInspections = () => {
    const today = dayjs();
    const inspections = [];
    const maxScore = getMaxTotalScore();
    const statuses = ['pending', 'in_progress', 'completed', 'pending', 'pending'];
    const stores = MOCK_STORES.slice(0, 5);
    stores.forEach((store, index) => {
        const status = statuses[index];
        const isCompleted = status === 'completed';
        const score = isCompleted ? Math.floor(Math.random() * 30) + 70 : 0;
        inspections.push({
            id: generateId(),
            storeId: store.id,
            storeName: store.name,
            storeAddress: store.address,
            inspectorId: MOCK_INSPECTOR.id,
            inspectorName: MOCK_INSPECTOR.name,
            scheduledDate: today.format('YYYY-MM-DD'),
            startTime: status !== 'pending' ? today.add(index, 'hour').format('YYYY-MM-DD HH:mm:ss') : undefined,
            endTime: isCompleted ? today.add(index + 1, 'hour').format('YYYY-MM-DD HH:mm:ss') : undefined,
            status,
            result: isCompleted ? (score >= 60 ? 'pass' : 'fail') : 'pending',
            totalScore: score,
            maxScore,
            categories: INSPECTION_CATEGORIES,
            scores: [],
            photos: [],
            createdAt: today.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
            updatedAt: today.format('YYYY-MM-DD HH:mm:ss'),
        });
    });
    return inspections;
};
export const MOCK_INSPECTIONS = generateMockInspections();
export const MOCK_STORE_RANKINGS = [
    { rank: 1, storeId: 's003', storeName: '茶百道(国贸店)', area: '朝阳区', averageScore: 95, inspectionCount: 18, trend: 'up' },
    { rank: 2, storeId: 's001', storeName: '茶百道(中关村店)', area: '海淀区', averageScore: 92, inspectionCount: 24, trend: 'stable' },
    { rank: 3, storeId: 's006', storeName: '茶百道(五道口店)', area: '海淀区', averageScore: 91, inspectionCount: 12, trend: 'up' },
    { rank: 4, storeId: 's008', storeName: '茶百道(王府井店)', area: '东城区', averageScore: 89, inspectionCount: 8, trend: 'up' },
    { rank: 5, storeId: 's002', storeName: '茶百道(望京店)', area: '朝阳区', averageScore: 88, inspectionCount: 20, trend: 'down' },
    { rank: 6, storeId: 's004', storeName: '茶百道(西单店)', area: '西城区', averageScore: 85, inspectionCount: 16, trend: 'stable' },
    { rank: 7, storeId: 's007', storeName: '茶百道(崇文门店)', area: '东城区', averageScore: 82, inspectionCount: 10, trend: 'down' },
    { rank: 8, storeId: 's005', storeName: '茶百道(三里屯店)', area: '朝阳区', averageScore: 78, inspectionCount: 14, trend: 'down' },
];
export const getMonthlyReport = (month) => {
    return {
        month,
        totalInspections: 120,
        completedInspections: 115,
        averageScore: 87.5,
        passRate: 92.5,
        storeRankings: MOCK_STORE_RANKINGS,
        areaStatistics: [
            { area: '朝阳区', storeCount: 3, inspectionCount: 52, averageScore: 87, passRate: 90 },
            { area: '海淀区', storeCount: 2, inspectionCount: 36, averageScore: 91.5, passRate: 97 },
            { area: '东城区', storeCount: 2, inspectionCount: 18, averageScore: 85.5, passRate: 89 },
            { area: '西城区', storeCount: 1, inspectionCount: 9, averageScore: 85, passRate: 89 },
        ],
    };
};
//# sourceMappingURL=index.js.map