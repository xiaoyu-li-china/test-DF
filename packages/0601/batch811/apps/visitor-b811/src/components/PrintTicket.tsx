import React from 'react';
import { Visitor } from '../services/types';
import { printTicket, formatDateTime } from '../services/printService';
import ActionButton from './ActionButton';

interface PrintTicketProps {
  visitor: Visitor;
  onClose: () => void;
}

const PrintTicket: React.FC<PrintTicketProps> = ({ visitor, onClose }) => {
  const handlePrint = async () => {
    await printTicket(visitor);
  };

  const getVisitTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      '商务拜访': '商务',
      '面试': '面试',
      '快递/外卖': '快递',
      '亲友探访': '探访',
      '设备维修': '维修',
      '会议参会': '会议',
      '培训学习': '培训',
      '其他': '其他',
    };
    return labels[type] || type;
  };

  return (
    <div className="ticket-preview">
      <div className="ticket-header">
        <div className="ticket-title">访客登记凭证</div>
      </div>

      <div className="success-icon">✅</div>
      <div className="success-title">登记成功</div>
      <div className="success-subtitle">请妥善保管您的排队号</div>

      <div className="queue-number">{visitor.queueNumber}</div>

      <div className="ticket-info">
        <div className="ticket-row">
          <span className="ticket-label">姓名</span>
          <span className="ticket-value">{visitor.name}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">身份证号</span>
          <span className="ticket-value">
            {visitor.idNumber.slice(0, 6)}****{visitor.idNumber.slice(-4)}
          </span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">来访类型</span>
          <span className="ticket-value">{getVisitTypeLabel(visitor.visitType)}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">来访时段</span>
          <span className="ticket-value">{visitor.visitStartTime} - {visitor.visitEndTime}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">被访人</span>
          <span className="ticket-value">{visitor.hostName}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">部门</span>
          <span className="ticket-value">{visitor.hostDepartment}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">登记时间</span>
          <span className="ticket-value">{formatDateTime(new Date(visitor.createdAt))}</span>
        </div>
      </div>

      <div className="ticket-footer">
        请凭此号等待叫号 · 感谢您的配合
      </div>

      <div className="ticket-actions">
        <ActionButton className="btn-success" onClick={handlePrint} loadingText="打印中...">
          🖨️ 打印凭证
        </ActionButton>
        <button className="btn btn-secondary" onClick={onClose}>
          返回首页
        </button>
      </div>
    </div>
  );
};

export default PrintTicket;
