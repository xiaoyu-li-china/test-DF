from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class SeckillGoods(models.Model):
    name = models.CharField('商品名称', max_length=200)
    description = models.TextField('商品描述', blank=True)
    price = models.DecimalField('原价', max_digits=10, decimal_places=2)
    seckill_price = models.DecimalField('秒杀价', max_digits=10, decimal_places=2)
    stock = models.IntegerField('库存数量')
    start_time = models.DateTimeField('秒杀开始时间')
    end_time = models.DateTimeField('秒杀结束时间')
    is_active = models.BooleanField('是否激活', default=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'seckill_goods'
        verbose_name = '秒杀商品'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class SeckillOrder(models.Model):
    STATUS_CHOICES = (
        (0, '待支付'),
        (1, '已支付'),
        (2, '已取消'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='用户')
    goods = models.ForeignKey(SeckillGoods, on_delete=models.CASCADE, verbose_name='秒杀商品')
    order_no = models.CharField('订单号', max_length=64, unique=True)
    price = models.DecimalField('秒杀价格', max_digits=10, decimal_places=2)
    status = models.SmallIntegerField('订单状态', choices=STATUS_CHOICES, default=0)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    paid_at = models.DateTimeField('支付时间', null=True, blank=True)

    class Meta:
        db_table = 'seckill_order'
        verbose_name = '秒杀订单'
        verbose_name_plural = verbose_name
        unique_together = ('user', 'goods')

    def __str__(self):
        return f'{self.user.username} - {self.goods.name}'
