import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#1B5E20] flex flex-col items-center justify-center text-white">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="flex flex-col items-center"
      >
        <span className="text-8xl mb-8">🎨</span>
        <h1 className="text-5xl font-black italic tracking-tighter">ColorFlow</h1>
        <p className="text-white/70 text-lg font-bold uppercase tracking-[0.3em] mt-2 text-center">Infinite Puzzle</p>
        
        <motion.div 
          className="mt-12"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
};
