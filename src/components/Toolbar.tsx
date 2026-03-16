import React from "react";
import { motion } from "framer-motion";
import {
  MousePointer2, Pencil, Paintbrush, Eraser, Shapes, Palette,
  Plus, Minus, FilePlus, FolderOpen, Save, Settings, Video,
  Sun, Moon, Pipette, Move, Undo2, Redo2, ArrowUpFromLine, ArrowDownToLine
} from "lucide-react";

export type Tool = "select" | "pen" | "brush" | "eraser" | "shape" | "pan";
export type ThemeMode = "dark" | "light" | "custom";

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  showShapes: boolean;
  setShowShapes: (show: boolean) => void;
  showColors: boolean;
  setShowColors: (show: boolean) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

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

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool, setActiveTool,
  showShapes, setShowShapes,
  showColors, setShowColors,
  brushSize, setBrushSize,
  showCamera, setShowCamera,
  themeMode, setThemeMode,
  onNew, onOpen, onSave,
  onUndo, onRedo, onBringForward, onSendBackward,
  canUndo, canRedo
}) => {
  return (
    <nav className="w-16 h-full border-r border-white/5 flex flex-col items-center py-4 gap-2 z-50 bg-background/80 backdrop-blur-xl shrink-0">
      
      <ToolButton icon={<MousePointer2 className="w-4 h-4" />} active={activeTool === "select"} onClick={() => setActiveTool("select")} label="Select" />
      <ToolButton icon={<Move className="w-4 h-4" />} active={activeTool === "pan"} onClick={() => setActiveTool("pan")} label="Pan Canvas" />
      <ToolButton icon={<Pencil className="w-4 h-4" />} active={activeTool === "pen"} onClick={() => setActiveTool("pen")} label="Pen" />
      <ToolButton icon={<Paintbrush className="w-4 h-4" />} active={activeTool === "brush"} onClick={() => setActiveTool("brush")} label="Brush" />
      <ToolButton icon={<Eraser className="w-4 h-4" />} active={activeTool === "eraser"} onClick={() => setActiveTool("eraser")} label="Eraser" />
      <ToolButton icon={<Shapes className="w-4 h-4" />} active={showShapes || activeTool === "shape"} onClick={() => {setShowShapes(!showShapes); if(!showShapes) setActiveTool("shape");}} label="Shapes" />

      <div className="h-px w-8 bg-white/10 my-1 flex-shrink-0" />

      <ToolButton icon={<Undo2 className={`w-4 h-4 ${!canUndo && "opacity-30"}`} />} onClick={onUndo} label="Undo" />
      <ToolButton icon={<Redo2 className={`w-4 h-4 ${!canRedo && "opacity-30"}`} />} onClick={onRedo} label="Redo" />
      <ToolButton icon={<ArrowUpFromLine className="w-4 h-4" />} onClick={onBringForward} label="Bring Forward" />
      <ToolButton icon={<ArrowDownToLine className="w-4 h-4" />} onClick={onSendBackward} label="Send Backward" />

      <div className="h-px w-8 bg-white/10 my-1 flex-shrink-0" />

      <ToolButton icon={<Palette className="w-4 h-4" />} active={showColors} onClick={() => setShowColors(!showColors)} label="Colors" />
      <ToolButton icon={<Plus className="w-4 h-4" />} onClick={() => setBrushSize(Math.min(brushSize + 1, 50))} label="Size +" />
      <ToolButton icon={<Minus className="w-4 h-4" />} onClick={() => setBrushSize(Math.max(brushSize - 1, 1))} label="Size -" />

      <div className="mt-auto flex flex-col items-center gap-2">
        <ToolButton icon={<FilePlus className="w-4 h-4" />} onClick={onNew} label="New" />
        <ToolButton icon={<FolderOpen className="w-4 h-4" />} onClick={onOpen} label="Open" />
        <ToolButton icon={<Save className="w-4 h-4" />} onClick={onSave} label="Save" />
        <div className="h-px w-8 bg-white/10 my-1" />
        <ToolButton
          icon={themeMode === "dark" ? <Sun className="w-4 h-4" /> : themeMode === "light" ? <Moon className="w-4 h-4" /> : <Pipette className="w-4 h-4" />}
          onClick={() => setThemeMode(themeMode === "dark" ? "light" : themeMode === "light" ? "custom" : "dark")}
          label="Theme"
        />
        <ToolButton icon={<Video className="w-4 h-4" />} active={showCamera} onClick={() => setShowCamera(!showCamera)} label="Camera" />
      </div>
    </nav>
  );
};
