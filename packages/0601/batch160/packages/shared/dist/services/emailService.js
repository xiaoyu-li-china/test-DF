import dayjs from 'dayjs';
import { generateId, formatDate } from '../utils';
import { inspectionService } from './inspectionService';
class EmailService {
    constructor() {
        this.schedules = [];
        this.logs = [];
        this.timer = null;
        this.listeners = [];
        this.initMockSchedules();
        this.startScheduler();
    }
    initMockSchedules() {
        this.schedules.push({
            id: generateId(),
            name: '月度巡检报告',
            type: 'monthly',
            recipients: ['manager@example.com', 'director@example.com'],
            subject: '月度门店巡检报告',
            enabled: true,
            nextSendAt: dayjs().add(1, 'minute').toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: 'admin001',
        }, {
            id: generateId(),
            name: '周度数据汇总',
            type: 'weekly',
            recipients: ['supervisor@example.com'],
            subject: '周度门店巡检数据汇总',
            enabled: true,
            nextSendAt: dayjs().add(2, 'day').toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: 'admin001',
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
    startScheduler() {
        this.timer = setInterval(() => {
            this.checkAndSend();
        }, 60000);
        console.log('[EmailService] 邮件调度器已启动');
    }
    stopScheduler() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    checkAndSend() {
        const now = new Date().toISOString();
        const dueSchedules = this.schedules.filter((s) => s.enabled && s.nextSendAt <= now);
        dueSchedules.forEach((schedule) => {
            this.sendScheduleEmail(schedule);
            this.updateNextSendTime(schedule);
        });
    }
    updateNextSendTime(schedule) {
        const now = dayjs();
        switch (schedule.type) {
            case 'daily':
                schedule.nextSendAt = now.add(1, 'day').toISOString();
                break;
            case 'weekly':
                schedule.nextSendAt = now.add(1, 'week').toISOString();
                break;
            case 'monthly':
                schedule.nextSendAt = now.add(1, 'month').toISOString();
                break;
        }
        schedule.lastSentAt = new Date().toISOString();
        this.notify('schedule');
    }
    async sendScheduleEmail(schedule) {
        console.log('[EmailService] 发送邮件:', schedule.name, '收件人:', schedule.recipients);
        const reportMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
        const report = inspectionService.getMonthlyReport(reportMonth);
        const log = {
            id: generateId(),
            scheduleId: schedule.id,
            subject: schedule.subject,
            recipients: [...schedule.recipients],
            status: 'sent',
            sentAt: new Date().toISOString(),
            reportMonth,
        };
        this.logs.unshift(log);
        this.notify('log');
        console.log('[EmailService] 邮件发送成功，报告数据:', {
            month: reportMonth,
            totalInspections: report.totalInspections,
            averageScore: report.averageScore,
        });
        return true;
    }
    createSchedule(data) {
        const now = dayjs();
        let nextSendAt;
        switch (data.type) {
            case 'daily':
                nextSendAt = now.add(1, 'day').toISOString();
                break;
            case 'weekly':
                nextSendAt = now.add(1, 'week').toISOString();
                break;
            case 'monthly':
                nextSendAt = now.add(1, 'month').toISOString();
                break;
        }
        const schedule = {
            id: generateId(),
            name: data.name,
            type: data.type,
            recipients: [...data.recipients],
            subject: data.subject,
            enabled: true,
            nextSendAt,
            createdAt: new Date().toISOString(),
            createdBy: data.createdBy,
        };
        this.schedules.push(schedule);
        console.log('[EmailService] 创建邮件计划:', schedule.id, schedule.name);
        this.notify('schedule');
        return schedule;
    }
    updateSchedule(id, updates) {
        const schedule = this.schedules.find((s) => s.id === id);
        if (!schedule)
            return false;
        Object.assign(schedule, updates);
        console.log('[EmailService] 更新邮件计划:', id);
        this.notify('schedule');
        return true;
    }
    deleteSchedule(id) {
        const index = this.schedules.findIndex((s) => s.id === id);
        if (index === -1)
            return false;
        this.schedules.splice(index, 1);
        console.log('[EmailService] 删除邮件计划:', id);
        this.notify('schedule');
        return true;
    }
    toggleSchedule(id) {
        const schedule = this.schedules.find((s) => s.id === id);
        if (!schedule)
            return false;
        schedule.enabled = !schedule.enabled;
        console.log('[EmailService] 切换邮件计划状态:', id, schedule.enabled ? '启用' : '禁用');
        this.notify('schedule');
        return true;
    }
    getSchedules() {
        return [...this.schedules];
    }
    getScheduleById(id) {
        return this.schedules.find((s) => s.id === id);
    }
    getLogs() {
        return [...this.logs];
    }
    getLogsBySchedule(scheduleId) {
        return this.logs.filter((l) => l.scheduleId === scheduleId);
    }
    async sendNow(scheduleId) {
        const schedule = this.schedules.find((s) => s.id === scheduleId);
        if (!schedule)
            return false;
        console.log('[EmailService] 立即发送邮件:', schedule.name);
        return this.sendScheduleEmail(schedule);
    }
    sendTestEmail(recipient, month) {
        const reportMonth = month || dayjs().format('YYYY-MM');
        const report = inspectionService.getMonthlyReport(reportMonth);
        console.log('[EmailService] 发送测试邮件:', recipient);
        console.log('[EmailService] 报告内容摘要:', {
            month: reportMonth,
            totalInspections: report.totalInspections,
            completedInspections: report.completedInspections,
            averageScore: report.averageScore,
            passRate: report.passRate,
            topStore: report.storeRankings[0]?.storeName,
        });
        const log = {
            id: generateId(),
            scheduleId: 'test',
            subject: `测试邮件 - ${reportMonth} 巡检报告`,
            recipients: [recipient],
            status: 'sent',
            sentAt: new Date().toISOString(),
            reportMonth,
        };
        this.logs.unshift(log);
        this.notify('log');
        return true;
    }
    getReportEmailContent(month) {
        const report = inspectionService.getMonthlyReport(month);
        const subject = `${month} 月度门店巡检报告`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%); 
                    color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .stat { background: #f5f7fa; padding: 16px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #165DFF; }
          .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e6eb; }
          th { background: #f7f8fa; font-weight: 600; }
          .rank-1 { background: linear-gradient(90deg, #FFD700 0%, transparent 100%); }
          .rank-2 { background: linear-gradient(90deg, #C0C0C0 0%, transparent 100%); }
          .rank-3 { background: linear-gradient(90deg, #CD7F32 0%, transparent 100%); }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${month} 月度门店巡检报告</h1>
          <p>自动生成于 ${formatDate(new Date().toISOString(), 'YYYY年MM月DD日 HH:mm')}</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${report.totalInspections}</div>
            <div class="stat-label">巡检总数</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.completedInspections}</div>
            <div class="stat-label">完成数</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.averageScore}</div>
            <div class="stat-label">平均分</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.passRate}%</div>
            <div class="stat-label">通过率</div>
          </div>
        </div>

        <h3>🏆 门店排名 TOP 5</h3>
        <table>
          <thead>
            <tr><th>排名</th><th>门店名称</th><th>区域</th><th>平均分</th><th>巡检次数</th></tr>
          </thead>
          <tbody>
            ${report.storeRankings.slice(0, 5).map((store, i) => `
              <tr class="${i < 3 ? `rank-${i + 1}` : ''}">
                <td>${store.rank}</td>
                <td>${store.storeName}</td>
                <td>${store.area}</td>
                <td><strong>${store.averageScore}</strong></td>
                <td>${store.inspectionCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>📊 各区域统计</h3>
        <table>
          <thead>
            <tr><th>区域</th><th>门店数</th><th>巡检次数</th><th>平均分</th><th>通过率</th></tr>
          </thead>
          <tbody>
            ${report.areaStatistics.map((area) => `
              <tr>
                <td>${area.area}</td>
                <td>${area.storeCount}</td>
                <td>${area.inspectionCount}</td>
                <td>${area.averageScore}</td>
                <td>${area.passRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 30px; color: #86909c; font-size: 12px;">
          此邮件由系统自动发送，请勿直接回复。
        </p>
      </body>
      </html>
    `;
        return { subject, html };
    }
}
export const emailService = new EmailService();
//# sourceMappingURL=emailService.js.map