import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";

export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 4,
      size: 6 + Math.random() * 10,
      color: ["hsl(43,96%,56%)", "hsl(35,100%,62%)", "hsl(152,60%,42%)", "hsl(0,72%,51%)", "hsl(210,40%,96%)"][
        Math.floor(Math.random() * 5)
      ],
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color, top: -20 }}
          animate={{ y: [0, 800], x: [0, (Math.random() - 0.5) * 100], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export function FloatingCoins() {
  const coins = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="absolute text-primary"
          style={{ left: `${c.left}%`, bottom: -30 }}
          animate={{ y: [0, -600], opacity: [0, 1, 1, 0], scale: [0.5, 1, 0.8] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "easeOut" }}
        >
          <DollarSign className="h-5 w-5" />
        </motion.div>
      ))}
    </div>
  );
}
