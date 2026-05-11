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
  
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem('colorflow_tutorial') === 'true';
  });

  const handleTutorialComplete = () => {
    localStorage.setItem('colorflow_tutorial', 'true');
    setHasSeenTutorial(true);
  };

  useEffect(() => {
    // Apply accent color to CSS variable
    document.documentElement.style.setProperty('--accent-color', ACCENT_COLORS_MAP[accentColor]);
  }, [accentColor]);

  useEffect(() => {
    GameStorage.saveData({ 
      soundOn, 
      musicOn,
      level: data.level,
      stars: data.stars,
      bestLevel: data.bestLevel,
      theme: data.theme,
      palette: data.palette,
      musicStyle,
      accentColor,
      volume
    });
    sounds.setEnabled(soundOn);
    sounds.setMusicEnabled(musicOn);
    sounds.setMusicStyle(musicStyle);
    sounds.setVolume(volume);
  }, [soundOn, musicOn, musicStyle, accentColor, volume, data.level, data.stars, data.bestLevel, data.theme, data.palette]);

  const currentTheme = data.theme || themes[Math.floor((data.level - 1) / 10) % themes.length];

  const handleLevelComplete = (starsEarned: number) => {
    const activeLvl = gameLevel || data.level;
    
    setData(prev => {
      const oldLevelStars = prev.levelStars || {};
      const oldStarsForLevel = oldLevelStars[activeLvl] || 0;
      
      // Only update total stars if we got more than before on this level
      const starDifference = Math.max(0, starsEarned - oldStarsForLevel);
      const nextStars = prev.stars + starDifference;
      
      const nextLevelStars = { 
        ...oldLevelStars, 
        [activeLvl]: Math.max(oldStarsForLevel, starsEarned) 
      };

      let nextLevel = prev.level;
      let nextBestLevel = prev.bestLevel;

      if (gameLevel === null || gameLevel === prev.level) {
        nextLevel = prev.level + 1;
        if (nextLevel > nextBestLevel) nextBestLevel = nextLevel;
      }

      const nextData = { 
        ...prev, 
        stars: nextStars, 
        levelStars: nextLevelStars,
        level: nextLevel, 
        bestLevel: nextBestLevel,
        totalGamesPlayed: prev.totalGamesPlayed + 1
      };
      
      GameStorage.saveData(nextData);

      // Sync with global leaderboard if username exists
      if (nextData.username) {
        LeaderboardService.submitScore(
          nextData.username,
          nextData.avatarEmoji,
          nextStars,
          nextLevel
        ).catch(e => console.error("Leaderboard sync failed", e));
      }

      return nextData;
    });
    
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

  const playClick = () => sounds.playClick();

  return (
    <div className="w-full h-screen bg-[#0a0a0a] overflow-hidden">
      {screen === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}

      {!hasSeenTutorial && screen !== 'login' && screen !== 'splash' && <TutorialOverlay onComplete={handleTutorialComplete} />}
      
      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {screen === 'profile' && (
        <ProfileScreen data={data} onBack={() => setScreen('home')} onLogout={handleLogout} />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen onBack={() => { playClick(); setScreen('home'); }} />
      )}

      {screen === 'home' && (
        <HomeScreen 
          level={data.level} 
          stars={data.stars} 
          theme={currentTheme} 
          avatar={data.avatarEmoji}
          onPlay={() => { playClick(); setScreen('game'); }} 
          onLevels={() => { playClick(); setScreen('levelSelect'); }}
          onDaily={() => { playClick(); setScreen('daily'); }}
          onSettings={() => { playClick(); setScreen('settings'); }} 
          onProfile={() => { playClick(); setScreen('profile'); }}
          onLeaderboard={() => { playClick(); setScreen('leaderboard'); }}
        />
      )}
      {screen === 'levelSelect' && (
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
      )}
      {screen === 'daily' && (
        <DailyChallengeScreen 
          onComplete={(starsEarned) => {
            sounds.playComplete();
            const nextStars = data.stars + starsEarned;
            setData(prev => ({ ...prev, stars: nextStars }));
            GameStorage.saveData({ stars: nextStars });
            setScreen('home');
          }}
          onBack={() => { playClick(); setScreen('home'); }}
          palette={data.palette}
        />
      )}
      {screen === 'game' && (
        <GameScreen 
          currentLevel={gameLevel || data.level} 
          onComplete={handleLevelComplete} 
          onBack={() => { 
            playClick(); 
            setGameLevel(null); 
            setScreen('home'); 
          }} 
          onHintUsed={() => {
            const nextHints = data.hintsUsed + 1;
            setData(prev => ({ ...prev, hintsUsed: nextHints }));
            GameStorage.saveData({ hintsUsed: nextHints });
          }}
          palette={data.palette}
          theme={currentTheme}
        />
      )}
      {screen === 'settings' && (
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
      )}
    </div>
  );
}

