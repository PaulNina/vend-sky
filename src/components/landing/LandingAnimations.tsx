import { motion, Variants } from "framer-motion";
import { Coins } from "lucide-react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.8,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

export const Confetti = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            backgroundColor: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#FF4D4D" : "#4DFF4D",
            left: `${Math.random() * 100}%`,
            top: `-20px`,
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: ["0px", `${(Math.random() - 0.5) * 200}px`],
            rotate: [0, Math.random() * 360],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export const FloatingCoins = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 90 + 5}%`,
            top: `${Math.random() * 80 + 10}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Coins className="h-6 w-6 text-primary/20" />
        </motion.div>
      ))}
    </div>
  );
};
