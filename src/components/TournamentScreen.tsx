import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Calendar, Clock, Star, Play, Award, Zap, Users, CheckCircle, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { GameBoard } from './GameBoard';
import { sounds } from '../lib/sounds';
import confetti from 'canvas-confetti';
import { Level, CellType } from '../types';
import { auth } from '../firebase';
import { LeaderboardService } from '../services/leaderboardService';

interface TournamentScreenProps {
  onBack: () => void;
  userStars: number;
  username: string;
  avatarEmoji: string;
  onUpdateStars: (amount: number) => void;
  onUpdateRank?: (rank: number) => void;
}

interface TournamentLeader {
  username: string;
  avatarEmoji: string;
  score: number;
  time: number;
  moves: number;
  isCurrentUser?: boolean;
}

// Fixed Tournament Levels Definition for consistency
const TOURNAMENT_GRID_SIZES = [5, 6, 7];
const TOURNAMENT_COLOR_COUNTS = [4, 5, 5];

export const TournamentScreen: React.FC<TournamentScreenProps> = ({ 
  onBack, 
  userStars, 
  username, 
  avatarEmoji, 
  onUpdateStars,
  onUpdateRank
}) => {
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null); // null means in hub, 0-2 means playing
  const [levelCompletionStates, setLevelCompletionStates] = useState<boolean[]>([false, false, false]);
  const [levelMoves, setLevelMoves] = useState<number[]>([0, 0, 0]);
  const [levelTimes, setLevelTimes] = useState<number[]>([0, 0, 0]);

  // Active game run states
  const [tempGrid, setTempGrid] = useState<any[][] | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(Date.now());
  const [isDone, setIsDone] = useState(false);

  // Tournament-wide states
  const [tournamentCompleted, setTournamentCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Real database-backed tournament participants
  const [fetchedLeaders, setFetchedLeaders] = useState<TournamentLeader[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load user's previous tournament progress on mount from Firestore
  useEffect(() => {
    let active = true;
    const fetchUserProgress = async () => {
      if (!auth.currentUser) return;
      try {
        const { doc, getDoc, getFirestore } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const weeklyKey = LeaderboardService.getWeeklyKey();
        const userDocRef = doc(db, `leaderboard_tournament_${weeklyKey}`, auth.currentUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists() && active) {
          const udata = snap.data();
          if (udata.levelsCompleted) {
            const nextStates = [false, false, false];
            for (let i = 0; i < udata.levelsCompleted; i++) {
              nextStates[i] = true;
            }
            setLevelCompletionStates(nextStates);
            if (udata.levelsCompleted === 3) {
              setTournamentCompleted(true);
              setFinalScore(udata.score);
            }
            if (udata.moves) {
              // Populate average distribution across previous levels so UI doesn't say 0 for completed map tracks
              const partMoves = Math.max(1, Math.floor(udata.moves / udata.levelsCompleted));
              const partTimes = Math.max(1, Math.floor(udata.time / udata.levelsCompleted));
              setLevelMoves(prev => prev.map((m, idx) => idx < udata.levelsCompleted ? partMoves : m));
              setLevelTimes(prev => prev.map((t, idx) => idx < udata.levelsCompleted ? partTimes : t));
            }
          }
        }
      } catch (err) {
        console.warn("Could not load user's previous tournament progress", err);
      }
    };
    fetchUserProgress();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchRealData = async () => {
      try {
        const entries = await LeaderboardService.getTournamentLeaderboard(15);
        if (!active) return;
        
        // Filter out current user's entry to show real-time live progression accurately
        const currentUid = auth.currentUser?.uid;
        const filteredEntries = entries.filter((e: any) => e.userId !== currentUid);
        
        // Map database entries to TournamentLeaders
        const mapped: TournamentLeader[] = filteredEntries.map((entry: any) => {
          return {
            username: entry.username || 'Anonymous Flow',
            avatarEmoji: entry.avatarEmoji || '🎮',
            score: entry.score || 0,
            time: entry.time || 0,
            moves: entry.moves || 0,
            isCurrentUser: false
          };
        });

        let finalMerged = [...mapped];
        
        // Sort final list by score (highest first), then by moves (fewer first), then by time (less first)
        finalMerged.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          if (a.moves !== b.moves) {
            return a.moves - b.moves;
          }
          return a.time - b.time;
        });
        setFetchedLeaders(finalMerged);
      } catch (err) {
        console.error("Failed to fetch real arena standings:", err);
      }
    };

    fetchRealData();
    return () => { active = false; };
  }, [username, avatarEmoji, refreshTrigger]);

  // Real-time Countdown timer (Ends at midnight of next Sunday)
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const daysToSunday = (7 - currentDay) % 7;
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysToSunday);
      targetDate.setHours(23, 59, 59, 999);

      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('ENDED');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${d > 0 ? `${d}d ` : ''}${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate levels based on seeds
  const tournamentLevels = useMemo(() => {
    return TOURNAMENT_GRID_SIZES.map((size, idx) => {
      // Procedurally generate tournament levels with stable seeded logic
      const levelNumber = 9000 + idx; // Specific range for tournament
      const colorsCount = TOURNAMENT_COLOR_COUNTS[idx];

      // Standard grid design fallback
      const grid: any[][] = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => ({
          row: r,
          col: c,
          type: CellType.EMPTY,
          isPath: false,
        }))
      );

      // Create stable layout based on level
      if (idx === 0) {
        // level 1: 5x5 Grid size (Neon Warmup)
        // 100% solvable 5x5 grid with beautiful full coverage solutions
        grid[0][0] = { row: 0, col: 0, type: CellType.DOT, colorIndex: 0, isPath: false };
        grid[4][2] = { row: 4, col: 2, type: CellType.DOT, colorIndex: 0, isPath: false };

        grid[0][1] = { row: 0, col: 1, type: CellType.DOT, colorIndex: 1, isPath: false };
        grid[4][4] = { row: 4, col: 4, type: CellType.DOT, colorIndex: 1, isPath: false };

        grid[0][2] = { row: 0, col: 2, type: CellType.DOT, colorIndex: 2, isPath: false };
        grid[3][4] = { row: 3, col: 4, type: CellType.DOT, colorIndex: 2, isPath: false };

        grid[0][3] = { row: 0, col: 3, type: CellType.DOT, colorIndex: 3, isPath: false };
        grid[1][3] = { row: 1, col: 3, type: CellType.DOT, colorIndex: 3, isPath: false };
      } else if (idx === 1) {
        // level 2: 6x6 Grid size with blocking obstacles (Zen Master)
        // 100% solvable, hand-designed 5-color flow layout with complete cell coverage & 4 walls
        grid[0][0] = { row: 0, col: 0, type: CellType.DOT, colorIndex: 0, isPath: false };
        grid[5][0] = { row: 5, col: 0, type: CellType.DOT, colorIndex: 0, isPath: false };

        grid[0][1] = { row: 0, col: 1, type: CellType.DOT, colorIndex: 1, isPath: false };
        grid[5][1] = { row: 5, col: 1, type: CellType.DOT, colorIndex: 1, isPath: false };

        grid[0][2] = { row: 0, col: 2, type: CellType.DOT, colorIndex: 2, isPath: false };
        grid[1][5] = { row: 1, col: 5, type: CellType.DOT, colorIndex: 2, isPath: false };

        grid[1][2] = { row: 1, col: 2, type: CellType.DOT, colorIndex: 3, isPath: false };
        grid[4][2] = { row: 4, col: 2, type: CellType.DOT, colorIndex: 3, isPath: false };

        grid[5][2] = { row: 5, col: 2, type: CellType.DOT, colorIndex: 4, isPath: false };
        grid[2][5] = { row: 2, col: 5, type: CellType.DOT, colorIndex: 4, isPath: false };

        // 4 Symmetric blocking obstacles in the center core
        grid[2][2] = { row: 2, col: 2, type: CellType.WALL, isPath: false };
        grid[3][3] = { row: 3, col: 3, type: CellType.WALL, isPath: false };
        grid[2][3] = { row: 2, col: 3, type: CellType.WALL, isPath: false };
        grid[3][2] = { row: 3, col: 2, type: CellType.WALL, isPath: false };
      } else {
        // level 3: 7x7 Grid size spiraled (Eclipse Paradox)
        // 100% solvable masterpiece with outer-to-inner concentric rings using 5 colors
        grid[0][0] = { row: 0, col: 0, type: CellType.DOT, colorIndex: 0, isPath: false };
        grid[6][6] = { row: 6, col: 6, type: CellType.DOT, colorIndex: 0, isPath: false };

        grid[1][0] = { row: 1, col: 0, type: CellType.DOT, colorIndex: 1, isPath: false };
        grid[6][5] = { row: 6, col: 5, type: CellType.DOT, colorIndex: 1, isPath: false };

        grid[2][0] = { row: 2, col: 0, type: CellType.DOT, colorIndex: 2, isPath: false };
        grid[6][4] = { row: 6, col: 4, type: CellType.DOT, colorIndex: 2, isPath: false };

        grid[3][0] = { row: 3, col: 0, type: CellType.DOT, colorIndex: 3, isPath: false };
        grid[6][3] = { row: 6, col: 3, type: CellType.DOT, colorIndex: 3, isPath: false };

        grid[4][0] = { row: 4, col: 0, type: CellType.DOT, colorIndex: 4, isPath: false };
        grid[6][2] = { row: 6, col: 2, type: CellType.DOT, colorIndex: 4, isPath: false };
      }

      return {
        number: levelNumber,
        gridSize: size,
        grid: grid,
        colorCount: colorsCount
      } as Level;
    });
  }, []);

  // Real database-backed weekly/global leaders list
  const leadersList: TournamentLeader[] = useMemo(() => {
    let baseList = [...fetchedLeaders];

    // Remove duplicates of current user if already exists in fetched leaders list
    baseList = baseList.filter(l => l.username !== (username || 'You'));

    const completedCount = levelCompletionStates.filter(Boolean).length;
    if (completedCount > 0) {
      const sumMoves = levelMoves.reduce((a, b) => a + b, 0);
      const sumTimes = levelTimes.reduce((a, b) => a + b, 0);
      
      let currentScore = 0;
      if (levelCompletionStates[0]) currentScore += 5;
      if (levelCompletionStates[1]) currentScore += 10;
      if (levelCompletionStates[2]) currentScore += 20;

      const userEntry: TournamentLeader = {
        username: username || 'You',
        avatarEmoji: avatarEmoji || '🎮',
        score: currentScore,
        time: sumTimes,
        moves: sumMoves,
        isCurrentUser: true
      };

      const newList = [...baseList, userEntry];
      newList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (a.moves !== b.moves) {
          return a.moves - b.moves;
        }
        return a.time - b.time;
      });
      return newList;
    }

    return baseList;
  }, [fetchedLeaders, levelCompletionStates, levelTimes, levelMoves, username, avatarEmoji]);

  const userComputedRank = useMemo(() => {
    const idx = leadersList.findIndex(l => l.isCurrentUser);
    return idx !== -1 ? idx + 1 : undefined;
  }, [leadersList]);

  useEffect(() => {
    if (userComputedRank !== undefined && onUpdateRank) {
      onUpdateRank(userComputedRank);
    }
  }, [userComputedRank, onUpdateRank]);

  // Handle Starting a Level
  const startLevel = (index: number) => {
    sounds.playClick();
    setCurrentLevelIndex(index);
    setMoveCount(0);
    // Deep clone level grid
    const targetLvl = tournamentLevels[index];
    const initialGrid = targetLvl.grid.map(row => row.map(cell => ({ ...cell })));
    setTempGrid(initialGrid);
    setLevelStartTime(Date.now());
    setIsDone(false);
  };

  // Handle Single Level Solve/Completion
  const handleLevelComplete = () => {
    if (currentLevelIndex === null || isDone) return;
    setIsDone(true);
    sounds.playComplete();
    const timeSpent = Math.max(1, Math.floor((Date.now() - levelStartTime) / 1000));
    
    const updatedMoves = [...levelMoves];
    updatedMoves[currentLevelIndex] = moveCount;

    const updatedTimes = [...levelTimes];
    updatedTimes[currentLevelIndex] = timeSpent;

    const updatedCompletion = [...levelCompletionStates];
    updatedCompletion[currentLevelIndex] = true;

    // Save level performance state
    setLevelMoves(updatedMoves);
    setLevelTimes(updatedTimes);
    setLevelCompletionStates(updatedCompletion);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#3B82F6', '#10B981', '#F59E0B']
    });

    const completedCount = updatedCompletion.filter(Boolean).length;
    const sumMoves = updatedMoves.reduce((a, b) => a + b, 0);
    const sumTimes = updatedTimes.reduce((a, b) => a + b, 0);
    
    let calculatedScore = 0;
    if (updatedCompletion[0]) calculatedScore += 5;
    if (updatedCompletion[1]) calculatedScore += 10;
    if (updatedCompletion[2]) calculatedScore += 20;

    // Submit live stats to tournament leaderboard in real-time
    LeaderboardService.submitTournamentScore(
      username,
      avatarEmoji,
      calculatedScore,
      sumTimes,
      sumMoves,
      completedCount
    ).then(() => {
      setRefreshTrigger(prev => prev + 1);
    });

    setTimeout(() => {
      if (updatedCompletion.every(Boolean)) {
        setFinalScore(calculatedScore);
        setTournamentCompleted(true);
      }
      setCurrentLevelIndex(null);
      setTempGrid(null);
    }, 2000);
  };

  // Reset/Restart Tournament Session
  const resetTournament = () => {
    sounds.playClick();
    setLevelCompletionStates([false, false, false]);
    setLevelMoves([0, 0, 0]);
    setLevelTimes([0, 0, 0]);
    setTournamentCompleted(false);
    setFinalScore(0);
    setRewardClaimed(false);
  };

  const claimTournamentReward = () => {
    if (rewardClaimed) return;
    sounds.playComplete();
    setRewardClaimed(true);
    onUpdateStars(150); // Direct 150 Star Reward for completing Tournament

    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#FFD700', '#FCD34D']
    });
  };

  const getThemeColors = () => {
    return { bg: 'bg-[#0f172a]', accent: '#f0abfc', secondary: '#701a75' }; // Cyber/Dark Theme for tournaments
  };

  const colors = getThemeColors();

  return (
    <div className={`fixed inset-0 ${colors.bg} flex flex-col text-white overflow-hidden p-0 h-screen w-full`}>
      {/* Visual background assets */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 60, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full opacity-35 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[90vw] h-[90vw] rounded-full opacity-25 blur-[150px]"
          style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
        />
      </div>

      <header className="flex items-center p-6 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 justify-between">
        <div className="flex items-center">
          <motion.button 
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors mr-4 bg-white/5 border border-white/5"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black italic tracking-tighter uppercase leading-none">WEEKEND TOURNAMENT</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black tracking-widest text-[#10B981] uppercase">LIVE SUNDAY ARENA</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
          <span className="text-yellow-400 text-xs">⭐</span>
          <span className="text-xs font-black tracking-tighter font-mono">{userStars}</span>
        </div>
      </header>

      {currentLevelIndex === null ? (
        <main className="flex-1 overflow-y-auto p-6 space-y-6 z-10 custom-scrollbar pb-24 max-w-xl mx-auto w-full">
          {/* Tournament Overview Card */}
          <div className="bg-gradient-to-br from-purple-900/30 via-slate-900/40 to-black/50 border border-white/10 rounded-[2.5rem] p-6 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-4 right-4 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest">
              EVENT 5
            </div>
            
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="text-yellow-500 flex justify-center mb-4"
            >
              <Trophy size={60} strokeWidth={1.5} className="drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
            </motion.div>

            <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1 pink-glow">ECLIPSE ARENA CHAMPIONSHIP</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto mb-6">
              Complete all three levels with minimal moves and time to claim top ranks and claim 150 stars!
            </p>

            <div className="grid grid-cols-2 gap-4 bg-black/30 p-4 rounded-3xl border border-white/5 max-w-md mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-[8.5px] font-black tracking-widest text-white/30 uppercase mb-1">Time Remaining</span>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <Clock size={12} />
                  <span className="text-xs font-black font-mono tracking-wider">{timeLeft}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/5 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-[8.5px] font-black tracking-widest text-white/30 uppercase mb-1">Status</span>
                <span className={`text-xs font-black italic uppercase ${tournamentCompleted ? 'text-green-500' : 'text-yellow-500'}`}>
                  {tournamentCompleted ? 'SUCCESSFULLY CLEARED' : 'PENDING RUNS'}
                </span>
              </div>
            </div>
          </div>

          {/* Levels Playlist */}
          <div className="space-y-4">
            <h4 className="text-[9.5px] font-black uppercase tracking-[0.4em] text-white/30 px-2">TOURNAMENT MAP TRACKS</h4>
            
            <div className="space-y-3">
              {tournamentLevels.map((lvl, index) => {
                const isCleared = levelCompletionStates[index];
                const prevCleared = index === 0 || levelCompletionStates[index - 1]; // enforce linear complete
                const isClickable = !isCleared && prevCleared && !tournamentCompleted;

                return (
                  <div 
                    key={index}
                    className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${
                      isCleared 
                        ? 'bg-green-500/10 border-green-500/30 shadow-none' 
                        : isClickable 
                          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30' 
                          : 'bg-black/10 border-white/5 opacity-40 select-none'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-lg ${
                        isCleared 
                          ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                          : isClickable 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'bg-white/5 text-white/20'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black italic tracking-tight">{index === 0 ? 'NEON WARMUP' : index === 1 ? 'ZEN MASTER' : 'ECLIPSE PARADOX'}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-white/40">{lvl.gridSize}x{lvl.gridSize} Board</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full" />
                          <span className="text-[9px] font-mono text-purple-400">{lvl.colorCount} Flow Lines</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCleared ? (
                        <div className="flex flex-col items-end text-right">
                          <span className="text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle size={10} /> SOLVED
                          </span>
                          <span className="text-[9px] text-white/30 font-mono mt-0.5">{levelMoves[index]} moves • {levelTimes[index]}s</span>
                        </div>
                      ) : isClickable ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startLevel(index)}
                          className="px-5 py-2.5 bg-white text-black rounded-full font-black text-xs italic tracking-widest flex items-center gap-1.5 hover:bg-purple-400 transition-colors"
                        >
                          <Play size={10} fill="black" /> START
                        </motion.button>
                      ) : (
                        <AlertCircle size={18} className="text-white/20" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tournament Overview Results Form or Leaderboard */}
          {tournamentCompleted && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-green-500/10 via-black/40 to-green-500/5 border border-green-500/30 rounded-[2.5rem] p-6 text-center space-y-4"
              >
                <div className="flex justify-center text-green-400">
                  <Award size={48} className="drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                </div>
                <h3 className="text-lg font-black italic text-green-500">TOURNAMENT PERFORMANCE SUBMITTED</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  Your final tournament metrics have been logged into the global ranking arena database!
                </p>

                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto bg-black/40 rounded-2xl p-4 border border-white/5 font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] tracking-widest text-white/30 uppercase mb-0.5">Total Moves</span>
                    <span className="text-sm font-black text-white">{levelMoves.reduce((a, b) => a + b, 0)}</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-white/5">
                    <span className="text-[8px] tracking-widest text-white/30 uppercase mb-0.5">Total Time</span>
                    <span className="text-sm font-black text-white">{levelTimes.reduce((a, b) => a + b, 0)}s</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] tracking-widest text-white/30 uppercase mb-0.5">Final Score</span>
                    <span className="text-sm font-black text-green-400">{finalScore}</span>
                  </div>
                </div>

                {!rewardClaimed ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={claimTournamentReward}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 rounded-2xl font-black italic tracking-widest text-xs flex items-center justify-center gap-2 shadow-2xl"
                  >
                    <Star size={14} fill="black" /> CLAIM 150 BONUS STARS REWARD
                  </motion.button>
                ) : (
                  <div className="w-full bg-white/5 border border-white/5 text-white/40 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest italic">
                    REWARD CLAIMED ✅ (+150 STARS)
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={resetTournament}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RefreshCw size={12} /> RE-ATTEMPT TO BEAT TOURNAMENT RECORD
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Live Standings Board */}
          <div className="bg-white/5 rounded-[2.5rem] border border-white/5 p-6">
            <h4 className="text-xs font-black uppercase tracking-[0.4em] text-white/30 mb-4 px-2 flex items-center gap-1.5">
              <Users size={14} /> ARENA STANDINGS (LIVE EVENT)
            </h4>

            <div className="space-y-3 font-mono">
              {leadersList.map((leader, i) => {
                const rank = i + 1;
                let badge = null;
                if (rank <= 3) {
                  badge = (
                    <span className="text-[7px] px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-extrabold tracking-wider uppercase border border-amber-400/30 rounded-[4px] shadow-sm flex items-center gap-0.5">
                      👑 ECLIPSE LEGEND
                    </span>
                  );
                } else if (rank <= 10) {
                  badge = (
                    <span className="text-[7px] px-1.5 py-0.5 bg-cyan-400/20 text-cyan-300 font-extrabold tracking-wider uppercase border border-cyan-400/30 rounded-[4px] shadow-sm">
                      💎 ELITE CHALLENGER
                    </span>
                  );
                } else if (rank <= 100) {
                  badge = (
                    <span className="text-[7px] px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 font-extrabold tracking-wider uppercase border border-emerald-400/30 rounded-[4px] shadow-sm">
                      ✨ ARENA CONTENDER
                    </span>
                  );
                }

                return (
                  <div 
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      leader.isCurrentUser 
                        ? 'bg-amber-400/15 border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                        : 'bg-[#1e1b4b]/10 border-white/5 shadow-inner'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black italic w-5 ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/40'}`}>
                        #{rank}
                      </span>
                      <span className="text-xl w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                        {leader.avatarEmoji}
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black tracking-tight ${leader.isCurrentUser ? 'text-amber-400 font-black' : 'text-white/80'}`}>
                            {leader.username} {leader.isCurrentUser && '(YOU)'}
                          </span>
                          {badge}
                        </div>
                        <span className="text-[8.5px] text-white/30 font-semibold">{leader.moves} moves • {leader.time}s</span>
                      </div>
                    </div>

                    <span className={`text-xs font-black italic tracking-tight ${leader.isCurrentUser ? 'text-amber-400' : rank === 1 ? 'text-pink-400' : 'text-white/40'}`}>
                      {leader.score} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* Tournament Active Gameplay View */
        <div className="flex-1 flex flex-col justify-between p-6 z-10 select-none max-w-lg mx-auto w-full">
          <div className="mt-2 text-center">
            <span className="text-[10px] font-black tracking-[0.3em] text-purple-400 uppercase">TOURNAMENT STEP {currentLevelIndex + 1} OF 3</span>
            <h3 className="text-xl font-black italic tracking-tighter mt-1">
              {currentLevelIndex === 0 ? 'NEON WARMUP' : currentLevelIndex === 1 ? 'ZEN MASTER' : 'ECLIPSE PARADOX'}
            </h3>
            
            <div className="flex justify-center gap-6 mt-4 bg-black/40 border border-white/5 py-2.5 px-6 rounded-2xl max-w-xs mx-auto font-mono text-[10px]">
              <div className="flex flex-col items-center">
                <span className="text-white/30 uppercase tracking-widest font-black mb-0.5">Moves</span>
                <span className="text-sm font-black italic text-[#10B981]">{moveCount}</span>
              </div>
              <div className="w-px h-6 bg-white/5 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-white/30 uppercase tracking-widest font-black mb-0.5">Grid</span>
                <span className="text-sm font-black text-purple-300">{TOURNAMENT_GRID_SIZES[currentLevelIndex]}x{TOURNAMENT_GRID_SIZES[currentLevelIndex]}</span>
              </div>
            </div>
          </div>

          <div className="my-8 flex justify-center items-center">
            {tempGrid && (
              <div className="w-full max-w-[340px] aspect-square">
                <GameBoard 
                  level={tournamentLevels[currentLevelIndex]}
                  grid={tempGrid}
                  setGrid={setTempGrid}
                  colors={['#A855F7', '#3B82F6', '#10B981', '#EAB308', '#EC4899']}
                  onComplete={handleLevelComplete}
                  onMove={() => setMoveCount(prev => prev + 1)}
                  moveCount={moveCount}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                const confirmed = confirm("Are you sure you want to exit? Your run progress for this level will be reset.");
                if (confirmed) {
                  sounds.playClick();
                  setCurrentLevelIndex(null);
                  setTempGrid(null);
                }
              }}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-black italic text-xs tracking-widest rounded-2xl flex items-center justify-center gap-1.5 transition-all uppercase border border-white/5"
            >
              QUIT ACTIVE TOURNAMENT RUN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
