import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Hand, Sparkles } from "lucide-react";

const ease = [0.23, 1, 0.32, 1] as const;
type EaseType = [number, number, number, number];
const easeVal = ease as unknown as EaseType;

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-svh flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-cyan-400/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: easeVal }}
        className="text-center max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">AI-Powered Drawing System</span>
        </motion.div>

        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 text-gradient leading-[0.9]">
          Smart Virtual<br />Drawing Panel
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10" style={{ textWrap: "pretty" as any }}>
          A gesture-controlled AI drawing system powered by neural networks and computer vision.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/app")}
            className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-full transition-shadow hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          >
            Start Drawing
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-8 py-4 glass-panel rounded-full hover:bg-white/10 transition-colors font-medium"
          >
            Learn More
          </motion.button>
        </div>
      </motion.div>

      {/* Animated canvas preview */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease }}
        className="mt-16 relative w-full max-w-5xl aspect-video glass-panel rounded-2xl overflow-hidden"
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        {/* Animated drawing hand */}
        <motion.div
          animate={{
            x: [80, 280, 180, 380, 250, 120],
            y: [40, 120, 80, 160, 200, 60],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute z-20"
        >
          <Hand className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
        </motion.div>

        {/* Animated SVG drawing path */}
        <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 800 450">
          <motion.path
            d="M100,200 C150,100 250,100 300,200 S450,300 500,200 C550,100 650,150 700,250"
            stroke="hsl(185 80% 55%)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
          />
          <motion.path
            d="M150,300 Q250,250 350,300 T550,280"
            stroke="hsl(185 80% 55% / 0.4)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 3, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
          />
        </svg>

        {/* Status bar */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">Hand Detected</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Latency: 14ms | Accuracy: 99.2%</span>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
