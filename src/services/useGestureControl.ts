import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GestureCommand = {
  gesture: string;
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  pinch_dist?: number;
  hover_progress?: number;
};

// Euclidean distance utility
const distance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export function useGestureControl(videoRef: MutableRefObject<HTMLVideoElement | null>) {
  const [command, setCommand] = useState<GestureCommand | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const processingRef = useRef(false);

  // State trackers
  const hoverStartRef = useRef<number | null>(null);
  const hoverLocationRef = useRef<{x: number, y: number} | null>(null);
  
  const lastCenterRef = useRef<{x: number, y: number} | null>(null);
  const lastPinchLocRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const initializeLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        landmarkerRef.current = landmarker;
        console.log("HandLandmarker loaded");
      } catch (err) {
        console.error("Failed to initialize MediaPipe", err);
      }
    };

    initializeLandmarker();

    const processFrame = () => {
      if (
        !landmarkerRef.current || 
        !videoRef.current || 
        videoRef.current.readyState < 2 || 
        processingRef.current
      ) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      processingRef.current = true;
      const video = videoRef.current;
      
      const startTimeMs = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, startTimeMs);
      
      handleGestures(results);
      
      processingRef.current = false;
      animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start loop
    animationFrameId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  const handleGestures = (results: HandLandmarkerResult) => {
    if (!results.landmarks || results.landmarks.length === 0) {
      // No hands
      setCommand(null);
      hoverStartRef.current = null;
      lastCenterRef.current = null;
      lastPinchLocRef.current = null;
      return;
    }

    const lm = results.landmarks[0]; // First hand
    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const indexMcp = lm[5];
    const middleTip = lm[12];
    const middleMcp = lm[9];
    const ringTip = lm[16];
    const ringMcp = lm[13];
    const pinkyTip = lm[20];
    const pinkyMcp = lm[17];

    // Count fingers 
    const fingersUp = [
      Math.abs(thumbTip.x - wrist.x) > Math.abs(indexMcp.x - wrist.x) ? 1 : 0, 
      indexTip.y < indexMcp.y ? 1 : 0,
      middleTip.y < middleMcp.y ? 1 : 0,
      ringTip.y < ringMcp.y ? 1 : 0,
      pinkyTip.y < pinkyMcp.y ? 1 : 0,
    ];

    const numFingers = fingersUp[1] + fingersUp[2] + fingersUp[3] + fingersUp[4];

    // Base coordinates - Mirror x because camera is mirrored
    const nx = 1.0 - indexTip.x;
    const ny = indexTip.y;
    const baseEvent = { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
    
    // Use wrist for panning stability
    const center = { x: 1.0 - wrist.x, y: wrist.y };

    const now = performance.now();
    let gestureToReturn = "HOVER";
    let dx = 0;
    let dy = 0;
    
    // --- 3 Second Hover Logic (Runs independent of gesture type) ---
    let hoverProgress = 0;
    if (numFingers > 0) {
      if (!hoverStartRef.current || !hoverLocationRef.current) {
         hoverStartRef.current = now;
         hoverLocationRef.current = { x: baseEvent.x, y: baseEvent.y };
      } else {
        const dist = distance(hoverLocationRef.current, {x: baseEvent.x, y: baseEvent.y});
        if (dist < 0.05) { // If pointer hasn't moved much
          const elapsed = now - hoverStartRef.current;
          hoverProgress = Math.min(elapsed / 3000, 1.0);
          if (elapsed > 3000) {
             gestureToReturn = "SELECT_TOOL";
             hoverStartRef.current = now; // reset
             hoverProgress = 0;
          }
        } else {
          // Moved too far, reset hover anchor
          hoverLocationRef.current = { x: baseEvent.x, y: baseEvent.y };
          hoverStartRef.current = now;
          hoverProgress = 0;
        }
      }
    } else {
      hoverStartRef.current = null; // Fist resets hover
    }

    // --- Gesture State Machine ---
    
    // FIST = PAUSE
    if (numFingers === 0) {
      gestureToReturn = "PAUSE";
      lastCenterRef.current = null;
      lastPinchLocRef.current = null;
    }
    // 5 FINGERS = PAN (Instant, no 5s wait)
    else if (fingersUp[1] && fingersUp[2] && fingersUp[3] && fingersUp[4] && fingersUp[0]) {
       gestureToReturn = "MOVE_CANVAS";
       if (lastCenterRef.current) {
          dx = center.x - lastCenterRef.current.x;
          dy = center.y - lastCenterRef.current.y;
       }
       lastCenterRef.current = center;
       lastPinchLocRef.current = null;
    }
    else {
      lastCenterRef.current = null;
      
      const pinchDist = distance(thumbTip, indexTip);
      
      // PINCH = SELECT / DRAG / ZOOM
      if (pinchDist < 0.08) {
        if (!lastPinchLocRef.current) {
          gestureToReturn = "PINCH"; // Initial grab
          lastPinchLocRef.current = { x: baseEvent.x, y: baseEvent.y };
        } else {
          gestureToReturn = "PINCH_MOVE";
          dx = baseEvent.x - lastPinchLocRef.current.x;
          dy = baseEvent.y - lastPinchLocRef.current.y;
          lastPinchLocRef.current = { x: baseEvent.x, y: baseEvent.y };
        }
      } 
      // 2 FINGERS = ERASE
      else if (fingersUp[1] && fingersUp[2] && !fingersUp[3] && !fingersUp[4]) {
        gestureToReturn = "ERASE";
        lastPinchLocRef.current = null;
      }
      // 1 FINGER = DRAW
      else if (fingersUp[1] && !fingersUp[2] && !fingersUp[3] && !fingersUp[4]) {
        // If SELECT_TOOL was triggered by the 3s hover, DO NOT overwrite it with DRAW.
        if (gestureToReturn !== "SELECT_TOOL") {
           gestureToReturn = "DRAW";
        }
        lastPinchLocRef.current = null;
      }
      else {
        // Fallback to HOVER
        if (gestureToReturn !== "SELECT_TOOL") {
            gestureToReturn = "HOVER";
        }
        lastPinchLocRef.current = null;
      }
    }

    setCommand({ ...baseEvent, gesture: gestureToReturn, hover_progress: hoverProgress, dx, dy });
  };

  return { lastCommand: command };
}
