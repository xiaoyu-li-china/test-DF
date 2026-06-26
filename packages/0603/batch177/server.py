import asyncio
import websockets
import logging
from typing import Set, Optional
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

HEARTBEAT_TIMEOUT = 60
RECEIVE_TIMEOUT = 5

active_tasks: Set[asyncio.Task] = set()

def track_task(task: asyncio.Task) -> None:
    active_tasks.add(task)
    task.add_done_callback(lambda t: active_tasks.discard(t))

async def message_receiver(
    websocket,
    last_heartbeat: dict,
    stop_event: asyncio.Event
) -> None:
    client_addr = websocket.remote_address
    
    try:
        while not stop_event.is_set():
            try:
                message = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=RECEIVE_TIMEOUT
                )
                
                last_heartbeat['time'] = datetime.now()
                
                if message == "ping":
                    logger.info(f"收到心跳 ping 来自 {client_addr}")
                    await websocket.send("pong")
                else:
                    logger.info(f"收到消息来自 {client_addr}: {message}")
                    
            except asyncio.TimeoutError:
                continue
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"客户端断开 {client_addr}, 代码: {e.code}")
    except asyncio.CancelledError:
        logger.debug(f"消息接收任务被取消: {client_addr}")
        raise
    except Exception as e:
        logger.error(f"消息接收错误 {client_addr}: {e}")
    finally:
        stop_event.set()

async def heartbeat_monitor(
    websocket,
    last_heartbeat: dict,
    stop_event: asyncio.Event
) -> None:
    client_addr = websocket.remote_address
    
    try:
        while not stop_event.is_set():
            await asyncio.sleep(1)
            
            elapsed = datetime.now() - last_heartbeat['time']
            if elapsed > timedelta(seconds=HEARTBEAT_TIMEOUT):
                logger.warning(
                    f"心跳超时 ({elapsed.total_seconds():.1f}秒)，主动断开: {client_addr}"
                )
                try:
                    await websocket.close(code=1008, reason="Heartbeat timeout")
                except Exception:
                    pass
                break
                
    except asyncio.CancelledError:
        logger.debug(f"心跳监控任务被取消: {client_addr}")
        raise
    except Exception as e:
        logger.error(f"心跳监控错误 {client_addr}: {e}")
    finally:
        stop_event.set()

async def handle_client(websocket, path) -> None:
    client_addr = websocket.remote_address
    logger.info(f"新客户端连接: {client_addr}")
    
    last_heartbeat = {'time': datetime.now()}
    stop_event = asyncio.Event()
    
    receiver_task: Optional[asyncio.Task] = None
    monitor_task: Optional[asyncio.Task] = None
    
    try:
        receiver_task = asyncio.create_task(
            message_receiver(websocket, last_heartbeat, stop_event)
        )
        track_task(receiver_task)
        
        monitor_task = asyncio.create_task(
            heartbeat_monitor(websocket, last_heartbeat, stop_event)
        )
        track_task(monitor_task)
        
        await asyncio.gather(receiver_task, monitor_task, return_exceptions=True)
        
    except asyncio.CancelledError:
        logger.debug(f"处理器被取消: {client_addr}")
        raise
    except Exception as e:
        logger.error(f"处理客户端错误 {client_addr}: {e}")
    finally:
        stop_event.set()
        
        for task in [receiver_task, monitor_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await asyncio.wait_for(task, timeout=1.0)
                except (asyncio.CancelledError, asyncio.TimeoutError):
                    pass
                except Exception as e:
                    logger.debug(f"清理任务异常 {client_addr}: {e}")
        
        for task in [receiver_task, monitor_task]:
            if task in active_tasks:
                active_tasks.discard(task)
        
        logger.info(
            f"连接清理完成: {client_addr}, 活跃任务数: {len(active_tasks)}"
        )

async def cleanup_on_shutdown() -> None:
    logger.info(f"正在清理 {len(active_tasks)} 个活跃任务...")
    for task in list(active_tasks):
        if not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
    logger.info("所有任务已清理")

async def main():
    server = await websockets.serve(handle_client, "localhost", 8765)
    logger.info("WebSocket 服务器启动在 ws://localhost:8765")
    logger.info(f"心跳超时: {HEARTBEAT_TIMEOUT}秒, 接收超时: {RECEIVE_TIMEOUT}秒")
    
    try:
        await server.wait_closed()
    except asyncio.CancelledError:
        logger.info("服务器收到关闭信号")
        await cleanup_on_shutdown()
        raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("服务器已停止")
