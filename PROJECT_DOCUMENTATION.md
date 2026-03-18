# Smart Virtual Drawing Panel: Project Documentation

This document provides a comprehensive overview of the **Smart Virtual Drawing Panel**, detailing the tools, libraries, underlying theories, and the step-by-step process of how the Neural Network and Deep Learning (NNDL) components integrate with the frontend application.

## 1. Project Overview

The Smart Virtual Drawing Panel is a web-based, gesture-controlled digital whiteboard. It allows users to draw, erase, pan, zoom, and manipulate objects on a canvas entirely through hand gestures captured by a webcam, eliminating the need for a mouse or keyboard.

### Core Architecture Shift (Python to Pure React)
Initially, the project was envisioned with a Python backend running OpenCV and MediaPipe, communicating with a React frontend via WebSockets.
However, to make the application easily deployable as a static website, the architecture was shifted to a **100% Client-Side Single Page Application (SPA)**. The NNDL processing now happens directly in the user's web browser using WebAssembly.

---

## 2. Tools & Libraries Used

### 2.1 Neural Network & Deep Learning (NNDL) Core
*   **Library:** `@mediapipe/tasks-vision` (Google MediaPipe)
*   **Purpose:** The backbone of the gesture recognition system. It provides pre-trained Machine Learning models capable of detecting hands and extracting precise 3D coordinates for 21 hand landmarks (knuckles and fingertips) in real-time.
*   **Theory:** MediaPipe Hand Landmarker relies on a pipeline of multiple neural network models:
    1.  **Palm Detection Model:** Operates on the full image and returns an oriented hand bounding box.
    2.  **Hand Landmark Model:** Operates on the cropped image region defined by the palm detector and returns high-fidelity 3D hand keypoints.
*   **Why WebAssembly (Wasm)?** Running these complex ML models directly in JavaScript would be too slow. MediaPipe compiles its C++ high-performance NNDL models into WebAssembly, allowing them to run in the browser at near-native speeds.

### 2.2 Frontend Application
*   **Framework:** **React (with Vite)** - Used for building the modular User Interface (UI) components.
*   **Language:** **TypeScript** - Provides static typing on top of JavaScript, reducing bugs during development.
*   **Canvas Engine:** **Fabric.js** - A powerful HTML5 canvas library. It provides an interactive object model on top of the native canvas, allowing us to easily create, select, drag, scale, and manipulate shapes and free-hand drawings.
*   **Styling:** **Tailwind CSS** - A utility-first CSS framework used for rapidly designing the modern, glass-morphic UI.
*   **Animations:** **Framer Motion** - Used for smooth UI transitions (like tool selection and the color palette popups).
*   **Icons:** **Lucide React** - Vector icons used in the toolbar.

---

## 3. Step-by-Step NNDL Process & Logic

The core logic resides in the custom React hook: `src/services/useGestureControl.ts`.

### Step 3.1: Initialization and Model Loading
```typescript
const vision = await FilesetResolver.forVisionTasks(".../wasm");
const landmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: ".../hand_landmarker.task",
    delegate: "GPU" // Uses WebGL hardware acceleration
  },
  runningMode: "VIDEO",
  numHands: 1,
});
```
*   **Process:** When the app loads, it downloads the pre-trained `hand_landmarker.task` weights and initializes the WebAssembly environment, configuring the model to run optimally on the user's GPU.

### Step 3.2: Real-time Video Inference
```typescript
const processFrame = () => {
    // ... wait for video to be ready ...
    const results = landmarkerRef.current.detectForVideo(video, performance.now());
    handleGestures(results); // Pass NNDL results to the logic engine
    requestAnimationFrame(processFrame); // Loop continuously
};
```
*   **Process:** `requestAnimationFrame` creates a highly optimized loop synchronized with the monitor's refresh rate. In every frame, the current webcam image is fed into the MediaPipe Neural Network.
*   **Output:** The NNDL model outputs `results.landmarks`, an array containing the `[x, y, z]` coordinates of 21 specific points on the detected hand.

### Step 3.3: Finger State Detection (The Logic)
```typescript
    // Count fingers (naive 2D approach based on Y position relative to MCP joints)
    const fingersUp = [
      Math.abs(thumbTip.x - wrist.x) > Math.abs(indexMcp.x - wrist.x) ? 1 : 0, 
      indexTip.y < indexMcp.y ? 1 : 0,    // Is Index tip higher than knuckle?
      middleTip.y < middleMcp.y ? 1 : 0,  // Is Middle tip higher than knuckle?
      ringTip.y < ringMcp.y ? 1 : 0,
      pinkyTip.y < pinkyMcp.y ? 1 : 0,
    ];
```
*   **Logic:** Once the 21 landmarks are extracted by the NNDL model, we apply heuristic logic to determine which fingers are raised. We compare the vertical `y` coordinate of the fingertip to its corresponding base knuckle (MCP joint). If the tip is "higher" (lower `y` value because screen coordinates start at the top), the finger is considered "Up".

### Step 3.4: Gesture Classification
We use a State Machine to translate the `fingersUp` array into actionable commands:

*   **1 Finger (Index): `DRAW`**
    *   *Condition:* Only index finger is up.
    *   *Data:* Emits the normalized `(x, y)` position of the index fingertip.
*   **2 Fingers (Index + Middle): `ERASE`**
    *   *Condition:* Index and Middle fingers are up.
*   **5 Fingers: `MOVE_CANVAS` (Pan)**
    *   *Condition:* All five fingers are detected as up.
    *   *Data:* Calculates the difference (`dx`, `dy`) of the wrist position between frames to determine how far the hand moved.
*   **0 Fingers (Fist): `PAUSE`**
    *   *Condition:* No fingers are up. Stops all current actions.
*   **Pinch Gesture: `PINCH` / `PINCH_MOVE`**
    *   *Logic:* Calculates the Euclidean distance between the `thumbTip` and `indexTip`.
    *   ```typescript
        const pinchDist = distance(thumbTip, indexTip);
        if (pinchDist < 0.08) { ... trigger pinch logic ... }
        ```

### Step 3.5: Hover Progression (UI Interaction)
Instead of hardcoding gestures to click buttons, the engine tracks how long a gesture stays relatively still:
```typescript
const dist = distance(hoverLocationRef.current, {x: baseEvent.x, y: baseEvent.y});
if (dist < 0.05) { // If pointer hasn't moved much
    const elapsed = now - hoverStartRef.current;
    hoverProgress = Math.min(elapsed / 3000, 1.0); // 0.0 to 1.0
    if (elapsed > 3000) { gestureToReturn = "SELECT_TOOL"; }
}
```

---

## 4. Frontend Integration: How Gestures Control the Canvas

The NNDL logic outputs structured command objects (e.g., `{ gesture: "DRAW", x: 0.5, y: 0.5 }`). The `src/components/CanvasBoard.tsx` component is responsible for translating these abstract commands into actual visual changes on the screen.

### Connection Method: Synthetic Events
Fabric.js expects mouse or touch events to draw or select objects. Because we are using gestures, we "fake" these mouse events (Synthetic Events) and feed them directly into Fabric's internal engine.

#### Example: Drawing
When the NNDL engine emits a `DRAW` command:
1.  **Coordinate Mapping:** The normalized coordinates `(0.0 to 1.0)` are converted to absolute screen pixels.
2.  **State Management:** If it's the start of a stroke, we simulate a `mousedown`. If the stroke is continuing, we simulate a `mousemove`.
```typescript
// Inside CanvasBoard.tsx
if (gesture === "DRAW") {
    const fakeEvent = {
        clientX: screenX,
        clientY: screenY,
        type: isDrawing ? 'mousemove' : 'mousedown', // Start or continue stroke
    } as unknown as MouseEvent;

    if (!isDrawing) {
        fabricCanvas._onMouseDown(fakeEvent); // Tell Fabric to start drawing
        setIsDrawing(true);
    } else {
        fabricCanvas._onMouseMove(fakeEvent); // Tell Fabric to continue the line
    }
}
```

### Advanced Interactions: Erasing (Raycasting)
To erase specific strokes without deleting the whole canvas, we use a technique called "Raycasting".
```typescript
if (gesture === "ERASE") {
    // 1. Get the mathematical point on the canvas corresponding to the finger
    const point = fabricCanvas.getScenePoint({ clientX: screenX, clientY: screenY } as any);
    
    // 2. Ask Fabric.js to check every object to see if it intersects with that point
    const objs = fabricCanvas.getObjects();
    for (let i = objs.length - 1; i >= 0; i--) {
        if (objs[i].containsPoint(point)) {
            // 3. If an intersection is found, remove that specific object
            fabricCanvas.remove(objs[i]);
            break; 
        }
    }
}
```

### Advanced Interactions: Global Pinch Zoom
When the user pinches and moves their hand up or down (`dy`), the code calculates a new zoom multiplier and applies it to the canvas focal point:
```typescript
if (gesture === "PINCH_MOVE") {
    let newZoom = fabricCanvas.getZoom();
    newZoom -= dy * 5; // Negative dy (moving hand up) increases zoom
    
    // Apply bounds
    if (newZoom > 20) newZoom = 20;
    if (newZoom < 0.1) newZoom = 0.1;

    // Zoom into the specific point where the pinch happened
    fabricCanvas.zoomToPoint(new fabric.Point(canvasX, canvasY), newZoom);
}
```

---

## Summary of the Flow

1.  **Webcam Capture:** `CameraPreview.tsx` captures the raw video feed.
2.  **NNDL Processing:** The video frame is sent to `useGestureControl.ts`, where the WebAssembly MediaPipe ML models extract 21 3D hand coordinates.
3.  **Heuristic Logic:** Math functions determine finger states (up/down) and distances (pinching) to classify the gesture.
4.  **Event Output:** `useGestureControl.ts` outputs a continuous stream of `GestureCommand` objects containing the gesture name, coordinates, and hover progress.
5.  **UI Feedback:** `DrawingApp.tsx` reads the `(x, y)` coordinates and `hover_progress` to move the red virtual cursor and draw the circular progress ring.
6.  **Canvas Action:** `CanvasBoard.tsx` intercepts the `GestureCommand`. It translates normalized coordinates into screen pixels and uses Fabric.js mathematical functions (like `getScenePoint` or `containsPoint`) and Synthetic Mouse Events to manipulate the canvas seamlessly.
