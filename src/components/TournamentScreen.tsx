import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Trophy, Calendar, Clock, Star, Play, Award, Zap, 
  Users, CheckCircle, RefreshCw, AlertCircle, Sparkles, Gift, ShieldAlert, BadgeInfo 
} from 'lucide-react';
import { GameBoard } from './GameBoard';
import { sounds } from '../lib/sounds';
import confetti from 'canvas-confetti';
import { Level, CellType } from '../types';
import { auth } from '../firebase';
import { LeaderboardService } from '../services/leaderboardService';
import { getDailyTournamentLevels } from '../services/tournamentLevels';

interface TournamentScreenProps {
  onBack: () => void;
  userStars: number;
  username: string;
  avatarEmoji: string;
  onUpdateStars: (amount: number) => void;
  onUpdateRank?: (rank: number) => void;
  onUnlockHint?: (amount: number) => void;
}

interface TournamentLeader {
  username: string;
  avatarEmoji: string;
  score: number;
  time: number;
  moves: number;
  runsCount?: number;
  titleTag?: string;
  isCurrentUser?: boolean;
}

const LEVEL_NAMES = [
  'NEON WARMUP',
  'SPECTRUM LAUNCH',
  'ZEN MASTER',
  'MATRIX PORTAL',
  'ECLIPSE PARADOX',
  'NEBULA TWIST',
  'DIMENSION RIFT'
];

const LEVEL_DIFFICULTIES = [
  'EASY', 'EASY', 'MEDIUM', 'MEDIUM', 'HARD', 'HARD', 'HARD'
];

const LEVEL_POINTS = [10, 15, 25, 30, 45, 50, 75];
const LEVEL_SIZES = [5, 5, 6, 6, 7, 7, 7];
const LEVEL_COLORS = [4, 4, 5, 5, 5, 5, 6];

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_LONG = [
  'Monday Madness',
  'Spectral Tuesday',
  'Zenith Wednesday',
  'Matrix Thursday',
  'Cosmic Friday',
  'Nebula Saturday',
  'Championship Sunday'
];

export const TournamentScreen: React.FC<TournamentScreenProps> = ({ 
  onBack, 
  userStars, 
  username, 
  avatarEmoji, 
  onUpdateStars,
  onUpdateRank,
  onUnlockHint
}) => {
  // Determine current day of week (Monday is 0, Sunday is 6)
  const currentDayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 = Sunday, 1 = Mon ... 6 = Sat
    return (day + 6) % 7;
  }, []);

  const weeklyKey = useMemo(() => LeaderboardService.getWeeklyKey(), []);
  const previousWeeklyKey = useMemo(() => LeaderboardService.getPreviousWeeklyKey(), []);

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<'arena' | 'claim' | 'rules'>('arena');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null); // null means in hub, 0-6 means playing
  const [showLevelClearModal, setShowLevelClearModal] = useState<boolean>(false);
  
  // Todays levels
  const dailyLevels = useMemo(() => getDailyTournamentLevels(currentDayIndex), [currentDayIndex]);

  // Daily Run progress states
  const [levelCompletionStates, setLevelCompletionStates] = useState<boolean[]>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.completion) return parsed.completion;
      }
    } catch {}
    return Array(7).fill(false);
  });

  const [levelMoves, setLevelMoves] = useState<number[]>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.moves) return parsed.moves;
      }
    } catch {}
    return Array(7).fill(0);
  });

  const [levelTimes, setLevelTimes] = useState<number[]>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.times) return parsed.times;
      }
    } catch {}
    return Array(7).fill(0);
  });

  // Active level game state
  const [tempGrid, setTempGrid] = useState<any[][] | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(Date.now());
  const [isDone, setIsDone] = useState(false);
  const [movesLeft, setMovesLeft] = useState(0);
  const [timeLeftForGame, setTimeLeftForGame] = useState(40);
  const [isGameOver, setIsGameOver] = useState(false);
  const [earnedHintThisLevel, setEarnedHintThisLevel] = useState(false);

  // Status & database sync
  const [todayCompleted, setTodayCompleted] = useState<boolean>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.isTodayCompleted !== undefined) return parsed.isTodayCompleted;
      }
    } catch {}
    return false;
  });

  const [todayScore, setTodayScore] = useState<number>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.todayScore !== undefined) return parsed.todayScore;
      }
    } catch {}
    return 0;
  });

  const [rewardClaimedToday, setRewardClaimedToday] = useState<boolean>(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    try {
      const cached = localStorage.getItem(localProgressKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.rewardClaimedToday !== undefined) return parsed.rewardClaimedToday;
      }
    } catch {}
    return false;
  });
  
  const [fetchedLeaders, setFetchedLeaders] = useState<TournamentLeader[]>([]);
  const [userRunsData, setUserRunsData] = useState<Record<string, any>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Unlocked prizes custom options (Titles and Custom Equipped Badges)
  const [equippedTitle, setEquippedTitle] = useState<string>(() => {
    return localStorage.getItem('unlocked_title_equipped') || '';
  });
  const [unlockedTitles, setUnlockedTitles] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('unlocked_titles') || '[]');
    } catch {
      return [];
    }
  });

  // Chest prize states
  const [chestModel, setChestModel] = useState<{
    show: boolean;
    rank: number;
    stars: number;
    title: string;
    emoji: string;
    shaking: boolean;
    opened: boolean;
    claimed: boolean;
  } | null>(null);

  // 1. Check Previous Week Tournament Rewards for a clean, secure claims modal
  useEffect(() => {
    const checkPreviousRewards = async () => {
      if (!auth.currentUser) return;
      const claimKey = `claimed_tournament_rewards_for_week_${previousWeeklyKey}`;
      const isClaimed = localStorage.getItem(claimKey) === 'true';
      if (isClaimed) return;

      try {
        const lastWeekStandings = await LeaderboardService.getPreviousTournamentLeaderboard(100);
        const myUid = auth.currentUser.uid;
        const myRankIndex = lastWeekStandings.findIndex((item: any) => item.userId === myUid);
        
        if (myRankIndex !== -1) {
          const rank = myRankIndex + 1;
          let starsReward = 50;
          let unlockTitle = "✨ ARENA CONTENDER";
          let premiumEmoji = "🚀";

          if (rank <= 3) {
            starsReward = 500;
            unlockTitle = "🏆 COSMIC CHAMPION";
            premiumEmoji = "👑";
          } else if (rank <= 10) {
            starsReward = 200;
            unlockTitle = "⚔️ ASTRAL ELITE";
            premiumEmoji = "⚡";
          }

          setChestModel({
            show: true,
            rank,
            stars: starsReward,
            title: unlockTitle,
            emoji: premiumEmoji,
            shaking: false,
            opened: false,
            claimed: false
          });
        }
      } catch (err) {
        console.warn("Failed to retrieve last week's rankings for claiming.", err);
      }
    };
    checkPreviousRewards();
  }, [previousWeeklyKey]);

  // Load and Restore today's local & cloud progress on mount 
  useEffect(() => {
    let active = true;
    const loadUserProgressAndState = async () => {
      if (!auth.currentUser) return;

      // Restore from local cache for fast loading
      const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
      const cached = localStorage.getItem(localProgressKey);
      if (cached && active) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.completion) setLevelCompletionStates(parsed.completion);
          if (parsed.moves) setLevelMoves(parsed.moves);
          if (parsed.times) setLevelTimes(parsed.times);
          if (parsed.todayScore) setTodayScore(parsed.todayScore);
          if (parsed.isTodayCompleted) setTodayCompleted(parsed.isTodayCompleted);
          if (parsed.rewardClaimedToday) setRewardClaimedToday(parsed.rewardClaimedToday);
        } catch {
          // fallback silently
        }
      }

      try {
        // Hydrate from Live Database for perfect cloud synchronization across devices
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const docRef = doc(db, `leaderboard_tournament_${weeklyKey}`, auth.currentUser.uid);
        const snap = await getDoc(docRef);
        
        if (snap.exists() && active) {
          const docData = snap.data();
          const runs = docData.runs || {};
          setUserRunsData(runs);
          
          const todayRun = runs[`day_${currentDayIndex}`];
          if (todayRun) {
            // Restore from database if we didn't have it locally or if it's better
            const dbScore = todayRun.score || 0;
            // Let's populate todays completions if they were completed in the DB
            if (dbScore > 0 && todayRun.levelsCompleted === 7) {
              setLevelCompletionStates(Array(7).fill(true));
              setTodayCompleted(true);
              setTodayScore(dbScore);
              
              const localClaimKey = `claimed_reward_day_${weeklyKey}_${currentDayIndex}`;
              const claimedTodayReward = localStorage.getItem(localClaimKey) === 'true';
              setRewardClaimedToday(claimedTodayReward);
            }
          }
        }
      } catch (e) {
        console.warn("Error hydrating tournament session info:", e);
      }
    };

    loadUserProgressAndState();
    return () => { active = false; };
  }, [weeklyKey, currentDayIndex]);

  // Save Today's progress to local persistence whenever state changes
  useEffect(() => {
    const localProgressKey = `colorflow_tournament_v2_progress_${weeklyKey}_day_${currentDayIndex}`;
    localStorage.setItem(localProgressKey, JSON.stringify({
      completion: levelCompletionStates,
      moves: levelMoves,
      times: levelTimes,
      todayScore,
      isTodayCompleted: todayCompleted,
      rewardClaimedToday: rewardClaimedToday
    }));
  }, [levelCompletionStates, levelMoves, levelTimes, todayScore, todayCompleted, rewardClaimedToday, weeklyKey, currentDayIndex]);

  // Load Arena Standings
  useEffect(() => {
    let active = true;
    const fetchArenaData = async () => {
      try {
        const leaders = await LeaderboardService.getTournamentLeaderboard(20);
        if (!active) return;

        const currentUid = auth.currentUser?.uid;
        // Filter out current user to perform a manual unified merge & sort
        const cleanList = leaders.filter((entry: any) => entry.userId !== currentUid);

        const mapped: TournamentLeader[] = cleanList.map((entry: any) => {
          let runsNum = 0;
          if (entry.runs) runsNum = Object.keys(entry.runs).length;
          else if (entry.levelsCompleted) runsNum = Math.ceil(entry.levelsCompleted / 7);

          // Give titles depending on score or stored badge title
          let title = "";
          if (entry.score >= 1000) title = "🏆 COSMIC CHAMPION";
          else if (entry.score >= 400) title = "⚔️ ASTRAL ELITE";
          else if (entry.score > 0) title = "✨ ARENA CONTENDER";

          return {
            username: entry.username || 'Anonymous Flow',
            avatarEmoji: entry.avatarEmoji || '🎮',
            score: entry.score || 0,
            time: entry.time || 0,
            moves: entry.moves || 0,
            runsCount: runsNum,
            titleTag: entry.titleTag || title,
            isCurrentUser: false
          };
        });

        setFetchedLeaders(mapped);
      } catch (err) {
        console.error("Failed to fetch real arena standings:", err);
      }
    };

    fetchArenaData();
    return () => { active = false; };
  }, [username, avatarEmoji, refreshTrigger]);

  // Real-time Weekly Countdown timer (Ends at midnight of next Sunday/Monday)
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Calculate next Monday midnight
      const targetDate = new Date(now);
      const day = now.getDay();
      const daysToNextMonday = day === 0 ? 1 : 8 - day; // If sunday, monday is tomorrow
      targetDate.setDate(now.getDate() + daysToNextMonday);
      targetDate.setHours(0, 0, 0, 0);

      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('NEW TOURNAMENT WEEK OPENED!');
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

  // Compute Unified Leaders list including current user's active accumulated stats
  const unifiedLeadersList = useMemo(() => {
    const currentUid = auth.currentUser?.uid;
    const baseList = [...fetchedLeaders];

    // Compute user's aggregate stats from userRunsData
    let userTotalScore = 0;
    let userTotalTime = 0;
    let userTotalMoves = 0;
    let userTotalRunsCount = 0;

    if (userRunsData && Object.keys(userRunsData).length > 0) {
      Object.keys(userRunsData).forEach(dayKey => {
        const run = userRunsData[dayKey];
        userTotalScore += run.score || 0;
        userTotalTime += run.time || 0;
        userTotalMoves += run.moves || 0;
        userTotalRunsCount++;
      });
    } else {
      // fallback to today's active progress
      userTotalScore = todayScore;
      userTotalTime = levelTimes.reduce((a, b) => a + b, 0);
      userTotalMoves = levelMoves.reduce((a, b) => a + b, 0);
      userTotalRunsCount = todayCompleted ? 1 : 0;
    }

    // Manual injection of active user
    const userEntry: TournamentLeader = {
      username: username || 'You',
      avatarEmoji: avatarEmoji || '🎮',
      score: userTotalScore,
      time: userTotalTime,
      moves: userTotalMoves,
      runsCount: userTotalRunsCount,
      titleTag: equippedTitle || (userTotalScore >= 1000 ? "🏆 COSMIC CHAMPION" : userTotalScore >= 400 ? "⚔️ ASTRAL ELITE" : "✨ CONTENDER"),
      isCurrentUser: true
    };

    const merged = [userEntry, ...baseList];
    
    // Sort logic: Higher score first -> Lower moves second -> Lower times third
    merged.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    });

    return merged;
  }, [fetchedLeaders, userRunsData, todayCompleted, todayScore, levelMoves, levelTimes, username, avatarEmoji, equippedTitle]);

  const userComputedRank = useMemo(() => {
    const idx = unifiedLeadersList.findIndex(l => l.isCurrentUser);
    return idx !== -1 ? idx + 1 : undefined;
  }, [unifiedLeadersList]);

  useEffect(() => {
    if (userComputedRank !== undefined && onUpdateRank) {
      onUpdateRank(userComputedRank);
    }
  }, [userComputedRank, onUpdateRank]);

  // Handle level starting
  const startLevel = (index: number) => {
    sounds.playClick();
    setCurrentLevelIndex(index);
    setMoveCount(0);
    setShowLevelClearModal(false);
    
    // Scale move limits and timers dynamically based on index parameters
    const size = LEVEL_SIZES[index];
    const difficulty = LEVEL_DIFFICULTIES[index];
    const movesAllowed = difficulty === 'EASY' 
      ? Math.max(50, size * 11) 
      : difficulty === 'MEDIUM' 
      ? Math.max(55, size * 10) 
      : Math.max(60, size * 9);
    
    const timeAllowed = difficulty === 'EASY' ? 50 : difficulty === 'MEDIUM' ? 70 : 90;

    setMovesLeft(movesAllowed);
    setTimeLeftForGame(timeAllowed);
    setIsGameOver(false);
    setEarnedHintThisLevel(false);
    // Deep clone today's template grid for gameplay
    const targetLvl = dailyLevels[index];
    const clonedGrid = targetLvl.grid.map(row => row.map(cell => ({ ...cell })));
    setTempGrid(clonedGrid);
    setLevelStartTime(Date.now());
    setIsDone(false);
  };

  const handlePlayNextTournamentLevel = () => {
    if (currentLevelIndex !== null && currentLevelIndex < 6) {
      const nextIndex = currentLevelIndex + 1;
      sounds.playClick();
      setCurrentLevelIndex(nextIndex);
      setMoveCount(0);
      setShowLevelClearModal(false);
      
      const size = LEVEL_SIZES[nextIndex];
      const difficulty = LEVEL_DIFFICULTIES[nextIndex];
      const movesAllowed = difficulty === 'EASY' 
        ? Math.max(50, size * 11) 
        : difficulty === 'MEDIUM' 
        ? Math.max(55, size * 10) 
        : Math.max(60, size * 9);
      
      const timeAllowed = difficulty === 'EASY' ? 50 : difficulty === 'MEDIUM' ? 70 : 90;

      setMovesLeft(movesAllowed);
      setTimeLeftForGame(timeAllowed);
      setIsGameOver(false);
      setIsDone(false);
      setEarnedHintThisLevel(false);
      
      const targetLvl = dailyLevels[nextIndex];
      const clonedGrid = targetLvl.grid.map(row => row.map(cell => ({ ...cell })));
      setTempGrid(clonedGrid);
      setLevelStartTime(Date.now());
    }
  };

  useEffect(() => {
    if (currentLevelIndex === null || isGameOver || isDone) return;
    const intervalTimer = setInterval(() => {
      setTimeLeftForGame(prev => {
        if (prev <= 1) {
          setIsGameOver(true);
          clearInterval(intervalTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [currentLevelIndex, isGameOver, isDone]);

  const handleTournamentMove = () => {
    if (isGameOver || isDone) return;
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
    if (currentLevelIndex === null) return;
    setMoveCount(0);
    
    const size = LEVEL_SIZES[currentLevelIndex];
    const difficulty = LEVEL_DIFFICULTIES[currentLevelIndex];
    const movesAllowed = difficulty === 'EASY' 
      ? Math.max(50, size * 11) 
      : difficulty === 'MEDIUM' 
      ? Math.max(55, size * 10) 
      : Math.max(60, size * 9);
    
    const timeAllowed = difficulty === 'EASY' ? 50 : difficulty === 'MEDIUM' ? 70 : 90;

    setMovesLeft(movesAllowed);
    setTimeLeftForGame(timeAllowed);
    setIsGameOver(false);
    setIsDone(false);
    setEarnedHintThisLevel(false);
    const targetLvl = dailyLevels[currentLevelIndex];
    const clonedGrid = targetLvl.grid.map(row => row.map(cell => ({ ...cell })));
    setTempGrid(clonedGrid);
    setLevelStartTime(Date.now());
  };

  // Solve callback
  const handleLevelComplete = () => {
    if (currentLevelIndex === null || isDone) return;
    setIsDone(true);
    sounds.playComplete();
    
    // Reward bonus hint only for completing Hard levels
    const difficulty = LEVEL_DIFFICULTIES[currentLevelIndex];
    const isHardMode = difficulty === 'HARD';
    if (isHardMode) {
      onUnlockHint?.(1);
      setEarnedHintThisLevel(true);
    } else {
      setEarnedHintThisLevel(false);
    }

    const timeSpent = Math.max(1, Math.floor((Date.now() - levelStartTime) / 1000));
    
    const nextCompletions = [...levelCompletionStates];
    nextCompletions[currentLevelIndex] = true;

    const nextMoves = [...levelMoves];
    nextMoves[currentLevelIndex] = moveCount;

    const nextTimes = [...levelTimes];
    nextTimes[currentLevelIndex] = timeSpent;

    setLevelCompletionStates(nextCompletions);
    setLevelMoves(nextMoves);
    setLevelTimes(nextTimes);

    // Blast micro level-completion confetti
    confetti({
      particleCount: 50,
      spread: 40,
      origin: { y: 0.8 },
      colors: ['#A855F7', '#3B82F6', '#10B981']
    });

    // Calculate score of today's run
    let combinedScore = 0;
    nextCompletions.forEach((c, idx) => {
      if (c) combinedScore += LEVEL_POINTS[idx];
    });
    setTodayScore(combinedScore);

    // Check if daily run is fully cleaned out
    const finishedDailyRun = nextCompletions.every(Boolean);

    if (finishedDailyRun) {
      setTodayCompleted(true);
      
      const totalDailyMoves = nextMoves.reduce((a, b) => a + b, 0);
      const totalDailyTime = nextTimes.reduce((a, b) => a + b, 0);

      // Submit final daily stats instantly to the accumulating Weekly Database!
      LeaderboardService.submitTournamentDailyScore(
        username,
        avatarEmoji,
        currentDayIndex,
        combinedScore,
        totalDailyTime,
        totalDailyMoves,
        7
      ).then(() => {
        // Increment trigger to fetch fresh global numbers
        setRefreshTrigger(prev => prev + 1);
        
        // Update userRunsData state locally so user sees their score update instantly without a hard load
        setUserRunsData(prev => ({
          ...prev,
          [`day_${currentDayIndex}`]: {
            score: combinedScore,
            time: totalDailyTime,
            moves: totalDailyMoves,
            levelsCompleted: 7
          }
        }));
      });
    }

    setTimeout(() => {
      setShowLevelClearModal(true);
    }, 1500);
  };

  // Claim today's 7-track completions rewards
  const claimDailyCompletionGift = () => {
    if (rewardClaimedToday) return;
    sounds.playComplete();
    setRewardClaimedToday(true);
    
    // Save claim status locally
    const localClaimKey = `claimed_reward_day_${weeklyKey}_${currentDayIndex}`;
    localStorage.setItem(localClaimKey, 'true');

    // Give 150 points instantly
    onUpdateStars(150);

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#FFD700', '#FCD34D']
    });
  };

  // Chest shake animation trigger
  const shakeChestAndReveal = () => {
    if (!chestModel || chestModel.opened) return;
    
    // Trigger shaking
    sounds.playClick();
    setChestModel(prev => prev ? { ...prev, shaking: true } : null);

    setTimeout(() => {
      // Solve shake, burst confetti, and reveal content!
      sounds.playComplete();
      confetti({
         particleCount: 220,
         spread: 120,
         origin: { y: 0.4 },
         colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#A855F7']
      });

      // Unlock Tag Title in Storage
      const currentUnlocked = [...unlockedTitles];
      if (!currentUnlocked.includes(chestModel.title)) {
        currentUnlocked.push(chestModel.title);
        localStorage.setItem('unlocked_titles', JSON.stringify(currentUnlocked));
        setUnlockedTitles(currentUnlocked);
      }

      setChestModel(prev => prev ? { ...prev, shaking: false, opened: true } : null);
    }, 1200);
  };

  // Claim Chest contents
  const claimChestRewards = () => {
    if (!chestModel || !chestModel.opened || chestModel.claimed) return;
    
    sounds.playComplete();
    onUpdateStars(chestModel.stars);

    // Set Equipped Title instantly as badge of honour
    localStorage.setItem('unlocked_title_equipped', chestModel.title);
    setEquippedTitle(chestModel.title);

    // Save claim status in localStorage so they can't claim twice
    const claimKey = `claimed_tournament_rewards_for_week_${previousWeeklyKey}`;
    localStorage.setItem(claimKey, 'true');

    setChestModel(prev => prev ? { ...prev, claimed: true, show: false } : null);
  };

  // Equip a title from the unlocked title inventory
  const equipTitle = (title: string) => {
    sounds.playClick();
    setEquippedTitle(title);
    localStorage.setItem('unlocked_title_equipped', title);
  };

  return (
    <div className="fixed inset-0 bg-[#070514] flex flex-col text-white overflow-hidden p-0 h-screen w-full">
      {/* Dynamic Ambient Neon Backdrop meshes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 40, -40, 0], y: [0, -30, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -right-1/4 w-[75vw] h-[75vw] rounded-full opacity-30 blur-[130px]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
        />
        <motion.div 
          animate={{ x: [0, -50, 50, 0], y: [0, 40, -40, 0], scale: [1.1, 0.85, 1.15, 1.1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -left-1/4 w-[85vw] h-[85vw] rounded-full opacity-25 blur-[160px]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      <header className="flex items-center p-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 justify-between">
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors bg-white/5 border border-white/10"
          >
            <ChevronLeft size={20} />
          </motion.button>
          
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic tracking-tighter uppercase leading-none text-purple-400">CHAMPIONS ARENA</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">7-DAY TOURNAMENT</span>
            </div>
          </div>
        </div>

        {/* Dynamic stars display */}
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
          <span className="text-yellow-400 text-sm">⭐</span>
          <span className="text-xs font-black tracking-tight font-mono text-yellow-300">{userStars}</span>
        </div>
      </header>

      {/* Main Container Layout */}
      {currentLevelIndex === null ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* Navigation Tab Bar */}
          <div className="flex bg-black/40 border-b border-white/5 p-1 backdrop-blur-xl z-20">
            <button 
              onClick={() => { sounds.playClick(); setActiveTab('arena'); }}
              className={`flex-1 py-3 text-center text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'arena' ? 'text-purple-400 bg-white/5 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Trophy size={14} /> LIVE TOURNAMENT
            </button>
            <button 
              onClick={() => { sounds.playClick(); setActiveTab('rewards'); }}
              className={`flex-1 py-3 text-center text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'rewards' ? 'text-purple-400 bg-white/5 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Gift size={14} /> REWARDS & BADGES
            </button>
            <button 
              onClick={() => { sounds.playClick(); setActiveTab('rules'); }}
              className={`flex-1 py-3 text-center text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 ${activeTab === 'rules' ? 'text-purple-400 bg-white/5 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <BadgeInfo size={14} /> INFO & RULES
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            <div className="max-w-xl mx-auto w-full p-6 space-y-6">

              {/* Arena Hub Tab */}
              {activeTab === 'arena' && (
                <>
                  {/* Tournament Splash Hero Banner */}
                  <div className="relative bg-gradient-to-br from-purple-950/40 via-indigo-950/40 to-black/60 border border-purple-500/20 rounded-[2.5rem] p-6 text-center space-y-4 overflow-hidden shadow-2xl">
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/20 blur-[40px] rounded-full" />
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 blur-[40px] rounded-full" />
                    
                    <div className="absolute top-4 right-4 bg-purple-500/20 border border-purple-500/40 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-purple-300">
                      WEEKLY CHAMPIONSHIP
                    </div>

                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-amber-400 flex justify-center drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]"
                    >
                      <Trophy size={56} className="text-purple-400" />
                    </motion.div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">
                        ASTRAL CONCENTRIC GLOW
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                        Current Day: <span className="text-purple-400 font-extrabold">{DAYS_LONG[currentDayIndex]}</span>
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Every day brings 7 new levels: 2 Easy, 2 Medium, and 3 Hard. Solve them to score daily points. Your scores are added up across 7 days for the ultimate weekly crown!
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-black/40 p-3.5 rounded-3xl border border-white/5 max-w-sm mx-auto font-mono">
                      <div className="text-center">
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black block mb-0.5">WEEK ENDS IN</span>
                        <div className="flex items-center justify-center gap-1 text-purple-400">
                          <Clock size={11} />
                          <span className="text-xs font-extrabold tracking-tight">{timeLeft}</span>
                        </div>
                      </div>
                      <div className="text-center border-l border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black block mb-0.5">TODAY STATUS</span>
                        <span className={`text-xs font-black uppercase tracking-wide ${todayCompleted ? 'text-green-400' : 'text-amber-400'}`}>
                          {todayCompleted ? 'CLEARED ✅' : 'PENDING RUNS'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Calendar Nodes Progression bar */}
                  <div className="bg-slate-950/60 border border-white/5 p-4 rounded-[2rem] space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">WEEK TIMELINE</span>
                      <span className="text-[9px] font-black text-purple-400 uppercase">7 Days of Flow</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS_SHORT.map((day, dIdx) => {
                        const isToday = dIdx === currentDayIndex;
                        const isPast = dIdx < currentDayIndex;
                        const runs = userRunsData || {};
                        const run = runs[`day_${dIdx}`];
                        const keyExist = run && run.score > 0;
                        const scoreStr = keyExist ? `${run.score}p` : '';

                        return (
                          <div 
                            key={day}
                            className={`flex flex-col items-center justify-center p-2 rounded-2xl border ${
                              isToday 
                                ? 'bg-purple-500/15 border-purple-500 text-purple-200' 
                                : keyExist
                                  ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                                  : isPast
                                    ? 'bg-black/40 border-white/5 text-slate-500'
                                    : 'bg-black/10 border-white/5 text-slate-600'
                            }`}
                          >
                            <span className="text-[8px] font-black tracking-tight tracking-widest mb-1">{day}</span>
                            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">
                              {keyExist ? (
                                <CheckCircle size={12} className="text-green-400" />
                              ) : isToday ? (
                                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" />
                              ) : (
                                <span className="text-[9px] text-slate-500">•</span>
                              )}
                            </div>
                            <span className="text-[7.5px] font-mono mt-1 font-bold truncate tracking-tighter block h-2.5">
                              {scoreStr || (isToday ? 'LIVE' : '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Tracks playlist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">TODAY'S 7-LEVEL MISSION</h4>
                      <span className="text-[9.5px] font-black font-mono text-purple-400">Max Score: 250pts</span>
                    </div>

                    <div className="space-y-2.5">
                      {dailyLevels.map((lvl, index) => {
                        const isCleared = levelCompletionStates[index];
                        // First level is open automatically, otherwise must clear previous
                        const isUnlocked = index === 0 || levelCompletionStates[index - 1];
                        const difficulty = LEVEL_DIFFICULTIES[index];
                        const points = LEVEL_POINTS[index];

                        return (
                          <div 
                            key={index}
                            className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
                              isCleared 
                                ? 'bg-green-500/5 border-green-500/20 shadow-none' 
                                : isUnlocked 
                                  ? 'bg-white/[0.03] border-white/5 hover:bg-white/10 hover:border-purple-500/30' 
                                  : 'bg-black/30 border-white/5 opacity-30 select-none'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-sm ${
                                isCleared 
                                  ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                  : isUnlocked 
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                    : 'bg-white/5 text-slate-600'
                              }`}>
                                {index + 1}
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-xs font-black tracking-tight">{LEVEL_NAMES[index]}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                    difficulty === 'EASY' 
                                      ? 'bg-green-500/10 text-green-400' 
                                      : difficulty === 'MEDIUM'
                                        ? 'bg-amber-500/10 text-amber-400'
                                        : 'bg-rose-500/10 text-rose-400'
                                  }`}>
                                    {difficulty}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-400">{LEVEL_SIZES[index]}x{LEVEL_SIZES[index]} Board</span>
                                  <span className="text-[9px] font-mono text-purple-400">+{points} PTS</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {isCleared ? (
                                <div className="flex flex-col items-end text-right">
                                  <span className="text-green-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 leading-none">
                                    <CheckCircle size={10} /> CLEAR
                                  </span>
                                  <span className="text-[8.5px] text-slate-400 font-mono mt-0.5">{levelMoves[index]} moves • {levelTimes[index]}s</span>
                                </div>
                              ) : isUnlocked ? (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => startLevel(index)}
                                  className="px-4 py-2 bg-purple-500 text-white rounded-full font-black text-[10px] italic tracking-widest flex items-center gap-1.5 hover:bg-purple-400 transition-colors uppercase"
                                >
                                  <Play size={8} fill="white" /> PLAY
                                </motion.button>
                              ) : (
                                <AlertCircle size={16} className="text-slate-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Run Completion Success Box (Claims stars) */}
                  {todayCompleted && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-green-500/10 via-black/40 to-green-500/5 border border-green-500/30 rounded-[2.5rem] p-6 text-center space-y-4"
                    >
                      <div className="flex justify-center text-green-400">
                        <Award size={44} className="drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                      </div>
                      <h3 className="text-base font-black italic text-green-500 uppercase leading-none">TODAY'S CHAMPIONSHIP MISSION MET</h3>
                      <p className="text-slate-400 text-[10px] max-w-sm mx-auto">
                        Amazing! You cleared all 7 levels for today! Your point value is submitted to the Weekly Championship Board. Play again tomorrow to accumulate more points and secure your rank!
                      </p>

                      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto bg-black/40 rounded-2xl p-3 border border-white/5 font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] tracking-widest text-slate-500 uppercase mb-0.5">Combined Moves</span>
                          <span className="text-xs font-black text-white">{levelMoves.reduce((a, b) => a + b, 0)}</span>
                        </div>
                        <div className="flex flex-col items-center border-x border-white/5">
                          <span className="text-[8px] tracking-widest text-slate-500 uppercase mb-0.5">Combined Time</span>
                          <span className="text-xs font-black text-white">{levelTimes.reduce((a, b) => a + b, 0)}s</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] tracking-widest text-slate-500 uppercase mb-0.5">Scored Points</span>
                          <span className="text-xs font-black text-green-400">+{todayScore} PTS</span>
                        </div>
                      </div>

                      {!rewardClaimedToday ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={claimDailyCompletionGift}
                          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3.5 rounded-2xl font-black italic tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl uppercase"
                        >
                          <Star size={12} fill="black" /> CLAIM 150 STARS COMPLETED GIFT
                        </motion.button>
                      ) : (
                        <div className="w-full bg-white/5 border border-white/5 text-slate-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest italic text-center">
                          CLAIMED DAILY REWARD ✅ (+150 STARS)
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Unified Live Standings Board */}
                  <div className="bg-slate-950/60 rounded-[2.5rem] border border-white/5 p-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 px-2 flex items-center gap-2">
                      <Users size={14} /> GLOBAL WEEKLY STANDINGS (LIVE)
                    </h4>

                    <div className="space-y-2.5">
                      {unifiedLeadersList.map((leader, i) => {
                        const rank = i + 1;
                        let rankBadge = null;
                        
                        if (rank === 1) {
                          rankBadge = (
                            <span className="text-[7px] px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 font-extrabold tracking-wider uppercase border border-yellow-400/30 rounded-[4px]">
                              👑 Champion
                            </span>
                          );
                        } else if (rank <= 3) {
                          rankBadge = (
                            <span className="text-[7px] px-1.5 py-0.5 bg-slate-400/20 text-slate-200 font-extrabold tracking-wider uppercase border border-slate-400/30 rounded-[4px]">
                              🥈 Podium Winner
                            </span>
                          );
                        } else if (rank <= 10) {
                          rankBadge = (
                            <span className="text-[7px] px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 font-extrabold tracking-wider uppercase border border-cyan-400/20 rounded-[4px]">
                              ⚡ Elite Warrior
                            </span>
                          );
                        }

                        return (
                          <div 
                            key={i}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              leader.isCurrentUser 
                                ? 'bg-purple-500/15 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                                : 'bg-black/30 border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-black italic w-5 ${
                                rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-slate-500'
                              }`}>
                                #{rank}
                              </span>
                              <span className="text-lg w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                {leader.avatarEmoji}
                              </span>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-black tracking-tight ${leader.isCurrentUser ? 'text-purple-400' : 'text-slate-200'}`}>
                                    {leader.username} {leader.isCurrentUser && '(YOU)'}
                                  </span>
                                  {rankBadge}
                                </div>
                                
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {leader.titleTag && (
                                    <span className="text-[8px] font-black text-purple-400 leading-none">
                                      {leader.titleTag}
                                    </span>
                                  )}
                                  <span className="w-1 h-3 border-l border-white/10" />
                                  <span className="text-[8px] font-mono text-slate-500">
                                    {leader.runsCount || 0} run{leader.runsCount !== 1 ? 's' : ''} • {leader.moves} mv • {leader.time}s
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end justify-center font-mono">
                              <span className={`text-xs font-black italic tracking-tight ${leader.isCurrentUser ? 'text-purple-400' : 'text-purple-300'}`}>
                                {leader.score} PTS
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Rewards Claim & Titles Inventory Tab */}
              {activeTab === 'rewards' && (
                <div className="space-y-6">
                  {/* Claim Card */}
                  <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/40 to-black/60 border border-purple-500/20 p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-4 right-4 text-purple-400">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    
                    <h3 className="text-sm font-black italic text-slate-300 uppercase mb-3 px-1 leading-none tracking-wider">
                      CHAMPIONSHIP UNLOCK REWARDS
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 items-center">
                        <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-400 text-lg">
                          🏆
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs font-black tracking-tight text-yellow-400 leading-none mb-1">Rank 1 - 3 (Grand Champions)</span>
                          <span className="text-[10px] text-slate-400 leading-normal">
                            Unlocks grand prize box: **500 Stars**, Golden Crown title title (**🏆 COSMIC CHAMPION**), and the exclusive legendary Golden Crown avatar emoji (**👑**)!
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 items-center">
                        <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 text-lg">
                          ⚔️
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs font-black tracking-tight text-cyan-400 leading-none mb-1">Rank 4 - 10 (Elite Challengers)</span>
                          <span className="text-[10px] text-slate-400 leading-normal">
                            Unlocks elite prize box: **200 Stars**, Neon warrior title title (**⚔️ ASTRAL ELITE**), and the legendary Lightning avatar emoji (**⚡**)!
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 bg-black/40 p-4 rounded-3xl border border-white/5 items-center">
                        <div className="w-12 h-12 bg-slate-500/10 border border-slate-500/20 rounded-2xl flex items-center justify-center text-slate-400 text-lg">
                          ✨
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-xs font-black tracking-tight text-purple-300 leading-none mb-1">Rank 11+ (Arena Contenders)</span>
                          <span className="text-[10px] text-slate-400 leading-normal">
                            Unlocks contender prize box: **50 Stars**, Arena Contender title tag (**✨ CONTENDER**), and the classic Rocket avatar emoji (**🚀**)!
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Character Title Inventory */}
                  <div className="bg-slate-950/60 border border-white/5 p-5 rounded-[2.5rem]">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={16} className="text-purple-400" />
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300 leading-none">
                        MY UNLOCKED TITLES INVENTORY
                      </h4>
                    </div>

                    {unlockedTitles.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 space-y-2">
                        <ShieldAlert size={24} className="mx-auto text-slate-600" />
                        <p className="text-[10.5px] font-black uppercase tracking-tight">No unlocked titles yet!</p>
                        <p className="text-[9.5px]/relaxed text-slate-500 max-w-xs mx-auto">
                          Unlock special titles by ranking high in the final weekly leaderboards at the end of the 7-day tournament!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {unlockedTitles.map((title) => {
                          const isEquipped = equippedTitle === title;
                          return (
                            <div 
                              key={title}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between ${isEquipped ? 'bg-purple-500/10 border-purple-500' : 'bg-black/30 border-white/5'}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-black tracking-tight text-purple-300">{title}</span>
                                <span className="text-[8.5px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Unlocked from Previous Championship</span>
                              </div>

                              <button
                                onClick={() => equipTitle(title)}
                                className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest ${
                                  isEquipped 
                                    ? 'bg-purple-400 text-black cursor-default' 
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                                }`}
                              >
                                {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tournament Rules/How-to Tab */}
              {activeTab === 'rules' && (
                <div className="bg-slate-950/60 rounded-[2.5rem] border border-white/5 p-6 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-purple-400 uppercase italic">THE 7-DAY ARENA RULEBOOK</h3>
                    <p className="text-[10px] text-slate-400/90 leading-relaxed">
                      Follow these regulations to claim elite champion status and claim massive star rewards.
                    </p>
                  </div>

                  <div className="space-y-4 font-mono text-[9.5px] text-slate-300">
                    <div className="flex gap-3">
                      <span className="text-purple-400 font-black">01 //</span>
                      <p className="leading-relaxed">
                        **Daily Refresh Logic**: Everyday at midnight, 7 brand new, procedurally twisted flow levels are launched. There are always exactly 2 easy, 2 medium, and 3 hard levels.
                      </p>
                    </div>

                    <div className="flex gap-3 border-t border-white/5 pt-3">
                      <span className="text-purple-400 font-black">02 //</span>
                      <p className="leading-relaxed">
                        **Point Matrix**: Easy levels are worth 10-15 points. Medium levels are worth 25-30 points. Hard levels are worth 45-75 points. Solving a level locks in its points.
                      </p>
                    </div>

                    <div className="flex gap-3 border-t border-white/5 pt-3">
                      <span className="text-purple-400 font-black">03 //</span>
                      <p className="leading-relaxed">
                        **Weekly Aggregates**: Your final weekly tournament score is the cumulative sum of scores across all days you play inside the week. Playing daily is key to reaching 1000+ points!
                      </p>
                    </div>

                    <div className="flex gap-3 border-t border-white/5 pt-3">
                      <span className="text-purple-400 font-black">04 //</span>
                      <p className="leading-relaxed">
                        **Tie-Breaking Priority**: If scores are identical, the engine ranks users based on fewer total moves across the week, followed by shorter combined solve times.
                      </p>
                    </div>

                    <div className="flex gap-3 border-t border-white/5 pt-3">
                      <span className="text-purple-400 font-black">05 //</span>
                      <p className="leading-relaxed">
                        **Vault Claiming**: When Monday morning starts, the active week finishes and previous rankings freeze. You can then immediately claim your championship prize boxes on your next login!
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Level Active Gameplay Overlay */
        <div className="flex-1 flex flex-col justify-between p-6 z-10 select-none max-w-lg mx-auto w-full relative">
          <div className="mt-2 text-center space-y-1">
            <span className="text-[9px] font-black tracking-[0.3em] text-purple-400 uppercase leading-none">
              TOURNAMENT CHALLENGE {currentLevelIndex + 1} OF 7
            </span>
            <h3 className="text-lg font-black italic tracking-tighter mt-1 text-white uppercase leading-none">
              {LEVEL_NAMES[currentLevelIndex]}
            </h3>
            
            <div className="grid grid-cols-3 gap-2 mt-4 bg-black/40 border border-white/5 py-2.5 px-3 rounded-2xl max-w-sm mx-auto font-mono text-[9.5px] text-center">
              <div className="flex flex-col items-center justify-center">
                <span className="text-slate-500 uppercase tracking-widest font-black mb-0.5">Moves Left</span>
                <span className={`text-base font-black italic ${movesLeft < 6 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>{movesLeft}</span>
              </div>
              <div className="flex flex-col items-center justify-center border-x border-white/10">
                <span className="text-slate-500 uppercase tracking-widest font-black mb-0.5">Time Left</span>
                <span className={`text-base font-black italic ${timeLeftForGame <= 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>{timeLeftForGame}s</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-slate-500 uppercase tracking-widest font-black mb-0.5">Rewards</span>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-xs font-black text-purple-300">+{LEVEL_POINTS[currentLevelIndex]}p</span>
                  {LEVEL_DIFFICULTIES[currentLevelIndex] === 'HARD' && (
                    <span className="text-[8px] font-black text-yellow-400 mt-0.5">BONUS 💡</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="my-6 flex justify-center items-center relative">
            {tempGrid && (
              <div className="w-full max-w-[320px] aspect-square relative">
                <GameBoard 
                  level={dailyLevels[currentLevelIndex]}
                  grid={tempGrid}
                  setGrid={setTempGrid}
                  colors={['#A855F7', '#3B82F6', '#10B981', '#EAB308', '#EC4899', '#EF4444', '#06B6D4']}
                  onComplete={handleLevelComplete}
                  onMove={handleTournamentMove}
                  moveCount={moveCount}
                />

                <AnimatePresence>
                  {isGameOver && !isDone && (
                    <motion.div 
                      key="tournament-failed-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md rounded-3xl"
                    >
                      <div className="text-center p-6">
                        <RefreshCw size={48} className="mx-auto mb-4 text-purple-500 animate-spin-reverse" />
                        <h2 className="text-2xl font-black italic mb-1 tracking-tight uppercase text-white">CHALLENGE FAILED</h2>
                        <p className="text-xs text-slate-400 mb-6 font-bold leading-relaxed">
                          You ran out of moves or time limit! Retry to lock in your tournament scores.
                        </p>
                        <button 
                          onClick={resetLevel}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-black italic text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2 mx-auto transition-colors"
                        >
                          <RefreshCw size={14} />
                          RETRY LEVEL
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {isDone && earnedHintThisLevel && (
                    <motion.div 
                      key="tournament-hardmode-success"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl"
                    >
                      <div className="text-center p-6 bg-purple-950/90 border border-purple-500/30 rounded-3xl max-w-xs mx-auto">
                        <Sparkles className="text-yellow-400 animate-bounce mx-auto mb-2" size={32} />
                        <h4 className="text-sm font-black text-purple-200 tracking-wider uppercase mb-1">HARD MODE VICTORY!</h4>
                        <p className="text-[10px] text-slate-355 font-medium mb-3">You completed a hard tournament puzzle under the constraints!</p>
                        <div className="text-yellow-400 font-bold text-xs uppercase tracking-widest bg-yellow-500/10 py-1 px-3 rounded-full inline-flex items-center gap-1">
                          +1💡 HINT BONUS CLAIMED!
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {showLevelClearModal && currentLevelIndex !== null && (
                    <motion.div 
                      key="tournament-level-clear-overlay"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md rounded-3xl p-4"
                    >
                      <div className="text-center p-6 w-full max-w-sm">
                        <Trophy className="text-yellow-400 animate-bounce mx-auto mb-3" size={40} />
                        <h4 className="text-lg font-black text-purple-200 tracking-tight uppercase mb-1">CHALLENGE CLEARED!</h4>
                        <p className="text-sm font-extrabold text-white mb-4">
                          +{LEVEL_POINTS[currentLevelIndex]} Points Earned!
                        </p>
                        
                        <div className="bg-purple-950/40 border border-purple-500/10 p-3 rounded-xl flex justify-around mb-6 font-mono text-[10px] text-slate-300">
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase font-black">Moves Taken</span>
                            <span className="text-sm font-black text-white">{moveCount}</span>
                          </div>
                          <div className="border-r border-purple-500/10" />
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase font-black">Time Spent</span>
                            <span className="text-sm font-black text-yellow-400">
                              {Math.max(1, Math.floor((Date.now() - levelStartTime) / 1000))}s
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {currentLevelIndex < 6 ? (
                            <button 
                              onClick={handlePlayNextTournamentLevel}
                              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white py-3.5 rounded-xl font-black italic text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/30 font-bold"
                            >
                              Play Next Challenge ⏭
                            </button>
                          ) : (
                            <div className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                              🎉 YOU HAVE SLAMMED TODAY'S TOTAL RUN OUT OF TRACKS!
                            </div>
                          )}
                          
                          <button 
                            onClick={() => {
                              setCurrentLevelIndex(null);
                              setTempGrid(null);
                              setShowLevelClearModal(false);
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-black italic text-[11px] uppercase tracking-widest transition-all"
                          >
                            Back to Arena Map
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                const confirmed = confirm("Exit current level? Run progress for this active board will format back to 0.");
                if (confirmed) {
                  sounds.playClick();
                  setCurrentLevelIndex(null);
                  setTempGrid(null);
                }
              }}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black italic text-xs tracking-widest rounded-2xl flex items-center justify-center gap-1.5 transition-all uppercase border border-white/5"
            >
              ABANDON ACTIVE GAME
            </button>
          </div>
        </div>
      )}

      {/* Floating Chest Unboxing AnimatePresence Modal for last week rewards */}
      <AnimatePresence>
        {chestModel && chestModel.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-3xl z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ 
                scale: 1, 
                y: 0,
                x: chestModel.shaking ? [-6, 6, -6, 6, -3, 3, 0] : 0 
              }}
              transition={{ x: { repeat: chestModel.shaking ? Infinity : 0, duration: 0.15 } }}
              className="bg-gradient-to-br from-[#120e2e] via-[#0b081f] to-black border-2 border-purple-500/30 w-full max-w-sm rounded-[3rem] p-6 text-center space-y-5"
            >
              {/* Stars & glow highlights */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
                  WEEKLY CHAMPIONSHIP VAULT
                </span>
                <h3 className="text-lg font-black tracking-tight text-white uppercase italic">
                  CLAIM YOUR WEEKLY ARENA REWARDS
                </h3>
              </div>

              {/* Dynamic shaking/opened box imagery */}
              <div className="relative py-4 flex justify-center">
                {!chestModel.opened ? (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    onClick={shakeChestAndReveal}
                    className="cursor-pointer text-8xl select-none filter drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                  >
                    📦
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-8xl select-none filter drop-shadow-[0_0_35px_rgba(245,158,11,0.5)]"
                  >
                    👑
                  </motion.div>
                )}
              </div>

              {!chestModel.opened ? (
                <div className="space-y-4">
                  <p className="text-[10px] text-slate-400">
                    You completed the previous 7-Day tournament! Your final computed standing: <span className="text-yellow-400 font-black">RANK #{chestModel.rank}</span>! Tap the mystery crate above to claim your rewards!
                  </p>
                  
                  <button 
                    onClick={shakeChestAndReveal}
                    className="w-full py-4 bg-purple-500 hover:bg-purple-400 text-white rounded-2xl font-black text-xs tracking-wider uppercase italic shadow-lg"
                  >
                    TAP TO UNBOX VAULT
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-yellow-400 block uppercase">Rewards Unlocked:</span>
                    <div className="max-w-xs mx-auto bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-1.5 text-center font-mono">
                      <p className="text-xs font-black text-white">⭐ +{chestModel.stars} TOTAL BONUS STARS</p>
                      <p className="text-[10px] font-black text-purple-400">🏷️ Dynamic Title unlocked: "{chestModel.title}"</p>
                      <p className="text-[10px] font-black text-green-400">😀 Avatar Emoji unlocked: "{chestModel.emoji}"</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400">
                    This dynamic title has been unlocked and prepped into your titles inventory. Tap claim below to claim your stars.
                  </p>

                  <button 
                    onClick={claimChestRewards}
                    className="w-full py-4 bg-green-500 hover:bg-green-400 text-black rounded-2xl font-black text-xs tracking-wider uppercase italic shadow-lg"
                  >
                    CONFIRM & CLAIM ALL (+{chestModel.stars} Stars)
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
