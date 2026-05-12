import React from 'react';
import { motion } from 'motion/react';
import { Settings, Play, User, Trophy } from 'lucide-react';
import { ThemeName } from '../types';

interface HomeScreenProps {
  level: number;
  stars: number;
  streak: number;
  hints: number;
  theme: ThemeName;
  avatar: string;
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onSettings: () => void;
  onProfile: () => void;
  onLeaderboard: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ level, stars, streak, hints, theme, avatar, onPlay, onLevels, onDaily, onSettings, onProfile, onLeaderboard }) => {
  const getThemeGradient = (themeName: ThemeName) => {
    switch (themeName) {
      case 'forest': return 'from-green-900 to-green-500';
      case 'ocean': return 'from-blue-900 to-blue-400';
      case 'space': return 'from-indigo-950 to-purple-600';
      case 'candy': return 'from-pink-800 to-yellow-500';
      case 'desert': return 'from-orange-800 to-yellow-600';
      case 'arctic': return 'from-slate-800 to-slate-400';
      case 'volcano': return 'from-red-900 to-orange-600';
      case 'garden': return 'from-green-800 to-green-300';
      case 'city': return 'from-slate-900 to-gray-600';
      case 'clouds': return 'from-indigo-700 to-blue-100';
      default: return 'from-green-900 to-green-500';
    }
  };

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${getThemeGradient(theme)} flex flex-col items-center justify-center text-white overflow-hidden p-6`}>
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-[60]">
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSettings}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg active:bg-white/30"
          >
            <Settings size={22} className="text-white/70" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLeaderboard}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg active:bg-white/30"
          >
            <Trophy size={22} className="text-yellow-400" />
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onProfile}
          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors shadow-lg active:bg-white/30"
        >
          {avatar ? (
            <span className="text-2xl w-6 h-6 flex items-center justify-center">{avatar}</span>
          ) : (
            <User size={24} />
          )}
        </motion.button>
      </div>

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <span className="text-8xl mb-6 block drop-shadow-lg">🎨</span>
        <h1 className="text-6xl font-black tracking-tighter drop-shadow-md">ColorFlow</h1>
        <p className="text-white/70 font-medium tracking-widest mt-2 uppercase">Infinite Puzzle</p>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 flex flex-col items-center gap-4"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex items-center gap-4 shadow-xl">
          <div className="text-xl font-black italic tracking-tighter text-white">LEVEL {level}</div>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] text-xl">⭐</span>
            <span className="text-xl font-black italic tracking-tighter text-white">{stars}</span>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 text-xl">💡</span>
            <span className="text-xl font-black italic tracking-tighter text-white">{hints}</span>
          </div>
        </div>
        
        {streak > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30"
          >
            <span className="text-orange-500 font-black italic text-[10px]">🔥 STREAK: {streak} DAYS</span>
          </motion.div>
        )}
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">THEME: {theme.toUpperCase()}</div>
      </motion.div>

      <div className="flex flex-col gap-4 mt-16 w-full max-w-[240px]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlay}
          className="bg-white text-black py-5 rounded-full flex items-center justify-center gap-3 shadow-2xl overflow-hidden group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          <Play fill="black" size={24} />
          <span className="text-2xl font-black italic">PLAY</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDaily}
          className="bg-accent text-black py-4 rounded-full flex items-center justify-center gap-3 border border-white/20 shadow-[0_0_20px_rgba(var(--accent-color),0.3)]"
        >
          <span className="text-lg font-black italic tracking-widest">DAILY CHALLENGE</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLevels}
          className="bg-white/10 backdrop-blur-md text-white py-4 rounded-full flex items-center justify-center gap-3 border border-white/20 transition-colors hover:bg-white/20"
        >
          <span className="text-lg font-black italic tracking-widest">LEVELS</span>
        </motion.button>
      </div>

    </div>
  );
};
