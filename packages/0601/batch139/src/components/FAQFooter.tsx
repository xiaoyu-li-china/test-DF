import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, CreditCard, RefreshCw, QrCode } from 'lucide-react';

interface FAQItem {
  id: string;
  icon: React.ReactNode;
  question: string;
  answer: React.ReactNode;
  category: '储值规则' | '退款政策' | '二维码使用';
}

const faqItems: FAQItem[] = [
  {
    id: 'faq-1',
    icon: <CreditCard size={18} />,
    category: '储值规则',
    question: '储值卡余额有没有有效期？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>储值卡余额长期有效，无过期限制。您可以随时使用账户内的余额进行消费。</p>
        <p className="text-gray-500">💡 提示：建议每月至少登录一次，关注账户余额和最新优惠活动。</p>
      </div>
    ),
  },
  {
    id: 'faq-2',
    icon: <CreditCard size={18} />,
    category: '储值规则',
    question: '充值赠送的优惠券如何使用？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>充值成功后，优惠券自动发放到您的账户中，有效期为 30 天。</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>¥100 档位：送 10 元面包券（满 30 可用）</li>
          <li>¥200 档位：送 30 元蛋糕券（满 100 可用）+ 赠 10 元余额</li>
          <li>¥500 档位：送 100 元生日蛋糕券（满 300 可用）+ 赠 50 元余额</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'faq-3',
    icon: <CreditCard size={18} />,
    category: '储值规则',
    question: '生日月双倍积分怎么算？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>生日当月（自然月），所有消费和充值均可获得双倍积分。</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>普通月份：消费 1 元 = 1 积分</li>
          <li>生日月份：消费 1 元 = 2 积分</li>
          <li>积分可兑换门店商品和专属优惠券</li>
        </ul>
        <p className="text-caramel-600 font-medium">请确保您的生日信息已正确填写！</p>
      </div>
    ),
  },
  {
    id: 'faq-4',
    icon: <RefreshCw size={18} />,
    category: '退款政策',
    question: '储值余额可以退款吗？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>根据相关规定，储值卡余额支持退款：</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li><strong>未消费余额</strong>：可申请全额退款，原路返回</li>
          <li><strong>赠送金额</strong>：退款时赠送部分不予退还</li>
          <li><strong>退款周期</strong>：提交申请后 3-5 个工作日到账</li>
        </ul>
        <p className="text-gray-500">📞 退款请联系客服热线：400-888-8888</p>
      </div>
    ),
  },
  {
    id: 'faq-5',
    icon: <RefreshCw size={18} />,
    category: '退款政策',
    question: '充值后可以取消吗？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>充值成功后，系统会立即发放赠送的优惠券和积分，因此：</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>充值 30 分钟内且未使用优惠券：可全额取消</li>
          <li>已使用赠送优惠券：优惠券价值将从退款中扣除</li>
          <li>超过 24 小时：按正常退款流程办理</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'faq-6',
    icon: <QrCode size={18} />,
    category: '二维码使用',
    question: '店员怎么扫码扣款？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p className="font-medium text-gray-700">扫码支付操作流程：</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-500">
          <li>点击余额卡片右上角的二维码图标</li>
          <li>向收银员出示付款码页面</li>
          <li>收银员使用扫码枪扫描您的二维码</li>
          <li>确认扣款金额后输入密码（如需）</li>
          <li>支付成功，自动更新余额</li>
        </ol>
        <p className="text-bakery-strawberry">⚠️ 请勿向陌生人展示付款码！</p>
      </div>
    ),
  },
  {
    id: 'faq-7',
    icon: <QrCode size={18} />,
    category: '二维码使用',
    question: '二维码安全吗？会过期吗？',
    answer: (
      <div className="space-y-2 text-sm text-gray-600">
        <p className="font-medium text-gray-700">安全机制说明：</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li><strong>动态刷新</strong>：二维码每分钟自动刷新一次</li>
          <li><strong>单次有效</strong>：每笔交易使用后立即失效</li>
          <li><strong>限额保护</strong>：单笔扫码支付上限 500 元</li>
          <li><strong>异常检测</strong>：异常位置触发短信验证</li>
        </ul>
        <p className="text-caramel-600">💡 如遇二维码失效，请下拉刷新页面</p>
      </div>
    ),
  },
];

export default function FAQFooter() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['faq-1']));

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const categories = [...new Set(faqItems.map((item) => item.category))];

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle size={20} className="text-caramel-500" />
          <h3 className="text-lg font-bold text-gray-800">常见问题</h3>
        </div>

        {categories.map((category) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category}
            </h4>
            <div className="space-y-2">
              {faqItems
                .filter((item) => item.category === category)
                .map((item) => {
                  const isExpanded = expandedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-xl overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-caramel-500">{item.icon}</span>
                        <span className="flex-1 font-medium text-gray-800">
                          {item.question}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 animate-fade-in-up">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">客服热线：400-888-8888</p>
          <p className="text-xs text-gray-400 mt-1">工作时间：周一至周日 8:00-22:00</p>
          <p className="text-xs text-gray-300 mt-4">© 2025 烘焙工坊会员系统 v1.0</p>
        </div>
      </div>
    </footer>
  );
}
