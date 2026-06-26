import { useState, useCallback, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { usePriceStore } from '../store/usePriceStore';
import { getCategoryIcon } from '../utils/excelParser';
import type { PriceRecord } from '../types';
import { ABNORMAL_THRESHOLD } from '../types';

interface OcrResult {
  category: string;
  price: number;
  confidence: number;
  categoryIcon: string;
}

interface ParsedItem {
  category: string;
  categoryIcon: string;
  price: number;
  stallNumber: string;
  unit: string;
  confirmed: boolean;
}

export function OcrInput() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateRecords, currentMarketId } = usePriceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryKeywords: Record<string, string[]> = {
    '白菜': ['白菜', '大白菜', '小白菜', '洋白菜'],
    '猪肉': ['猪肉', '五花', '排骨', '瘦肉', '前腿', '后腿'],
    '牛肉': ['牛肉', '牛腩', '牛腱'],
    '鸡肉': ['鸡肉', '鸡胸', '鸡腿', '鸡翅', '整鸡'],
    '鸡蛋': ['鸡蛋', '蛋'],
    '西红柿': ['西红柿', '番茄', '圣女果'],
    '黄瓜': ['黄瓜', '青瓜'],
    '土豆': ['土豆', '马铃薯'],
    '胡萝卜': ['胡萝卜', '红萝卜'],
    '洋葱': ['洋葱', '葱头'],
    '青椒': ['青椒', '菜椒', '甜椒'],
    '茄子': ['茄子', '紫茄'],
    '豆角': ['豆角', '长豆', '四季豆'],
    '菠菜': ['菠菜', '波菜'],
    '生菜': ['生菜', '油麦菜'],
    '苹果': ['苹果', '红富士'],
    '香蕉': ['香蕉', '芭蕉'],
    '橘子': ['橘子', '橙子', '柑橘'],
    '西瓜': ['西瓜', '哈密瓜'],
    '大米': ['大米', '米', '稻米'],
  };

  const parseOcrText = useCallback((text: string): OcrResult[] => {
    const results: OcrResult[] = [];
    const lines = text.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      let matchedCategory = '';
      let matchedIcon = '📦';

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
          if (line.includes(keyword)) {
            matchedCategory = category;
            matchedIcon = getCategoryIcon(category);
            break;
          }
        }
        if (matchedCategory) break;
      }

      if (!matchedCategory) continue;

      const pricePatterns = [
        /[¥￥]\s*(\d+\.?\d*)/,
        /(\d+\.?\d*)\s*[元\/]/,
        /(\d+\.\d{1,2})/,
      ];

      let price = 0;
      let confidence = 0.6;

      for (const pattern of pricePatterns) {
        const match = line.match(pattern);
        if (match) {
          price = parseFloat(match[1]);
          confidence = 0.85;
          break;
        }
      }

      if (price > 0) {
        results.push({
          category: matchedCategory,
          categoryIcon: matchedIcon,
          price,
          confidence,
        });
      }
    }

    return results;
  }, []);

  const processImage = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setProgress(0);
      setMessage(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        setPreviewUrl(imageUrl);

        try {
          const Tesseract = await import('tesseract.js');
          const worker = await Tesseract.createWorker('chi_sim', undefined, {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                setProgress(Math.round(m.progress * 100));
              }
            },
          });

          const { data: { text } } = await worker.recognize(imageUrl);
          await worker.terminate();

          const results = parseOcrText(text);
          setOcrResults(results);

          if (results.length === 0) {
            setMessage({
              type: 'error',
              text: '未能从图片中识别出价格信息，请确保图片清晰且包含品类和价格',
            });
          } else {
            const items: ParsedItem[] = results.map((r, i) => ({
              category: r.category,
              categoryIcon: r.categoryIcon,
              price: r.price,
              stallNumber: `${String.fromCharCode(65 + Math.floor(i / 2))}${String((i % 2 + 1) * 2).padStart(2, '0')}`,
              unit: '元/斤',
              confirmed: true,
            }));
            setParsedItems(items);
            setMessage({
              type: 'success',
              text: `识别完成！共识别出 ${results.length} 个品类价格`,
            });
          }
        } catch (error) {
          setMessage({
            type: 'error',
            text: 'OCR识别失败，请重试或手动录入',
          });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [parseOcrText]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const toggleConfirmed = (index: number) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const updatePrice = (index: number, price: number) => {
    setParsedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, price } : item))
    );
  };

  const handleConfirmImport = () => {
    const confirmedItems = parsedItems.filter((item) => item.confirmed);
    if (confirmedItems.length === 0) {
      setMessage({ type: 'error', text: '请至少确认一条数据' });
      return;
    }

    const records: PriceRecord[] = confirmedItems.map((item, index) => ({
      id: `ocr-${currentMarketId}-${index + 1}`,
      category: item.category,
      categoryIcon: item.categoryIcon,
      stallNumber: item.stallNumber,
      price: item.price,
      unit: item.unit,
      yesterdayPrice: item.price,
      change: 0,
      history7Days: Array(7).fill(item.price),
      isAbnormal: false,
    }));

    updateRecords(records);
    setMessage({ type: 'success', text: 'OCR识别数据已成功导入！' });
  };

  const handleReset = () => {
    setOcrResults([]);
    setParsedItems([]);
    setPreviewUrl(null);
    setMessage(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          📸 拍照识别价签
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          用手机拍摄价签照片，系统将自动识别品类名称和价格。支持一次拍摄多个价签。
        </p>

        <div className="flex gap-4">
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
              id="camera-capture"
            />
            <label
              htmlFor="camera-capture"
              className="flex flex-col items-center gap-3 p-8 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-650 transition-colors border-2 border-dashed border-gray-500 hover:border-green-500"
            >
              <Camera className="w-12 h-12 text-green-400" />
              <span className="text-white font-medium">📱 拍照识别</span>
              <span className="text-gray-400 text-sm">使用手机摄像头拍摄价签</span>
            </label>
          </div>

          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center gap-3 p-8 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-650 transition-colors border-2 border-dashed border-gray-500 hover:border-green-500"
            >
              <Upload className="w-12 h-12 text-blue-400" />
              <span className="text-white font-medium">🖼️ 上传图片</span>
              <span className="text-gray-400 text-sm">从相册选择价签照片</span>
            </label>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
            <span className="text-white font-medium">正在识别中...</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">识别进度：{progress}%</p>
        </div>
      )}

      {previewUrl && !isProcessing && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">📷 原始图片</h3>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重新识别
            </button>
          </div>
          <img
            src={previewUrl}
            alt="价签照片"
            className="max-h-48 rounded-lg mx-auto"
          />
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-900 bg-opacity-50' : 'bg-red-900 bg-opacity-50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <XCircle className="w-6 h-6 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">✅ 识别结果（请确认并修正）</h3>
          <div className="space-y-3">
            {parsedItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  item.confirmed ? 'bg-gray-700' : 'bg-gray-700 bg-opacity-50'
                }`}
              >
                <button
                  onClick={() => toggleConfirmed(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    item.confirmed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  {item.confirmed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </button>

                <span className="text-2xl">{item.categoryIcon}</span>

                <div className="flex-1">
                  <div className="text-white font-medium">{item.category}</div>
                  <div className="text-gray-400 text-sm">{item.stallNumber}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400">¥</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                    className="w-24 bg-gray-600 text-yellow-400 font-bold text-lg px-3 py-1 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                    step="0.1"
                  />
                  <span className="text-gray-400 text-sm">/斤</span>
                </div>

                {ocrResults[index] && (
                  <div className="text-xs text-gray-500">
                    置信度: {Math.round(ocrResults[index].confidence * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              重新识别
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 transition-colors font-semibold"
            >
              确认导入 ({parsedItems.filter((i) => i.confirmed).length} 条)
            </button>
          </div>
        </div>
      )}

      <div className="p-6 bg-gray-800 rounded-xl">
        <h3 className="text-lg font-bold mb-4">💡 拍照识别提示</h3>
        <div className="text-gray-400 space-y-2 text-sm">
          <p>1. 尽量拍摄清晰、光线充足的价签照片</p>
          <p>2. 确保价签上的品类名称和价格清晰可见</p>
          <p>3. 支持一次拍摄多个价签，系统将批量识别</p>
          <p>4. 识别后请仔细核对价格，如有误可手动修改</p>
          <p>5. 点击 ✓ 可取消不需要的条目，点击 ✗ 可恢复</p>
        </div>
      </div>
    </div>
  );
}
