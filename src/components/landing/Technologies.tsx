import { motion } from "framer-motion";

const techs = [
  { name: "Python", desc: "Core backend" },
  { name: "OpenCV", desc: "Computer vision" },
  { name: "MediaPipe", desc: "Hand tracking" },
  { name: "React", desc: "Frontend UI" },
  { name: "WebSockets", desc: "Real-time sync" },
  { name: "Canvas API", desc: "Rendering" },
];

const Technologies = () => (
  <section className="py-32 px-6 max-w-7xl mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-16"
    >
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gradient mb-4">
        Built With
      </h2>
      <p className="text-muted-foreground text-lg">The technologies powering Smart Virtual Drawing Panel.</p>
    </motion.div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {techs.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -4, scale: 1.05 }}
          className="glass-panel rounded-2xl p-6 text-center group cursor-default"
        >
          <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1">
            {t.name}
          </div>
          <div className="text-xs font-mono text-muted-foreground">{t.desc}</div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default Technologies;
