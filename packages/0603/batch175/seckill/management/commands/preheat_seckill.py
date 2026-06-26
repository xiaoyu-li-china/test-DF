from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from seckill.models import SeckillGoods
from seckill.redis_utils import redis_client


class Command(BaseCommand):
    help = '预热秒杀活动：将开始时间在5分钟内的商品库存预加载到Redis'

    def add_arguments(self, parser):
        parser.add_argument(
            '--goods-id',
            type=int,
            help='指定商品ID预热，不指定则自动预热所有即将开始的商品'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='预热所有活动状态为激活的商品'
        )

    def handle(self, *args, **options):
        goods_id = options.get('goods_id')
        all_goods = options.get('all')
        now = timezone.now()

        if goods_id:
            try:
                goods = SeckillGoods.objects.get(id=goods_id, is_active=True)
                self.preheat_goods(goods)
            except SeckillGoods.DoesNotExist:
                raise CommandError(f'商品ID {goods_id} 不存在或未激活')
        elif all_goods:
            goods_list = SeckillGoods.objects.filter(is_active=True)
            for goods in goods_list:
                self.preheat_goods(goods)
        else:
            preheat_window_end = now + timedelta(
                minutes=redis_client.PREHEAT_WINDOW_MINUTES
            )
            goods_list = SeckillGoods.objects.filter(
                is_active=True,
                start_time__gt=now,
                start_time__lte=preheat_window_end
            )
            if not goods_list.exists():
                self.stdout.write(self.style.WARNING('没有即将开始的秒杀活动需要预热'))
                return
            for goods in goods_list:
                self.preheat_goods(goods)

    def preheat_goods(self, goods):
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

        self.stdout.write(
            self.style.SUCCESS(
                f'预热成功: 商品[{goods.id}] {goods.name} '
                f'库存={goods.stock} 开始时间={goods.start_time}'
            )
        )
