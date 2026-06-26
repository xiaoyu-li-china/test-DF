import { useEffect } from 'react';
import { Header } from '../components/Header';
import { PriceScroll } from '../components/PriceScroll';
import { PriceChart } from '../components/PriceChart';
import { RankList } from '../components/RankList';
import { usePriceStore } from '../store/usePriceStore';

export function Dashboard() {
  const { loadData } = usePriceStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-6">
          <div className="col-span-4 h-full">
            <PriceScroll />
          </div>

          <div className="col-span-5 h-full flex flex-col gap-6">
            <div className="flex-1">
              <PriceChart />
            </div>
          </div>

          <div className="col-span-3 h-full">
            <RankList />
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 bg-opacity-50 px-8 py-3 text-center">
        <p className="text-gray-500 text-sm">
          💡 点击任意菜品可查看详细走势 | 数据每日早市更新 | 城东农贸市场管理处 宣
        </p>
      </footer>
    </div>
  );
}
