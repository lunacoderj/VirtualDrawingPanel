import { motion } from "framer-motion";
import { Camera, Scan, Brain, Cpu, PenTool } from "lucide-react";

const steps = [
  { icon: <Camera />, label: "Webcam Input", sub: "Video capture" },
  { icon: <Scan />, label: "Hand Detection", sub: "MediaPipe" },
  { icon: <Brain />, label: "Gesture Recognition", sub: "Neural network" },
  { icon: <Cpu />, label: "Command Engine", sub: "Interpreter" },
  { icon: <PenTool />, label: "Canvas Rendering", sub: "Real-time draw" },
];

const HowItWorks = () => (
  <section className="py-32 px-6 max-w-7xl mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-20"
    >
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gradient mb-4">
        How It Works
      </h2>
      <p className="text-muted-foreground text-lg max-w-xl mx-auto">
        From camera input to canvas output in under 15 milliseconds.
      </p>
    </motion.div>

    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
          className="flex items-center gap-4"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl glass-panel-strong flex items-center justify-center text-primary mb-3 hover:glow-cyan transition-shadow">
              {step.icon}
            </div>
            <span className="text-sm font-semibold text-foreground">{step.label}</span>
            <span className="text-xs font-mono text-muted-foreground mt-1">{step.sub}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="hidden md:block w-12 h-px bg-gradient-to-r from-primary/50 to-primary/10 mx-2" />
          )}
        </motion.div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
