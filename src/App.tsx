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
import { ThemeName, MusicStyle, AccentColor } from './types';
import { sounds } from './lib/sounds';
import { GameStorage } from './logic/storage';
import { LeaderboardService } from './services/leaderboardService';
import { motion, AnimatePresence } from 'motion/react';
import { AchievementService, Achievement } from './services/achievementService';
import confetti from 'canvas-confetti';

type Screen = 'splash' | 'home' | 'game' | 'settings' | 'levelSelect' | 'daily' | 'login' | 'profile' | 'leaderboard';

const themes: ThemeName[] = [
  'forest', 'ocean', 'space', 'candy', 'desert',
  'arctic', 'volcano', 'garden', 'city', 'clouds',
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
  const [data, setData] = useState(() => GameStorage.getData());
  const [screen, setScreen] = useState<Screen>('splash');

  const handleSplashComplete = () => {
    const saved = GameStorage.getData();
    setScreen(saved.username ? 'home' : 'login');
  };

  const [soundOn, setSoundOn] = useState(data.soundOn);
  const [musicOn, setMusicOn] = useState(data.musicOn);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>(data.musicStyle || 'calm');
  const [accentColor, setAccentColor] = useState<AccentColor>(data.accentColor || 'green');
  const [volume, setVolume] = useState(data.volume || 0.5);
  const [gameLevel, setGameLevel] = useState<number | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  
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
      // Don't give bonus if it's the very first visit to keep stars at 0 for new players
      const isFirstVisitEver = !lastVisit;
      
      let nextStreak = data.dailyStreak || 0;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastVisit === yesterday.toDateString()) {
        nextStreak += 1;
      } else {
        nextStreak = 1;
      }

      // Rewards for streak - Only give bonus if streak is continuing or if it's not the first visit ever
      let bonusStars = 0;
      let bonusHints = 0;

      if (!isFirstVisitEver) {
        bonusStars = 2; // Baseline for returning
        if (nextStreak % 5 === 0) bonusHints = 1;
        if (nextStreak % 10 === 0) bonusStars += 10;
      }

      setData(prev => ({
        ...prev,
        dailyStreak: nextStreak,
        lastDailyVisit: today,
        stars: isFirstVisitEver ? 0 : prev.stars + bonusStars,
        hintsRemaining: isFirstVisitEver ? 0 : (prev.hintsRemaining || 0) + bonusHints
      }));
      
      if (bonusHints > 0 && !isFirstVisitEver) {
        console.log(`Streak Reward! ${bonusHints} hints added.`);
      }
    }
  }, []);

  useEffect(() => {
    // Check for achievements
    const earned = AchievementService.getNewAchievements(data);
    if (earned.length > 0) {
      setNewAchievements(prev => [...prev, ...earned]);
      setData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), ...earned.map(a => a.id)],
        stars: prev.stars + earned.reduce((sum, a) => sum + a.rewardStars, 0)
      }));
      
      // Fire confetti for big achievements
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [data]);

  useEffect(() => {
    // Apply accent color to CSS variable
    document.documentElement.style.setProperty('--accent-color', ACCENT_COLORS_MAP[accentColor]);
  }, [accentColor]);

  useEffect(() => {
    GameStorage.saveData(data);
    sounds.setEnabled(soundOn);
    sounds.setMusicEnabled(musicOn);
    sounds.setMusicStyle(musicStyle);
    sounds.setVolume(volume);
  }, [data, soundOn, musicOn, musicStyle, volume]);

  useEffect(() => {
    setData(prev => ({ ...prev, soundOn, musicOn, musicStyle, accentColor, volume }));
  }, [soundOn, musicOn, musicStyle, accentColor, volume]);

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
    
    // Calculate new values outside to avoid side effects in state updater
    const oldLevelStars = data.levelStars || {};
    const oldStarsForLevel = oldLevelStars[activeLvl] || 0;
    const starDifference = Math.max(0, starsEarned - oldStarsForLevel);
    const nextStars = data.stars + starDifference;
    
    let nextLevel = data.level;
    let nextBestLevel = data.bestLevel;
    if (gameLevel === null || gameLevel === data.level) {
      nextLevel = data.level + 1;
      if (nextLevel > nextBestLevel) nextBestLevel = nextLevel;
    }

    if (starsEarned === 3) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF']
      });
    }

    const nextData = { 
      ...data, 
      stars: nextStars, 
      levelStars: { ...oldLevelStars, [activeLvl]: Math.max(oldStarsForLevel, starsEarned) },
      level: nextLevel, 
      bestLevel: nextBestLevel,
      totalGamesPlayed: (data.totalGamesPlayed || 0) + 1,
      totalMoves: (data.totalMoves || 0) + moves,
      totalTimeSeconds: (data.totalTimeSeconds || 0) + time,
      threeStarLevels: (data.threeStarLevels || 0) + (starsEarned === 3 ? 1 : 0)
    };

    setData(nextData);
    
    // Side effect: Sync with global leaderboard if username exists
    if (nextData.username) {
      LeaderboardService.submitScore(
        nextData.username,
        nextData.avatarEmoji,
        nextStars,
        nextLevel
      ).catch(e => console.error("Leaderboard sync failed", e));
    }
    
    if (gameLevel === data.level || gameLevel === null) {
      setGameLevel(null);
    }
  };

  const handleLogin = (username: string, avatarEmoji: string) => {
    const nextData = { ...data, username, avatarEmoji };
    setData(nextData);
    GameStorage.saveData(nextData);
    setScreen('home');
  };

  const handleLogout = () => {
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
            <ProfileScreen data={data} onBack={() => setScreen('home')} onLogout={handleLogout} />
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
              onComplete={(stats) => {
                sounds.playComplete();
                confetti({
                  particleCount: 200,
                  spread: 120,
                  origin: { y: 0.6 }
                });

                const nextStars = data.stars + stats.stars;
                const nextDailyCount = (data.dailyChallengesCompleted || 0) + 1;
                const nextData = { 
                  ...data, 
                  stars: nextStars,
                  dailyChallengesCompleted: nextDailyCount,
                  totalMoves: (data.totalMoves || 0) + stats.moves,
                  totalTimeSeconds: (data.totalTimeSeconds || 0) + stats.time
                };

                setData(nextData);

                // Sync with leaderboard
                if (nextData.username) {
                  LeaderboardService.submitScore(
                    nextData.username,
                    nextData.avatarEmoji,
                    nextData.stars,
                    nextData.level
                  ).catch(e => console.error("Leaderboard sync failed", e));
                }
                setScreen('home');
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
                setData(prev => ({ 
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
              onToggleSound={() => setSoundOn(!soundOn)}
              onToggleMusic={() => setMusicOn(!musicOn)}
              onResetProgress={handleLogout}
              preferredTheme={data.theme}
              onSelectTheme={(t) => { setData(prev => ({ ...prev, theme: t })); sounds.playClick(); }}
              preferredPalette={data.palette}
              onSelectPalette={(p) => { setData(prev => ({ ...prev, palette: p })); sounds.playClick(); }}
              musicStyle={musicStyle}
              onSelectMusicStyle={(s) => { setMusicStyle(s); sounds.playClick(); }}
              accentColor={accentColor}
              onSelectAccentColor={(c) => { setAccentColor(c); sounds.playClick(); }}
              volume={volume}
              onVolumeChange={(v) => { setVolume(v); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Notifications */}
      <AnimatePresence>
        {newAchievements.length > 0 && (
          <motion.div 
            key={newAchievements[0].id}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl flex items-center gap-4 shadow-2xl"
          >
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/20">
              {newAchievements[0].icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Achievement Unlocked!</span>
              <span className="text-sm font-black text-white">{newAchievements[0].title}</span>
              <span className="text-[10px] text-white/50">{newAchievements[0].description}</span>
            </div>
            <div className="bg-white/5 px-3 py-1 rounded-xl border border-white/10 ml-2">
               <span className="text-xs font-black text-yellow-500">+{newAchievements[0].rewardStars} ⭐</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

