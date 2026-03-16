import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PenTool } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel rounded-2xl px-6 py-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm tracking-tight text-foreground">SVDP</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Technologies</a>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/app")}
          className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full"
        >
          Launch App
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
