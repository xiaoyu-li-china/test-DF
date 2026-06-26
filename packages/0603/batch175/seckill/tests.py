from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import SeckillGoods
from .redis_utils import redis_client

User = get_user_model()


def _preheat_goods(goods):
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


class SeckillAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='123456')
        self.goods = SeckillGoods.objects.create(
            name='测试商品',
            price=100.00,
            seckill_price=50.00,
            stock=10,
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=1),
            is_active=True
        )
        _preheat_goods(self.goods)

    def tearDown(self):
        redis_client.clear_seckill_data(self.goods.id)

    def test_seckill_success(self):
        response = self.client.post('/api/seckill/', {
            'goods_id': self.goods.id,
            'user_id': self.user.id
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['code'], 200)
        self.assertIn('remaining_stock', response.json()['data'])

    def test_seckill_duplicate(self):
        self.client.post('/api/seckill/', {
            'goods_id': self.goods.id,
            'user_id': self.user.id
        }, content_type='application/json')

        response = self.client.post('/api/seckill/', {
            'goods_id': self.goods.id,
            'user_id': self.user.id
        }, content_type='application/json')
        self.assertEqual(response.json()['code'], 400)
        self.assertIn('已秒杀过', response.json()['message'])

    def test_seckill_out_of_stock(self):
        for i in range(10):
            user = User.objects.create_user(username=f'user{i}', password='123456')
            self.client.post('/api/seckill/', {
                'goods_id': self.goods.id,
                'user_id': user.id
            }, content_type='application/json')

        user_last = User.objects.create_user(username='user_last', password='123456')
        response = self.client.post('/api/seckill/', {
            'goods_id': self.goods.id,
            'user_id': user_last.id
        }, content_type='application/json')
        self.assertEqual(response.json()['code'], 400)
        self.assertIn('售罄', response.json()['message'])

    def test_seckill_lua_atomic_duplicate(self):
        result1 = redis_client.execute_seckill(self.goods.id, self.user.id)
        self.assertTrue(result1['success'])

        result2 = redis_client.execute_seckill(self.goods.id, self.user.id)
        self.assertFalse(result2['success'])
        self.assertEqual(result2['code'], 'DUPLICATE')

    def test_seckill_lua_atomic_sold_out(self):
        for i in range(10):
            user = User.objects.create_user(username=f'atomuser{i}', password='123456')
            redis_client.execute_seckill(self.goods.id, user.id)

        result = redis_client.execute_seckill(self.goods.id, 9999)
        self.assertFalse(result['success'])
        self.assertEqual(result['code'], 'SOLD_OUT')


class SeckillPreheatTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='preheatuser', password='123456')
        self.future_goods = SeckillGoods.objects.create(
            name='即将开始商品',
            price=200.00,
            seckill_price=99.00,
            stock=50,
            start_time=timezone.now() + timedelta(minutes=2),
            end_time=timezone.now() + timedelta(hours=2),
            is_active=True
        )
        self.active_goods = SeckillGoods.objects.create(
            name='进行中商品',
            price=100.00,
            seckill_price=50.00,
            stock=20,
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=1),
            is_active=True
        )

    def tearDown(self):
        redis_client.clear_seckill_data(self.future_goods.id)
        redis_client.clear_seckill_data(self.active_goods.id)

    def test_seckill_without_preheat_returns_not_started(self):
        response = self.client.post('/api/seckill/', {
            'goods_id': self.active_goods.id,
            'user_id': self.user.id
        }, content_type='application/json')
        self.assertEqual(response.json()['code'], 400)
        self.assertEqual(response.json()['message'], '活动未开始')

    def test_preheat_api_success(self):
        response = self.client.post('/api/seckill/preheat/', {
            'goods_id': self.active_goods.id
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['code'], 200)
        self.assertTrue(redis_client.is_preheated(self.active_goods.id))

    def test_preheat_api_invalid_goods(self):
        response = self.client.post('/api/seckill/preheat/', {
            'goods_id': 99999
        }, content_type='application/json')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 404)

    def test_preheat_then_seckill_success(self):
        _preheat_goods(self.active_goods)
        response = self.client.post('/api/seckill/', {
            'goods_id': self.active_goods.id,
            'user_id': self.user.id
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['code'], 200)

    def test_preheat_stores_start_timestamp(self):
        _preheat_goods(self.future_goods)
        goods_info = redis_client.get_goods_info(self.future_goods.id)
        self.assertIsNotNone(goods_info)
        self.assertEqual(goods_info['stock'], 50)
        self.assertEqual(goods_info['goods_name'], '即将开始商品')
        self.assertIsNotNone(goods_info['start_ts'])
        self.assertTrue(goods_info['preheated'])


class SeckillStatusTest(TestCase):
    def setUp(self):
        self.not_started_goods = SeckillGoods.objects.create(
            name='未开始商品',
            price=100.00,
            seckill_price=50.00,
            stock=100,
            start_time=timezone.now() + timedelta(minutes=10),
            end_time=timezone.now() + timedelta(hours=2),
            is_active=True
        )
        self.active_goods = SeckillGoods.objects.create(
            name='进行中商品',
            price=100.00,
            seckill_price=50.00,
            stock=100,
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=1),
            is_active=True
        )
        _preheat_goods(self.active_goods)

    def tearDown(self):
        redis_client.clear_seckill_data(self.not_started_goods.id)
        redis_client.clear_seckill_data(self.active_goods.id)

    def test_status_not_started(self):
        response = self.client.get(f'/api/seckill/status/{self.not_started_goods.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        self.assertEqual(data['activity_status'], 'NOT_STARTED')
        self.assertEqual(data['status_text'], '秒杀未开始')
        self.assertFalse(data['is_preheated'])

    def test_status_ongoing(self):
        response = self.client.get(f'/api/seckill/status/{self.active_goods.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        self.assertEqual(data['activity_status'], 'ONGOING')
        self.assertEqual(data['status_text'], '秒杀进行中')
        self.assertTrue(data['is_preheated'])

    def test_status_sold_out(self):
        user = User.objects.create_user(username='solduser', password='123456')
        for i in range(100):
            u = User.objects.create_user(username=f'sold{i}', password='123456')
            redis_client.execute_seckill(self.active_goods.id, u.id)

        response = self.client.get(f'/api/seckill/status/{self.active_goods.id}/')
        data = response.json()['data']
        self.assertEqual(data['activity_status'], 'SOLD_OUT')
        self.assertEqual(data['status_text'], '商品已售罄')
        self.assertEqual(data['remaining_stock'], 0)

    def test_status_invalid_goods(self):
        response = self.client.get('/api/seckill/status/99999/')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 404)
