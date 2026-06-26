import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, AlertCircle, X } from 'lucide-react';
import { parseExcelFile, downloadTemplate } from '../../utils/excelParser';
import { useAppStore } from '../../store/useAppStore';

interface ExcelImportProps {
  onClose: () => void;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; count: number; relationship: string; allergens: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importGuests = useAppStore((state) => state.importGuests);

  const handleFile = async (file: File) => {
    setError(null);
    setPreview([]);

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('请上传 Excel 文件（.xlsx 或 .xls 格式）');
      return;
    }

    try {
      const guests = await parseExcelFile(file);
      if (guests.length === 0) {
        setError('未找到有效的宾客数据');
        return;
      }
      setPreview(guests);
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    importGuests(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-champagne-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-champagne-100 rounded-lg">
              <FileSpreadsheet size={24} className="text-champagne-600" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-espresso-800">
                导入宾客名单
              </h3>
              <p className="text-sm text-espresso-500">支持 Excel 格式</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-espresso-50 text-espresso-400 hover:text-espresso-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8
              text-center cursor-pointer
              transition-all duration-200
              ${isDragging
                ? 'border-champagne-500 bg-champagne-50'
                : 'border-champagne-300 hover:border-champagne-400 hover:bg-champagne-50/50'
              }
            `}
          >
            <Upload
              size={40}
              className={`mx-auto mb-3 ${isDragging ? 'text-champagne-600' : 'text-champagne-400'}`}
            />
            <p className="text-espresso-700 font-medium mb-1">
              拖拽文件到此处，或点击选择
            </p>
            <p className="text-sm text-espresso-400">支持 .xlsx, .xls 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-espresso-700">
                  预览：共 {preview.length} 组宾客
                </p>
                <span className="text-xs text-espresso-500">
                  {preview.reduce((sum, g) => sum + g.count, 0)} 人
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-champagne-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-champagne-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-espresso-600 font-medium">姓名</th>
                      <th className="px-2 py-2 text-center text-espresso-600 font-medium">人数</th>
                      <th className="px-2 py-2 text-left text-espresso-600 font-medium">关系</th>
                      <th className="px-2 py-2 text-left text-espresso-600 font-medium">过敏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((guest, index) => (
                      <tr key={index} className="border-t border-champagne-100">
                        <td className="px-3 py-2 text-espresso-800">{guest.name}</td>
                        <td className="px-2 py-2 text-center text-espresso-600">{guest.count}</td>
                        <td className="px-2 py-2 text-espresso-600">{guest.relationship}</td>
                        <td className="px-2 py-2 text-amber-600">{guest.allergens || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="text-center text-xs text-espresso-400 py-2">
                    还有 {preview.length - 10} 组数据未显示...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-champagne-600 hover:text-champagne-700 transition-colors"
            >
              <Download size={16} />
              下载模板
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-champagne-300 text-espresso-600 hover:bg-champagne-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={preview.length === 0}
                className="
                  px-6 py-2 rounded-lg
                  bg-champagne-500 text-white
                  font-medium
                  hover:bg-champagne-600
                  disabled:bg-champagne-300 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                导入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
