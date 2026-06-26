import { Inspection, InspectionSubmissionData, AuditRecord, Store, StoreRanking, MonthlyReport } from '../types';
type DataChangeListener = (type: 'inspection' | 'audit' | 'store') => void;
declare class InspectionService {
    private inspections;
    private stores;
    private auditRecords;
    private listeners;
    constructor();
    private initAuditRecords;
    subscribe(listener: DataChangeListener): () => void;
    private notify;
    getInspections(): Inspection[];
    getInspectionById(id: string): Inspection | undefined;
    getInspectionsByDate(date: string): Inspection[];
    getInspectionsByStoreAndDate(storeId: string, date: string): Inspection[];
    canSubmitInspection(storeId: string, date: string): {
        allowed: boolean;
        reason?: string;
        existingVersion?: number;
    };
    submitInspection(data: InspectionSubmissionData): {
        success: boolean;
        message: string;
        auditRecord?: AuditRecord;
    };
    private getNextVersion;
    private updateStoreAverageScore;
    getAuditRecords(): AuditRecord[];
    getAuditRecordsByStore(storeId: string): AuditRecord[];
    getAuditRecordsByInspection(inspectionId: string): AuditRecord[];
    getStoreRankings(): StoreRanking[];
    getMonthlyReport(month: string): MonthlyReport;
    exportReportToCSV(month: string): string;
    downloadReport(month: string, format?: 'csv' | 'pdf'): void;
    getStores(): Store[];
    getStoreById(id: string): Store | undefined;
}
export declare const inspectionService: InspectionService;
export {};
