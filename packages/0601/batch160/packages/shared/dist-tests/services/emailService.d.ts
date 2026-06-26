import { EmailSchedule, EmailLog } from '../types';
declare class EmailService {
    private schedules;
    private logs;
    private timer;
    private listeners;
    constructor();
    private initMockSchedules;
    subscribe(listener: (type: 'schedule' | 'log') => void): () => void;
    private notify;
    private startScheduler;
    stopScheduler(): void;
    private checkAndSend;
    private updateNextSendTime;
    private sendScheduleEmail;
    createSchedule(data: {
        name: string;
        type: 'daily' | 'weekly' | 'monthly';
        recipients: string[];
        subject: string;
        createdBy: string;
    }): EmailSchedule;
    updateSchedule(id: string, updates: Partial<EmailSchedule>): boolean;
    deleteSchedule(id: string): boolean;
    toggleSchedule(id: string): boolean;
    getSchedules(): EmailSchedule[];
    getScheduleById(id: string): EmailSchedule | undefined;
    getLogs(): EmailLog[];
    getLogsBySchedule(scheduleId: string): EmailLog[];
    sendNow(scheduleId: string): Promise<boolean>;
    sendTestEmail(recipient: string, month?: string): boolean;
    getReportEmailContent(month: string): {
        subject: string;
        html: string;
    };
}
export declare const emailService: EmailService;
export {};
