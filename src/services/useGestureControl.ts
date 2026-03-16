import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GestureCommand = {
  gesture: string;
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  pinch_dist?: number;
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
  const panStartRef = useRef<number | null>(null);
  const hoverStartRef = useRef<number | null>(null);
  const hoverLocationRef = useRef<{x: number, y: number} | null>(null);
  const lastCanvasCenterRef = useRef<{x: number, y: number} | null>(null);
  
  const lastPinchRef = useRef<number | null>(null); // To detect Zooming
  const pinchStartDistRef = useRef<number | null>(null); 

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
      panStartRef.current = null;
      hoverStartRef.current = null;
      lastCanvasCenterRef.current = null;
      lastPinchRef.current = null;
      pinchStartDistRef.current = null;
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

    // Count fingers (naive 2D approach based on Y position relative to MCP joints, 
    // requires hand to be roughly upright. A 3D distance approach is better but this works for drawing)
    const fingersUp = [
      Math.abs(thumbTip.x - wrist.x) > Math.abs(indexMcp.x - wrist.x) ? 1 : 0, // Roughly speaking, thumb is extended horizontally 
      indexTip.y < indexMcp.y ? 1 : 0,
      middleTip.y < middleMcp.y ? 1 : 0,
      ringTip.y < ringMcp.y ? 1 : 0,
      pinkyTip.y < pinkyMcp.y ? 1 : 0,
    ];

    const numFingers = fingersUp[1] + fingersUp[2] + fingersUp[3] + fingersUp[4]; // excluding thumb for counts

    // Base coordinates - Mirror x because camera is mirrored
    const nx = 1.0 - indexTip.x;
    const ny = indexTip.y;
    const baseEvent = { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };

    const now = performance.now();

    // === 0 Fingers: FIST (PAUSE/STOP) ===
    if (numFingers === 0) {
      setCommand({ ...baseEvent, gesture: "PAUSE" });
      panStartRef.current = null;
      hoverStartRef.current = null;
      lastPinchRef.current = null;
      return;
    }

    // === 5 Fingers: PAN (Needs 5 seconds) ===
    if (fingersUp[1] && fingersUp[2] && fingersUp[3] && fingersUp[4] && fingersUp[0]) {
      if (!panStartRef.current) {
        panStartRef.current = now;
      } else if (now - panStartRef.current > 5000) {
        // We are panning
        const center = { x: 1.0 - wrist.x, y: wrist.y };
        if (lastCanvasCenterRef.current) {
          const dx = center.x - lastCanvasCenterRef.current.x;
          const dy = center.y - lastCanvasCenterRef.current.y;
          lastCanvasCenterRef.current = center;
          setCommand({ ...baseEvent, gesture: "MOVE_CANVAS", dx, dy });
          return;
        } else {
          lastCanvasCenterRef.current = center;
          setCommand({ ...baseEvent, gesture: "MOVE_CANVAS", dx: 0, dy: 0 });
          return;
        }
      }
      setCommand({ ...baseEvent, gesture: "HOVER" });
      hoverStartRef.current = null; // reset UI hover if 5 fingers
      return;
    } else {
      panStartRef.current = null;
      lastCanvasCenterRef.current = null;
    }

    // === PINCH (Select, Drag, Zoom) ===
    const pinchDist = distance(thumbTip, indexTip);
    if (pinchDist < 0.05) {
      hoverStartRef.current = null; // Pinching breaks UI hover

      if (!lastPinchRef.current) {
        lastPinchRef.current = now;
        pinchStartDistRef.current = baseEvent.y; // anchor Y for zoom
        setCommand({ ...baseEvent, gesture: "PINCH", pinch_dist: pinchDist }); // Initiates Select
      } else {
        // They are holding the pinch. Usually this means DRAG.
        // We can add logic: if Y moves drastically compared to X, maybe ZOOM.
        // For simplicity, we just keep sending PINCH_DRAG with Y delta.
        // And if the user moves UP/DOWN drastically (ZOOM).
        const dy = baseEvent.y - (pinchStartDistRef.current || baseEvent.y);
        
        // If they want Zoom In/Out via Pinch Up/Down:
        if (Math.abs(dy) > 0.05) {
            setCommand({ ...baseEvent, gesture: "PINCH_ZOOM", dy: dy });
        } else {
            setCommand({ ...baseEvent, gesture: "PINCH_DRAG", dx: 1.0 - indexTip.x, dy: indexTip.y });
        }
      }
      return;
    } else {
      lastPinchRef.current = null;
    }

    // === 2 Fingers (Index + Middle): ERASE ===
    if (fingersUp[1] && fingersUp[2] && !fingersUp[3] && !fingersUp[4]) {
      setCommand({ ...baseEvent, gesture: "ERASE" });
      hoverStartRef.current = null;
      return;
    }

    // === 1 Finger (Index): DRAW ===
    if (fingersUp[1] && !fingersUp[2] && !fingersUp[3] && !fingersUp[4]) {
      setCommand({ ...baseEvent, gesture: "DRAW" });
      hoverStartRef.current = null;
      return;
    }

    // === Hover & 3s Detect (for selecting UI) ===
    if (!hoverStartRef.current || !hoverLocationRef.current) {
       hoverStartRef.current = now;
       hoverLocationRef.current = { x: baseEvent.x, y: baseEvent.y };
    } else {
      // Check if we are still hovering in the roughly same 5% area
      const dist = distance(hoverLocationRef.current, {x: baseEvent.x, y: baseEvent.y});
      if (dist < 0.05) {
        if (now - hoverStartRef.current > 3000) {
           setCommand({ ...baseEvent, gesture: "SELECT_TOOL" }); // 3s hold trigger
           // Reset so we don't spam clicks
           hoverStartRef.current = now;
           return;
        }
      } else {
        // Moved too far, reset hover anchor
        hoverLocationRef.current = { x: baseEvent.x, y: baseEvent.y };
        hoverStartRef.current = now;
      }
    }

    setCommand({ ...baseEvent, gesture: "HOVER" });
  };

  return { lastCommand: command };
}
