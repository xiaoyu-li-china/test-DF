from django.contrib import admin
from .models import SeckillGoods, SeckillOrder


@admin.register(SeckillGoods)
class SeckillGoodsAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'price', 'seckill_price', 'stock',
                    'start_time', 'end_time', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(SeckillOrder)
class SeckillOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_no', 'user', 'goods', 'price', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['order_no', 'user__username', 'goods__name']
