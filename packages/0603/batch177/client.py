import asyncio
import websockets

PING_INTERVAL = 30

async def heartbeat_client():
    uri = "ws://localhost:8765"
    print(f"连接到 {uri}")
    print(f"心跳间隔: {PING_INTERVAL}秒")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("连接成功！")
            
            ping_count = 0
            while True:
                await websocket.send("ping")
                ping_count += 1
                print(f"发送 ping #{ping_count}")
                
                response = await websocket.recv()
                print(f"收到响应: {response}")
                
                await asyncio.sleep(PING_INTERVAL)
    
    except websockets.exceptions.ConnectionClosed:
        print("连接已关闭（可能由于心跳超时）")
    except Exception as e:
        print(f"发生错误: {e}")

async def silent_client():
    uri = "ws://localhost:8765"
    print(f"静默客户端连接到 {uri}")
    print("该客户端不发送心跳，将在60秒后被服务器断开")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("连接成功！等待服务器断开...")
            
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5)
                    print(f"收到消息: {message}")
                except asyncio.TimeoutError:
                    print("等待中...")
                    
    except websockets.exceptions.ConnectionClosed:
        print("连接已被服务器关闭（心跳超时）")
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "silent":
        asyncio.run(silent_client())
    else:
        asyncio.run(heartbeat_client())
