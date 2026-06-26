import React, { useState, useCallback } from 'react';
import IdScanner from '../components/IdScanner';
import ActionButton from '../components/ActionButton';
import { VisitorFormData, FormErrors, IdCardInfo, Visitor } from '../services/types';
import { validateVisitorForm, hasErrors } from '../services/validationService';
import { getDepartmentList, getVisitTypeList, createVisitor } from '../services/visitorService';
import { checkTimeConflict } from '../services/conflictService';

interface VisitorFormProps {
  onSubmit: (visitor: Visitor) => void;
}

const VisitorForm: React.FC<VisitorFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<VisitorFormData>({
    name: '',
    idNumber: '',
    phone: '',
    visitType: '',
    hostName: '',
    hostDepartment: '',
    visitPurpose: '',
    visitStartTime: '',
    visitEndTime: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [conflictMessage, setConflictMessage] = useState('');

  const departmentList = getDepartmentList();
  const visitTypeList = getVisitTypeList();

  const handleIdScan = (info: IdCardInfo) => {
    setFormData(prev => ({
      ...prev,
      name: info.name,
      idNumber: info.idNumber,
    }));
    setErrors(prev => ({
      ...prev,
      name: undefined,
      idNumber: undefined,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }

    if (conflictMessage) {
      setConflictMessage('');
      setErrors(prev => ({
        ...prev,
        conflict: undefined,
      }));
    }
  };

  const handleSubmit = useCallback(async (): Promise<void> => {
    const validationErrors = validateVisitorForm(formData);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const conflict = checkTimeConflict(formData);
    if (conflict.hasConflict) {
      setConflictMessage(conflict.message);
      setErrors(prev => ({
        ...prev,
        conflict: conflict.message,
        visitStartTime: ' ',
        visitEndTime: ' ',
      }));
      return;
    }

    setConflictMessage('');

    return new Promise((resolve) => {
      setTimeout(() => {
        const visitor = createVisitor(formData);
        onSubmit(visitor);
        resolve();
      }, 800);
    });
  }, [formData, onSubmit]);

  const handleReset = () => {
    setFormData({
      name: '',
      idNumber: '',
      phone: '',
      visitType: '',
      hostName: '',
      hostDepartment: '',
      visitPurpose: '',
      visitStartTime: '',
      visitEndTime: '',
    });
    setErrors({});
    setConflictMessage('');
  };

  return (
    <div className="form-card">
      <h2 className="form-title">访客登记表</h2>

      <IdScanner onScan={handleIdScan} />

      <form>
        <div className="form-group">
          <label className="form-label">姓名 *</label>
          <input
            type="text"
            name="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={handleChange}
            placeholder="请输入姓名"
          />
          {errors.name && <div className="error-message">⚠️ {errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">身份证号码 *</label>
          <input
            type="text"
            name="idNumber"
            className={`form-input ${errors.idNumber ? 'error' : ''}`}
            value={formData.idNumber}
            onChange={handleChange}
            placeholder="请输入18位身份证号码"
            maxLength={18}
          />
          {errors.idNumber && <div className="error-message">⚠️ {errors.idNumber}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">手机号码 *</label>
          <input
            type="tel"
            name="phone"
            className={`form-input ${errors.phone ? 'error' : ''}`}
            value={formData.phone}
            onChange={handleChange}
            placeholder="请输入11位手机号码"
            maxLength={11}
          />
          {errors.phone && <div className="error-message">⚠️ {errors.phone}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">来访类型 *</label>
          <select
            name="visitType"
            className={`form-select ${errors.visitType ? 'error' : ''}`}
            value={formData.visitType}
            onChange={handleChange}
          >
            <option value="">请选择来访类型</option>
            {visitTypeList.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.visitType && <div className="error-message">⚠️ {errors.visitType}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">被访人姓名 *</label>
          <input
            type="text"
            name="hostName"
            className={`form-input ${errors.hostName ? 'error' : ''}`}
            value={formData.hostName}
            onChange={handleChange}
            placeholder="请输入被访人姓名"
          />
          {errors.hostName && <div className="error-message">⚠️ {errors.hostName}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">被访人部门 *</label>
          <select
            name="hostDepartment"
            className={`form-select ${errors.hostDepartment ? 'error' : ''}`}
            value={formData.hostDepartment}
            onChange={handleChange}
          >
            <option value="">请选择部门</option>
            {departmentList.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {errors.hostDepartment && <div className="error-message">⚠️ {errors.hostDepartment}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">来访时段 *</label>
          <div className="time-range-row">
            <input
              type="time"
              name="visitStartTime"
              className={`form-input time-input ${errors.visitStartTime ? 'error' : ''}`}
              value={formData.visitStartTime}
              onChange={handleChange}
            />
            <span className="time-separator">至</span>
            <input
              type="time"
              name="visitEndTime"
              className={`form-input time-input ${errors.visitEndTime ? 'error' : ''}`}
              value={formData.visitEndTime}
              onChange={handleChange}
            />
          </div>
          {errors.visitStartTime && errors.visitStartTime.trim() && (
            <div className="error-message">⚠️ {errors.visitStartTime}</div>
          )}
          {errors.visitEndTime && errors.visitEndTime.trim() && (
            <div className="error-message">⚠️ {errors.visitEndTime}</div>
          )}
        </div>

        {conflictMessage && (
          <div className="conflict-banner">
            <div className="conflict-icon">🚫</div>
            <div className="conflict-text">{conflictMessage}</div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">来访事由 *</label>
          <textarea
            name="visitPurpose"
            className={`form-textarea ${errors.visitPurpose ? 'error' : ''}`}
            value={formData.visitPurpose}
            onChange={handleChange}
            placeholder="请简要说明来访事由"
            rows={3}
          />
          {errors.visitPurpose && <div className="error-message">⚠️ {errors.visitPurpose}</div>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            重置
          </button>
          <ActionButton className="btn-primary" onClick={handleSubmit} loadingText="提交中...">
            提交登记
          </ActionButton>
        </div>
      </form>
    </div>
  );
};

export default VisitorForm;
