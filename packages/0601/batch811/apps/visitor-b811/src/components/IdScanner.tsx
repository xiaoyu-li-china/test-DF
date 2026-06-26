import React, { useState } from 'react';
import { IdCardInfo } from '../services/types';

interface IdScannerProps {
  onScan: (info: IdCardInfo) => void;
}

const IdScanner: React.FC<IdScannerProps> = ({ onScan }) => {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);

    setTimeout(() => {
      const mockIdCardInfo: IdCardInfo = {
        name: '张三',
        idNumber: '110101199001011234',
        gender: '男',
        birth: '1990-01-01',
        address: '北京市东城区某某街道123号',
      };

      setScanning(false);
      onScan(mockIdCardInfo);
    }, 1500);
  };

  return (
    <div className="scanner-section" onClick={handleScan}>
      <div className="scanner-icon">
        {scanning ? (
          <div className="loading-spinner" style={{ width: '64px', height: '64px', borderWidth: '6px', margin: '0 auto' }}></div>
        ) : (
          '📇'
        )}
      </div>
      <div className="scanner-text">
        {scanning ? '正在读取身份证信息...' : '点击此处扫描身份证'}
      </div>
    </div>
  );
};

export default IdScanner;
