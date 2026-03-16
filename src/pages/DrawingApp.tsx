import React, { useState, useEffect, useRef } from "react";
import { Toolbar, Tool, ThemeMode } from "../components/Toolbar";
import { ShapeTools, ShapeType } from "../components/ShapeTools";
import { CameraPreview } from "../components/CameraPreview";
import { CanvasBoard } from "../components/CanvasBoard";
import { useGestureControl } from "../services/useGestureControl";
import { AnimatePresence } from "framer-motion";
import * as fabric from "fabric";

const DrawingApp = () => {
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [brushColor, setBrushColor] = useState("hsl(185 80% 55%)");
  const [brushSize, setBrushSize] = useState(3);
  const [showShapes, setShowShapes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [showCamera, setShowCamera] = useState(true);

  // Keep a ref to the active Fabric.js instance so we can push shapes to it
  const [canvasInstance, setCanvasInstance] = useState<fabric.Canvas | null>(null);
  
  // Undo/Redo tracking
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isHistoryUpdate = useRef(false);

  // Video reference for MediaPipe tracking
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleNewFile = () => {
    if (canvasInstance) {
      canvasInstance.clear();
      canvasInstance.backgroundColor = themeMode === "dark" ? "#0a0a0f" : themeMode === "light" ? "#ffffff" : "#1a1a2e";
      setUndoStack([JSON.stringify(canvasInstance.toJSON())]);
      setRedoStack([]);
    }
  };

  const handleSave = () => {
    if (canvasInstance) {
      const json = JSON.stringify(canvasInstance.toJSON());
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fabric_drawing.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleOpen = () => {
    if (!canvasInstance) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const json = ev.target?.result as string;
          await canvasInstance.loadFromJSON(json);
          canvasInstance.renderAll();
        } catch (err) {
          console.error("Invalid canvas JSON", err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleInsertShape = (type: ShapeType) => {
    if (!canvasInstance) return;
    
    // Add shapes to center of current viewport
    const center = canvasInstance.getVpCenter();
    const commonProps = {
        left: center.x,
        top: center.y,
        originX: 'center' as const,
        originY: 'center' as const,
        fill: brushColor,
        strokeWidth: 2,
    };

    let shapeObj;

    switch (type) {
        case "rect":
            shapeObj = new fabric.Rect({ ...commonProps, width: 100, height: 100 });
            break;
        case "circle":
            shapeObj = new fabric.Circle({ ...commonProps, radius: 50 });
            break; // missing closing bracket in original logic
        case "triangle":
            shapeObj = new fabric.Triangle({ ...commonProps, width: 100, height: 100 });
            break;
        case "line":
            shapeObj = new fabric.Line([0, 0, 100, 100], { ...commonProps, stroke: brushColor, fill: undefined });
            break;
        case "rounded-rect":
            shapeObj = new fabric.Rect({ ...commonProps, width: 150, height: 100, rx: 15, ry: 15 });
            break;
        default:
            shapeObj = new fabric.Rect({ ...commonProps, width: 80, height: 80, fill: '#888' });
    }

    if (shapeObj) {
        canvasInstance.add(shapeObj);
        canvasInstance.setActiveObject(shapeObj);
        setActiveTool("select"); // Auto switch out of shape mode and into manipulating mode
        setShowShapes(false);
    }
  };

  // --- History & Layer Management ---
  useEffect(() => {
    if (!canvasInstance) return;
    
    const saveHistory = () => {
      if (isHistoryUpdate.current) return;
      const json = JSON.stringify(canvasInstance.toJSON());
      setUndoStack(prev => {
        // Prevent storing duplicate consecutive states
        if (prev.length > 0 && prev[prev.length - 1] === json) return prev;
        return [...prev, json];
      });
      setRedoStack([]); // clear redo on new action
    };

    canvasInstance.on('object:added', saveHistory);
    canvasInstance.on('object:modified', saveHistory);
    canvasInstance.on('object:removed', saveHistory);
    canvasInstance.on('path:created', saveHistory);

    // initial state
    setUndoStack([JSON.stringify(canvasInstance.toJSON())]);

    return () => {
      canvasInstance.off('object:added', saveHistory);
      canvasInstance.off('object:modified', saveHistory);
      canvasInstance.off('object:removed', saveHistory);
      canvasInstance.off('path:created', saveHistory);
    };
  }, [canvasInstance]);

  const handleUndo = () => {
    if (undoStack.length <= 1 || !canvasInstance) return;
    isHistoryUpdate.current = true;
    const current = undoStack.pop() as string;
    setRedoStack(prev => [...prev, current]);
    const previous = undoStack[undoStack.length - 1];
    canvasInstance.loadFromJSON(previous).then(() => {
      canvasInstance.renderAll();
      isHistoryUpdate.current = false;
    });
    setUndoStack([...undoStack]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !canvasInstance) return;
    isHistoryUpdate.current = true;
    const next = redoStack.pop() as string;
    setUndoStack(prev => [...prev, next]);
    canvasInstance.loadFromJSON(next).then(() => {
      canvasInstance.renderAll();
      isHistoryUpdate.current = false;
    });
    setRedoStack([...redoStack]);
  };

  const handleBringForward = () => {
    if (!canvasInstance) return;
    const activeObj = canvasInstance.getActiveObject();
    if (activeObj) {
      canvasInstance.bringObjectForward(activeObj);
      canvasInstance.renderAll();
      canvasInstance.fire('object:modified'); // Triggers saveHistory
    }
  };

  const handleSendBackward = () => {
    if (!canvasInstance) return;
    const activeObj = canvasInstance.getActiveObject();
    if (activeObj) {
      canvasInstance.sendObjectBackwards(activeObj);
      canvasInstance.renderAll();
      canvasInstance.fire('object:modified');
    }
  };


  const { lastCommand } = useGestureControl(videoRef);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Update virtual cursor position and handle UI clicking
  useEffect(() => {
    if (lastCommand && 'x' in lastCommand && 'y' in lastCommand) {
      // Map 0-1 to screen pixel coordinates
      const px = lastCommand.x * window.innerWidth;
      const py = lastCommand.y * window.innerHeight;
      setCursorPos({ x: px, y: py });

      // Handle UI Clicking
      if (lastCommand.gesture === "SELECT_TOOL") {
        const elementUnderCursor = document.elementFromPoint(px, py);
        if (elementUnderCursor) {
           const isCanvasObj = elementUnderCursor.tagName.toLowerCase() === 'canvas';
           if (!isCanvasObj) {
              (elementUnderCursor as HTMLElement).click();
           }
        }
      }
    }
  }, [lastCommand]);

  return (
    <main className="h-svh w-screen overflow-hidden flex bg-black relative">
      {/* Virtual Cursor */}
      <div 
        className="pointer-events-none fixed z-[9999] w-4 h-4 rounded-full bg-red-500/80 border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.8)] transition-all ease-out flex items-center justify-center isolate"
        style={{ 
            left: `${cursorPos.x}px`, 
            top: `${cursorPos.y}px`, 
            transform: 'translate(-50%, -50%)',
            scale: lastCommand?.gesture === "PINCH" ? 0.8 : 1,
            transitionDuration: '50ms'
        }}
      >
        {lastCommand?.hover_progress ? (
           <svg className="absolute w-8 h-8 -top-2 -left-2 transform -rotate-90 pointer-events-none" viewBox="0 0 32 32">
             <circle 
               cx="16" cy="16" r="14" 
               stroke="white" 
               strokeWidth="3" 
               fill="none" 
               strokeLinecap="round"
               strokeDasharray={`${lastCommand.hover_progress * 88} 88`} 
             />
           </svg>
        ) : null}
      </div>

      <Toolbar
        activeTool={activeTool} setActiveTool={setActiveTool}
        showShapes={showShapes} setShowShapes={setShowShapes}
        showColors={showColors} setShowColors={setShowColors}
        brushSize={brushSize} setBrushSize={setBrushSize}
        showCamera={showCamera} setShowCamera={setShowCamera}
        themeMode={themeMode} setThemeMode={setThemeMode}
        onNew={handleNewFile} onOpen={handleOpen} onSave={handleSave}
        onUndo={handleUndo} onRedo={handleRedo} 
        onBringForward={handleBringForward} onSendBackward={handleSendBackward}
        canUndo={undoStack.length > 1}
        canRedo={redoStack.length > 0}
      />

      <div className="relative flex-1 flex flex-col">
        {/* Absolute tools overlay */}
        <ShapeTools show={showShapes} onSelectShape={handleInsertShape} />
        
        <CanvasBoard
            activeTool={activeTool}
            brushColor={brushColor}
            brushSize={brushSize}
            themeMode={themeMode}
            showColors={showColors}
            setShowColors={setShowColors}
            setBrushColor={setBrushColor}
            onCanvasReady={(c) => setCanvasInstance(c)}
            lastCommand={lastCommand}
        />
      </div>

      <AnimatePresence>
        {showCamera && <CameraPreview videoRef={videoRef} />}
      </AnimatePresence>
    </main>
  );
};

export default DrawingApp;
