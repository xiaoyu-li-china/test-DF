"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformToSummary = exports.calculateScorePercentage = exports.generateId = exports.isOverdue = exports.isToday = exports.formatTime = exports.formatDateTime = exports.formatDate = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const constants_1 = require("../constants");
const formatDate = (date, format = 'YYYY-MM-DD') => {
    return (0, dayjs_1.default)(date).format(format);
};
exports.formatDate = formatDate;
const formatDateTime = (date) => {
    return (0, dayjs_1.default)(date).format('YYYY-MM-DD HH:mm');
};
exports.formatDateTime = formatDateTime;
const formatTime = (date) => {
    return (0, dayjs_1.default)(date).format('HH:mm');
};
exports.formatTime = formatTime;
const isToday = (date) => {
    return (0, dayjs_1.default)(date).isSame((0, dayjs_1.default)(), 'day');
};
exports.isToday = isToday;
const isOverdue = (date) => {
    return (0, dayjs_1.default)(date).isBefore((0, dayjs_1.default)(), 'day');
};
exports.isOverdue = isOverdue;
const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
exports.generateId = generateId;
const calculateScorePercentage = (score, maxScore) => {
    return Math.round((score / maxScore) * 100);
};
exports.calculateScorePercentage = calculateScorePercentage;
const transformToSummary = (inspection) => {
    const maxScore = (0, constants_1.getMaxTotalScore)();
    return {
        id: inspection.id,
        storeId: inspection.storeId,
        storeName: inspection.storeName,
        storeAddress: inspection.storeAddress,
        inspectorName: inspection.inspectorName,
        scheduledDate: inspection.scheduledDate,
        status: inspection.status,
        totalScore: inspection.totalScore,
        maxScore: maxScore,
        scoreLevel: (0, constants_1.getScoreLevel)(inspection.totalScore, maxScore),
    };
};
exports.transformToSummary = transformToSummary;
//# sourceMappingURL=index.js.map