import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Calendar, Sparkles, Lightbulb, RefreshCw, Lock } from 'lucide-react';
import { LevelGenerator } from '../logic/levelGenerator';
import { GameBoard } from './GameBoard';
import { Level } from '../types';

interface DailyChallengeScreenProps {
  onComplete: (stats: { stars: number, moves: number, time: number, difficulty: string }) => void;
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
  const [movesLeft, setMovesLeft] = useState(30);
  const [timeLeft, setTimeLeft] = useState(40);
  const [isGameOver, setIsGameOver] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [showingSolution, setShowingSolution] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
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
    setShowClearModal(false);

    // Use difficulty in seed for different levels
    const diffSeed = difficulty === 'easy' ? dailySeed : difficulty === 'medium' ? dailySeed + 100 : dailySeed + 200;
    const generator = new LevelGenerator(diffSeed);
    const dailyLevel = generator.generate(getDifficultyLevelNum(difficulty));
    
    // Procedurally scale move and time limits dynamically based on the level's grid size and difficulty
    const gSize = dailyLevel.gridSize || 5;
    const initialMoves = difficulty === 'easy' 
      ? Math.max(50, gSize * 11) 
      : difficulty === 'medium' 
      ? Math.max(55, gSize * 10) 
      : Math.max(60, gSize * 9);
    
    const initialTime = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 70 : 90;

    setMovesLeft(initialMoves);
    setTimeLeft(initialTime);
    setLevel(dailyLevel);
    setGrid(dailyLevel.grid);

    return () => {
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [dailySeed, difficulty]);

  const isDifficultyDone = localCompleted[difficulty];

  const isDifficultyUnlocked = (d: 'easy' | 'medium' | 'hard') => {
    if (d === 'easy') return true;
    if (d === 'medium') return !!localCompleted.easy;
    if (d === 'hard') return !!localCompleted.easy && !!localCompleted.medium;
  };

  useEffect(() => {
    if (isGameOver || showComplete || isDifficultyDone || showingSolution || !level) return;
    const intervalTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsGameOver(true);
          clearInterval(intervalTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [isGameOver, showComplete, isDifficultyDone, showingSolution, level]);

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
    
    // Invoke onComplete immediately to submit scores to the engine
    onComplete({ stars: starRew, moves: moveCount, time: duration, difficulty });

    setTimeout(() => {
      setShowComplete(false);
      setShowClearModal(true);
    }, 1500);
  };

  const handleMove = () => {
    if (showingSolution || isGameOver) return;
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
        const gSize = level.gridSize || 5;
        const initialMoves = difficulty === 'easy' 
          ? Math.max(50, gSize * 11) 
          : difficulty === 'medium' 
          ? Math.max(55, gSize * 10) 
          : Math.max(60, gSize * 9);
        
        const initialTime = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 70 : 80;

        setMovesLeft(initialMoves);
        setTimeLeft(initialTime);
        setIsGameOver(false);
        setShowingSolution(false);
        setShowClearModal(false);
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
      {/* Golden Background Blobs (Static, high-accuracy, zero lag) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[85vw] h-[85vw] bg-yellow-500 rounded-full opacity-[0.08] blur-[110px]"
        />
        <div 
          className="absolute bottom-[-15%] left-[-15%] w-[65vw] h-[65vw] bg-amber-600 rounded-full opacity-[0.05] blur-[100px]"
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
          {(['easy', 'medium', 'hard'] as const).map(d => {
            const unlocked = isDifficultyUnlocked(d);
            return (
              <button
                key={d}
                onClick={() => {
                  if (unlocked) setDifficulty(d);
                }}
                disabled={!unlocked}
                className={`flex-1 py-3 rounded-xl font-black italic text-xs tracking-widest uppercase transition-all flex flex-col items-center gap-1 ${
                  difficulty === d 
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 font-bold' 
                    : unlocked 
                    ? 'bg-white/5 text-white/40 hover:bg-white/10' 
                    : 'bg-black/40 text-white/15 cursor-not-allowed border border-white/5/20 opacity-60'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {!unlocked && <Lock size={11} className="text-white/40" />}
                  <span>{d}</span>
                </span>
                {localCompleted[d] ? (
                  <Trophy size={11} className={difficulty === d ? 'text-black' : 'text-yellow-500'} />
                ) : (
                  !unlocked && <span className="text-[8px] text-white/20 font-bold">LOCKED</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative">
        {isDifficultyDone && !showClearModal && (
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
        <div className="mb-4 grid grid-cols-3 gap-2 w-full text-center bg-black/20 p-3.5 rounded-2xl border border-white/5">
            <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] text-white/30 font-black tracking-widest uppercase mb-1">Moves Left</span>
                <motion.div 
                    animate={{ color: movesLeft < 6 ? '#ef4444' : '#ffffff' }}
                    className="text-2xl font-black italic font-mono"
                >
                    {movesLeft}
                </motion.div>
            </div>

            <div className="flex flex-col items-center justify-center border-x border-white/10">
                <span className="text-[9px] text-white/30 font-black tracking-widest uppercase mb-1">Timer</span>
                <motion.div 
                    animate={{ color: timeLeft <= 10 ? '#ef4444' : '#f59e0b' }}
                    className={`text-2xl font-black italic font-mono ${timeLeft <= 10 ? 'animate-pulse' : ''}`}
                >
                    {timeLeft}s
                </motion.div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] text-white/30 font-black tracking-widest uppercase mb-1">Reward</span>
                <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
                    <span className="text-yellow-500 text-sm font-black italic">
                      +{difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40} ⭐
                    </span>
                    {difficulty === 'hard' && (
                        <span className="text-yellow-300 text-[10px] font-black uppercase tracking-tight">
                          +1 💡 BONUS
                        </span>
                    )}
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
                key="daily-failed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md rounded-3xl"
               >
                 <div className="text-center p-12">
                    <RefreshCw size={64} className="mx-auto mb-6 text-white/20 animate-spin-reverse" />
                    <h2 className="text-3xl font-black italic mb-2 tracking-tight uppercase">Challenge Failed</h2>
                    <p className="text-white/60 mb-8 font-bold text-sm">You ran out of moves or time! Reset the flow and try again.</p>
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
                key="daily-complete-splash"
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

            {showClearModal && (
              <motion.div
                key="daily-clear-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md rounded-3xl p-6"
              >
                <div className="text-center p-6 w-full max-w-sm">
                  <Trophy size={48} className="mx-auto mb-4 text-yellow-500 animate-bounce" />
                  <h3 className="text-2xl font-black italic mb-1 uppercase tracking-tight text-white">{difficulty} Cleared!</h3>
                  <p className="text-yellow-500 font-extrabold text-xs tracking-widest uppercase mb-4">
                    +{difficulty === 'easy' ? 15 : difficulty === 'medium' ? 25 : 40} STARS CLAIMED!
                  </p>
                  
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 mb-6 text-xs text-white/75 flex justify-around font-mono">
                    <div>
                      <span className="block text-[8px] text-white/40 uppercase font-black tracking-wider">Moves</span>
                      <span className="text-sm font-black text-white">{moveCount}</span>
                    </div>
                    <div className="border-r border-white/10" />
                    <div>
                      <span className="block text-[8px] text-white/40 uppercase font-black tracking-wider">Time</span>
                      <span className="text-sm font-black text-yellow-500">
                        {Math.floor((Date.now() - startTime) / 1000)}s
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {difficulty === 'easy' && (
                      <button 
                        onClick={() => {
                          setDifficulty('medium');
                          setShowClearModal(false);
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black py-3.5 rounded-xl font-black italic text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20 font-bold"
                      >
                        Play Medium Challenge ⏭
                      </button>
                    )}
                    
                    {difficulty === 'medium' && (
                      <button 
                        onClick={() => {
                          setDifficulty('hard');
                          setShowClearModal(false);
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black py-3.5 rounded-xl font-black italic text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20 font-bold"
                      >
                        Play Hard Challenge ⏭
                      </button>
                    )}

                    {difficulty === 'hard' && (
                      <div className="text-yellow-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                        🏆 CONGRATULATIONS! ALL CHALLENGES ARE SECURED TODAY!
                      </div>
                    )}

                    <button 
                      onClick={onBack}
                      className="w-full bg-white/5 hover:bg-white/10 text-slate-350 py-2.5 rounded-xl font-black italic text-[11px] uppercase tracking-widest transition-all"
                    >
                      Back to Hub
                    </button>
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
