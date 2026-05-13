import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#064e3b] flex flex-col items-center justify-center text-white overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] bg-[#10b981] rounded-full opacity-20 blur-[100px]"
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, -50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[80vw] h-[80vw] bg-[#065f46] rounded-full opacity-10 blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <img src="/icon-512.png" alt="ColorFlow" className="w-32 h-32 rounded-[2.5rem]" 
               onError={(e) => {
                 // Fallback if icon missing
                 (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSI4MCIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjE4MCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzFfMikiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMV8yIiB4MT0iNzYiIHkxPSI3NiIgeDI9IjQzNiIgeTI9IjQzNiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIHN0b3AtY29sb3I9IiMxMEI5ODEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzQjgyRjYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4=';
               }}
          />
        </motion.div>
        
        <h1 className="text-6xl font-black italic tracking-tighter drop-shadow-2xl">ColorFlow</h1>
        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.5em] mt-4 text-center">Infinite Puzzle</p>
        
        <div className="mt-16 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </div>
      </motion.div>

      <div className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.8em] text-white/10">
        Mindful Play
      </div>
    </div>
  );
};
