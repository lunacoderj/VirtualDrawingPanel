import React, { useState } from "react";
import { Toolbar, Tool, ThemeMode } from "../components/Toolbar";
import { ShapeTools, ShapeType } from "../components/ShapeTools";
import { CameraPreview } from "../components/CameraPreview";
import { CanvasBoard } from "../components/CanvasBoard";
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

  const handleNewFile = () => {
    if (canvasInstance) {
      canvasInstance.clear();
      canvasInstance.backgroundColor = themeMode === "dark" ? "#0a0a0f" : themeMode === "light" ? "#ffffff" : "#1a1a2e";
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


  return (
    <main className="h-svh w-screen overflow-hidden flex bg-black">
      <Toolbar
        activeTool={activeTool} setActiveTool={setActiveTool}
        showShapes={showShapes} setShowShapes={setShowShapes}
        showColors={showColors} setShowColors={setShowColors}
        brushSize={brushSize} setBrushSize={setBrushSize}
        showCamera={showCamera} setShowCamera={setShowCamera}
        themeMode={themeMode} setThemeMode={setThemeMode}
        onNew={handleNewFile} onOpen={handleOpen} onSave={handleSave}
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
        />
      </div>

      <AnimatePresence>
        {showCamera && <CameraPreview />}
      </AnimatePresence>
    </main>
  );
};

export default DrawingApp;
