import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MousePointer2, Pencil, Paintbrush, Eraser, Shapes, Palette,
  Plus, Minus, FilePlus, FolderOpen, Save, Settings, ArrowLeft,
  Square, Circle, Triangle, Diamond, Hexagon, Star, ArrowRight,
  MessageSquare, Minus as LineIcon, RectangleHorizontal, Video,
  Sun, Moon, Pipette, ZoomIn, ZoomOut, Move,
} from "lucide-react";

type Tool = "select" | "pen" | "brush" | "eraser" | "shape";
type ThemeMode = "dark" | "light" | "custom";

interface DrawnPath {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: string;
}

const shapeCategories = [
  { icon: <LineIcon className="w-4 h-4" />, name: "Line" },
  { icon: <Square className="w-4 h-4" />, name: "Rectangle" },
  { icon: <RectangleHorizontal className="w-4 h-4" />, name: "Rounded Rect" },
  { icon: <Circle className="w-4 h-4" />, name: "Circle" },
  { icon: <Triangle className="w-4 h-4" />, name: "Triangle" },
  { icon: <Diamond className="w-4 h-4" />, name: "Diamond" },
  { icon: <Hexagon className="w-4 h-4" />, name: "Hexagon" },
  { icon: <Star className="w-4 h-4" />, name: "Star" },
  { icon: <ArrowRight className="w-4 h-4" />, name: "Arrow" },
  { icon: <Square className="w-4 h-4" />, name: "Flowchart" },
  { icon: <MessageSquare className="w-4 h-4" />, name: "Speech Bubble" },
];

const colors = [
  "hsl(185 80% 55%)", "#ffffff", "#ef4444", "#22c55e",
  "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1",
];

const DrawingApp = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [brushColor, setBrushColor] = useState("hsl(185 80% 55%)");
  const [brushSize, setBrushSize] = useState(3);
  const [showShapes, setShowShapes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<DrawnPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawnPath | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCamera, setShowCamera] = useState(true);

  const canvasBg = themeMode === "dark" ? "#0a0a0f" : themeMode === "light" ? "#ffffff" : "#1a1a2e";
  const dotColor = themeMode === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Draw dots
    const dotSize = 1;
    const gap = 32 * zoom;
    ctx.fillStyle = dotColor;
    for (let x = (pan.x % gap + gap) % gap; x < canvas.offsetWidth; x += gap) {
      for (let y = (pan.y % gap + gap) % gap; y < canvas.offsetHeight; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw paths
    const allPaths = currentPath ? [...paths, currentPath] : paths;
    for (const path of allPaths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.tool === "eraser" ? canvasBg : path.color;
      ctx.lineWidth = path.size * zoom;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(path.points[0].x * zoom + pan.x, path.points[0].y * zoom + pan.y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x * zoom + pan.x, path.points[i].y * zoom + pan.y);
      }
      ctx.stroke();
    }
  }, [paths, currentPath, zoom, pan, canvasBg, dotColor]);

  useEffect(() => {
    redrawCanvas();
    const handleResize = () => redrawCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redrawCanvas]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "select") return;
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentPath({
      points: [pos],
      color: brushColor,
      size: activeTool === "eraser" ? brushSize * 4 : brushSize,
      tool: activeTool,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const pos = getPos(e);
    setCurrentPath({
      ...currentPath,
      points: [...currentPath.points, pos],
    });
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };

  const handleNewFile = () => {
    setPaths([]);
    setCurrentPath(null);
  };

  const handleSave = () => {
    const data = JSON.stringify(paths);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          setPaths(data);
        } catch {
          /* invalid file */
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const ToolButton = ({ icon, active, onClick, label }: { icon: React.ReactNode; active?: boolean; onClick?: () => void; label?: string }) => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {icon}
    </motion.button>
  );

  return (
    <main className="h-svh w-screen overflow-hidden flex" style={{ backgroundColor: canvasBg }}>
      {/* Toolbar */}
      <nav className="w-16 h-full border-r border-white/5 flex flex-col items-center py-4 gap-2 z-50 bg-background/80 backdrop-blur-xl">
        <ToolButton icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate("/")} label="Back" />
        <div className="h-px w-8 bg-white/10 my-1" />

        <ToolButton icon={<MousePointer2 className="w-4 h-4" />} active={activeTool === "select"} onClick={() => setActiveTool("select")} label="Select" />
        <ToolButton icon={<Pencil className="w-4 h-4" />} active={activeTool === "pen"} onClick={() => setActiveTool("pen")} label="Pen" />
        <ToolButton icon={<Paintbrush className="w-4 h-4" />} active={activeTool === "brush"} onClick={() => setActiveTool("brush")} label="Brush" />
        <ToolButton icon={<Eraser className="w-4 h-4" />} active={activeTool === "eraser"} onClick={() => setActiveTool("eraser")} label="Eraser" />
        <ToolButton icon={<Shapes className="w-4 h-4" />} active={showShapes} onClick={() => setShowShapes(!showShapes)} label="Shapes" />

        <div className="h-px w-8 bg-white/10 my-1" />

        <ToolButton icon={<Palette className="w-4 h-4" />} active={showColors} onClick={() => setShowColors(!showColors)} label="Colors" />
        <ToolButton icon={<Plus className="w-4 h-4" />} onClick={() => setBrushSize(Math.min(brushSize + 1, 20))} label="Size +" />
        <ToolButton icon={<Minus className="w-4 h-4" />} onClick={() => setBrushSize(Math.max(brushSize - 1, 1))} label="Size -" />

        <div className="h-px w-8 bg-white/10 my-1" />

        <ToolButton icon={<ZoomIn className="w-4 h-4" />} onClick={() => setZoom(z => Math.min(z + 0.2, 3))} label="Zoom In" />
        <ToolButton icon={<ZoomOut className="w-4 h-4" />} onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} label="Zoom Out" />
        <ToolButton icon={<Move className="w-4 h-4" />} onClick={() => setPan({ x: 0, y: 0 })} label="Reset Pan" />

        <div className="mt-auto flex flex-col items-center gap-2">
          <ToolButton icon={<FilePlus className="w-4 h-4" />} onClick={handleNewFile} label="New" />
          <ToolButton icon={<FolderOpen className="w-4 h-4" />} onClick={handleOpen} label="Open" />
          <ToolButton icon={<Save className="w-4 h-4" />} onClick={handleSave} label="Save" />
          <div className="h-px w-8 bg-white/10 my-1" />
          <ToolButton
            icon={themeMode === "dark" ? <Sun className="w-4 h-4" /> : themeMode === "light" ? <Moon className="w-4 h-4" /> : <Pipette className="w-4 h-4" />}
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : themeMode === "light" ? "custom" : "dark")}
            label="Theme"
          />
          <ToolButton icon={<Video className="w-4 h-4" />} active={showCamera} onClick={() => setShowCamera(!showCamera)} label="Camera" />
        </div>
      </nav>

      {/* Main Canvas */}
      <section className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: activeTool === "select" ? "default" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Shape Library */}
        <AnimatePresence>
          {showShapes && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-4 p-3 glass-panel-strong rounded-xl grid grid-cols-4 gap-2 z-30"
            >
              {shapeCategories.map((s, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors"
                  title={s.name}
                >
                  {s.icon}
                  <span className="text-[8px] mt-0.5 leading-none">{s.name}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color Palette */}
        <AnimatePresence>
          {showColors && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute top-4 left-20 p-3 glass-panel-strong rounded-xl flex gap-2 z-30"
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
          <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              Brush: {brushSize}px
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Objects: {paths.length}
            </span>
          </div>
          <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">Ready</span>
          </div>
        </div>

        {/* Camera Preview */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-16 right-4 w-64 aspect-video glass-panel-strong rounded-2xl overflow-hidden border border-primary/30 z-30"
              style={{ boxShadow: "0 0 30px rgba(34,211,238,0.15)" }}
            >
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest rounded z-10">
                Camera
              </div>
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-muted-foreground">Webcam Preview</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
};

export default DrawingApp;
