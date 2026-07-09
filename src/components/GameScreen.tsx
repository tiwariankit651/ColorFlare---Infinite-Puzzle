import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, RefreshCw, ChevronLeft, HelpCircle, Undo2, FastForward, Star, PlayCircle, Share2 } from 'lucide-react';
import { Level, ThemeName } from '../types';
import { LevelGenerator } from '../logic/levelGenerator';
import { GameBoard } from './GameBoard';
import { TutorialOverlay } from './TutorialOverlay';
import { GameStorage } from '../logic/storage';
import { sounds } from '../lib/sounds';
import confetti from 'canvas-confetti';

interface GameScreenProps {
  currentLevel: number;
  onComplete: (stats: { stars: number, moves: number, time: number }) => void;
  onBack: () => void;
  palette?: string[];
  theme?: ThemeName;
  onHintUsed?: () => void;
  hintsRemaining?: number;
  hardModeOn?: boolean;
}

const DEFAULT_COLORS = [
  '#EF4444', // red-500
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#A855F7', // purple-500
  '#14B8A6', // teal-500
  '#F43F5E', // neon rose (was zinc-500 #71717A)
];

const PERFECT_MSGS = ['💯 Perfect!', '✨ Brilliant!', '🌟 Superb!', '🚀 Awesome!'];
const GREAT_MSGS = ['💪 Great Job!', '👏 Well Done!', '🔥 On Fire!', '⭐ Amazing!'];
const GOOD_MSGS = ['🎉 Hurray!', '🏆 Congrats!', '😎 Cool!', '🥳 Happy!'];

export const GameScreen: React.FC<GameScreenProps> = ({ currentLevel, onComplete, onBack, onHintUsed, palette, theme, hintsRemaining = 0, hardModeOn = false }) => {
  const gameColors = palette || DEFAULT_COLORS;
  const [level, setLevel] = useState<Level | null>(null);

  const getThemeColors = (themeName?: ThemeName) => {
    switch (themeName) {
      case 'forest': return { bg: 'bg-[#064e3b]', accent: '#10b981', secondary: '#065f46' };
      case 'ocean': return { bg: 'bg-[#0c4a6e]', accent: '#0ea5e9', secondary: '#075985' };
      case 'space': return { bg: 'bg-[#1e1b4b]', accent: '#8b5cf6', secondary: '#312e81' };
      case 'candy': return { bg: 'bg-[#831843]', accent: '#ec4899', secondary: '#9d174d' };
      case 'desert': return { bg: 'bg-[#7c2d12]', accent: '#f97316', secondary: '#9a3412' };
      case 'arctic': return { bg: 'bg-[#334155]', accent: '#94a3b8', secondary: '#1e293b' };
      case 'volcano': return { bg: 'bg-[#7f1d1d]', accent: '#ef4444', secondary: '#991b1b' };
      case 'garden': return { bg: 'bg-[#14532d]', accent: '#22c55e', secondary: '#166534' };
      case 'city': return { bg: 'bg-[#0f172a]', accent: '#64748b', secondary: '#1e293b' };
      case 'clouds': return { bg: 'bg-[#1e3a8a]', accent: '#60a5fa', secondary: '#1e40af' };
      case 'cyber': return { bg: 'bg-[#0a0a0a]', accent: '#f0abfc', secondary: '#701a75' };
      case 'zen': return { bg: 'bg-[#1c1917]', accent: '#d6d3d1', secondary: '#44403c' };
      default: return { bg: 'bg-[#0a0a0a]', accent: '#10b981', secondary: '#1f2937' };
    }
  };

  const [grid, setGrid] = useState<any[][] | null>(null);
  const [history, setHistory] = useState<any[][][]>([]);
  const [moveHistory, setMoveHistory] = useState<number[]>([]);
  const [winningHistory, setWinningHistory] = useState<any[][][]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStep, setReviewStep] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  const [starsEarned, setStarsEarned] = useState(0);
  const [shouldShake, setShouldShake] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adReason, setAdReason] = useState<'hint'>('hint');
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [failReason, setFailReason] = useState<'moves' | 'time' | null>(null);

  const [hasUsedHintOnce, setHasUsedHintOnce] = useState(false);
  const hintTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const HINT_MOVES_REQUIRED = 40;
  const HINT_COOLDOWN_MS = 10000;
  const AD_DURATION_MS = 30000; // 30 seconds
  const SKIP_AVAILABLE_MS = 15000; // 15 seconds
  const [adTimeElapsed, setAdTimeElapsed] = useState(0);

  useEffect(() => {
    // Generate a stable seed for this level to ensure consistency across users and sessions
    const levelSeed = (currentLevel * 15485863) % 2147483647;
    const levelGenerator = new LevelGenerator(levelSeed);
    let newLevel = levelGenerator.generate(currentLevel, hardModeOn);
    
    if (hardModeOn) {
      newLevel = levelGenerator.applyHardMode(newLevel);
    }
    
    setLevel(newLevel);
    setGrid(newLevel.grid);
    setHistory([]);
    setMoveHistory([]);
    setHintPath(undefined);
    setMoveCount(0);
    setHintsUsed(0);
    setStartTime(Date.now());
    setLastHintTime(0);
    setCooldownRemaining(0);
    setHintUsageCount(0);
    setHasUsedHintOnce(false);
    setFailReason(null);
    if (hardModeOn && newLevel.timeLimit) {
      setTimeLeft(newLevel.timeLimit);
    } else {
      setTimeLeft(null);
    }
    if (currentLevel === 1 && !localStorage.getItem('colorflow_tutorial')) {
      setShowTutorial(true);
    }
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [currentLevel, hardModeOn]);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!hardModeOn || timeLeft === null || showComplete || failReason) return;
    if (timeLeft <= 0) {
      setFailReason('time');
      triggerShake();
      setTimeout(() => {
        resetLevel();
      }, 1500);
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, hardModeOn, showComplete, failReason]);

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
      triggerHintLogic();
    }
  }, [isWatchingAd, adTimeElapsed, AD_DURATION_MS]);

  const handleUndo = () => {
    if (history.length === 0 || moveHistory.length === 0) return;
    const newHistory = [...history];
    const lastGrid = newHistory.pop();
    setGrid(lastGrid!);
    setHistory(newHistory);

    const newMoveHistory = [...moveHistory];
    const prevMoveCount = newMoveHistory.pop();
    if (prevMoveCount !== undefined) {
      setMoveCount(prevMoveCount);
    }
    setMoveHistory(newMoveHistory);
    sounds.playClick();
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

  const handleComplete = (finalGrid?: any[][]) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setCompletionTime(duration);

    // Save history for replay
    const resolvedFinalGrid = finalGrid || grid!;
    setWinningHistory([...history, resolvedFinalGrid]);

    // Save global stats
    const totalCells = level?.gridSize ? level.gridSize * level.gridSize : 25;
    
    // Count actual playable cells (excluding walls)
    let playableCells = 0;
    level?.grid.forEach(row => row.forEach(cell => {
      if (cell.type !== 'wall') playableCells++;
    }));
    if (playableCells === 0) playableCells = totalCells;

    // Advanced cell-transition based star scoring calculation
    const colorCount = level?.colorCount || 5;
    const gridSize = level?.gridSize || 5;

    // Calculate exact minimum moves (cell-transitions) required for a perfect connection
    let perfectMoves = 0;
    if (level?.solutionPaths && level.solutionPaths.length > 0) {
      perfectMoves = level.solutionPaths.reduce((acc, path) => acc + Math.max(0, path.length - 1), 0);
    } else {
      perfectMoves = Math.max(colorCount * 2, playableCells - colorCount);
    }

    // Advanced adaptive grace thresholds that perfectly support step-by-step moves
    const threeStarThreshold = perfectMoves + Math.max(8, Math.floor(perfectMoves * 0.45));
    const twoStarThreshold = perfectMoves + Math.max(20, Math.floor(perfectMoves * 0.95));

    const earned = moveCount <= threeStarThreshold ? 3 : moveCount <= twoStarThreshold ? 2 : 1;
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
    
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: gameColors
      });
    }, 300);


    setShowComplete(true);
    setConfettiActive(true);
    sounds.playComplete();
    
    // Auto-advance stats to App via a small delay or on button click
    // But we need to call onComplete with full stats
  };

  const handleNextLevel = () => {
    setShowComplete(false);
    setConfettiActive(false);
    onComplete({ stars: starsEarned, moves: moveCount, time: completionTime });
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
      setMoveHistory([]);
      setHintPath(undefined);
      setMoveCount(0);
      setHintsUsed(0);
      setStartTime(Date.now());
      setShowingSolution(false);
      setConfettiActive(false);
      setPreHintGrid(null);
      setFailReason(null);
      if (hardModeOn && level.timeLimit) {
        setTimeLeft(level.timeLimit);
      } else {
        setTimeLeft(null);
      }
    }
  };

  const useHint = () => {
    if (showingSolution) return;
    
    if (hintsRemaining > 0) {
      triggerHintLogic();
    } else {
      setAdReason('hint');
      setIsWatchingAd(true);
      setAdTimeElapsed(0);
    }
  };

  const triggerHintLogic = () => {
    if (!level?.solutionPaths || !grid || level.solutionPaths.length === 0) {
      console.error("Missing level data for hint");
      return;
    }

    setShowingSolution(true);
    setLastHintTime(Date.now());
    setHintsUsed(prev => prev + 1);
    
    // Hint guideline trails remain active for 12 seconds so they have plenty of time to trace them
    const displayDuration = 12000;
    setHintUsageCount(prev => prev + 1);

    onHintUsed?.();
    setCooldownRemaining(HINT_COOLDOWN_MS);
    setHasUsedHintOnce(false);

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
        setShowingSolution(false);
        hintTimeoutRef.current = null;
    }, displayDuration);
  };

  const isHintUnlocked = moveCount >= 5; 
  const isCooldownOver = cooldownRemaining === 0;
  const canUseHint = isCooldownOver && !showingSolution && !showComplete && !isReviewing;

  if (!level) return null;
  const colors = getThemeColors(theme);

  const controlsDisabled = showComplete || isReviewing;

  return (
    <div className={`fixed inset-0 ${colors.bg} flex flex-col text-white pt-secure overflow-hidden`}>
      {/* Background Blobs for Zen Feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ 
            x: [0, -50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full opacity-10 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
        />
      </div>

      <header className="flex items-center justify-between px-2 py-2 md:p-6 bg-black/20 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-1 md:gap-3">
          <button 
            onClick={onBack} 
            disabled={controlsDisabled}
            className={`p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5 ${controlsDisabled ? 'opacity-20 pointer-events-none' : ''}`}
          >
            <ChevronLeft size={18} className="md:w-6 md:h-6" />
          </button>
          <button 
            onClick={resetLevel} 
            disabled={controlsDisabled}
            className={`p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5 text-white/50 hover:text-white ${controlsDisabled ? 'opacity-20 pointer-events-none' : ''}`}
            title="Reset Level"
          >
            <RefreshCw size={16} className="md:w-5 md:h-5" />
          </button>
          <button 
            onClick={handleUndo}
            disabled={history.length === 0 || controlsDisabled}
            className={`p-1.5 md:p-3 rounded-lg md:rounded-2xl transition-colors bg-white/5 ${history.length > 0 && !controlsDisabled ? 'text-white/50 hover:text-white' : 'opacity-20 pointer-events-none'}`}
            title="Undo Move"
          >
            <Undo2 size={16} className="md:w-5 md:h-5" />
          </button>
          <button 
            onClick={() => setShowTutorial(true)} 
            disabled={controlsDisabled}
            className={`hidden xs:flex p-1.5 md:p-3 hover:bg-white/10 rounded-lg md:rounded-2xl transition-colors bg-white/5 text-white/50 hover:text-white ${controlsDisabled ? 'opacity-20 pointer-events-none' : ''}`}
          >
            <HelpCircle size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center px-1 flex-1 min-w-0">
          <h2 className="text-[10px] md:text-lg font-black italic tracking-tighter opacity-50 uppercase tracking-widest truncate w-full text-center">Level {currentLevel}</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const url = `${window.location.origin}?level=${currentLevel}`;
              navigator.clipboard.writeText(`Challenge: Can you solve ColorFlow Level ${currentLevel}? ${url}`);
              sounds.playClick();
              alert('Level link copied! Share it with a friend! 🚀');
            }}
            className="flex items-center gap-1 text-[8px] font-black uppercase text-cyan-400 mt-1 hover:text-cyan-300"
          >
            <Share2 size={10} />
            Challenge Friend
          </motion.button>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <div className="relative">
            <button 
              onClick={useHint} 
              disabled={!canUseHint}
              className={`relative p-2 md:p-4 rounded-lg md:rounded-2xl transition-all shadow-xl flex items-center gap-2 ${
                canUseHint 
                  ? 'text-black bg-yellow-500 hover:scale-105 active:scale-95 shadow-yellow-500/20' 
                  : 'text-white/10 bg-white/5 opacity-20'
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
              {canUseHint && (
                <span className="text-xs font-black mr-1">
                  {hintsRemaining > 0 ? hintsRemaining : '+'}
                </span>
              )}
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
        <div className="mb-5 text-center">
          <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-4 w-full">
            <span>{level.colorCount} COLORS</span>
            <span className="text-white/10">•</span>
            <span>{level.gridSize}x{level.gridSize} GRID</span>
          </div>
          {hardModeOn && level.isHardMode && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-6 mt-3 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl max-w-xs mx-auto"
            >
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400/80">Moves Left</span>
                <span className={`text-lg font-black tracking-tight ${level.maxMoves && (level.maxMoves - moveCount <= 2) ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {level.maxMoves ? Math.max(0, level.maxMoves - moveCount) : '∞'}
                </span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400/80">Time Limit</span>
                <span className={`text-lg font-black tracking-tight ${timeLeft !== null && timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {timeLeft !== null ? `${timeLeft}s` : '∞'}
                </span>
              </div>
            </motion.div>
          )}
          {level.strategyName && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-2.5 bg-purple-500/10 border border-purple-500/20 px-3.5 py-1.5 rounded-full inline-flex flex-col items-center max-w-xs"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                🧩 setup: {level.strategyName}
              </span>
              {level.strategyDesc && (
                <span className="text-[8.5px] text-slate-400 font-medium tracking-tight text-center leading-normal mt-0.5">
                  {level.strategyDesc}
                </span>
              )}
            </motion.div>
          )}
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
              <div className="bg-yellow-505 bg-yellow-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 shadow-2xl border border-white/20 animate-bounce">
                <Lightbulb size={12} fill="black animate-pulse" />
                Ghost Trails Active! Trace to Solve!
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
              showingSolution={showingSolution}
              hintPath={hintPath || (currentLevel <= 2 && moveCount < 5 ? level.solutionPaths?.[0] : undefined)}
              onMove={(prevGrid, colorIdx, isStartStroke) => {
                if (isReviewing || failReason) return;
                setHistory(prev => [...prev.slice(-19), prevGrid]); // Keep last 20 moves
                setMoveHistory(prev => [...prev.slice(-19), moveCount]); // Track moveCount transitions for clean Undos
                const nextMoveCount = moveCount + 1;
                setMoveCount(nextMoveCount);
                setLastMovedColor(colorIdx);
                sounds.playCombo(Math.min(12, Math.floor(moveCount / 5)));
                
                if (hardModeOn && level?.maxMoves && nextMoveCount > level.maxMoves) {
                  setFailReason('moves');
                  triggerShake();
                  setTimeout(() => {
                    resetLevel();
                  }, 1500);
                }
              }}
              moveCount={moveCount}
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
                  
                  let playableCells = 0;
                  level?.grid.forEach(row => row.forEach(cell => {
                    if (cell.type !== 'wall') playableCells++;
                  }));
                  if (playableCells === 0) playableCells = totalCells;

                  const colorCount = level?.colorCount || 5;
                  let perfectMoves = 0;
                  if (level?.solutionPaths && level.solutionPaths.length > 0) {
                    perfectMoves = level.solutionPaths.reduce((acc, path) => acc + Math.max(0, path.length - 1), 0);
                  } else {
                    perfectMoves = Math.max(colorCount * 2, playableCells - colorCount);
                  }

                  const threeStarThreshold = perfectMoves + Math.max(8, Math.floor(perfectMoves * 0.45));
                  const twoStarThreshold = perfectMoves + Math.max(20, Math.floor(perfectMoves * 0.95));
                  const finalStars = moveCount <= threeStarThreshold ? 3 : moveCount <= twoStarThreshold ? 2 : 1;
                  
                  onComplete({ stars: finalStars, moves: moveCount, time: completionTime || 0 });
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
                        onClick={handleNextLevel}
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
            {failReason && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 backdrop-blur-sm rounded-3xl"
              >
                <div className="text-center p-8 bg-red-600/10 border-2 border-red-500 rounded-3xl max-w-xs mx-auto shadow-2xl">
                  <h3 className="text-2xl font-black italic text-red-500 mb-2 uppercase tracking-tight">
                    {failReason === 'moves' ? 'OUT OF MOVES!' : 'TIME UP!'}
                  </h3>
                  <p className="text-xs text-white/60 uppercase tracking-widest font-black leading-tight">
                    Hard Mode is tough!
                  </p>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mt-2">
                    Auto-resetting...
                  </p>
                </div>
              </motion.div>
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
      {showTutorial && (
        <TutorialOverlay 
          onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('colorflow_tutorial', 'true');
          }} 
        />
      )}

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
                🎁 Hint Unlocking...
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
              
              {adTimeElapsed >= SKIP_AVAILABLE_MS ? (
                <button 
                  onClick={() => {
                    setIsWatchingAd(false);
                    triggerHintLogic();
                  }}
                  className="bg-yellow-500 text-black px-8 py-3 rounded-2xl font-black italic tracking-widest hover:scale-105 active:scale-95 transition-transform"
                >
                  GET HINT ▶
                </button>
              ) : (
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                  Unlock in {Math.ceil((SKIP_AVAILABLE_MS - adTimeElapsed) / 1000)}s
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
