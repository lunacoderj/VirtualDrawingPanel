import cv2
import asyncio

from hand_tracker import HandTracker
from gesture_detector import GestureDetector
from websocket_server import send_command, start_server


tracker=HandTracker()
controller=GestureDetector()

cap=cv2.VideoCapture(0)


async def run():
    # Start WebSocket server
    await start_server()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("ERROR: Failed to capture from webcam.")
            print("If the React app is currently displaying the Camera Preview, your OS may block Python from accessing the camera at the same time. Try closing the Camera Preview in the browser and restarting this script.")
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        landmarks = tracker.get_landmarks(frame)

        if landmarks:
            cmd = controller.detect(landmarks, w, h)
            if cmd:
                print(cmd)
                await send_command(cmd)

        cv2.imshow("Gesture Engine", frame)

        # waitKey needs a small delay, also we need to yield to the event loop
        if cv2.waitKey(1) == 27:
            break
            
        await asyncio.sleep(0.01)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    asyncio.run(run())