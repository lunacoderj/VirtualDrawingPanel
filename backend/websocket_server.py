import asyncio
import websockets
import json

clients=set()

async def handler(ws):

    clients.add(ws)

    try:
        async for msg in ws:
            pass
    finally:
        clients.remove(ws)


async def send_command(cmd):

    if clients:

        data=json.dumps(cmd)

        await asyncio.wait([
            client.send(data) for client in clients
        ])


async def start_server():
    print("WebSocket server starting on ws://localhost:8765")
    server = await websockets.serve(
        handler,
        "localhost",
        8765
    )
    # We purposefully don't wait_closed here, so the main loop can continue