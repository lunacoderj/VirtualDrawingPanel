import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { Tool, ThemeMode } from "./Toolbar";
import { ShapeType } from "./ShapeTools";
import { AnimatePresence, motion } from "framer-motion";
import { GestureCommand } from "../services/useGestureControl";

interface CanvasBoardProps {
  activeTool: Tool;
  brushColor: string;
  brushSize: number;
  themeMode: ThemeMode;
  showColors: boolean;
  setShowColors: (s: boolean) => void;
  setBrushColor: (c: string) => void;
  onCanvasReady: (canvas: fabric.Canvas) => void;
  lastCommand: GestureCommand | null;
}

const colors = [
  "hsl(185 80% 55%)", "#ffffff", "#ef4444", "#22c55e",
  "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1",
];

export const CanvasBoard: React.FC<CanvasBoardProps> = ({
  activeTool,
  brushColor,
  brushSize,
  themeMode,
  showColors,
  setShowColors,
  setBrushColor,
  onCanvasReady,
  lastCommand
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [objectCount, setObjectCount] = useState(0);

  const isConnected = !!lastCommand; // Assume connected if we are receiving any inference loop ticks

  const canvasBg = themeMode === "dark" ? "#0a0a0f" : themeMode === "light" ? "#ffffff" : "#1a1a2e";

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    // Initialize Fabric
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      isDrawingMode: false,
      backgroundColor: canvasBg,
      selection: true,
    });

    setFabricCanvas(canvas);
    onCanvasReady(canvas);

    // Track objects for status bar
    const updateCount = () => setObjectCount(canvas.getObjects().length);
    canvas.on("object:added", updateCount);
    canvas.on("object:removed", updateCount);

    // Window resize handler
    const handleResize = () => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // Pan & Zoom with Mouse Wheel
    canvas.on('mouse:wheel', function(opt) {
      if (!opt.e) return;
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;
      
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // Update canvas state based on activeTool
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "pen" || activeTool === "brush";
    if (fabricCanvas.isDrawingMode) {
      const brush = new fabric.PencilBrush(fabricCanvas);
      brush.color = brushColor;
      brush.width = activeTool === "brush" ? brushSize * 3 : brushSize;
      
      // Attempt smoother strokes for brush vs pen
      if (activeTool === "brush") {
        brush.decimate = 1.5; 
      }
      fabricCanvas.freeDrawingBrush = brush;
    }

    // Config for pan vs select
    if (activeTool === "pan") {
      fabricCanvas.defaultCursor = "grab";
      fabricCanvas.selection = false;
      fabricCanvas.getObjects().forEach(o => o.selectable = false);
    } else if (activeTool === "select") {
      fabricCanvas.defaultCursor = "default";
      fabricCanvas.selection = true;
      fabricCanvas.getObjects().forEach(o => o.selectable = true);
    } else {
      fabricCanvas.defaultCursor = "crosshair";
      fabricCanvas.selection = false;
      fabricCanvas.getObjects().forEach(o => o.selectable = false);
    }

    fabricCanvas.backgroundColor = canvasBg;
    fabricCanvas.renderAll();
  }, [fabricCanvas, activeTool, brushColor, brushSize, canvasBg]);

  // Prevent firing overlapping synthetic events
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const pointerEventRef = useRef<MouseEvent | null>(null);
  const lastPanPosRef = useRef<{x: number, y: number} | null>(null);

  // Map WebSocket Commands to Canvas Actions
  useEffect(() => {
    if (!fabricCanvas || !lastCommand) return;

    const { gesture, x, y, dx, dy } = lastCommand;
    
    // x and y are normalized, map to canvas bounding rect matching what Fabric expects
    const canvasRef = fabricCanvas.getElement();
    const rect = canvasRef.getBoundingClientRect();
    
    // Screen absolute pixels:
    const screenX = x * window.innerWidth;
    const screenY = y * window.innerHeight;

    // Canvas relative pixels:
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    // Only process gestures that fall inside the canvas boundaries
    if (screenX < rect.left || screenX > rect.right || screenY < rect.top || screenY > rect.bottom) {
        if (isDrawing || isPinching) {
            const fakeEvent = { clientX: screenX, clientY: screenY, type: 'mouseup' } as unknown as MouseEvent;
            fabricCanvas._onMouseUp(fakeEvent);
            fabricCanvas.isDrawingMode = false; // Force stop
            setIsDrawing(false);
            setIsPinching(false);
            // Need to toggle back to maintain tool state
            setTimeout(() => { if (activeTool === "pen" || activeTool === "brush") fabricCanvas.isDrawingMode = true; }, 50);
        }
        lastPanPosRef.current = null;
        return;
    }

    // Reset pan position if not panning
    if (gesture !== "DRAW" || activeTool !== "pan") {
        lastPanPosRef.current = null;
    }

    if (gesture === "DRAW") {
        if (activeTool === "pen" || activeTool === "brush") {
            // Simulate drawing for Fabric.js
            const fakeEvent = {
                clientX: screenX,
                clientY: screenY,
                type: isDrawing ? 'mousemove' : 'mousedown',
                preventDefault: () => {},
                stopPropagation: () => {}
            } as unknown as MouseEvent;

            if (!isDrawing) {
                fabricCanvas._onMouseDown(fakeEvent);
                setIsDrawing(true);
            } else {
                fabricCanvas._onMouseMove(fakeEvent);
            }
        }
        else if (activeTool === "eraser") {
            // Erasing logic (Raycast) when using 1 finger with Eraer selected
            const point = fabricCanvas.getScenePoint({ clientX: screenX, clientY: screenY } as any);
            const objs = fabricCanvas.getObjects();
            for (let i = objs.length - 1; i >= 0; i--) {
                if (objs[i].containsPoint(point)) {
                    fabricCanvas.remove(objs[i]);
                    break;
                }
            }
        }
        else if (activeTool === "pan") {
            // Pan logic when using 1 finger with Pan selected
            const vpt = fabricCanvas.viewportTransform;
            if (vpt && lastPanPosRef.current) {
                vpt[4] += (canvasX - lastPanPosRef.current.x);
                vpt[5] += (canvasY - lastPanPosRef.current.y);
                fabricCanvas.requestRenderAll();
            }
            lastPanPosRef.current = { x: canvasX, y: canvasY };
        }
    } 
    else if (gesture === "ERASE") {
        if (isDrawing || isPinching) {
            // Stop previous drawing action safely
            const fakeEvent = { clientX: screenX, clientY: screenY, type: 'mouseup' } as unknown as MouseEvent;
            fabricCanvas._onMouseUp(fakeEvent);
            setIsDrawing(false);
            setIsPinching(false);
        }

        // Erasing 2-finger shortcut: Delete underneath instantly
        const point = fabricCanvas.getScenePoint({ clientX: screenX, clientY: screenY } as any);
        const objs = fabricCanvas.getObjects();
        for (let i = objs.length - 1; i >= 0; i--) {
            if (objs[i].containsPoint(point)) {
                fabricCanvas.remove(objs[i]);
                break;
            }
        }
    }
    else {
        // Not drawing, if we were drawing -> trigger mouseup
        if (isDrawing || isPinching) {
            const fakeEvent = { clientX: screenX, clientY: screenY, type: 'mouseup' } as unknown as MouseEvent;
            fabricCanvas._onMouseUp(fakeEvent);
            if (isPinching) {
                // If we dropped an object, trigger save history
                fabricCanvas.fire('object:modified');
            }
            setIsDrawing(false);
            setIsPinching(false);
        }

        if (gesture === "MOVE_CANVAS" && dx !== undefined && dy !== undefined) {
             // Pan the canvas instantaneously
            const vpt = fabricCanvas.viewportTransform;
            if (vpt) {
                // Since moving hand left (negative dx) means canvas moves right
                vpt[4] += dx * canvasRef.width; 
                vpt[5] += dy * canvasRef.height;
                fabricCanvas.requestRenderAll();
            }
        }
        else if (gesture === "PINCH") {
           // Simulate grabbing shapes if in "select" tool
           if (activeTool === "select" && !isPinching) {
              const point = fabricCanvas.getScenePoint({ clientX: screenX, clientY: screenY } as any);
              let targetObj = null;
              const objs = fabricCanvas.getObjects();
              for (let i = objs.length - 1; i >= 0; i--) {
                  if (objs[i].containsPoint(point)) {
                      targetObj = objs[i];
                      break;
                  }
              }

              if (targetObj) {
                  fabricCanvas.setActiveObject(targetObj);
                  const fakeEvent = {
                      clientX: screenX,
                      clientY: screenY,
                      type: 'mousedown',
                      preventDefault: () => {},
                      stopPropagation: () => {}
                  } as unknown as MouseEvent;
                  // We dispatch down, and moving during PINCH will drag it if fabric natively picks it up
                  fabricCanvas._onMouseDown(fakeEvent);
                  setIsPinching(true);
              } else {
                  setIsPinching(false); // Empty pinch initiates Zoom
              }
           }
        }
        else if (gesture === "PINCH_MOVE" && dx !== undefined && dy !== undefined) {
            if (activeTool === "select" && isPinching) {
                const moveEvent = { clientX: screenX, clientY: screenY, type: 'mousemove', preventDefault: ()=>{}, stopPropagation: ()=>{} } as unknown as MouseEvent;
                fabricCanvas._onMouseMove(moveEvent);
            } else {
                 // Zoom Canvas if pan tool is active or we pinch on empty space
                 let newZoom = fabricCanvas.getZoom();
                 
                 // if dy is negative, hand moved up -> zoom in
                 newZoom -= dy * 5;

                 if (newZoom > 20) newZoom = 20;
                 if (newZoom < 0.1) newZoom = 0.1;

                 // Using raw physical canvas coordinates to designate zoom focal point
                 fabricCanvas.zoomToPoint(new fabric.Point(canvasX, canvasY), newZoom);
                 setZoom(newZoom);
            }
        }
    }

  }, [lastCommand]);


  return (
    <section className="relative flex-1" ref={containerRef}>
      <canvas ref={canvasElRef} className="w-full h-full" />

      {/* Color Palette Overlay */}
      <AnimatePresence>
        {showColors && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute top-4 left-6 p-3 glass-panel-strong rounded-xl flex gap-2 z-30"
          >
            {colors.map((c, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                onClick={() => setBrushColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${brushColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none z-20">
        <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-3 bg-black/40 backdrop-blur text-white">
          <span className="text-xs font-mono opacity-80">
            Brush: {brushSize}px
          </span>
          <span className="text-xs font-mono opacity-80">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <span className="text-xs font-mono opacity-80">
            Objects: {objectCount}
          </span>
        </div>
        <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-2 bg-black/40 backdrop-blur text-white">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-mono opacity-80">
            Backend: {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </section>
  );
};
