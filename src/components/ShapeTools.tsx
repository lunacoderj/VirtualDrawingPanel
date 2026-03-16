import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square, Circle, Triangle, Diamond, Hexagon, Star, ArrowRight,
  MessageSquare, Minus as LineIcon, RectangleHorizontal, Cloud, Heart
} from "lucide-react";

export type ShapeType = "line" | "arrow" | "rect" | "rounded-rect" | "circle" | "triangle" | "diamond" | "hexagon" | "star" | "heart" | "cloud" | "speech-bubble" | "flowchart";

interface ShapeToolsProps {
  show: boolean;
  onSelectShape: (shape: ShapeType) => void;
}

const shapeCategories: { icon: React.ReactNode; name: string, type: ShapeType }[] = [
  { icon: <LineIcon className="w-4 h-4" />, name: "Line", type: "line" },
  { icon: <ArrowRight className="w-4 h-4" />, name: "Arrow", type: "arrow" },
  { icon: <Square className="w-4 h-4" />, name: "Rectangle", type: "rect" },
  { icon: <RectangleHorizontal className="w-4 h-4" />, name: "Rounded Rect", type: "rounded-rect" },
  { icon: <Circle className="w-4 h-4" />, name: "Circle", type: "circle" },
  { icon: <Triangle className="w-4 h-4" />, name: "Triangle", type: "triangle" },
  { icon: <Diamond className="w-4 h-4" />, name: "Diamond", type: "diamond" },
  { icon: <Hexagon className="w-4 h-4" />, name: "Hexagon", type: "hexagon" },
  { icon: <Star className="w-4 h-4" />, name: "Star", type: "star" },
  { icon: <Heart className="w-4 h-4" />, name: "Heart", type: "heart" },
  { icon: <Cloud className="w-4 h-4" />, name: "Cloud", type: "cloud" },
  { icon: <MessageSquare className="w-4 h-4" />, name: "Speech Bubble", type: "speech-bubble" },
  { icon: <Square className="w-4 h-4" />, name: "Flowchart", type: "flowchart" },
];

export const ShapeTools: React.FC<ShapeToolsProps> = ({ show, onSelectShape }) => {
  return (
    <AnimatePresence>
      {show && (
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
              onClick={() => onSelectShape(s.type)}
              className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors"
              title={s.name}
            >
              {s.icon}
              <span className="text-[8px] mt-0.5 leading-none text-center leading-tight line-clamp-1">{s.name}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
