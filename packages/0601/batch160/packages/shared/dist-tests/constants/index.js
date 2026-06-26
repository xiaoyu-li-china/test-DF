"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_COLORS = exports.STATUS_LABELS = exports.SCORE_LEVEL_LABELS = exports.getScoreLevel = exports.getMaxTotalScore = exports.INSPECTION_CATEGORIES = void 0;
exports.INSPECTION_CATEGORIES = [
    {
        id: 'sanitation',
        name: '环境卫生',
        items: [
            { id: 's1', category: 'sanitation', name: '店面整体清洁', description: '店面内外无垃圾、无污渍', maxScore: 10, required: true, needPhoto: true },
            { id: 's2', category: 'sanitation', name: '操作台卫生', description: '操作台干净整洁，无积水残留', maxScore: 10, required: true, needPhoto: true },
            { id: 's3', category: 'sanitation', name: '设备清洁', description: '制冰机、封口机等设备清洁', maxScore: 10, required: true, needPhoto: false },
            { id: 's4', category: 'sanitation', name: '洗手间卫生', description: '洗手间干净无异味', maxScore: 10, required: false, needPhoto: true },
        ]
    },
    {
        id: 'food_safety',
        name: '食品安全',
        items: [
            { id: 'f1', category: 'food_safety', name: '原料保质期', description: '所有原料在保质期内', maxScore: 15, required: true, needPhoto: true },
            { id: 'f2', category: 'food_safety', name: '原料存储规范', description: '原料分类存储，标识清晰', maxScore: 10, required: true, needPhoto: true },
            { id: 'f3', category: 'food_safety', name: '员工操作规范', description: '员工佩戴口罩手套，操作规范', maxScore: 10, required: true, needPhoto: false },
        ]
    },
    {
        id: 'service',
        name: '服务质量',
        items: [
            { id: 'sv1', category: 'service', name: '员工着装', description: '员工统一着装，佩戴工牌', maxScore: 10, required: true, needPhoto: true },
            { id: 'sv2', category: 'service', name: '服务态度', description: '热情接待，礼貌用语', maxScore: 10, required: true, needPhoto: false },
            { id: 'sv3', category: 'service', name: '出餐速度', description: '出餐时间符合标准', maxScore: 5, required: false, needPhoto: false },
        ]
    },
    {
        id: 'brand',
        name: '品牌形象',
        items: [
            { id: 'b1', category: 'brand', name: '招牌灯箱', description: '招牌、灯箱完好明亮', maxScore: 5, required: true, needPhoto: true },
            { id: 'b2', category: 'brand', name: '宣传物料', description: '宣传海报摆放规范', maxScore: 5, required: false, needPhoto: true },
            { id: 'b3', category: 'brand', name: '价目表', description: '价目表清晰准确', maxScore: 5, required: false, needPhoto: false },
        ]
    }
];
const getMaxTotalScore = () => {
    return exports.INSPECTION_CATEGORIES.reduce((total, category) => {
        return total + category.items.reduce((sum, item) => sum + item.maxScore, 0);
    }, 0);
};
exports.getMaxTotalScore = getMaxTotalScore;
const getScoreLevel = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90)
        return 'excellent';
    if (percentage >= 75)
        return 'good';
    if (percentage >= 60)
        return 'average';
    return 'poor';
};
exports.getScoreLevel = getScoreLevel;
exports.SCORE_LEVEL_LABELS = {
    excellent: '优秀',
    good: '良好',
    average: '一般',
    poor: '较差',
};
exports.STATUS_LABELS = {
    pending: '待巡检',
    in_progress: '进行中',
    completed: '已完成',
    overdue: '已逾期',
};
exports.STATUS_COLORS = {
    pending: '#FF7D00',
    in_progress: '#165DFF',
    completed: '#00B42A',
    overdue: '#F53F3F',
};
//# sourceMappingURL=index.js.map