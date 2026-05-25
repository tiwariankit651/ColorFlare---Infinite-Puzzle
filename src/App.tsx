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
import { TutorialOverlay } from './components/TutorialOverlay';
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
import { auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { AchievementService, Achievement } from './services/achievementService';
import confetti from 'canvas-confetti';
import { Star } from 'lucide-react';

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

export default function App() {
  const [data, setData] = useState<StorageData>(() => GameStorage.getData());
  const [screen, setScreen] = useState<Screen>('splash');

  // Helper to update state and save to transitively
  const updateData = (updater: (prev: StorageData) => StorageData) => {
    setData(prev => {
      const next = updater(prev);
      // Synchronous local save
      GameStorage.saveData(next);
      return next;
    });
  };

  // Unified Leaderboard and Cloud Sync Effect
  useEffect(() => {
    if (!auth.currentUser || !data.username) return;

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
  }, [data.level, data.stars, data.username, data.dailyChallengesCompleted, data.dailyStreak, data.avatarEmoji]);

  useEffect(() => {
    // Initial cloud load after auth is ready
    const syncWithCloud = async () => {
      if (auth.currentUser) {
        const cloudData = await UserService.loadProgress();
        if (cloudData) {
          setData(prev => ({ ...prev, ...cloudData }));
        }
      }
    };
    
    syncWithCloud();
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

  const [gameLevel, setGameLevel] = useState<number | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [dailyReward, setDailyReward] = useState<{ stars: number, hints: number } | null>(null);
  
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem('colorflow_tutorial') === 'true';
  });

  const handleTutorialComplete = () => {
    localStorage.setItem('colorflow_tutorial', 'true');
    setHasSeenTutorial(true);
  };

  useEffect(() => {
    // Daily Streak Logic
    const lastVisit = data.lastDailyVisit;
    const today = new Date().toDateString();
    
    if (lastVisit !== today) {
      updateData(prev => {
        const isFirstVisitEver = !lastVisit;
        let nextStreak = prev.dailyStreak || 0;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastVisit === yesterday.toDateString()) {
          nextStreak += 1;
        } else {
          nextStreak = 1;
        }

        let bonusStars = 0;
        let bonusHints = 0;

        if (!isFirstVisitEver) {
          bonusStars = 10 + (nextStreak * 2);
          if (nextStreak % 5 === 0) bonusHints = 1;
          setDailyReward({ stars: bonusStars, hints: bonusHints });
        }

        const nextData = {
          ...prev,
          dailyStreak: nextStreak,
          streakDays: (prev.streakDays || 0) + 1,
          lastDailyVisit: today,
          stars: prev.stars + bonusStars,
          hintsRemaining: (prev.hintsRemaining || 0) + bonusHints
        };

        return nextData;
      });
    }
  }, [data.username]); // Added data.username to deps to ensure sync after login

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
    
    // Vibe-based logic (can be overridden by manual settings in the future)
    if (screen === 'game' || screen === 'daily') {
      sounds.setMusicStyle('calm');
    } else {
      sounds.setMusicStyle('upbeat');
    }
    
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

  const handleLevelComplete = ({ stars: starsEarned, moves, time }: { stars: number, moves: number, time: number }) => {
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
      const oldStarsForLevel = oldLevelStars[activeLvl] || 0;
      const starDifference = Math.max(0, starsEarned - oldStarsForLevel);
      const nextStars = prev.stars + starDifference;
      
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

      const nextData = { 
        ...prev, 
        stars: nextStars, 
        levelStars: { ...oldLevelStars, [activeLvl]: Math.max(oldStarsForLevel, starsEarned) },
        level: nextLevel, 
        bestLevel: nextBestLevel,
        totalGamesPlayed: (prev.totalGamesPlayed || 0) + 1,
        totalMoves: (prev.totalMoves || 0) + moves,
        totalTimeSeconds: (prev.totalTimeSeconds || 0) + time,
        threeStarLevels: (prev.threeStarLevels || 0) + (starsEarned === 3 ? 1 : 0),
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
    
    updateData(prev => ({ 
      ...prev, 
      ...(cloudData || {}),
      username: cloudData?.username || username, 
      avatarEmoji: cloudData?.avatarEmoji || avatarEmoji 
    }));
    
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
              onBack={() => setScreen('home')} 
              onLogout={handleLogout} 
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
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

                updateData(prev => ({
                  ...prev, 
                  stars: prev.stars + stats.stars,
                  hintsRemaining: (prev.hintsRemaining || 0) + 1,
                  dailyChallengesCompleted: (prev.dailyChallengesCompleted || 0) + 1,
                  lastDailyChallengeDate: new Date().toDateString(),
                  totalMoves: (prev.totalMoves || 0) + stats.moves,
                  totalTimeSeconds: (prev.totalTimeSeconds || 0) + stats.time
                }));
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
              onUpdateStars={(amount) => {
                updateData(prev => ({
                  ...prev,
                  stars: prev.stars + amount
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
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
    </div>
  );
}

