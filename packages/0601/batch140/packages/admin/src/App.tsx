import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { Order, Leader } from '@group-buy/shared';
import {
  getMockOrders,
  getMockLeader,
  getPendingPickupOrders,
  getTodayOrders,
  calculateDailySummary,
  isValidOrder
} from '@group-buy/shared';
import './App.css';

type TabType = 'orders' | 'export' | 'commission';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [leader, setLeader] = useState<Leader | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    setOrders(getMockOrders());
    setLeader(getMockLeader());
  }, []);

  const filteredOrders = orders
    .filter(isValidOrder)
    .filter((o) => dayjs(o.groupDate).isSame(selectedDate, 'day'))
    .filter((o) => {
      if (!searchKeyword) return true;
      const kw = searchKeyword.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(kw) ||
        o.buyer.name.toLowerCase().includes(kw) ||
        o.buyer.phone.includes(kw) ||
        o.items.some((item) => item.productName.toLowerCase().includes(kw))
      );
    });

  const todaySummary = calculateDailySummary(orders, selectedDate);
  const todayOrders = getTodayOrders(orders);
  const pendingOrders = getPendingPickupOrders(orders);

  const exportToExcel = () => {
    const exportData = filteredOrders.map((order) => ({
      '订单编号': order.orderNo,
      '下单时间': dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      '提货码': order.pickupCode,
      '买家姓名': order.buyer.name,
      '联系电话': order.buyer.phone,
      '商品明细': order.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
      '订单金额': order.totalAmount,
      '佣金': order.commissionAmount,
      '订单状态': order.status,
      '提货状态': order.pickupStatus,
      '备注': order.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单明细');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob(['\uFEFF' + String.fromCharCode(...new Uint8Array(excelBuffer))], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `订单汇总_${selectedDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCommissionReport = () => {
    const dateOrders = orders
      .filter(isValidOrder)
      .filter((o) => dayjs(o.groupDate).isSame(selectedDate, 'day'));

    const exportData = [
      {
        '日期': selectedDate,
        '团长姓名': leader?.name,
        '社区名称': leader?.communityName,
        '订单总数': dateOrders.length,
        '销售总额': dateOrders.reduce((s, o) => s + o.totalAmount, 0),
        '佣金比例': `${(leader?.commissionRate || 0) * 100}%`,
        '佣金总额': dateOrders.reduce((s, o) => s + o.commissionAmount, 0)
      }
    ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '佣金结算');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob(['\uFEFF' + String.fromCharCode(...new Uint8Array(excelBuffer))], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `佣金结算_${selectedDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container header-content">
          <h1 className="logo">🥬 社区拼团管理系统</h1>
          <div className="leader-info">
            <span className="leader-name">{leader?.name}</span>
            <span className="leader-community">{leader?.communityName}</span>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="container">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              订单管理
            </button>
            <button
              className={`nav-tab ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              Excel导单
            </button>
            <button
              className={`nav-tab ${activeTab === 'commission' ? 'active' : ''}`}
              onClick={() => setActiveTab('commission')}
            >
              佣金结算
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        <div className="container">
          {activeTab === 'orders' && (
            <div className="tab-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{todayOrders.length}</div>
                  <div className="stat-label">今日订单</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{pendingOrders.length}</div>
                  <div className="stat-label">待提货</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">¥{todaySummary.totalAmount.toFixed(2)}</div>
                  <div className="stat-label">今日销售额</div>
                </div>
                <div className="stat-card primary">
                  <div className="stat-value">¥{todaySummary.commissionAmount.toFixed(2)}</div>
                  <div className="stat-label">今日佣金</div>
                </div>
              </div>

              <div className="filter-bar">
                <div className="filter-item">
                  <label>选择日期：</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label>搜索：</label>
                  <input
                    type="text"
                    placeholder="搜索订单号、姓名、商品"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>订单号</th>
                      <th>下单时间</th>
                      <th>提货码</th>
                      <th>买家</th>
                      <th>商品</th>
                      <th>金额</th>
                      <th>佣金</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderNo}</td>
                        <td>{dayjs(order.createdAt).format('MM-DD HH:mm')}</td>
                        <td>
                          <span className="pickup-code">{order.pickupCode}</span>
                        </td>
                        <td>
                          <div>{order.buyer.name}</div>
                          <div className="text-small">{order.buyer.phone}</div>
                        </td>
                        <td>
                          {order.items.slice(0, 2).map((item, i) => (
                            <div key={i} className="text-small">
                              {item.productName} x{item.quantity}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-small text-gray">等{item.length}件</div>
                          )}
                        </td>
                        <td>¥{order.totalAmount.toFixed(2)}</td>
                        <td className="text-green">+¥{order.commissionAmount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${order.pickupStatus}`}>
                            {order.pickupStatus === 'picked' ? '已提货' : '待提货'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="empty-state">暂无订单数据</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="tab-content">
              <div className="export-section">
                <h2>Excel 导单</h2>
                <p className="section-desc">
                  选择日期后导出订单明细，支持批量导出和打印
                </p>

                <div className="export-form">
                  <div className="form-group">
                    <label>导出日期：</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div className="export-summary">
                    <div className="summary-item">
                      <span className="label">订单数量：</span>
                      <span className="value">{filteredOrders.length} 单</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">商品总数：</span>
                      <span className="value">
                        {filteredOrders.reduce(
                          (s, o) => s + o.items.reduce((sum, i) => sum + i.quantity, 0),
                          0
                        )}{' '}
                        件
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">销售总额：</span>
                      <span className="value price">
                        ¥{filteredOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">佣金总额：</span>
                      <span className="value commission">
                        ¥{filteredOrders.reduce((s, o) => s + o.commissionAmount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="export-actions">
                    <button className="btn btn-primary" onClick={exportToExcel}>
                      📊 导出订单 Excel
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                      🖨️ 打印订单列表
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="tab-content">
              <div className="commission-section">
                <h2>佣金结算</h2>
                <p className="section-desc">查看团长佣金明细，导出结算报表</p>

                <div className="commission-cards">
                  <div className="commission-card">
                    <div className="card-label">累计佣金</div>
                    <div className="card-value">¥{leader?.totalCommission.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="commission-card green">
                    <div className="card-label">可提现</div>
                    <div className="card-value">¥{leader?.availableCommission.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="commission-card yellow">
                    <div className="card-label">冻结中</div>
                    <div className="card-value">¥{leader?.frozenCommission.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="commission-card blue">
                    <div className="card-label">佣金比例</div>
                    <div className="card-value">{((leader?.commissionRate || 0) * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="settlement-form">
                  <div className="form-group">
                    <label>结算日期：</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div className="settlement-summary">
                    <h3>当日结算明细</h3>
                    <div className="summary-grid">
                      <div className="summary-row">
                        <span>成团单数</span>
                        <span>{filteredOrders.length} 单</span>
                      </div>
                      <div className="summary-row">
                        <span>销售总额</span>
                        <span>¥{filteredOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</span>
                      </div>
                      <div className="summary-row highlight">
                        <span>应结佣金</span>
                        <span className="text-green">
                          ¥{filteredOrders.reduce((s, o) => s + o.commissionAmount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="export-actions">
                    <button className="btn btn-primary" onClick={exportCommissionReport}>
                      📑 导出结算报表
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
