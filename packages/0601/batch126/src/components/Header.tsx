import { useState, useEffect } from 'react';
import { Sun, Cloud, Maximize2, Settings, Store } from 'lucide-react';
import { usePriceStore } from '../store/usePriceStore';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toggleFullscreen, currentMarketId, markets, switchMarket } = usePriceStore();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${year}年${month}月${day}日 ${weekDays[date.getDay()]}`;
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const WeatherIcon = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 18) return <Sun className="w-8 h-8 text-yellow-400" />;
    return <Cloud className="w-8 h-8 text-gray-300" />;
  };

  const currentMarket = markets.find((m) => m.id === currentMarketId) || markets[0];

  return (
    <header className="bg-gradient-to-r from-green-800 via-green-700 to-green-800 text-white px-8 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-wider">
            🏪 {currentMarket.name} - 今日菜价公示大屏
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-green-900 bg-opacity-60 rounded-lg p-1">
            <Store className="w-5 h-5 mr-2 ml-2 text-green-300" />
            {markets.map((market) => (
              <button
                key={market.id}
                onClick={() => switchMarket(market.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentMarketId === market.id
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`}
              >
                {market.name.replace('农贸市场', '')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-green-900 bg-opacity-50 px-4 py-2 rounded-lg">
            <WeatherIcon />
            <div className="text-right">
              <div className="text-lg font-semibold">26°C 晴</div>
              <div className="text-sm text-green-200">湿度 65%</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-yellow-300">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-green-200">
              {formatDate(currentTime)}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-green-900 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors"
            title="全屏"
          >
            <Maximize2 className="w-6 h-6" />
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="p-2 bg-green-900 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors"
            title="管理后台"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="mt-1 text-xs text-green-300">
        📍 {currentMarket.address}
      </div>
    </header>
  );
}
