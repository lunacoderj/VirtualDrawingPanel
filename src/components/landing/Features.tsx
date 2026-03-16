import { motion } from "framer-motion";
import { Hand, Eraser, Shapes, Move, Maximize, FolderOpen } from "lucide-react";

const features = [
  { title: "Gesture Drawing", desc: "Draw using finger gestures detected through the webcam. Real-time tracking with sub-15ms latency.", icon: <Hand /> },
  { title: "Smart Erasing", desc: "Erase strokes using gesture-based commands. Palm recognition for instant clearing.", icon: <Eraser /> },
  { title: "Shape Tools", desc: "Insert lines, rectangles, circles, arrows, triangles, stars, and flowchart shapes with neural-assisted snapping.", icon: <Shapes /> },
  { title: "Object Manipulation", desc: "Select, move, and resize objects after drawing them. Full transform controls.", icon: <Move /> },
  { title: "Infinite Canvas", desc: "Move the canvas infinitely like a digital whiteboard. Pan, zoom, and explore without limits.", icon: <Maximize /> },
  { title: "File Management", desc: "Create new drawings, save your work, and open saved files. Full project management.", icon: <FolderOpen /> },
];

const Features = () => (
  <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gradient mb-4">
        Powerful Features
      </h2>
      <p className="text-muted-foreground text-lg max-w-xl mx-auto">
        Everything you need for gesture-controlled digital creation.
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          whileHover={{ y: -8 }}
          className="p-8 glass-panel rounded-[24px] group relative overflow-hidden cursor-default"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-12 h-12 mb-6 text-primary flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            {f.icon}
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground">{f.title}</h3>
          <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default Features;
