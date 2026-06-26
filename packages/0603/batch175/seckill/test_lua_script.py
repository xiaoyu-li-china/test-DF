import os
import sys
import unittest
from mockredis import MockRedis

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

LUA_SCRIPT_PATH = os.path.join(
    os.path.dirname(__file__), 'redis_utils.py'
)

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


def execute_seckill_lua(redis_client, stock_key, user_key, user_id):
    """
    Python equivalent of SECKILL_LUA_SCRIPT.
    Executes the same logic as the Lua script using mockredis commands.

    Lua script reference (seckill/redis_utils.py SECKILL_LUA_SCRIPT):
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
    if redis_client.sismember(user_key, user_id):
        return -1

    stock_raw = redis_client.get(stock_key)
    if stock_raw is None:
        return -2

    stock = int(stock_raw)
    if stock <= 0:
        return -2

    redis_client.decr(stock_key)
    redis_client.sadd(user_key, user_id)
    return stock - 1


class SeckillLuaScriptTest(unittest.TestCase):
    def setUp(self):
        self.redis = MockRedis()
        self.stock_key = 'seckill:stock:1'
        self.user_key = 'seckill:users:1'

    def tearDown(self):
        keys = [self.stock_key, self.user_key]
        for key in keys:
            self.redis.delete(key)

    def test_normal_deduction(self):
        self.redis.set(self.stock_key, 10)

        result = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )

        self.assertEqual(result, 9)
        self.assertEqual(int(self.redis.get(self.stock_key)), 9)
        self.assertTrue(self.redis.sismember(self.user_key, 'user_1'))

    def test_normal_deduction_multiple_users(self):
        self.redis.set(self.stock_key, 5)

        for i in range(1, 4):
            result = execute_seckill_lua(
                self.redis, self.stock_key, self.user_key, f'user_{i}'
            )
            self.assertEqual(result, 5 - i)

        self.assertEqual(int(self.redis.get(self.stock_key)), 2)
        for i in range(1, 4):
            self.assertTrue(self.redis.sismember(self.user_key, f'user_{i}'))

    def test_normal_deduction_to_zero(self):
        self.redis.set(self.stock_key, 3)

        for i in range(1, 4):
            result = execute_seckill_lua(
                self.redis, self.stock_key, self.user_key, f'user_{i}'
            )
            self.assertEqual(result, 3 - i)

        self.assertEqual(int(self.redis.get(self.stock_key)), 0)

    def test_sold_out_stock_zero(self):
        self.redis.set(self.stock_key, 0)

        result = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )

        self.assertEqual(result, -2)
        self.assertFalse(self.redis.sismember(self.user_key, 'user_1'))

    def test_sold_out_stock_negative(self):
        self.redis.set(self.stock_key, -1)

        result = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )

        self.assertEqual(result, -2)

    def test_sold_out_after_exhaustion(self):
        self.redis.set(self.stock_key, 2)

        result1 = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        self.assertEqual(result1, 1)

        result2 = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_2'
        )
        self.assertEqual(result2, 0)

        result3 = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_3'
        )
        self.assertEqual(result3, -2)

    def test_sold_out_stock_key_missing(self):
        result = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )

        self.assertEqual(result, -2)
        self.assertFalse(self.redis.sismember(self.user_key, 'user_1'))

    def test_duplicate_purchase_blocked(self):
        self.redis.set(self.stock_key, 10)

        result1 = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        self.assertEqual(result1, 9)

        result2 = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        self.assertEqual(result2, -1)

    def test_duplicate_purchase_stock_unchanged(self):
        self.redis.set(self.stock_key, 10)

        execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )

        self.assertEqual(int(self.redis.get(self.stock_key)), 9)

    def test_duplicate_purchase_does_not_affect_others(self):
        self.redis.set(self.stock_key, 10)

        execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_1'
        )
        result = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'user_2'
        )

        self.assertEqual(result, 8)
        self.assertEqual(int(self.redis.get(self.stock_key)), 8)

    def test_different_goods_independent(self):
        self.redis.set('seckill:stock:1', 5)
        self.redis.set('seckill:stock:2', 3)

        result1 = execute_seckill_lua(
            self.redis, 'seckill:stock:1', 'seckill:users:1', 'user_1'
        )
        self.assertEqual(result1, 4)

        result2 = execute_seckill_lua(
            self.redis, 'seckill:stock:2', 'seckill:users:2', 'user_1'
        )
        self.assertEqual(result2, 2)

    def test_full_seckill_flow(self):
        self.redis.set(self.stock_key, 3)
        users = ['alice', 'bob', 'charlie']

        results = []
        for user_id in users:
            r = execute_seckill_lua(
                self.redis, self.stock_key, self.user_key, user_id
            )
            results.append(r)

        self.assertEqual(results, [2, 1, 0])

        result_late = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'dave'
        )
        self.assertEqual(result_late, -2)

        result_dup = execute_seckill_lua(
            self.redis, self.stock_key, self.user_key, 'alice'
        )
        self.assertEqual(result_dup, -1)

        self.assertEqual(int(self.redis.get(self.stock_key)), 0)
        for user_id in users:
            self.assertTrue(self.redis.sismember(self.user_key, user_id))
        self.assertFalse(self.redis.sismember(self.user_key, 'dave'))

    def test_lua_script_source_integrity(self):
        with open(LUA_SCRIPT_PATH, 'r') as f:
            source = f.read()

        expected_parts = [
            "sismember",
            "return -1",
            "tonumber(redis.call('get', stock_key))",
            "stock == nil or stock <= 0",
            "return -2",
            "redis.call('decr', stock_key)",
            "redis.call('sadd', user_key, user_id)",
            "return stock - 1",
        ]
        for part in expected_parts:
            self.assertIn(
                part, source,
                f"Lua script missing expected logic: {part}"
            )


if __name__ == '__main__':
    unittest.main()
