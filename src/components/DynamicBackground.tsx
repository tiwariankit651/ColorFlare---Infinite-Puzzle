
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ThemeName } from '../types';

interface DynamicBackgroundProps {
  theme: ThemeName;
}

const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ theme }) => {
  const particles = useMemo(() => {
    const count = theme === 'cyber' ? 40 : theme === 'zen' ? 25 : 0;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * (theme === 'cyber' ? 4 : 8) + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, [theme]);

  if (!['cyber', 'zen'].includes(theme)) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${
            theme === 'cyber' ? 'bg-cyan-400' : 'bg-white'
          }`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            filter: theme === 'cyber' ? 'blur(1px) drop-shadow(0 0 4px cyan)' : 'blur(2px)',
          }}
          animate={{
            y: ['0%', '100%'],
            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: -p.delay,
          }}
        />
      ))}
      {theme === 'cyber' && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
      )}
    </div>
  );
};

export default DynamicBackground;
