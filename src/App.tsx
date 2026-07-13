/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { DailyChallengeScreen } from './components/DailyChallengeScreen';
import { InteractiveTutorial } from './components/InteractiveTutorial';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { AchievementsScreen } from './components/AchievementsScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { LevelEditorScreen } from './components/LevelEditorScreen';
import DynamicBackground from './components/DynamicBackground';
import { ThemeName, MusicStyle, AccentColor } from './types';
import { sounds } from './lib/sounds';
import { GameStorage, StorageData } from './logic/storage';
import { LeaderboardService } from './services/leaderboardService';
import { UserService } from './services/userService';
import { markTutorialComplete } from './services/tutorialService';
import { auth, authReady } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { AchievementService, Achievement } from './services/achievementService';
import confetti from 'canvas-confetti';
import { Star, Lightbulb } from 'lucide-react';

type Screen = 'splash' | 'home' | 'game' | 'settings' | 'levelSelect' | 'daily' | 'login' | 'profile' | 'leaderboard' | 'achievements' | 'tournament' | 'editor';

const themes: ThemeName[] = [
  'forest', 'ocean', 'space', 'candy', 'desert',
  'arctic', 'volcano', 'garden', 'city', 'clouds',
  'cyber', 'zen'
];

const ACCENT_COLORS_MAP: Record<AccentColor, string> = {
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
  red: '#EF4444',
  amber: '#D97706',
};

function mergeProgress(
  prev: StorageData, 
  cloudData: Partial<StorageData> | null, 
  username?: string, 
  avatarEmoji?: string
): StorageData {
  if (!cloudData) {
    return {
      ...prev,
      username: username || prev.username,
      avatarEmoji: avatarEmoji || prev.avatarEmoji
    };
  }

  const merged = { ...prev, ...cloudData } as StorageData;
  
  if (username) merged.username = username;
  if (avatarEmoji) merged.avatarEmoji = avatarEmoji;

  // Custom merging of streak metrics to prevent reverting of today's visit/streak
  const localVisit = prev.lastDailyVisit;
  const cloudVisit = cloudData.lastDailyVisit;
  
  if (localVisit && cloudVisit) {
    const dLocal = new Date(localVisit).getTime();
    const dCloud = new Date(cloudVisit).getTime();
    if (!isNaN(dLocal) && !isNaN(dCloud)) {
      if (dLocal > dCloud) {
        // Local visit date is more recent, keep local visit.
        merged.lastDailyVisit = localVisit;
        // Check if local is exactly 1 day after cloud
        const isConsec = (() => {
          const dl = new Date(localVisit);
          const dc = new Date(cloudVisit);
          dl.setHours(12, 0, 0, 0);
          dc.setHours(12, 0, 0, 0);
          return Math.round((dl.getTime() - dc.getTime()) / 86400000) === 1;
        })();
        if (isConsec) {
          merged.dailyStreak = Math.max(prev.dailyStreak || 0, (cloudData.dailyStreak || 0) + 1);
          merged.streakDays = Math.max(prev.streakDays || 0, (cloudData.streakDays || 0) + 1);
        } else {
          merged.dailyStreak = prev.dailyStreak || 0;
          merged.streakDays = Math.max(prev.streakDays || 0, cloudData.streakDays || 0);
        }
      } else if (dCloud > dLocal) {
        // Cloud visit date is more recent, keep cloud visit.
        merged.lastDailyVisit = cloudVisit;
        // Check if cloud is exactly 1 day after local
        const isConsec = (() => {
          const dl = new Date(localVisit);
          const dc = new Date(cloudVisit);
          dl.setHours(12, 0, 0, 0);
          dc.setHours(12, 0, 0, 0);
          return Math.round((dc.getTime() - dl.getTime()) / 86400000) === 1;
        })();
        if (isConsec) {
          merged.dailyStreak = Math.max(cloudData.dailyStreak || 0, (prev.dailyStreak || 0) + 1);
          merged.streakDays = Math.max(cloudData.streakDays || 0, (prev.streakDays || 0) + 1);
        } else {
          merged.dailyStreak = cloudData.dailyStreak || 0;
          merged.streakDays = Math.max(cloudData.streakDays || 0, prev.streakDays || 0);
        }
      } else {
        // Same date, take maximum of both streaks/visits
        merged.lastDailyVisit = localVisit;
        merged.dailyStreak = Math.max(prev.dailyStreak || 0, cloudData.dailyStreak || 0);
        merged.streakDays = Math.max(prev.streakDays || 0, cloudData.streakDays || 0);
      }
    }
  } else if (localVisit) {
    merged.lastDailyVisit = localVisit;
    merged.dailyStreak = prev.dailyStreak || 0;
    merged.streakDays = prev.streakDays || 0;
  } else if (cloudVisit) {
    merged.lastDailyVisit = cloudVisit;
    merged.dailyStreak = cloudData.dailyStreak || 0;
    merged.streakDays = cloudData.streakDays || 0;
  }

  // Merge lastClaimedRewardDate to prevent losing today's claim status
  const localClaim = prev.lastClaimedRewardDate;
  const cloudClaim = cloudData.lastClaimedRewardDate;
  if (localClaim && cloudClaim) {
    const dLocalClaim = new Date(localClaim).getTime();
    const dCloudClaim = new Date(cloudClaim).getTime();
    if (!isNaN(dLocalClaim) && !isNaN(dCloudClaim)) {
      merged.lastClaimedRewardDate = dLocalClaim > dCloudClaim ? localClaim : cloudClaim;
    } else {
      merged.lastClaimedRewardDate = localClaim || cloudClaim;
    }
  } else {
    merged.lastClaimedRewardDate = localClaim || cloudClaim;
  }

  // Merge longestWinStreak to prevent staleness (incorporating the newly resolved dailyStreak)
  merged.longestWinStreak = Math.max(
    Number(prev.longestWinStreak) || 0, 
    Number(cloudData.longestWinStreak) || 0, 
    Number(merged.dailyStreak) || 0
  );

  // Ensure we don't downgrade levels, stars, bestLevel or hintsRemaining if local state is higher
  merged.stars = Math.max(Number(prev.stars) || 0, Number(cloudData.stars) || 0);
  merged.level = Math.max(Number(prev.level) || 1, Number(cloudData.level) || 1);
  merged.bestLevel = Math.max(Number(prev.bestLevel) || 1, Number(cloudData.bestLevel) || 1);
  merged.hintsRemaining = Math.max(Number(prev.hintsRemaining) || 0, Number(cloudData.hintsRemaining) || 0);

  return merged;
}

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
};

export default function App() {
  const [data, setData] = useState<StorageData>(() => GameStorage.getData());
  const [screen, setScreenState] = useState<Screen>('splash');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Custom setScreen wrapper to manage the browser/phone history stack
  const setScreen = (targetScreen: Screen) => {
    if (targetScreen === screen) return;

    if (targetScreen !== 'splash' && targetScreen !== 'login' && targetScreen !== 'home') {
      window.history.pushState({ screen: targetScreen }, '');
    } else if (targetScreen === 'home') {
      window.history.replaceState({ screen: 'home' }, '');
    }
    setScreenState(targetScreen);
  };

  // Synchronize phone/browser back button popped states with the app screen
  useEffect(() => {
    if (!initialLoadDone) return;

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setScreenState(event.state.screen);
      } else {
        if (data.username) {
          setScreenState('home');
        } else {
          setScreenState('login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialLoadDone, data.username]);

  // Helper to update state and save to transitively
  const updateData = (updater: (prev: StorageData) => StorageData) => {
    setData(prev => {
      const next = updater(prev);
      // Synchronous local save
      GameStorage.saveData(next);

      // Immediate cloud save to guarantee settings/progress are saved instantly on change
      if (auth.currentUser && next.username) {
        UserService.saveProgress(next).catch(err => {
          console.warn("Immediate cloud save failed:", err);
        });
      }

      return next;
    });
  };

  // Unified Leaderboard and Cloud Sync Effect
  useEffect(() => {
    if (!currentUser || !data.username) return;

    const performSync = async () => {
      // 1. Sync stars/level/daily to leaderboard
      try {
        await LeaderboardService.submitScore(
          data.username,
          data.avatarEmoji,
          data.stars,
          data.level,
          data.dailyChallengesCompleted || 0
        );
      } catch (e) {
        console.error("Leaderboard auto-sync failed:", e);
      }

      // 2. Sync full progress to cloud
      try {
        await UserService.saveProgress(data);
      } catch (e) {
        console.error("Cloud auto-sync failed:", e);
      }
    };

    // Use a small delay to avoid excessive writes during rapid state changes
    const timeout = setTimeout(performSync, 500);
    return () => clearTimeout(timeout);
  }, [
    currentUser,
    data.level,
    data.stars,
    data.username,
    data.dailyChallengesCompleted,
    data.dailyStreak,
    data.avatarEmoji,
    data.soundOn,
    data.musicOn,
    data.theme,
    data.palette,
    data.musicStyle,
    data.accentColor,
    data.volume,
    data.hardModeOn
  ]);

  useEffect(() => {
    // Initial cloud load after auth is ready
    let active = true;
    const syncWithCloud = async () => {
      try {
        if (authReady) {
          await authReady;
        }
        if (!active) return;
        
        if (auth.currentUser) {
          const cloudData = await withTimeout(UserService.loadProgress(), 2000, null);
          if (cloudData && active) {
            setData(prev => {
              const next = mergeProgress(prev, cloudData);
              GameStorage.saveData(next);
              return next;
            });
          }
        }
      } catch (err) {
        console.error("Failed to dynamic sync initial cloud progress:", err);
      } finally {
        if (active) {
          setInitialLoadDone(true);
        }
      }
    };
    
    syncWithCloud();
    return () => {
      active = false;
    };
  }, []);

  const handleSplashComplete = () => {
    setScreen(data.username ? 'home' : 'login');
  };

  // Derivative settings to keep UI simple
  const soundOn = data.soundOn;
  const musicOn = data.musicOn;
  const musicStyle = data.musicStyle || 'calm';
  const accentColor = data.accentColor || 'green';
  const volume = data.volume ?? 0.5;
  const hardModeOn = !!data.hardModeOn;

  const [gameLevel, setGameLevel] = useState<number | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [dailyReward, setDailyReward] = useState<{ stars: number, hints: number } | null>(null);
  const [hintEarnedToast, setHintEarnedToast] = useState(false);
  
  const [showTutorial, setShowTutorial] = useState(false);

  const handleTutorialComplete = () => {
    markTutorialComplete();
    setShowTutorial(false);
  };

  useEffect(() => {
    if (!initialLoadDone) return;

    // Daily Streak Logic
    const lastVisit = data.lastDailyVisit;
    const today = new Date().toDateString();
    
    if (lastVisit !== today) {
      updateData(prev => {
        const isFirstVisitEver = !prev.lastDailyVisit;
        let nextStreak = prev.dailyStreak || 0;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (prev.lastDailyVisit === yesterdayStr) {
          nextStreak += 1;
        } else {
          // If they missed playing yesterday (or 2-3 days), streak resets to 1 (new streak)
          nextStreak = 1;
        }

        let bonusStars = 0;
        let bonusHints = 0;

        // Prevent claiming the daily bonus multiple times a day
        const alreadyClaimedToday = prev.lastClaimedRewardDate === today;

        if (!isFirstVisitEver && !alreadyClaimedToday) {
          bonusStars = 10 + (nextStreak * 2);
          if (nextStreak % 5 === 0) bonusHints = 1;
          setDailyReward({ stars: bonusStars, hints: bonusHints });
        }

        const nextData = {
          ...prev,
          dailyStreak: nextStreak,
          longestWinStreak: Math.max(prev.longestWinStreak || 0, nextStreak),
          streakDays: (prev.streakDays || 0) + 1,
          lastDailyVisit: today,
          lastClaimedRewardDate: alreadyClaimedToday ? prev.lastClaimedRewardDate : today,
          stars: prev.stars + (alreadyClaimedToday ? 0 : bonusStars),
          hintsRemaining: (prev.hintsRemaining || 0) + (alreadyClaimedToday ? 0 : bonusHints)
        };

        return nextData;
      });
    }
  }, [initialLoadDone, data.username, data.lastDailyVisit, data.lastClaimedRewardDate]); // Depend on initialLoadDone, username, lastDailyVisit and lastClaimedRewardDate for robust loading

  useEffect(() => {
    // Check for achievements
    const earned = AchievementService.getNewAchievements(data);
    if (earned.length > 0) {
      setNewAchievements(prev => [...prev, ...earned]);
      updateData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), ...earned.map(a => a.id)],
        stars: prev.stars + earned.reduce((sum, a) => sum + a.rewardStars, 0)
      }));
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [data.level, data.stars, data.totalGamesPlayed, data.tournamentRank]); // Only trigger on key stats

  useEffect(() => {
    // Apply accent color to CSS variable
    document.documentElement.style.setProperty('--accent-color', ACCENT_COLORS_MAP[accentColor]);
  }, [accentColor]);

  useEffect(() => {
    // Sync sounds system with settings
    sounds.setEnabled(soundOn);
    sounds.setMusicEnabled(musicOn);
    
    // Respect user's selected musicStyle from settings!
    sounds.setMusicStyle(musicStyle);
    
    sounds.setVolume(volume);
  }, [soundOn, musicOn, musicStyle, volume, screen]);

  const currentTheme = data.theme || themes[Math.floor((data.level - 1) / 10) % themes.length];

  useEffect(() => {
    if (newAchievements.length > 0) {
      const timer = setTimeout(() => {
        setNewAchievements(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [newAchievements]);

  const handleLevelComplete = (stats: { stars: number, moves: number, time: number }) => {
    // Highly defensive cleansing of completed level statistics
    const starsEarned = typeof stats?.stars === 'number' && !isNaN(stats.stars) ? Math.max(1, stats.stars) : 1;
    const moves = typeof stats?.moves === 'number' && !isNaN(stats.moves) ? Math.max(0, stats.moves) : 0;
    const time = typeof stats?.time === 'number' && !isNaN(stats.time) ? Math.max(0, stats.time) : 0;

    const activeLvl = gameLevel || data.level;
    const isPlayingCurrent = gameLevel === null || gameLevel === data.level;
    
    if (starsEarned === 3) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF']
      });
    }

    updateData(prev => {
      const oldLevelStars = prev.levelStars || {};
      const oldStarsForLevel = Number(oldLevelStars[activeLvl]) || 0;
      const starDifference = Math.max(0, starsEarned - oldStarsForLevel);
      const nextStars = (Number(prev.stars) || 0) + starDifference;
      
      let nextLevel = prev.level;
      let nextBestLevel = prev.bestLevel;
      
      if (isPlayingCurrent) {
        nextLevel = prev.level + 1;
        if (nextLevel > nextBestLevel) nextBestLevel = nextLevel;
      }

      const currentThemeName = currentTheme;
      const themeUsage = { ...prev.themeUsage };
      themeUsage[currentThemeName] = (themeUsage[currentThemeName] || 0) + 1;

      const fastestTimes = { ...prev.fastestLevelTimes };
      const previousBestTime = fastestTimes[activeLvl];
      if (!previousBestTime || time < previousBestTime) {
        fastestTimes[activeLvl] = time;
      }

      // Hint Earning System:
      let nextHints = prev.hintsRemaining || 0;
      let earnedHint = false;

      // 1. Every 5 levels completed
      if (isPlayingCurrent && (nextLevel - 1) % 5 === 0 && (nextLevel - 1) > 0) {
        nextHints += 1;
        earnedHint = true;
      }

      // 2. Every 5 new 3-star levels
      const wasThreeStarBefore = oldStarsForLevel === 3;
      const addedThreeStar = starsEarned === 3 && !wasThreeStarBefore;
      const nextThreeStarCount = (prev.threeStarLevels || 0) + (addedThreeStar ? 1 : 0);
      if (addedThreeStar && nextThreeStarCount > 0 && nextThreeStarCount % 5 === 0) {
        nextHints += 1;
        earnedHint = true;
      }

      if (earnedHint) {
        setTimeout(() => {
          setHintEarnedToast(true);
        }, 1000);
      }

      const nextData = { 
        ...prev, 
        stars: nextStars, 
        hintsRemaining: nextHints,
        levelStars: { ...oldLevelStars, [activeLvl]: Math.max(oldStarsForLevel, starsEarned) },
        level: nextLevel, 
        bestLevel: nextBestLevel,
        totalGamesPlayed: (prev.totalGamesPlayed || 0) + 1,
        totalMoves: (prev.totalMoves || 0) + moves,
        totalTimeSeconds: (prev.totalTimeSeconds || 0) + time,
        threeStarLevels: nextThreeStarCount,
        fastestLevelTimes: fastestTimes,
        themeUsage: themeUsage,
        totalPathsCreated: (prev.totalPathsCreated || 0) + 1 // Assuming 1 completion = at least 1 path session
      };

      return nextData;
    });
    
    // If we were playing an older level, go back to level select after "Next" is clicked
    if (!isPlayingCurrent) {
        setScreen('levelSelect');
        setGameLevel(null);
    } else {
        setGameLevel(null);
    }
  };

  const handleLogin = async (username: string, avatarEmoji: string) => {
    // Check for cloud data first
    const cloudData = await UserService.loadProgress();
    
    updateData(prev => mergeProgress(prev, cloudData, username, avatarEmoji));
    
    setScreen('home');
  };

  const handleLogout = async () => {
    await auth.signOut();
    GameStorage.reset();
    setData(GameStorage.getData());
    setScreen('login');
  };

  const playClick = () => {
    sounds.resume();
    sounds.playClick();
  };

  return (
    <div 
      className="w-full h-screen bg-[#0a0a0a] overflow-hidden"
      onClick={() => sounds.resume()}
      onTouchStart={() => sounds.resume()}
    >
      <DynamicBackground theme={currentTheme} />
      
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[100]"
          >
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0"
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {screen === 'profile' && (
          <motion.div
            key="profile"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            <ProfileScreen 
              data={data} 
              theme={currentTheme}
              onBack={() => setScreen('home')} 
              onLogout={handleLogout} 
              onUpdateProfile={(username, avatarEmoji) => {
                updateData(prev => ({
                  ...prev,
                  username,
                  avatarEmoji
                }));
              }}
              onRefreshData={async () => {
                const cloudData = await UserService.loadProgress();
                if (cloudData) {
                  setData(prev => ({ ...prev, ...cloudData }));
                }
              }}
              onOpenAchievements={() => setScreen('achievements')}
            />
          </motion.div>
        )}

        {screen === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            <AchievementsScreen 
              unlockedIds={data.achievements || []}
              onBack={() => setScreen('profile')}
            />
          </motion.div>
        )}

        {screen === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            <LeaderboardScreen onBack={() => { playClick(); setScreen('home'); }} />
          </motion.div>
        )}

        {screen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0"
          >
            <HomeScreen 
              level={data.level} 
              stars={data.stars} 
              streak={data.dailyStreak || 0}
              hints={data.hintsRemaining || 0}
              theme={currentTheme} 
              avatar={data.avatarEmoji}
              onPlay={() => { playClick(); setScreen('game'); }} 
              onLevels={() => { playClick(); setScreen('levelSelect'); }}
              onDaily={() => { playClick(); setScreen('daily'); }}
              onSettings={() => { playClick(); setScreen('settings'); }} 
              onProfile={() => { playClick(); setScreen('profile'); }}
              onLeaderboard={() => { playClick(); setScreen('leaderboard'); }}
              onTournament={() => { playClick(); setScreen('tournament'); }}
              onEditor={() => { playClick(); setScreen('editor'); }}
            />
          </motion.div>
        )}
        {screen === 'levelSelect' && (
          <motion.div
            key="levelSelect"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            <LevelSelectScreen 
              currentLevel={data.level}
              levelStars={data.levelStars || {}}
              onSelectLevel={(level) => {
                playClick();
                setGameLevel(level);
                setScreen('game');
              }}
              onBack={() => { playClick(); setScreen('home'); }}
            />
          </motion.div>
        )}
        {screen === 'daily' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <DailyChallengeScreen 
              challengesCompleted={data.dailyChallengesCompleted || 0}
              lastCompletionDate={data.lastDailyChallengeDate}
              hintsRemaining={data.hintsRemaining || 0}
              onHintUsed={() => {
                updateData(prev => ({
                  ...prev,
                  hintsRemaining: Math.max(0, (prev.hintsRemaining || 0) - 1)
                }));
              }}
              onComplete={(stats) => {
                sounds.playComplete();
                confetti({
                  particleCount: 200,
                  spread: 120,
                  origin: { y: 0.6 }
                });

                updateData(prev => {
                  const bonusHint = stats.difficulty === 'hard' ? 1 : 0;
                  return {
                    ...prev, 
                    stars: prev.stars + stats.stars,
                    hintsRemaining: (prev.hintsRemaining || 0) + bonusHint,
                    dailyChallengesCompleted: (prev.dailyChallengesCompleted || 0) + 1,
                    lastDailyChallengeDate: new Date().toDateString(),
                    totalMoves: (prev.totalMoves || 0) + stats.moves,
                    totalTimeSeconds: (prev.totalTimeSeconds || 0) + stats.time
                  };
                });
              }}
              onBack={() => { playClick(); setScreen('home'); }}
              palette={data.palette}
            />
          </motion.div>
        )}
        {screen === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <GameScreen 
              currentLevel={gameLevel || data.level} 
              onComplete={handleLevelComplete} 
              onBack={() => { 
                playClick(); 
                setGameLevel(null); 
                setScreen('home'); 
              }} 
              onHintUsed={() => {
                updateData(prev => ({ 
                  ...prev, 
                  hintsUsed: (prev.hintsUsed || 0) + 1,
                  hintsRemaining: Math.max(0, (prev.hintsRemaining || 0) - 1)
                }));
              }}
              hintsRemaining={data.hintsRemaining || 0}
              palette={data.palette}
              theme={currentTheme}
              hardModeOn={hardModeOn}
            />
          </motion.div>
        )}
        {screen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            <SettingsScreen 
              onBack={() => { playClick(); setScreen('home'); }} 
              soundOn={soundOn}
              musicOn={musicOn}
              onToggleSound={() => updateData(prev => ({ ...prev, soundOn: !prev.soundOn }))}
              onToggleMusic={() => updateData(prev => ({ ...prev, musicOn: !prev.musicOn }))}
              onResetProgress={handleLogout}
              preferredTheme={data.theme}
              onSelectTheme={(t) => { updateData(prev => ({ ...prev, theme: t })); sounds.playClick(); }}
              preferredPalette={data.palette}
              onSelectPalette={(p) => { updateData(prev => ({ ...prev, palette: p })); sounds.playClick(); }}
              musicStyle={musicStyle}
              onSelectMusicStyle={(s) => { updateData(prev => ({ ...prev, musicStyle: s })); sounds.playClick(); }}
              accentColor={accentColor}
              onSelectAccentColor={(c) => { updateData(prev => ({ ...prev, accentColor: c })); sounds.playClick(); }}
              volume={volume}
              onVolumeChange={(v) => { updateData(prev => ({ ...prev, volume: v })); }}
              hardModeOn={hardModeOn}
              onToggleHardMode={() => updateData(prev => ({ ...prev, hardModeOn: !prev.hardModeOn }))}
              onHowToPlay={() => { playClick(); setShowTutorial(true); }}
            />
          </motion.div>
        )}
        {screen === 'tournament' && (
          <motion.div
            key="tournament"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-0"
          >
            <TournamentScreen 
              onBack={() => { playClick(); setScreen('home'); }}
              userStars={data.stars}
              username={data.username || ''}
              avatarEmoji={data.avatarEmoji || '🎮'}
              hintsRemaining={data.hintsRemaining || 0}
              palette={data.palette}
              onHintUsed={() => {
                updateData(prev => ({
                  ...prev,
                  hintsRemaining: Math.max(0, (prev.hintsRemaining || 0) - 1)
                }));
              }}
              onUpdateStars={(amount) => {
                updateData(prev => ({
                  ...prev,
                  stars: prev.stars + amount
                }));
              }}
              onUnlockHint={(amount) => {
                updateData(prev => ({
                  ...prev,
                  hintsRemaining: (prev.hintsRemaining || 0) + amount
                }));
              }}
              onUpdateRank={(rank) => {
                updateData(prev => {
                  if (prev.tournamentRank === rank) return prev;
                  return {
                    ...prev,
                    tournamentRank: rank
                  };
                });
              }}
            />
          </motion.div>
        )}
        {screen === 'editor' && (
          <motion.div
            key="editor"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-0"
          >
            <LevelEditorScreen 
              onBack={() => { playClick(); setScreen('home'); }}
              username={data.username || ''}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Daily Reward Modal */}
      <AnimatePresence>
        {dailyReward && (
          <div key="daily-reward-popup-wrapper" className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setDailyReward(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
                <Star size={48} className="text-black fill-black" />
              </div>
              <h3 className="text-3xl font-black italic text-white mb-2 uppercase tracking-tight">Daily Reward!</h3>
              <p className="text-white/60 mb-8 font-medium">You logged in for <span className="text-yellow-500 font-bold">{data.dailyStreak}</span> days in a row!</p>
              
              <div className="flex justify-center gap-6 mb-8">
                <div className="flex flex-col items-center">
                   <div className="text-2xl font-black text-yellow-500">+{dailyReward.stars}</div>
                   <div className="text-[10px] uppercase font-black tracking-widest text-white/40">Stars</div>
                </div>
                {dailyReward.hints > 0 && (
                  <div className="flex flex-col items-center">
                     <div className="text-2xl font-black text-cyan-400">+{dailyReward.hints}</div>
                     <div className="text-[10px] uppercase font-black tracking-widest text-white/40">Hints</div>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 bg-white text-black font-black italic rounded-2xl shadow-lg hover:bg-yellow-400 transition-colors"
                onClick={() => setDailyReward(null)}
              >
                AWESOME!
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Achievement Notification Toast */}
      <AnimatePresence>
        {newAchievements.length > 0 && (
          <motion.div
            key={newAchievements[0].id}
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] w-[90%] max-w-sm bg-black/80 backdrop-blur-xl border border-amber-400/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-amber-400/20 rounded-xl text-2xl shadow-inner border border-amber-400/20">
              {newAchievements[0].icon}
            </div>
            <div className="flex-1">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 mb-1">Achievement Unlocked!</p>
               <h4 className="text-white font-black italic tracking-tight">{newAchievements[0].title}</h4>
               <p className="text-xs text-white/60 font-medium">{newAchievements[0].description}</p>
            </div>
            <div className="bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 flex items-center gap-1">
               <Star size={10} className="text-amber-400 fill-amber-400" />
               <span className="text-[10px] font-black text-amber-400">+{newAchievements[0].rewardStars}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Earned Modal Toast */}
      <AnimatePresence>
        {hintEarnedToast && (
          <div key="hint-earned-popup-wrapper" className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setHintEarnedToast(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/20">
                <Lightbulb size={48} className="text-black fill-black" />
              </div>
              <h3 className="text-3xl font-black italic text-white mb-2 uppercase tracking-tight font-sans">HINT EARNED! 🎁</h3>
              <p className="text-white/60 mb-8 font-medium">
                You've completed another 5 levels or earned 5 perfect 3-star ratings! Keep flowing!
              </p>
              
              <div className="flex justify-center gap-6 mb-8">
                <div className="flex flex-col items-center bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                   <div className="text-3xl font-black text-cyan-400">+1 HINT</div>
                   <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mt-1">Total: {data.hintsRemaining || 0} Hints</div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 bg-cyan-500 text-black font-black italic rounded-2xl shadow-lg hover:bg-cyan-400 transition-colors"
                onClick={() => setHintEarnedToast(false)}
              >
                AWESOME! ▶
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <InteractiveTutorial 
            onComplete={handleTutorialComplete} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

