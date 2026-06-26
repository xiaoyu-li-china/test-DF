import { Visitor, VisitorFormData } from './types';
import { generateQueueNumber } from './queueService';
import { formatDate } from './printService';

const STORAGE_KEY = 'visitor_records';

export const createVisitor = (formData: VisitorFormData): Visitor => {
  const now = new Date();
  const visitor: Visitor = {
    id: crypto.randomUUID(),
    ...formData,
    visitDate: formatDate(now),
    queueNumber: generateQueueNumber(),
    createdAt: now,
  };

  saveVisitor(visitor);
  return visitor;
};

const saveVisitor = (visitor: Visitor): void => {
  const visitors = getAllVisitors();
  visitors.push(visitor);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
};

export const getAllVisitors = (): Visitor[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

export const getVisitorsByDate = (date: string): Visitor[] => {
  const visitors = getAllVisitors();
  return visitors.filter(v => v.visitDate === date);
};

export const getVisitorById = (id: string): Visitor | undefined => {
  const visitors = getAllVisitors();
  return visitors.find(v => v.id === id);
};

export const getDepartmentList = (): string[] => {
  return [
    '研发部',
    '市场部',
    '销售部',
    '人力资源部',
    '财务部',
    '行政部',
    '产品部',
    '运营部',
    '客服部',
    '技术支持部',
  ];
};

export const getVisitTypeList = (): string[] => {
  return [
    '商务拜访',
    '面试',
    '快递/外卖',
    '亲友探访',
    '设备维修',
    '会议参会',
    '培训学习',
    '其他',
  ];
};
