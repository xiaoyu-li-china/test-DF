import { VisitorFormData, FormErrors } from './types';

export const validateVisitorForm = (data: VisitorFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = '请输入姓名';
  } else if (data.name.trim().length < 2) {
    errors.name = '姓名至少2个字符';
  }

  if (!data.idNumber.trim()) {
    errors.idNumber = '请输入身份证号码';
  } else if (!/^\d{17}[\dXx]$/.test(data.idNumber)) {
    errors.idNumber = '请输入有效的18位身份证号码';
  }

  if (!data.phone.trim()) {
    errors.phone = '请输入手机号码';
  } else if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.phone = '请输入有效的11位手机号码';
  }

  if (!data.visitType) {
    errors.visitType = '请选择来访类型';
  }

  if (!data.hostName.trim()) {
    errors.hostName = '请输入被访人姓名';
  }

  if (!data.hostDepartment) {
    errors.hostDepartment = '请选择被访人部门';
  }

  if (!data.visitPurpose.trim()) {
    errors.visitPurpose = '请输入来访事由';
  }

  if (!data.visitStartTime) {
    errors.visitStartTime = '请选择来访开始时间';
  }

  if (!data.visitEndTime) {
    errors.visitEndTime = '请选择来访结束时间';
  }

  if (data.visitStartTime && data.visitEndTime) {
    if (data.visitStartTime >= data.visitEndTime) {
      errors.visitEndTime = '结束时间必须晚于开始时间';
    }
  }

  return errors;
};

export const hasErrors = (errors: FormErrors): boolean => {
  return Object.keys(errors).length > 0;
};
