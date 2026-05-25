import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Calendar, Sparkles, Lightbulb, RefreshCw } from 'lucide-react';
import { LevelGenerator } from '../logic/levelGenerator';
import { GameBoard } from './GameBoard';
import { Level } from '../types';

interface DailyChallengeScreenProps {
  onComplete: (stats: { stars: number, moves: number, time: number }) => void;
  onBack: () => void;
  palette?: string[];
  challengesCompleted: number;
  lastCompletionDate?: string;
  hintsRemaining?: number;
  onHintUsed?: () => void;
}

const DEFAULT_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#71717A'
];

export const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ 
  onComplete, onBack, palette, challengesCompleted, lastCompletionDate, hintsRemaining = 0, onHintUsed 
}) => {
  const gameColors = palette || DEFAULT_COLORS;
  
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [level, setLevel] = useState<Level | null>(null);
  const [grid, setGrid] = useState<any[][] | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [movesLeft, setMovesLeft] = useState(50);
  const [isGameOver, setIsGameOver] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [showingSolution, setShowingSolution] = useState(false);
  
  const hintTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Generate a seed based on the current date
  const todayDate = new Date();
  const todayId = todayDate.toDateString();
  const todayDisp = todayDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  
  const completedHistory = useMemo(() => {
    try {
        const stored = localStorage.getItem('colorflow_daily_history');
        const history = stored ? JSON.parse(stored) : {};
        return history[todayId] || { easy: false, medium: false, hard: false };
    } catch (e) {
        return { easy: false, medium: false, hard: false };
    }
  }, [todayId]);

  const [localCompleted, setLocalCompleted] = useState(completedHistory);

  const dailySeed = useMemo(() => {
    const dStr = todayDate.toISOString().split('T')[0];
    const dateNum = parseInt(dStr.replace(/-/g, ''));
    return dateNum;
  }, [todayId]);

  const getDifficultyLevelNum = (diff: string) => {
    if (diff === 'easy') return 1 + (dailySeed % 20);
    if (diff === 'medium') return 30 + (dailySeed % 30);
    return 70 + (dailySeed % 50);
  };

  useEffect(() => {
    setIsGameOver(false);
    setShowComplete(false);
    setMoveCount(0);
    setStartTime(Date.now());
    setShowingSolution(false);

    // Use difficulty in seed for different levels
    const diffSeed = difficulty === 'easy' ? dailySeed : difficulty === 'medium' ? dailySeed + 100 : dailySeed + 200;
    const generator = new LevelGenerator(diffSeed);
    const dailyLevel = generator.generate(getDifficultyLevelNum(difficulty));
    
    // Increased move limits as requested
    const moves = Math.max(50, (dailyLevel.gridSize || 5) * 10);
    setMovesLeft(moves);
    setLevel(dailyLevel);
    setGrid(dailyLevel.grid);

    return () => {
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [dailySeed, difficulty]);

  const handleComplete = () => {
    setShowComplete(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Update local history
    const nextCompleted = { ...localCompleted, [difficulty]: true };
    setLocalCompleted(nextCompleted);
    
    const stored = localStorage.getItem('colorflow_daily_history');
    const history = stored ? JSON.parse(stored) : {};
    history[todayId] = nextCompleted;
    localStorage.setItem('colorflow_daily_history', JSON.stringify(history));

    const starRew = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40;

    setTimeout(() => {
      setShowComplete(false);
      onComplete({ stars: starRew, moves: moveCount, time: duration });
    }, 2000);
  };

  const isDifficultyDone = localCompleted[difficulty];

  const handleMove = () => {
    if (showingSolution) return;
    setMoveCount(prev => prev + 1);
    setMovesLeft(prev => {
        if (prev <= 1) {
            setIsGameOver(true);
            return 0;
        }
        return prev - 1;
    });
  };

  const resetLevel = () => {
    if (level) {
        setGrid(level.grid);
        setMoveCount(0);
        setMovesLeft(Math.max(50, level.gridSize * 10));
        setIsGameOver(false);
        setShowingSolution(false);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    }
  };

  const handleUseHint = () => {
    if (!level || showingSolution || hintsRemaining <= 0) return;

    const capturedGrid = grid!.map(row => row.map(cell => ({ ...cell })));
    
    const solutionGrid = level.grid.map(row => row.map(cell => ({ 
        ...cell, 
        isPath: false, 
        pathColorIndex: undefined 
    })));
    
    level.solutionPaths.forEach((path, colorIdx) => {
        path.forEach(p => {
            const cell = solutionGrid[p.r][p.c];
            if (cell.type !== 'dot') {
                cell.isPath = true;
                cell.pathColorIndex = colorIdx;
            }
        });
    });

    setGrid(solutionGrid);
    setShowingSolution(true);
    onHintUsed?.();

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
        setGrid(capturedGrid);
        setShowingSolution(false);
        hintTimeoutRef.current = null;
    }, 6000);
  };

  if (!level || !grid) {
    return (
      <div className="fixed inset-0 bg-[#2d1b06] flex items-center justify-center text-white">
        <RefreshCw className="animate-spin text-yellow-500" size={48} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#2d1b06] flex flex-col text-white overflow-hidden">
      {/* Golden Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 80, 0], y: [0, 60, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-yellow-500 rounded-full opacity-10 blur-[120px]"
        />
      </div>

      <header className="flex flex-col bg-black/20 backdrop-blur-xl border-b border-yellow-500/10 z-50">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-white/5">
                  <ChevronLeft size={24} />
              </button>
              <button onClick={resetLevel} className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-white/5 text-white/50">
                  <RefreshCw size={20} />
              </button>
          </div>

          <div className="flex flex-col items-center">
              <h2 className="text-xl font-black italic tracking-tighter text-yellow-500 uppercase">Daily Challenges</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <Calendar size={10} />
                  {todayDisp}
              </div>
          </div>

          <div className="flex items-center gap-2">
              <button 
                  onClick={handleUseHint}
                  disabled={hintsRemaining <= 0 || showingSolution}
                  className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                      hintsRemaining > 0 && !showingSolution
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                      : 'bg-white/5 text-white/10'
                  }`}
              >
                  <Lightbulb size={20} fill={hintsRemaining > 0 ? 'black' : 'none'} />
                  {hintsRemaining > 0 && <span className="text-xs font-black">{hintsRemaining}</span>}
              </button>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex p-2 gap-2 bg-black/20 border-t border-white/5">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-3 rounded-xl font-black italic text-xs tracking-widest uppercase transition-all flex flex-col items-center gap-1 ${
                difficulty === d ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white/40'
              }`}
            >
              <span>{d}</span>
              {localCompleted[d] && <Trophy size={12} className={difficulty === d ? 'text-black' : 'text-yellow-500'} />}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {isDifficultyDone && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 text-center rounded-[2rem]">
                <div className="bg-yellow-500 text-black p-8 rounded-[3rem] shadow-2xl rotate-3">
                    <Trophy size={48} className="mx-auto mb-4" />
                    <h3 className="text-2xl font-black italic mb-1 uppercase">{difficulty} Cleared!</h3>
                    <p className="text-sm font-black italic mb-6">Try another difficulty or come back tomorrow.</p>
                    <div className="flex gap-4 justify-center">
                        {localCompleted.easy && localCompleted.medium && localCompleted.hard ? 
                          <button onClick={onBack} className="bg-black text-white px-6 py-3 rounded-2xl font-black italic text-xs uppercase tracking-widest shadow-xl">Back to Hub</button>
                          :
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Unlock all trophies!</p>
                        }
                    </div>
                </div>
            </div>
        )}

        {showingSolution && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 left-0 right-0 z-50 text-center"
            >
                <div className="bg-yellow-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-xl">
                    <Lightbulb size={12} fill="black" />
                    Memorize! Hiding in 6 seconds...
                </div>
            </motion.div>
        )}
        <div className="mb-4 flex items-center justify-center gap-8 w-full">
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Moves Remaining</span>
                <motion.div 
                    key={movesLeft}
                    initial={{ scale: 1.5, color: '#f59e0b' }}
                    animate={{ scale: 1, color: movesLeft < 10 ? '#ef4444' : '#ffffff' }}
                    className="text-3xl font-black italic"
                >
                    {movesLeft}
                </motion.div>
            </div>
            
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Mode Reward</span>
                <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-lg font-black italic">
                      +{difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40} ⭐
                    </span>
                    {difficulty === 'hard' && <span className="text-yellow-300 text-lg font-black italic">+1 💡</span>}
                </div>
            </div>
        </div>

        <div className="relative w-full max-w-[400px]">
          <GameBoard 
            key={difficulty}
            level={level!} 
            grid={grid!}
            setGrid={setGrid}
            onComplete={handleComplete} 
            colors={gameColors} 
            onMove={handleMove}
          />

          <AnimatePresence>
            {isGameOver && !showComplete && !isDifficultyDone && (
               <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md rounded-3xl"
               >
                 <div className="text-center p-12">
                    <RefreshCw size={64} className="mx-auto mb-6 text-white/20 animate-spin-reverse" />
                    <h2 className="text-3xl font-black italic mb-2 tracking-tight uppercase">Out of Moves</h2>
                    <p className="text-white/60 mb-8 font-bold text-sm">Don't give up! Reset the flow and try again.</p>
                    <button 
                        onClick={resetLevel}
                        className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black italic shadow-2xl flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={20} />
                        RETRY {difficulty}
                    </button>
                 </div>
               </motion.div>
            )}

            {showComplete && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-70 pointer-events-none"
              >
                <div className="bg-yellow-500 text-black px-12 py-8 rounded-[2rem] shadow-[0_0_80px_rgba(234,179,8,0.5)] border-4 border-white/20 transform -rotate-2 text-center">
                    <Sparkles size={32} className="mx-auto mb-2" />
                    <p className="text-4xl font-black italic tracking-tighter">SOLVED!</p>
                    <div className="flex gap-4 justify-center mt-2">
                        <p className="text-sm font-black italic">+{difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40} STARS</p>
                    </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center max-w-[280px]">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] leading-relaxed">
                Connect all colors to claim your <span className="text-yellow-500">{difficulty} Trophy</span>. Solvable, dense flows.
            </p>
        </div>
      </main>
    </div>
  );
};
