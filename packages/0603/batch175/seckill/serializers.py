from rest_framework import serializers
from .models import SeckillGoods, SeckillOrder


class SeckillRequestSerializer(serializers.Serializer):
    goods_id = serializers.IntegerField(required=True, min_value=1)
    user_id = serializers.IntegerField(required=True, min_value=1)


class SeckillGoodsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeckillGoods
        fields = ['id', 'name', 'description', 'price', 'seckill_price',
                  'stock', 'start_time', 'end_time', 'is_active']


class SeckillOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeckillOrder
        fields = ['id', 'user', 'goods', 'order_no', 'price', 'status', 'created_at']
