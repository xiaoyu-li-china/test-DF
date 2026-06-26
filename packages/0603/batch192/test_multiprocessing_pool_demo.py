import unittest
from unittest.mock import patch, MagicMock
import multiprocessing

from multiprocessing_pool_demo import (
    calculate_chunk_sum,
    build_chunks,
    multi_process_sum,
    single_process_sum,
)


class TestBuildChunks(unittest.TestCase):

    def test_evenly_divisible(self):
        chunks = build_chunks(100, 4)
        self.assertEqual(len(chunks), 4)
        ranges = [c[0] for c in chunks]
        lens = [c[1] for c in chunks]
        idxs = [c[2] for c in chunks]

        self.assertEqual(list(ranges[0]), list(range(0, 25)))
        self.assertEqual(list(ranges[1]), list(range(25, 50)))
        self.assertEqual(list(ranges[2]), list(range(50, 75)))
        self.assertEqual(list(ranges[3]), list(range(75, 100)))
        self.assertEqual(lens, [25, 25, 25, 25])
        self.assertEqual(idxs, [0, 1, 2, 3])

    def test_remainder_goes_to_last_chunk(self):
        chunks = build_chunks(10, 3)
        ranges = [c[0] for c in chunks]
        lens = [c[1] for c in chunks]

        self.assertEqual(list(ranges[0]), list(range(0, 3)))
        self.assertEqual(list(ranges[1]), list(range(3, 6)))
        self.assertEqual(list(ranges[2]), list(range(6, 10)))
        self.assertEqual(lens, [3, 3, 4])

    def test_single_process(self):
        chunks = build_chunks(50, 1)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(list(chunks[0][0]), list(range(0, 50)))
        self.assertEqual(chunks[0][1], 50)
        self.assertEqual(chunks[0][2], 0)

    def test_more_processes_than_items(self):
        chunks = build_chunks(3, 5)
        chunk_sizes = [c[1] for c in chunks]
        self.assertEqual(chunk_sizes, [0, 0, 0, 0, 3])

    def test_all_chunks_cover_full_range(self):
        n = 10000000
        num_proc = 8
        chunks = build_chunks(n, num_proc)
        all_values = []
        for c in chunks:
            all_values.extend(list(c[0]))
        self.assertEqual(len(all_values), n)
        self.assertEqual(all_values[0], 0)
        self.assertEqual(all_values[-1], n - 1)

    def test_enable_failure_test_flag(self):
        chunks_normal = build_chunks(100, 4, enable_failure_test=False)
        chunks_fail = build_chunks(100, 4, enable_failure_test=True)
        for c in chunks_normal:
            self.assertFalse(c[3])
        for c in chunks_fail:
            self.assertTrue(c[3])


class TestCalculateChunkSum(unittest.TestCase):

    def test_success_result(self):
        chunk = range(0, 5)
        result = calculate_chunk_sum((chunk, 5, 0, False))
        self.assertTrue(result["success"])
        self.assertEqual(result["chunk_idx"], 0)

        expected = 0
        for i in range(5):
            val = i * i
            expected += val * val + val * 2 + val // 3
        self.assertEqual(result["result"], expected)

    def test_failure_result(self):
        chunk = range(0, 10)
        result = calculate_chunk_sum((chunk, 10, 2, True))
        self.assertFalse(result["success"])
        self.assertEqual(result["chunk_idx"], 2)
        self.assertIn("模拟崩溃测试", result["error"])
        self.assertIn("RuntimeError", result["traceback"])

    def test_no_failure_when_flag_off(self):
        chunk = range(0, 10)
        result = calculate_chunk_sum((chunk, 10, 2, False))
        self.assertTrue(result["success"])

    def test_no_failure_for_other_indices(self):
        chunk = range(0, 10)
        result = calculate_chunk_sum((chunk, 10, 0, True))
        self.assertTrue(result["success"])
        result = calculate_chunk_sum((chunk, 10, 5, True))
        self.assertTrue(result["success"])

    def test_empty_chunk(self):
        chunk = range(0, 0)
        result = calculate_chunk_sum((chunk, 0, 0, False))
        self.assertTrue(result["success"])
        self.assertEqual(result["result"], 0)

    def test_unexpected_exception(self):
        class BadRange:
            def __iter__(self):
                raise TypeError("mock type error")

        chunk = BadRange()
        result = calculate_chunk_sum((chunk, 5, 3, False))
        self.assertFalse(result["success"])
        self.assertEqual(result["chunk_idx"], 3)
        self.assertIn("mock type error", result["error"])


class TestMultiProcessSum(unittest.TestCase):

    @patch("multiprocessing_pool_demo.multiprocessing.Pool")
    @patch("multiprocessing_pool_demo.multiprocessing.cpu_count", return_value=4)
    def test_all_succeed(self, mock_cpu, mock_pool_cls):
        mock_pool = MagicMock()
        mock_pool_cls.return_value.__enter__ = MagicMock(return_value=mock_pool)
        mock_pool_cls.return_value.__exit__ = MagicMock(return_value=False)

        mock_pool.imap_unordered.return_value = iter([
            {"success": True, "result": 100, "chunk_idx": 1},
            {"success": True, "result": 200, "chunk_idx": 0},
            {"success": True, "result": 300, "chunk_idx": 3},
            {"success": True, "result": 400, "chunk_idx": 2},
        ])

        total, elapsed, num_proc, failed = multi_process_sum(1000)
        self.assertEqual(total, 1000)
        self.assertEqual(num_proc, 4)
        self.assertEqual(failed, 0)
        self.assertGreaterEqual(elapsed, 0)

    @patch("multiprocessing_pool_demo.multiprocessing.Pool")
    @patch("multiprocessing_pool_demo.multiprocessing.cpu_count", return_value=4)
    def test_partial_failure(self, mock_cpu, mock_pool_cls):
        mock_pool = MagicMock()
        mock_pool_cls.return_value.__enter__ = MagicMock(return_value=mock_pool)
        mock_pool_cls.return_value.__exit__ = MagicMock(return_value=False)

        mock_pool.imap_unordered.return_value = iter([
            {"success": True, "result": 100, "chunk_idx": 0},
            {"success": True, "result": 200, "chunk_idx": 1},
            {"success": False, "error": "boom", "chunk_idx": 2, "traceback": "..."},
            {"success": True, "result": 400, "chunk_idx": 3},
        ])

        total, elapsed, num_proc, failed = multi_process_sum(1000)
        self.assertEqual(total, 700)
        self.assertEqual(num_proc, 4)
        self.assertEqual(failed, 1)

    @patch("multiprocessing_pool_demo.multiprocessing.Pool")
    @patch("multiprocessing_pool_demo.multiprocessing.cpu_count", return_value=2)
    def test_all_fail(self, mock_cpu, mock_pool_cls):
        mock_pool = MagicMock()
        mock_pool_cls.return_value.__enter__ = MagicMock(return_value=mock_pool)
        mock_pool_cls.return_value.__exit__ = MagicMock(return_value=False)

        mock_pool.imap_unordered.return_value = iter([
            {"success": False, "error": "err0", "chunk_idx": 0, "traceback": "..."},
            {"success": False, "error": "err1", "chunk_idx": 1, "traceback": "..."},
        ])

        total, elapsed, num_proc, failed = multi_process_sum(100)
        self.assertEqual(total, 0)
        self.assertEqual(failed, 2)

    @patch("multiprocessing_pool_demo.multiprocessing.Pool")
    def test_custom_num_processes(self, mock_pool_cls):
        mock_pool = MagicMock()
        mock_pool_cls.return_value.__enter__ = MagicMock(return_value=mock_pool)
        mock_pool_cls.return_value.__exit__ = MagicMock(return_value=False)

        mock_pool.imap_unordered.return_value = iter([
            {"success": True, "result": 50, "chunk_idx": i}
            for i in range(3)
        ])

        total, _, num_proc, failed = multi_process_sum(100, num_processes=3)
        self.assertEqual(num_proc, 3)
        self.assertEqual(failed, 0)
        mock_pool_cls.assert_called_with(processes=3)

    @patch("multiprocessing_pool_demo.multiprocessing.Pool")
    @patch("multiprocessing_pool_demo.multiprocessing.cpu_count", return_value=4)
    def test_calls_imap_unordered(self, mock_cpu, mock_pool_cls):
        mock_pool = MagicMock()
        mock_pool_cls.return_value.__enter__ = MagicMock(return_value=mock_pool)
        mock_pool_cls.return_value.__exit__ = MagicMock(return_value=False)

        mock_pool.imap_unordered.return_value = iter([
            {"success": True, "result": 10, "chunk_idx": 0},
        ])

        multi_process_sum(100, num_processes=1)
        mock_pool.imap_unordered.assert_called_once()


class TestSingleProcessSum(unittest.TestCase):

    def test_returns_correct_format(self):
        total, elapsed = single_process_sum(100)
        self.assertIsInstance(total, int)
        self.assertIsInstance(elapsed, float)
        self.assertGreater(elapsed, 0)

    def test_small_value_correctness(self):
        total, _ = single_process_sum(5)
        expected = 0
        for i in range(5):
            val = i * i
            expected += val * val + val * 2 + val // 3
        self.assertEqual(total, expected)

    def test_zero_range(self):
        total, elapsed = single_process_sum(0)
        self.assertEqual(total, 0)


class TestConsistency(unittest.TestCase):

    def test_single_vs_chunk_sum(self):
        n = 100
        single_total, _ = single_process_sum(n)

        chunks = build_chunks(n, 4)
        chunk_total = 0
        for chunk_args in chunks:
            result = calculate_chunk_sum(chunk_args)
            self.assertTrue(result["success"])
            chunk_total += result["result"]

        self.assertEqual(single_total, chunk_total)


if __name__ == "__main__":
    unittest.main()
