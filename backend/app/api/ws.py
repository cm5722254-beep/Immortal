import json
from collections import defaultdict
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

# Connected clients per episode: episode_id -> set of WebSocket connections
active_connections: Dict[int, Set[WebSocket]] = defaultdict(set)


class ConnectionManager:
    @staticmethod
    async def connect(episode_id: int, websocket: WebSocket):
        await websocket.accept()
        active_connections[episode_id].add(websocket)
        await ConnectionManager.broadcast_viewer_count(episode_id)

    @staticmethod
    async def disconnect(episode_id: int, websocket: WebSocket):
        active_connections[episode_id].discard(websocket)
        if not active_connections[episode_id]:
            del active_connections[episode_id]
        else:
            await ConnectionManager.broadcast_viewer_count(episode_id)

    @staticmethod
    async def broadcast_viewer_count(episode_id: int):
        count = len(active_connections.get(episode_id, []))
        message = json.dumps({"type": "VIEWER_COUNT", "count": count})
        for connection in list(active_connections.get(episode_id, [])):
            try:
                await connection.send_text(message)
            except Exception:
                pass

    @staticmethod
    async def broadcast_danmaku(episode_id: int, danmaku_data: dict):
        message = json.dumps({"type": "DANMAKU", "data": danmaku_data})
        for connection in list(active_connections.get(episode_id, [])):
            try:
                await connection.send_text(message)
            except Exception:
                pass


@router.websocket("/ws/watch/{episode_id}")
async def watch_stream_websocket(websocket: WebSocket, episode_id: int):
    await ConnectionManager.connect(episode_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                payload = json.loads(raw_data)
                event_type = payload.get("type")
                if event_type == "DANMAKU":
                    # Broadcast to everyone watching this episode
                    danmaku_data = payload.get("data", {})
                    await ConnectionManager.broadcast_danmaku(episode_id, danmaku_data)
                elif event_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ConnectionManager.disconnect(episode_id, websocket)
    except Exception:
        await ConnectionManager.disconnect(episode_id, websocket)
