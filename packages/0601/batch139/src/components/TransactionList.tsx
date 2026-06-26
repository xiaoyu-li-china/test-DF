import { useRef, useCallback } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Store, Clock, Loader2 } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
}

function TransactionItem({ transaction, index }: TransactionItemProps) {
  const isRecharge = transaction.type === 'recharge';

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm animate-fade-in-up hover:shadow-md transition-shadow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
          isRecharge ? 'bg-green-100' : 'bg-caramel-100'
        }`}
      >
        {isRecharge ? (
          <ArrowUpCircle size={24} className="text-green-600" />
        ) : (
          <ArrowDownCircle size={24} className="text-caramel-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-800 truncate">{transaction.description}</span>
          <span
            className={`font-semibold ${isRecharge ? 'text-green-600' : 'text-gray-800'}`}
          >
            {isRecharge ? '+' : ''}
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Store size={12} />
            <span className="truncate">{transaction.storeName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDateTime(transaction.createdAt)}</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          余额: {formatCurrency(transaction.balanceAfter)}
        </div>
      </div>
    </div>
  );
}

export default function TransactionList() {
  const { transactions, loading, hasMoreTransactions, loadMoreTransactions } = useMemberStore();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading.transactions) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node && hasMoreTransactions) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              loadMoreTransactions();
            }
          },
          { threshold: 0.1 }
        );

        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [loading.transactions, hasMoreTransactions, loadMoreTransactions]
  );

  if (loading.transactions && transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">消费记录</h3>
        <span className="text-sm text-gray-500">共 {transactions.length} 条</span>
      </div>

      <div className="space-y-3">
        {transactions.map((tx, index) => (
          <div
            key={tx.id}
            ref={index === transactions.length - 1 ? lastItemRef : null}
          >
            <TransactionItem transaction={tx} index={index} />
          </div>
        ))}
      </div>

      {loading.transactions && transactions.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-caramel-500" />
        </div>
      )}

      {!hasMoreTransactions && transactions.length > 0 && (
        <div className="text-center text-sm text-gray-400 py-4">
          — 没有更多记录了 —
        </div>
      )}
    </div>
  );
}
