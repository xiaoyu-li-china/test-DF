import { X, Smartphone } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import { maskCardNumber } from '@/utils/formatters';

interface QRCodeModalProps {
  show: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ show, onClose }: QRCodeModalProps) {
  const memberInfo = useMemberStore((state) => state.memberInfo);

  if (!show || !memberInfo) return null;

  const generateQRPattern = () => {
    const size = 21;
    const pattern: boolean[][] = [];

    for (let i = 0; i < size; i++) {
      pattern[i] = [];
      for (let j = 0; j < size; j++) {
        if (
          (i < 7 && j < 7) ||
          (i < 7 && j >= size - 7) ||
          (i >= size - 7 && j < 7)
        ) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || j === size - 7 || j === size - 1 || i === size - 7 || i === size - 1) {
            pattern[i][j] = true;
          } else if (i >= 2 && i <= 4 && j >= 2 && j <= 4) {
            pattern[i][j] = true;
          } else if (i >= 2 && i <= 4 && j >= size - 5 && j <= size - 3) {
            pattern[i][j] = true;
          } else if (i >= size - 5 && i <= size - 3 && j >= 2 && j <= 4) {
            pattern[i][j] = true;
          } else {
            pattern[i][j] = false;
          }
        } else {
          pattern[i][j] = Math.random() > 0.5;
        }
      }
    }

    return pattern;
  };

  const qrPattern = generateQRPattern();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">付款码</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">请向店员出示付款码</p>

          <div className="bg-white p-6 rounded-2xl border-4 border-caramel-200 shadow-lg inline-block">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(21, 8px)` }}>
              {qrPattern.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`w-2 h-2 ${cell ? 'bg-gray-900' : 'bg-white'}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-caramel-50 to-cream-100 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Smartphone size={16} className="text-caramel-600" />
              <span className="text-sm font-medium text-caramel-700">会员储值卡</span>
            </div>
            <p className="text-lg font-bold text-gray-800 tracking-wider">
              {maskCardNumber(memberInfo.cardNumber)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{memberInfo.memberName}</p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>二维码每分钟自动刷新</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
