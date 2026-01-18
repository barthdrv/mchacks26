import { useMemo } from "react";
import { motion } from "framer-motion";

interface SnowflakeProps {
  delay: number;
  duration: number;
  left: number;
  size: number;
  opacity: number;
}

function Snowflake({ delay, duration, left, size, opacity }: SnowflakeProps) {
  return (
    <motion.div
      className="absolute top-0 rounded-full bg-sky-300 pointer-events-none"
      style={{
        left: `${left}%`,
        width: size,
        height: size,
        opacity,
      }}
      initial={{ y: -20, x: 0 }}
      animate={{
        y: "100vh",
        x: [0, 15, -15, 10, -10, 0],
      }}
      transition={{
        y: {
          duration,
          repeat: Infinity,
          ease: "linear",
          delay,
        },
        x: {
          duration: duration * 0.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
      }}
    />
  );
}

export function Snowfall() {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      left: Math.random() * 100,
      size: 4 + Math.random() * 6,
      opacity: 0.2 + Math.random() * 0.3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {snowflakes.map((flake) => (
        <Snowflake key={flake.id} {...flake} />
      ))}
    </div>
  );
}
