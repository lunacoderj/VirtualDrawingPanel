import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { Tool, ThemeMode } from "./Toolbar";
import { ShapeType } from "./ShapeTools";
import { AnimatePresence, motion } from "framer-motion";
import { useGestureWebSocket } from "../services/websocket";

interface CanvasBoardProps {
  activeTool: Tool;
  brushColor: string;
  brushSize: number;
  themeMode: ThemeMode;
  showColors: boolean;
  setShowColors: (s: boolean) => void;
  setBrushColor: (c: string) => void;
  onCanvasReady: (canvas: fabric.Canvas) => void;
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
  onCanvasReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [objectCount, setObjectCount] = useState(0);

  const { lastCommand, isConnected } = useGestureWebSocket();

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
      
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
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

  // Map WebSocket Commands to Canvas Actions
  useEffect(() => {
    if (!fabricCanvas || !lastCommand) return;

    const { gesture, x, y, dx, dy } = lastCommand;

    // A simplistic implementation to translate backend gestures to canvas operations.
    // In a real robust system, DRAW/ERASE events should stitch together paths rather than drawing circles,
    // or simulate mousedown/mousemove events via synthetic events.

    if (gesture === "DRAW" && x !== undefined && y !== undefined) {
       // Draw point
       const circle = new fabric.Circle({
        left: x,
        top: y,
        radius: activeTool === "brush" ? brushSize * 1.5 : brushSize / 2,
        fill: brushColor,
        selectable: false
       });
       fabricCanvas.add(circle);
    }
    else if (gesture === "ERASE" && x !== undefined && y !== undefined) {
        // Find objects under cursor and remove them
        const point = new fabric.Point(x, y);
        const objs = fabricCanvas.getObjects();
        for (let i = objs.length - 1; i >= 0; i--) {
            // Very simple hit test
            if (objs[i].containsPoint(point)) {
                fabricCanvas.remove(objs[i]);
                break; // erase one top object at a time
            }
        }
    }
    else if (gesture === "MOVE_CANVAS" && dx !== undefined && dy !== undefined) {
        // Pan the canvas
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
            vpt[4] += dx;
            vpt[5] += dy;
            fabricCanvas.requestRenderAll();
        }
    }
    else if (gesture === "SELECT OBJECT" && x !== undefined && y !== undefined) {
       // Future expansion: Select the object at (x,y)
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
