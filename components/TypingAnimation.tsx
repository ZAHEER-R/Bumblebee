"use client";

import { motion } from "framer-motion";

export default function TypingAnimation() {
  return (
    <div className="flex gap-1 px-4 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-cyan-400"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.6,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}