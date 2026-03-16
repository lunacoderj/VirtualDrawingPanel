"""
main.py
-------
Orchestrates hand tracking and gesture detection.
Optionally starts a WebSocket server to broadcast commands to a frontend.
"""

import cv2
import asyncio
import websockets
import json
import threading
from queue import Queue

from hand_tracker import HandTracker
from gesture_detector import GestureDetector

# WebSocket globals
clients = set()
command_queue = Queue()

async def websocket_handler(websocket, path):
    """Register client and keep connection alive."""
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

async def broadcast_commands():
    """Send commands from queue to all connected clients."""
    while True:
        if not command_queue.empty():
            cmd = command_queue.get()
            if clients:
                message = json.dumps(cmd)
                await asyncio.gather(*[client.send(message) for client in clients])
        await asyncio.sleep(0.01)   # small delay to avoid busy loop

def start_websocket_server():
    """Run WebSocket server in a separate thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    start_server = websockets.serve(websocket_handler, "localhost", 8765)
    loop.run_until_complete(start_server)
    loop.run_until_complete(broadcast_commands())
    loop.run_forever()

def main(use_websocket=False):
    # Initialise modules
    tracker = HandTracker(smoothing_window=5)
    detector = GestureDetector(pinch_threshold=40, pan_activation_frames=150)  # 5 sec @ 30 fps

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if use_websocket:
        # Start WebSocket server in background thread
        ws_thread = threading.Thread(target=start_websocket_server, daemon=True)
        ws_thread.start()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Flip horizontally for intuitive mirror view
        frame = cv2.flip(frame, 1)

        # 1. Detect hand(s) and get primary hand landmarks
        frame, hands_data = tracker.find_hands(frame, draw=True)   # draw for visual feedback

        # 2. Apply smoothing if hand present
        if hands_data:
            raw_landmarks = hands_data[0]['landmarks']
            smoothed = tracker.get_smoothed_landmarks(raw_landmarks)
            # Replace landmarks with smoothed ones for further processing
            hands_data[0]['landmarks'] = smoothed

        # 3. Recognise gesture
        cmd = detector.recognize(hands_data, frame.shape)

        # 4. Display gesture on frame (optional)
        cv2.putText(frame, f"Gesture: {cmd['gesture']}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow("Smart Virtual Drawing Panel", frame)

        # 5. Output command to console (or via WebSocket)
        print(cmd)   # or send to queue
        if use_websocket:
            command_queue.put(cmd)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    tracker.release()

if __name__ == "__main__":
    # Set use_websocket=True to enable WebSocket broadcasting
    main(use_websocket=False)