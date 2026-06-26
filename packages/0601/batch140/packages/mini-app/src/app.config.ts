export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/pickup/index',
    'pages/orders/index',
    'pages/commission/index',
    'pages/mine/index',
    'pages/order-detail/index',
    'pages/withdraw/index',
    'pages/scan/index',
    'pages/supplier/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#07c160',
    navigationBarTitleText: '团长端',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f8fafc'
  },
  tabBar: {
    color: '#94a3b8',
    selectedColor: '#07c160',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/pickup/index',
        text: '待提货'
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单'
      },
      {
        pagePath: 'pages/commission/index',
        text: '佣金'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
});
