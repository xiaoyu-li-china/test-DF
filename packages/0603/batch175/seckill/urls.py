from django.urls import path
from . import views

urlpatterns = [
    path('seckill/', views.SeckillAPIView.as_view(), name='seckill'),
    path('seckill/preheat/', views.SeckillPreheatAPIView.as_view(), name='seckill-preheat'),
    path('seckill/status/<int:goods_id>/', views.SeckillStatusAPIView.as_view(), name='seckill-status'),
    path('seckill/init/', views.SeckillGoodsInitAPIView.as_view(), name='seckill-init'),
    path('seckill/stock/<int:goods_id>/', views.SeckillStockAPIView.as_view(), name='seckill-stock'),
]
