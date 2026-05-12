import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Calendar, Sparkles } from 'lucide-react';
import { LevelGenerator } from '../logic/levelGenerator';
import { GameBoard } from './GameBoard';
import { Level } from '../types';

interface DailyChallengeScreenProps {
  onComplete: (stats: { stars: number, moves: number, time: number }) => void;
  onBack: () => void;
  palette?: string[];
}

const DEFAULT_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#71717A'
];

export const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ onComplete, onBack, palette }) => {
  const gameColors = palette || DEFAULT_COLORS;
  const generator = useMemo(() => new LevelGenerator(), []);
  const [level, setLevel] = useState<Level | null>(null);
  const [grid, setGrid] = useState<any[][] | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [movesLeft, setMovesLeft] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime] = useState(Date.now());

  // Generate a seed based on the current date
  const today = new Date().toISOString().split('T')[0];
  const dailyLevelNum = useMemo(() => {
    const seed = today.split('-').reduce((acc, part) => acc + parseInt(part), 0);
    return 500 + (seed % 100); // Daily challenges are high level
  }, [today]);

  useEffect(() => {
    const dailyLevel = generator.generate(dailyLevelNum);
    setLevel(dailyLevel);
    setGrid(dailyLevel.grid);
    setMovesLeft(30);
    setIsGameOver(false);
  }, [dailyLevelNum, generator]);

  const handleComplete = () => {
    setShowComplete(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setTimeout(() => {
      setShowComplete(false);
      onComplete({ stars: 10, moves: moveCount, time: duration });
    }, 1500);
  };

  const handleMove = () => {
    setMoveCount(prev => prev + 1);
    setMovesLeft(prev => {
        if (prev <= 1) {
            setIsGameOver(true);
            return 0;
        }
        return prev - 1;
    });
  };

  if (!level) return null;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col text-white">
      <header className="flex items-center justify-between p-6 bg-yellow-500/10 border-b border-yellow-500/20">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4">
          <ChevronLeft size={28} />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-xl font-black italic tracking-tighter text-yellow-500">DAILY CHALLENGE</h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                <Calendar size={10} />
                {today}
            </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        <div className="mb-8 flex gap-6">
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/30 font-black tracking-widest uppercase">Moves Left</span>
                <motion.span 
                    key={movesLeft}
                    initial={{ scale: 1.5, color: '#f59e0b' }}
                    animate={{ scale: 1, color: movesLeft < 10 ? '#ef4444' : '#ffffff' }}
                    className="text-3xl font-black italic"
                >
                    {movesLeft}
                </motion.span>
            </div>
            <div className="w-[1px] bg-white/10" />
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/30 font-black tracking-widest uppercase">Target</span>
                <span className="text-3xl font-black italic text-emerald-500">WIN</span>
            </div>
        </div>

        <div className="relative w-full">
          <GameBoard 
            level={level} 
            grid={grid!}
            setGrid={setGrid}
            onComplete={handleComplete} 
            colors={gameColors} 
            onMove={handleMove}
          />

          <AnimatePresence>
            {isGameOver && !showComplete && (
               <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl"
               >
                 <div className="text-center p-8">
                    <Trophy size={64} className="mx-auto mb-4 text-white/20" />
                    <h2 className="text-3xl font-black italic mb-2">OUT OF MOVES!</h2>
                    <p className="text-white/60 mb-6 font-bold">Today's challenge was tough.</p>
                    <button 
                        onClick={onBack}
                        className="bg-white text-black px-8 py-3 rounded-full font-black italic"
                    >
                        TRY AGAIN TOMORROW
                    </button>
                 </div>
               </motion.div>
            )}

            {showComplete && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-yellow-500 text-black px-12 py-8 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.5)] border-4 border-white/40 transform -rotate-3 text-center">
                    <Sparkles className="mx-auto mb-2" />
                    <p className="text-4xl font-black italic">CHALLENGE COMPLETE!</p>
                    <p className="text-sm font-bold mt-2">⭐ +10 STARS EARNED</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 text-center max-w-[280px]">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] leading-relaxed">
                Connect all colors using exactly 30 moves or less to claim your daily reward.
            </p>
        </div>
      </main>
    </div>
  );
};
