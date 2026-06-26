import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import BalanceCard from '@/components/BalanceCard';
import RechargeTiers from '@/components/RechargeTiers';
import TransactionList from '@/components/TransactionList';
import RechargeModal from '@/components/RechargeModal';
import SuccessModal from '@/components/SuccessModal';
import QRCodeModal from '@/components/QRCodeModal';
import FAQFooter from '@/components/FAQFooter';

export default function MemberCard() {
  const { refreshAll, loading, error } = useMemberStore();
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-cream-100">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-caramel-400 to-caramel-500 text-white px-4 py-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">会员储值卡</h1>
          <button
            onClick={refreshAll}
            disabled={loading.member || loading.tiers || loading.transactions}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={
                loading.member || loading.tiers || loading.transactions
                  ? 'animate-spin'
                  : ''
              }
            />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <BalanceCard onShowQRCode={() => setShowQRCode(true)} />
        <RechargeTiers />
        <TransactionList />
      </main>

      <FAQFooter />

      <RechargeModal />
      <SuccessModal />
      <QRCodeModal show={showQRCode} onClose={() => setShowQRCode(false)} />
    </div>
  );
}
