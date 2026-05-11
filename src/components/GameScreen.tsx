import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, RefreshCw, ChevronLeft, HelpCircle, Undo2, FastForward, Star, PlayCircle } from 'lucide-react';
import { Level, ThemeName } from '../types';
import { LevelGenerator } from '../logic/levelGenerator';
import { GameBoard } from './GameBoard';
import { TutorialOverlay } from './TutorialOverlay';
import { GameStorage } from '../logic/storage';
import { sounds } from '../lib/sounds';

interface GameScreenProps {
  currentLevel: number;
  onComplete: (stars: number) => void;
  onBack: () => void;
  palette?: string[];
  theme?: ThemeName;
  onHintUsed?: () => void;
}

const DEFAULT_COLORS = [
  '#EF4444', // red-500
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#71717A', // zinc-500
];

const PERFECT_MSGS = ['💯 Perfect!', '✨ Brilliant!', '🌟 Superb!', '🚀 Awesome!'];
const GREAT_MSGS = ['💪 Great Job!', '👏 Well Done!', '🔥 On Fire!', '⭐ Amazing!'];
const GOOD_MSGS = ['🎉 Hurray!', '🏆 Congrats!', '😎 Cool!', '🥳 Happy!'];

export const GameScreen: React.FC<GameScreenProps> = ({ currentLevel, onComplete, onBack, onHintUsed, palette, theme }) => {
  const gameColors = palette || DEFAULT_COLORS;
  const generator = useMemo(() => new LevelGenerator(), []);

  const getThemeGradient = (themeName?: ThemeName) => {
    switch (themeName) {
      case 'forest': return 'from-green-950 to-green-900';
      case 'ocean': return 'from-blue-950 to-blue-900';
      case 'space': return 'from-indigo-950 to-purple-950';
      case 'candy': return 'from-red-950 to-pink-900';
      case 'desert': return 'from-orange-950 to-yellow-900';
      case 'arctic': return 'from-slate-900 to-slate-800';
      case 'volcano': return 'from-red-950 to-orange-950';
      case 'garden': return 'from-green-950 to-emerald-950';
      case 'city': return 'from-slate-950 to-gray-900';
      case 'clouds': return 'from-indigo-900 to-blue-800';
      default: return 'from-[#0a0a0a] to-[#0a0a0a]';
    }
  };

  const [level, setLevel] = useState<Level | null>(null);
  const [grid, setGrid] = useState<any[][] | null>(null);
  const [history, setHistory] = useState<any[][][]>([]);
  const [winningHistory, setWinningHistory] = useState<any[][][]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStep, setReviewStep] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  const [starsEarned, setStarsEarned] = useState(0);
  const [shouldShake, setShouldShake] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adReason, setAdReason] = useState<'hint' | 'skip'>('hint');
  const [hintPath, setHintPath] = useState<{ r: number, c: number }[] | undefined>();
  const [moveCount, setMoveCount] = useState(0);
  const [lastMovedColor, setLastMovedColor] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintUsageCount, setHintUsageCount] = useState(0);
  const [showingSolution, setShowingSolution] = useState(false);
  const [preHintGrid, setPreHintGrid] = useState<any[][] | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [completionTime, setCompletionTime] = useState(0);
  const [lastHintTime, setLastHintTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const [hasUsedHintOnce, setHasUsedHintOnce] = useState(false);
  const hintTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const HINT_MOVES_REQUIRED = 40;
  const HINT_COOLDOWN_MS = 10000;
  const AD_DURATION_MS = 30000; // 30 seconds
  const SKIP_AVAILABLE_MS = 15000; // 15 seconds
  const [adTimeElapsed, setAdTimeElapsed] = useState(0);

  useEffect(() => {
    const newLevel = generator.generate(currentLevel);
    setLevel(newLevel);
    setGrid(newLevel.grid);
    setHistory([]);
    setHintPath(undefined);
    setMoveCount(0);
    setHintsUsed(0);
    setStartTime(Date.now());
    setLastHintTime(0);
    setCooldownRemaining(0);
    setHintUsageCount(0);
    setHasUsedHintOnce(false);
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [currentLevel, generator]);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isWatchingAd) {
      timer = setInterval(() => {
        setAdTimeElapsed(prev => prev + 1000);
      }, 1000);
    } else {
      setAdTimeElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isWatchingAd]);

  useEffect(() => {
    if (isWatchingAd && adTimeElapsed >= AD_DURATION_MS) {
      setIsWatchingAd(false);
      setAdTimeElapsed(0);
      if (adReason === 'hint') {
        triggerHintLogic();
      } else {
        skipLevel();
      }
    }
  }, [isWatchingAd, adTimeElapsed, AD_DURATION_MS, adReason]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const lastGrid = newHistory.pop();
    setGrid(lastGrid!);
    setHistory(newHistory);
    setMoveCount(prev => Math.max(0, prev - 1));
    sounds.playClick();
  };

  const skipLevel = () => {
    onComplete(1); // skip gives 1 star
  };

  useEffect(() => {
    if (isReviewing && winningHistory.length > 0) {
      setReviewStep(0);
      const interval = setInterval(() => {
        setReviewStep(prev => {
          const next = prev + 1;
          if (next >= winningHistory.length) {
            clearInterval(interval);
            return prev;
          }
          setGrid(winningHistory[next]);
          return next;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isReviewing, winningHistory]);

  const handleComplete = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setCompletionTime(duration);

    // Save history for replay
    setWinningHistory([...history, grid!]);

    // Save global stats
    const totalCells = level?.gridSize ? level.gridSize * level.gridSize : 25;
    
    // Count actual playable cells (excluding walls)
    let playableCells = 0;
    level?.grid.forEach(row => row.forEach(cell => {
      if (cell.type !== 'wall') playableCells++;
    }));
    if (playableCells === 0) playableCells = totalCells;

    // More generous star calculation
    // 3 stars: <= 1.5x cells (allows for some corrections)
    // 2 stars: <= 3x cells
    // 1 star: more than 3x cells
    const earned = moveCount <= playableCells * 1.5 ? 3 : moveCount <= playableCells * 3 ? 2 : 1;
    setStarsEarned(earned);

    // Pick celebration message based on performance
    let randomMsg = '';
    if (earned === 3) {
      randomMsg = PERFECT_MSGS[Math.floor(Math.random() * PERFECT_MSGS.length)];
    } else if (earned === 2) {
      randomMsg = GREAT_MSGS[Math.floor(Math.random() * GREAT_MSGS.length)];
    } else {
      randomMsg = GOOD_MSGS[Math.floor(Math.random() * GOOD_MSGS.length)];
    }
    setCelebrationMsg(randomMsg);

    GameStorage.saveData({
      totalGamesPlayed: (GameStorage.getData().totalGamesPlayed || 0) + 1,
      totalMoves: (GameStorage.getData().totalMoves || 0) + moveCount,
      totalTimeSeconds: (GameStorage.getData().totalTimeSeconds || 0) + duration,
      threeStarLevels: (GameStorage.getData().threeStarLevels || 0) + (earned === 3 ? 1 : 0),
    });

    setShowComplete(true);
    setConfettiActive(true);
    sounds.playComplete();
  };

  const triggerShake = () => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 300);
  };

  const resetLevel = () => {
    if (level) {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
      setGrid(level.grid);
      setHistory([]);
      setHintPath(undefined);
      setMoveCount(0);
      setHintsUsed(0);
      setStartTime(Date.now());
      setShowingSolution(false);
      setConfettiActive(false);
      setPreHintGrid(null);
    }
  };

  const useHint = () => {
    if (!canUseHint) return;
    
    setAdReason('hint');
    setIsWatchingAd(true);
    setAdTimeElapsed(0);
  };

  const triggerSkip = () => {
    setAdReason('skip');
    setIsWatchingAd(true);
    setAdTimeElapsed(0);
  };

  const triggerHintLogic = () => {
    if (!level?.solutionPaths || !grid || level.solutionPaths.length === 0) {
      console.error("Missing level data for hint");
      return;
    }

    // Capture current grid to restore later
    const capturedGrid = grid.map(row => row.map(cell => ({ ...cell })));
    setPreHintGrid(capturedGrid);
    
    // Create solution grid
    const solutionGrid = grid.map(row => row.map(cell => ({ ...cell })));
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
    setLastHintTime(Date.now());
    setHintsUsed(prev => prev + 1);
    
    // Determine hint duration: 10s for first, 5s thereafter
    const displayDuration = hintUsageCount === 0 ? 10000 : 5000;
    setHintUsageCount(prev => prev + 1);

    onHintUsed?.();
    setCooldownRemaining(HINT_COOLDOWN_MS);
    setHasUsedHintOnce(false);

    // Hide solution after the calculated duration
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
        setGrid(capturedGrid);
        setShowingSolution(false);
        setPreHintGrid(null);
        hintTimeoutRef.current = null;
    }, displayDuration);
  };

  const isHintUnlocked = moveCount >= HINT_MOVES_REQUIRED;
  const isCooldownOver = cooldownRemaining === 0;
  const canUseHint = isHintUnlocked && isCooldownOver && !showingSolution;

  if (!level) return null;
  const bgGradient = getThemeGradient(theme);

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${bgGradient} flex flex-col text-white pt-secure`}>
      <header className="flex items-center justify-between px-2 py-2 md:p-6 bg-black/20 backdrop-blur-sm border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={onBack} className="p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5">
            <ChevronLeft size={18} className="md:w-6 md:h-6" />
          </button>
          <button 
            onClick={resetLevel} 
            className="p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5 text-white/50 hover:text-white"
            title="Reset Level"
          >
            <RefreshCw size={16} className="md:w-5 md:h-5" />
          </button>
          <button 
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-2xl transition-colors bg-white/5 ${history.length > 0 ? 'text-white/50 hover:text-white' : 'opacity-20 pointer-events-none'}`}
            title="Undo Move"
          >
            <Undo2 size={16} className="md:w-5 md:h-5" />
          </button>
          <button onClick={() => setShowTutorial(true)} className="hidden xs:flex p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5 text-white/50 hover:text-white">
            <HelpCircle size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center px-1 flex-1 min-w-0">
          <h2 className="text-[10px] md:text-lg font-black italic tracking-tighter opacity-50 uppercase tracking-widest truncate w-full text-center">Level {currentLevel}</h2>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <div className="relative">
            <button 
              onClick={useHint} 
              disabled={!canUseHint}
              className={`relative p-2 md:p-4 rounded-lg md:rounded-2xl transition-all shadow-xl ${
                canUseHint 
                  ? 'text-black bg-yellow-500 hover:scale-105 active:scale-95 shadow-yellow-500/20' 
                  : 'text-white/10 bg-white/5'
              }`}
            >
              {/* Cooldown Ring */}
              {!canUseHint && cooldownRemaining > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: Math.max(0, Math.min(100, Math.round(100 - (cooldownRemaining / HINT_COOLDOWN_MS) * 100))) }}
                    className="text-yellow-500/40"
                  />
                </svg>
              )}
              <Lightbulb size={18} className="md:w-6 md:h-6" fill={canUseHint ? "black" : "none"} />
            </button>
          
          {!canUseHint && isHintUnlocked && cooldownRemaining > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-[10px] text-black font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0a0a0a]">
              {Math.ceil(cooldownRemaining / 1000)}s
            </div>
          )}
        </div>
      </div>
    </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        <div className="mb-6 text-white/20 text-[10px] font-black uppercase tracking-[0.5em] flex items-center justify-center gap-4 w-full">
          <span>{level.colorCount} COLORS</span>
          <span className="text-white/10">•</span>
          <span>{level.gridSize}x{level.gridSize} GRID</span>
        </div>

        {/* Interactive Tutorial Guide */}
        {(currentLevel === 1 || currentLevel === 2) && moveCount < 5 && level.solutionPaths && level.solutionPaths.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-6 px-6 py-3 bg-blue-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/30 text-center shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          >
            <p className="text-sm font-black italic tracking-wide text-blue-400">
               {currentLevel === 1 ? (
                 (() => {
                   if (moveCount === 0) return "🚀 Step 1: Start from this highlighted dot!";
                   if (moveCount === 1) return "✨ Good! Now extend the line to the next cell!";
                   if (moveCount === 2) return "🔗 Step 2: Keep going towards the matching dot!";
                   if (moveCount === 3) return "⭐ Step 3: Almost there! Flow the color!";
                   return "🏁 Final Step: Connect to the matching dot!";
                 })()
               ) : (
                 (() => {
                   if (moveCount === 0) return "💡 Pro Tip: Starting from a corner dot is often easier!";
                   if (moveCount === 1) return "🚀 Nice! Now plan your path to the other dot.";
                   if (moveCount === 2) return "✨ Great flow! Don't forget to fill all cells.";
                   if (moveCount === 3) return "🔗 Keep it up! Every cell must be covered.";
                   return "⭐ You've got this! Connect 'em all.";
                 })()
               )}
            </p>
          </motion.div>
        )}

        <div className="relative w-full">
          {showingSolution && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-12 left-0 right-0 z-50 text-center"
            >
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-xl">
                <Lightbulb size={12} fill="black" />
                Memorize! Hiding in a few seconds...
              </div>
            </motion.div>
          )}

          <motion.div 
            className="relative"
            animate={shouldShake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <GameBoard 
              level={level} 
              grid={grid}
              setGrid={setGrid}
              onComplete={handleComplete} 
              onError={triggerShake}
              colors={gameColors} 
              hintPath={hintPath || (currentLevel <= 2 && moveCount < 5 ? level.solutionPaths?.[0] : undefined)}
              onMove={(prevGrid, colorIdx) => {
                if (isReviewing || showingSolution) return;
                setHistory(prev => [...prev.slice(-19), prevGrid]); // Keep last 20 moves
                setMoveCount(prev => prev + 1);
                setLastMovedColor(colorIdx);
              }}
              moveCount={moveCount}
              showingSolution={showingSolution}
            />

            {/* Confetti Celebration Overlay */}
            <AnimatePresence>
              {confettiActive && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-xl">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: `${Math.random() * 100}%`, 
                        y: -20, 
                        scale: 0,
                        rotate: 0,
                        opacity: 1
                      }}
                      animate={{ 
                        y: ['-10%', '110%'],
                        scale: [0, 1, 1, 0.5],
                        opacity: [1, 1, 1, 0],
                        x: [
                          `${Math.random() * 100}%`, 
                          `${Math.random() * 100 + (Math.random() * 40 - 20)}%`
                        ],
                        rotate: Math.random() * 720
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        duration: Math.random() * 2 + 1.5, 
                        ease: "easeOut",
                        delay: Math.random() * 0.5
                      }}
                      className="absolute w-2 h-2 rounded-sm"
                      style={{ 
                        backgroundColor: gameColors[Math.floor(Math.random() * gameColors.length)],
                        left: 0,
                        top: 0,
                        boxShadow: `0 0 10px rgba(255,255,255,0.3)`
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {isReviewing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-24 left-0 right-0 bg-black/60 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between border border-white/10"
            >
              <div className="flex items-center gap-3 text-white/50">
                <PlayCircle className="animate-pulse text-green-500" size={20} />
                <span className="text-xs font-black italic tracking-widest">WATCHING REPLAY</span>
              </div>
              <button 
                onClick={() => {
                  setIsReviewing(false);
                  const totalCells = level?.gridSize ? level.gridSize * level.gridSize : 25;
                  const starsEarned = moveCount <= totalCells * 1.2 ? 3 : moveCount <= totalCells * 1.8 ? 2 : 1;
                  onComplete(starsEarned);
                }}
                className="bg-white text-black px-6 py-2 rounded-xl font-black italic text-xs tracking-tighter"
              >
                NEXT LEVEL
              </button>
            </motion.div>
          )}
          
          <AnimatePresence>
            {showComplete && (
              <>
                {/* Confetti Particles */}
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      top: '50%', 
                      left: '50%', 
                      scale: 0,
                      rotate: 0,
                      x: 0,
                      y: 0
                    }}
                    animate={{ 
                      x: (Math.random() - 0.5) * 600,
                      y: (Math.random() - 0.5) * 800,
                      scale: [0, 1, 0.5],
                      rotate: Math.random() * 360,
                      opacity: [1, 1, 0]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      ease: "easeOut",
                    }}
                    className="absolute z-40 w-3 h-3 rounded-sm pointer-events-none"
                    style={{ 
                      backgroundColor: gameColors[Math.floor(Math.random() * gameColors.length)],
                    }}
                  />
                ))}

                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0 
                  }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <div className="bg-[#1E1E1E] p-8 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-yellow-500/50 transform -rotate-2 w-full max-w-xs mx-auto flex flex-col items-center pointer-events-auto">
                    <p className="text-3xl font-black italic text-white mb-2 tracking-tight">
                      {celebrationMsg}
                    </p>
                    
                    <div className="flex justify-center gap-1 mb-6">
                       {Array.from({ length: 3 }).map((_, i) => (
                           <motion.div
                             key={i}
                             initial={{ scale: 0 }}
                             animate={{ scale: 1 }}
                             transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                           >
                             <Star 
                               className={`${i < starsEarned ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} 
                               size={32} 
                             />
                           </motion.div>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                      <div className="flex flex-col items-center bg-white/5 p-3 rounded-2xl">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Moves</span>
                        <span className="text-xl font-black">{moveCount}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 p-3 rounded-2xl">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Time</span>
                        <span className="text-xl font-black">{completionTime}s</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <button 
                        onClick={() => {
                          setShowComplete(false);
                          setConfettiActive(false);
                          onComplete(starsEarned);
                        }}
                        className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black italic tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-xl"
                      >
                        NEXT LEVEL ▶
                      </button>
                      <button 
                        onClick={() => {
                          setIsReviewing(true);
                          setReviewStep(0);
                          setGrid(winningHistory[0]);
                          setShowComplete(false);
                          setConfettiActive(false);
                        }}
                        className="w-full bg-white/5 text-white/50 py-3 rounded-2xl font-bold italic tracking-widest hover:bg-white/10 transition-colors border border-white/5"
                      >
                        WATCH REPLAY
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={resetLevel}
          className="mt-12 flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors uppercase text-xs font-black tracking-widest"
        >
          <RefreshCw size={14} />
          Reset Level
        </button>
      </main>

      <footer className="h-16 flex items-center justify-center bg-black/40 border-t border-white/5">
        <p className="text-[10px] text-white/20 font-bold tracking-[0.3em] uppercase">Never Stop Flowing</p>
      </footer>
      {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}

      <AnimatePresence>
        {isWatchingAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#1E1E1E]/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs bg-[#2a2a2a] rounded-[32px] p-8 flex flex-col items-center shadow-2xl border border-white/10"
            >
              <h3 className="text-white text-xl font-black italic mb-8 tracking-tight">
                {adReason === 'hint' ? '🎁 Hint Unlocking...' : '⏭ Skipping Level...'}
              </h3>
              
              <div className="relative w-32 h-32 mb-8">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="#EAB308"
                    strokeWidth="6"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: Math.max(0, Math.min(100, Math.round(100 - (adTimeElapsed / AD_DURATION_MS) * 100))) }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black italic">{Math.ceil((AD_DURATION_MS - adTimeElapsed) / 1000)}</span>
                </div>
              </div>

              {adTimeElapsed >= SKIP_AVAILABLE_MS && (hintUsageCount === 0 || adReason === 'skip') ? (
                <button 
                  onClick={() => {
                    setIsWatchingAd(false);
                    if (adReason === 'hint') triggerHintLogic();
                    else skipLevel();
                  }}
                  className="bg-yellow-500 text-black px-8 py-3 rounded-2xl font-black italic tracking-widest hover:scale-105 active:scale-95 transition-transform"
                >
                  SKIP ▶
                </button>
              ) : (
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                  {adReason === 'hint' && hintUsageCount > 0 
                    ? `Wait ${Math.ceil((AD_DURATION_MS - adTimeElapsed) / 1000)}s`
                    : `Skip in ${Math.ceil((SKIP_AVAILABLE_MS - adTimeElapsed) / 1000)}s`}
                </p>
              )}
            </motion.div>
            
            <p className="mt-8 text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Interactive Ad Simulation</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
