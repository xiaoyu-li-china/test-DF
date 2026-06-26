import uuid
import logging
from celery import shared_task
from django.db import transaction, IntegrityError
from django.utils import timezone
from .models import SeckillGoods, SeckillOrder

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=2)
def create_seckill_order(self, user_id, goods_id):
    try:
        with transaction.atomic():
            goods = SeckillGoods.objects.select_for_update().get(
                id=goods_id, is_active=True
            )

            if SeckillOrder.objects.filter(
                user_id=user_id, goods_id=goods_id
            ).exists():
                logger.warning(
                    'Duplicate seckill order blocked: user=%s goods=%s',
                    user_id, goods_id
                )
                return {'success': False, 'message': '用户已秒杀过该商品'}

            if goods.stock <= 0:
                logger.warning(
                    'Stock exhausted in DB: goods=%s', goods_id
                )
                return {'success': False, 'message': '商品已售罄'}

            order_no = (
                f'SECK{timezone.now().strftime("%Y%m%d%H%M%S")}'
                f'{uuid.uuid4().hex[:8].upper()}'
            )

            SeckillOrder.objects.create(
                user_id=user_id,
                goods_id=goods_id,
                order_no=order_no,
                price=goods.seckill_price
            )

            goods.stock = goods.stock - 1
            goods.save(update_fields=['stock', 'updated_at'])

            return {
                'success': True,
                'order_no': order_no,
                'message': '订单创建成功'
            }

    except IntegrityError:
        logger.warning(
            'IntegrityError on seckill order: user=%s goods=%s',
            user_id, goods_id
        )
        return {'success': False, 'message': '用户已秒杀过该商品'}

    except SeckillGoods.DoesNotExist:
        logger.error('Goods not found: goods=%s', goods_id)
        return {'success': False, 'message': '商品不存在'}

    except Exception as exc:
        logger.exception(
            'Unexpected error creating seckill order: user=%s goods=%s',
            user_id, goods_id
        )
        raise self.retry(exc=exc)
