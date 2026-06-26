import time
import multiprocessing
import logging
import traceback
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def calculate_chunk_sum(args):
    chunk, chunk_len, chunk_idx, fail_on_purpose = args
    try:
        if fail_on_purpose and chunk_idx == 2:
            raise RuntimeError(f"第 {chunk_idx} 号进程模拟崩溃测试")

        total = 0
        for i in chunk:
            val = i * i
            total += val * val + val * 2 + val // 3
        return {"success": True, "result": total, "chunk_idx": chunk_idx}

    except Exception as e:
        error_msg = f"Chunk {chunk_idx} 失败: {str(e)}"
        logger.error(error_msg)
        logger.error(f"堆栈信息:\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "chunk_idx": chunk_idx,
            "traceback": traceback.format_exc(),
        }


def single_process_sum(n):
    start = time.time()
    total = 0
    for i in tqdm(range(n), desc="单进程计算", unit="it"):
        val = i * i
        total += val * val + val * 2 + val // 3
    elapsed = time.time() - start
    return total, elapsed


def build_chunks(n, num_processes, enable_failure_test=False):
    chunk_size = n // num_processes
    chunks = []
    for i in range(num_processes):
        s = i * chunk_size
        e = s + chunk_size if i < num_processes - 1 else n
        chunks.append((range(s, e), e - s, i, enable_failure_test))
    return chunks


def multi_process_sum(n, num_processes=None, enable_failure_test=False):
    if num_processes is None:
        num_processes = multiprocessing.cpu_count()

    chunks = build_chunks(n, num_processes, enable_failure_test)

    start = time.time()
    success_results = []
    failed_chunks = []

    with multiprocessing.Pool(processes=num_processes) as pool:
        for result in tqdm(
            pool.imap_unordered(calculate_chunk_sum, chunks),
            total=num_processes,
            desc=f"多进程计算 ({num_processes}进程)",
            unit="chunk",
        ):
            if result["success"]:
                success_results.append(result)
            else:
                failed_chunks.append(result)

    total = sum(r["result"] for r in success_results)
    elapsed = time.time() - start

    if failed_chunks:
        logger.warning(f"完成！成功: {len(success_results)}/{num_processes}, 失败: {len(failed_chunks)}/{num_processes}")
        for failed in failed_chunks:
            logger.warning(f"  - Chunk {failed['chunk_idx']}: {failed['error']}")
    else:
        logger.info(f"所有 {num_processes} 个任务全部成功完成")

    return total, elapsed, num_processes, len(failed_chunks)


def main():
    N = 10000000
    print(f"计算 [i*i for i in range({N})] 的总和\n")
    print("=" * 60)

    print("【单进程计算】")
    single_total, single_time = single_process_sum(N)
    print(f"结果: {single_total}")
    print(f"耗时: {single_time:.4f} 秒\n")

    print("【多进程计算 - 正常模式】")
    multi_total, multi_time, num_proc, failed = multi_process_sum(N, enable_failure_test=False)
    print(f"进程数: {num_proc}")
    print(f"结果: {multi_total}")
    print(f"耗时: {multi_time:.4f} 秒")
    print(f"失败任务数: {failed}\n")

    print("=" * 60)
    print(f"结果一致性: {'✓ 一致' if single_total == multi_total else '✗ 不一致'}")
    print(f"加速比: {single_time / multi_time:.2f}x")
    print(f"时间节省: {(1 - multi_time / single_time) * 100:.1f}%\n")

    print("【多进程计算 - 异常测试模式 (第3个进程故意失败)】")
    multi_total_fail, multi_time_fail, num_proc_fail, failed_fail = multi_process_sum(
        N, enable_failure_test=True
    )
    print(f"进程数: {num_proc_fail}")
    print(f"结果 (部分完成): {multi_total_fail}")
    print(f"耗时: {multi_time_fail:.4f} 秒")
    print(f"失败任务数: {failed_fail}")
    print("(注意: 由于有进程失败，此结果仅为成功进程的部分和)\n")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
