import { VisitorFormData, ConflictResult } from './types';
import { getVisitorsByDate } from './visitorService';
import { formatDate } from './printService';

const isTimeOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  return startA < endB && startB < endA;
};

export const checkTimeConflict = (formData: VisitorFormData): ConflictResult => {
  const today = formatDate(new Date());
  const existingVisitors = getVisitorsByDate(today);

  const conflictingVisitors = existingVisitors.filter((visitor) => {
    const sameHost = visitor.hostName === formData.hostName &&
      visitor.hostDepartment === formData.hostDepartment;

    if (!sameHost) return false;

    return isTimeOverlap(
      formData.visitStartTime,
      formData.visitEndTime,
      visitor.visitStartTime,
      visitor.visitEndTime
    );
  });

  if (conflictingVisitors.length > 0) {
    const names = conflictingVisitors.map(v => `${v.name}(${v.visitStartTime}-${v.visitEndTime})`).join('、');
    return {
      hasConflict: true,
      conflictingVisitors,
      message: `时段冲突：被访人 ${formData.hostName}(${formData.hostDepartment}) 在 ${formData.visitStartTime}-${formData.visitEndTime} 已有预约：${names}`,
    };
  }

  return {
    hasConflict: false,
    conflictingVisitors: [],
    message: '',
  };
};

export const getConflictingSlots = (formData: VisitorFormData): string[] => {
  const today = formatDate(new Date());
  const existingVisitors = getVisitorsByDate(today);

  return existingVisitors
    .filter(v =>
      v.hostName === formData.hostName &&
      v.hostDepartment === formData.hostDepartment
    )
    .map(v => `${v.visitStartTime}-${v.visitEndTime}`);
};
