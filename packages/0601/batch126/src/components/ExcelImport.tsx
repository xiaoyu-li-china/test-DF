import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, ArrowLeft, Camera, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePriceStore } from '../store/usePriceStore';
import { parseExcelFile, generateSampleExcel } from '../utils/excelParser';
import { OcrInput } from './OcrInput';
import type { PriceRecord } from '../types';

type TabType = 'excel' | 'ocr';

export function ExcelImport() {
  const [activeTab, setActiveTab] = useState<TabType>('ocr');
  const [isDragging, setIsDragging] = useState(false);
  const [importedData, setImportedData] = useState<PriceRecord[] | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateRecords } = usePriceStore();
  const navigate = useNavigate();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setMessage({ type: 'error', text: '请上传 Excel 文件 (.xlsx 或 .xls)' });
        return;
      }

      try {
        const data = await parseExcelFile(file);
        if (data.length === 0) {
          setMessage({ type: 'error', text: 'Excel 文件中没有找到数据' });
          return;
        }
        setImportedData(data);
        setMessage({ type: 'success', text: `成功解析 ${data.length} 条数据` });
      } catch (error) {
        setMessage({ type: 'error', text: '解析 Excel 文件失败，请检查文件格式' });
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = () => {
    if (importedData) {
      updateRecords(importedData);
      setMessage({ type: 'success', text: '数据已成功更新！' });
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">📊 数据管理后台</h1>
          </div>
          {activeTab === 'excel' && (
            <button
              onClick={generateSampleExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
            >
              <Download className="w-5 h-5" />
              下载模板
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'ocr'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            拍照识别
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'excel'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            Excel导入
          </button>
        </div>

        {activeTab === 'ocr' && <OcrInput />}

        {activeTab === 'excel' && (
          <>
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? 'border-green-500 bg-green-500 bg-opacity-10'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-gray-700 rounded-full">
                    <Upload className="w-12 h-12 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">拖拽 Excel 文件到这里</p>
                    <p className="text-gray-400 mt-2">或点击选择文件</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    支持 .xlsx, .xls 格式
                  </div>
                </div>
              </label>
            </div>

            {message && activeTab === 'excel' && (
              <div
                className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-900 bg-opacity-50' : 'bg-red-900 bg-opacity-50'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {importedData && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">数据预览</h2>
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left">品类</th>
                          <th className="px-4 py-3 text-left">摊位号</th>
                          <th className="px-4 py-3 text-right">今日价格</th>
                          <th className="px-4 py-3 text-left">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.map((record, index) => (
                          <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="px-4 py-3">
                              <span className="mr-2">{record.categoryIcon}</span>
                              {record.category}
                            </td>
                            <td className="px-4 py-3 font-mono">{record.stallNumber}</td>
                            <td className="px-4 py-3 text-right text-yellow-400 font-bold">
                              ¥{record.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-gray-400">{record.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                  <button
                    onClick={() => setImportedData(null)}
                    className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 transition-colors font-semibold"
                  >
                    确认导入
                  </button>
                </div>
              </div>
            )}

            <div className="mt-12 p-6 bg-gray-800 rounded-xl">
              <h3 className="text-lg font-bold mb-4">📋 Excel 格式要求</h3>
              <div className="text-gray-400 space-y-2">
                <p>Excel 文件需包含以下列：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="text-green-400">品类</code> - 商品名称（如：白菜、猪肉）</li>
                  <li><code className="text-green-400">摊位号</code> - 摊位编号（如：A01、B02）</li>
                  <li><code className="text-green-400">今日价格</code> - 价格数值</li>
                  <li><code className="text-green-400">单位</code> - 可选，默认：元/斤</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
