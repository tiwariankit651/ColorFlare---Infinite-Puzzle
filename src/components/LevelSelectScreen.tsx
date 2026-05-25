import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Lock, Star, ChevronRight } from 'lucide-react';

interface LevelSelectScreenProps {
  currentLevel: number;
  levelStars: Record<number, number>;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ 
  currentLevel, 
  levelStars,
  onSelectLevel, 
  onBack 
}) => {
  const levelsPerPage = 100;
  const [page, setPage] = useState(Math.floor((currentLevel - 1) / levelsPerPage));
  
  const startLevel = page * levelsPerPage + 1;
  const levels = Array.from({ length: levelsPerPage }, (_, i) => startLevel + i);
  // Allow seeing up to 10 pages ahead, but locking logic will prevent playing.
  // Or better, just base it on currentLevel so they don't get lost in empty pages.
  const maxPageAvailable = Math.floor((currentLevel - 1) / levelsPerPage) + 1;
  
  const handleNextPage = () => {
    if (page < maxPageAvailable) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(p => p - 1);
  };

  return (
    <div className="fixed inset-0 bg-[#064e3b] flex flex-col text-white overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] bg-[#10b981] rounded-full opacity-10 blur-[100px]"
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[80vw] h-[80vw] bg-[#065f46] rounded-full opacity-10 blur-[120px]"
        />
      </div>

      <header className="flex items-center p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="p-2 hover:bg-white/10 rounded-xl transition-colors mr-4 bg-white/5"
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h2 className="text-xl font-black italic tracking-tighter">LEVEL SELECT</h2>
      </header>

      <main className="flex-1 p-6 overflow-y-auto z-10 pb-32">
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto px-2">
          <button 
            onClick={handlePrevPage}
            disabled={page === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              page === 0 ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Prev</span>
          </button>
          
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Page</span>
             <span className="text-lg font-black italic">{page + 1}</span>
          </div>

          <button 
            onClick={handleNextPage}
            disabled={page >= maxPageAvailable}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              page >= maxPageAvailable ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Next</span>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 max-w-2xl mx-auto">
          {levels.map((level) => {
            const isUnlocked = level <= currentLevel;
            const isCurrent = level === currentLevel;
            const stars = levelStars[level] || 0;

            return (
              <motion.button
                key={level}
                whileTap={isUnlocked ? { scale: 0.9 } : { x: [-2, 2, -2, 2, 0] }}
                onClick={() => isUnlocked && onSelectLevel(level)}
                animate={isCurrent ? { 
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 0 0px rgba(255,255,255,0)',
                    '0 0 0 15px rgba(255,255,255,0)',
                    '0 0 20px 0px rgba(255,255,255,0.3)',
                    '0 0 0 0px rgba(255,255,255,0)'
                  ]
                } : {}}
                transition={isCurrent ? { 
                  scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                  boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                } : { duration: 0.2 }}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                  isUnlocked 
                    ? (isCurrent 
                        ? 'bg-white text-black border-white z-10' 
                        : 'bg-white/5 text-white/80 border-white/10 hover:border-white/30 hover:bg-white/10')
                    : 'bg-transparent text-white/5 border-white/5 cursor-not-allowed'
                }`}
              >
                {!isUnlocked && <Lock size={14} className="mb-1 opacity-50" />}
                <span className={`text-xl font-black italic ${!isUnlocked ? 'text-white/10' : ''}`}>
                  {level}
                </span>
                {stars > 0 && (
                  <div className="absolute -bottom-1.5 left-0 right-0 flex justify-center gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`bg-black/60 rounded-full p-0.5 shadow-lg ${i <= stars ? 'text-yellow-400' : 'text-white/10'}`}>
                        <Star size={10} fill={i <= stars ? "currentColor" : "none"} stroke="currentColor" className="md:w-3 md:h-3" />
                      </div>
                    ))}
                  </div>
                )}
                {isCurrent && (
                  <>
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-[8px] font-black italic px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg z-20">
                      PLAYING
                    </div>
                    <motion.div 
                      layoutId="current-glow"
                      className="absolute inset-0 rounded-2xl ring-4 ring-white/50 animate-pulse"
                    />
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="py-12 text-center text-white/20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Keep Flowing To Unlock More</p>
        </div>
      </main>
    </div>
  );
};
