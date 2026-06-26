import dayjs from 'dayjs';
import { getScoreLevel, getMaxTotalScore } from '../constants';
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    return dayjs(date).format(format);
};
export const formatDateTime = (date) => {
    return dayjs(date).format('YYYY-MM-DD HH:mm');
};
export const formatTime = (date) => {
    return dayjs(date).format('HH:mm');
};
export const isToday = (date) => {
    return dayjs(date).isSame(dayjs(), 'day');
};
export const isOverdue = (date) => {
    return dayjs(date).isBefore(dayjs(), 'day');
};
export const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
export const calculateScorePercentage = (score, maxScore) => {
    return Math.round((score / maxScore) * 100);
};
export const transformToSummary = (inspection) => {
    const maxScore = getMaxTotalScore();
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
        scoreLevel: getScoreLevel(inspection.totalScore, maxScore),
    };
};
//# sourceMappingURL=index.js.map