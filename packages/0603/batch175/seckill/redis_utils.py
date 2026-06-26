import redis
from django.conf import settings


SECKILL_LUA_SCRIPT = """
local stock_key = KEYS[1]
local user_key = KEYS[2]
local user_id = ARGV[1]

if redis.call('sismember', user_key, user_id) == 1 then
    return -1
end

local stock = tonumber(redis.call('get', stock_key))
if stock == nil or stock <= 0 then
    return -2
end

redis.call('decr', stock_key)
redis.call('sadd', user_key, user_id)
return stock - 1
"""


PREHEAT_LUA_SCRIPT = """
local info_key = KEYS[1]
local stock_key = KEYS[2]
local start_ts = ARGV[1]
local end_ts = ARGV[2]
local stock = ARGV[3]
local goods_name = ARGV[4]
local seckill_price = ARGV[5]

redis.call('hset', info_key, 'start_ts', start_ts, 'end_ts', end_ts,
           'stock', stock, 'goods_name', goods_name,
           'seckill_price', seckill_price, 'preheated', 1)
redis.call('expireat', info_key, end_ts + 86400)

redis.call('set', stock_key, stock)
redis.call('expireat', stock_key, end_ts + 86400)

return 1
"""


class RedisClient:
    _instance = None
    PREHEAT_WINDOW_MINUTES = 5

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3
            )
            cls._instance._seckill_script = cls._instance.redis_client.register_script(
                SECKILL_LUA_SCRIPT
            )
            cls._instance._preheat_script = cls._instance.redis_client.register_script(
                PREHEAT_LUA_SCRIPT
            )
        return cls._instance

    @property
    def client(self):
        return self.redis_client

    @classmethod
    def get_stock_key(cls, goods_id):
        return f'seckill:stock:{goods_id}'

    @classmethod
    def get_user_key(cls, goods_id):
        return f'seckill:users:{goods_id}'

    @classmethod
    def get_info_key(cls, goods_id):
        return f'seckill:info:{goods_id}'

    def init_stock(self, goods_id, stock_count):
        stock_key = self.get_stock_key(goods_id)
        self.client.set(stock_key, stock_count)

    def get_stock(self, goods_id):
        stock_key = self.get_stock_key(goods_id)
        return int(self.client.get(stock_key) or 0)

    def execute_seckill(self, goods_id, user_id):
        stock_key = self.get_stock_key(goods_id)
        user_key = self.get_user_key(goods_id)
        result = self._seckill_script(
            keys=[stock_key, user_key],
            args=[user_id]
        )
        if result == -1:
            return {'success': False, 'code': 'DUPLICATE', 'message': '您已秒杀过该商品'}
        elif result == -2:
            return {'success': False, 'code': 'SOLD_OUT', 'message': '商品已售罄'}
        else:
            return {'success': True, 'code': 'OK', 'remaining_stock': result}

    def preheat(self, goods_id, start_timestamp, end_timestamp, stock, goods_name, seckill_price):
        info_key = self.get_info_key(goods_id)
        stock_key = self.get_stock_key(goods_id)
        self._preheat_script(
            keys=[info_key, stock_key],
            args=[
                int(start_timestamp),
                int(end_timestamp),
                int(stock),
                str(goods_name),
                float(seckill_price)
            ]
        )
        return True

    def is_preheated(self, goods_id):
        info_key = self.get_info_key(goods_id)
        return self.client.hget(info_key, 'preheated') == '1'

    def get_start_timestamp(self, goods_id):
        info_key = self.get_info_key(goods_id)
        ts = self.client.hget(info_key, 'start_ts')
        return int(ts) if ts else None

    def get_goods_info(self, goods_id):
        info_key = self.get_info_key(goods_id)
        data = self.client.hgetall(info_key)
        if not data:
            return None
        return {
            'start_ts': int(data.get('start_ts', 0)),
            'end_ts': int(data.get('end_ts', 0)),
            'stock': int(data.get('stock', 0)),
            'goods_name': data.get('goods_name', ''),
            'seckill_price': float(data.get('seckill_price', 0)),
            'preheated': data.get('preheated') == '1'
        }

    def clear_seckill_data(self, goods_id):
        info_key = self.get_info_key(goods_id)
        stock_key = self.get_stock_key(goods_id)
        user_key = self.get_user_key(goods_id)
        self.client.delete(info_key)
        self.client.delete(stock_key)
        self.client.delete(user_key)


redis_client = RedisClient()
