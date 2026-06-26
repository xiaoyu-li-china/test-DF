from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SeckillGoods
from .serializers import SeckillRequestSerializer
from .redis_utils import redis_client
from .tasks import create_seckill_order


class SeckillAPIView(APIView):
    def post(self, request):
        serializer = SeckillRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'code': 400,
                'message': '参数错误',
                'data': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        goods_id = serializer.validated_data['goods_id']
        user_id = serializer.validated_data['user_id']

        try:
            goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
        except SeckillGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '秒杀商品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        if not redis_client.is_preheated(goods_id):
            return Response({
                'code': 400,
                'message': '活动未开始'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if now < goods.start_time:
            return Response({
                'code': 400,
                'message': '秒杀尚未开始'
            }, status=status.HTTP_400_BAD_REQUEST)

        if now > goods.end_time:
            return Response({
                'code': 400,
                'message': '秒杀已结束'
            }, status=status.HTTP_400_BAD_REQUEST)

        result = redis_client.execute_seckill(goods_id, user_id)

        if not result['success']:
            http_status = status.HTTP_400_BAD_REQUEST
            return Response({
                'code': 400,
                'message': result['message']
            }, status=http_status)

        create_seckill_order.delay(user_id, goods_id)

        return Response({
            'code': 200,
            'message': '秒杀成功，订单正在处理中',
            'data': {
                'goods_id': goods_id,
                'goods_name': goods.name,
                'remaining_stock': result['remaining_stock']
            }
        }, status=status.HTTP_200_OK)


class SeckillPreheatAPIView(APIView):
    def post(self, request):
        goods_id = request.data.get('goods_id')
        if not goods_id:
            return Response({
                'code': 400,
                'message': '缺少 goods_id 参数'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
        except SeckillGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '商品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        start_ts = int(goods.start_time.timestamp())
        end_ts = int(goods.end_time.timestamp())

        redis_client.preheat(
            goods_id=goods.id,
            start_timestamp=start_ts,
            end_timestamp=end_ts,
            stock=goods.stock,
            goods_name=goods.name,
            seckill_price=float(goods.seckill_price)
        )

        return Response({
            'code': 200,
            'message': '预热成功',
            'data': {
                'goods_id': goods_id,
                'goods_name': goods.name,
                'stock': goods.stock,
                'start_time': goods.start_time.isoformat(),
                'end_time': goods.end_time.isoformat()
            }
        })


class SeckillStatusAPIView(APIView):
    def get(self, request, goods_id):
        try:
            goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
        except SeckillGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '商品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        is_preheated = redis_client.is_preheated(goods_id)
        remaining_stock = redis_client.get_stock(goods_id)
        goods_info = redis_client.get_goods_info(goods_id)

        if now < goods.start_time:
            activity_status = 'NOT_STARTED'
            status_text = '秒杀未开始'
        elif now > goods.end_time:
            activity_status = 'ENDED'
            status_text = '秒杀已结束'
        elif remaining_stock <= 0 and is_preheated:
            activity_status = 'SOLD_OUT'
            status_text = '商品已售罄'
        else:
            activity_status = 'ONGOING'
            status_text = '秒杀进行中'

        data = {
            'goods_id': goods_id,
            'goods_name': goods.name,
            'seckill_price': float(goods.seckill_price),
            'original_price': float(goods.price),
            'total_stock': goods.stock,
            'remaining_stock': max(0, remaining_stock),
            'start_time': goods.start_time.isoformat(),
            'end_time': goods.end_time.isoformat(),
            'is_preheated': is_preheated,
            'activity_status': activity_status,
            'status_text': status_text,
        }

        if goods_info:
            data['preheated_start_ts'] = goods_info['start_ts']
            data['preheated_end_ts'] = goods_info['end_ts']

        return Response({
            'code': 200,
            'message': 'success',
            'data': data
        })


class SeckillGoodsInitAPIView(APIView):
    def post(self, request):
        goods_id = request.data.get('goods_id')
        if not goods_id:
            return Response({
                'code': 400,
                'message': '缺少 goods_id 参数'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
        except SeckillGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '商品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        redis_client.init_stock(goods_id, goods.stock)

        return Response({
            'code': 200,
            'message': '库存初始化成功',
            'data': {
                'goods_id': goods_id,
                'stock': goods.stock
            }
        })


class SeckillStockAPIView(APIView):
    def get(self, request, goods_id):
        try:
            goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
        except SeckillGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '商品不存在'
            }, status=status.HTTP_404_NOT_FOUND)

        stock = redis_client.get_stock(goods_id)

        return Response({
            'code': 200,
            'message': 'success',
            'data': {
                'goods_id': goods_id,
                'goods_name': goods.name,
                'remaining_stock': max(0, stock)
            }
        })
