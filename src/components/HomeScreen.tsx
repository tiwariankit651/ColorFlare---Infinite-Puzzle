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
  onTournament: () => void;
  onEditor: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  level, 
  stars, 
  streak, 
  hints, 
  theme, 
  avatar, 
  onPlay, 
  onLevels, 
  onDaily, 
  onSettings, 
  onProfile, 
  onLeaderboard,
  onTournament,
  onEditor
}) => {
  const getThemeColors = (themeName: ThemeName) => {
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
      default: return { bg: 'bg-[#064e3b]', accent: '#10b981', secondary: '#065f46' };
    }
  };

  const colors = getThemeColors(theme);

  return (
    <div className={`fixed inset-0 ${colors.bg} flex flex-col items-center justify-center text-white overflow-hidden p-6`}>
      {/* Bio-morphic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full opacity-30 blur-[100px]"
          style={{ background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0], 
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[90vw] h-[90vw] rounded-full opacity-20 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-[60]">
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSettings}
            className="p-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-white/10 transition-colors shadow-lg active:bg-white/20"
          >
            <Settings size={22} className="text-white/70" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLeaderboard}
            className="p-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-white/10 transition-colors shadow-lg active:bg-white/20"
          >
            <Trophy size={22} className="text-yellow-400" />
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onProfile}
          className="p-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-white/10 transition-colors shadow-lg active:bg-white/20"
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
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <img src="/icon-512.png" alt="ColorFlow" className="w-32 h-32 mx-auto rounded-3xl" />
        </motion.div>
        <h1 className="text-7xl font-black tracking-tighter drop-shadow-2xl">ColorFlow</h1>
        <p className="text-white/50 font-bold tracking-[0.3em] mt-3 uppercase text-xs">Infinite Puzzle</p>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ y: -5, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
        transition={{ delay: 0.6 }}
        className="mt-12 flex flex-col items-center gap-5 z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 px-8 py-4 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-0.5">Level</span>
            <span className="text-2xl font-black italic tracking-tighter leading-none">{level}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-0.5">Stars</span>
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-lg">⭐</span>
              <span className="text-2xl font-black italic tracking-tighter leading-none">{stars}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-0.5">Hints</span>
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-500 text-lg">💡</span>
              <span className="text-2xl font-black italic tracking-tighter leading-none">{hints}</span>
            </div>
          </div>
        </div>
        
        {streak > 0 && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 1 }}
            className="flex items-center gap-2 bg-orange-500/20 px-4 py-1.5 rounded-full border border-orange-500/30 backdrop-blur-md"
          >
            <span className="text-orange-500 font-black italic text-[11px] tracking-widest">🔥 STREAK: {streak} DAYS</span>
          </motion.div>
        )}
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">THEME: {theme.toUpperCase()}</div>
      </motion.div>

      <div className="flex flex-col gap-4 mt-16 w-full max-w-[280px] z-10">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlay}
          className="bg-white text-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl overflow-hidden group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 opacity-20" />
          <Play fill="black" size={24} />
          <span className="text-2xl font-black italic tracking-tight">PLAY NOW</span>
        </motion.button>

        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDaily}
            className="bg-white/10 backdrop-blur-xl text-white py-4 rounded-[1.5rem] flex flex-col items-center justify-center gap-0.5 border border-white/10 transition-all hover:bg-white/20"
          >
            <span className="text-[8px] font-black tracking-widest opacity-50">DAILY</span>
            <span className="text-xs font-black italic">CHALLENGE</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLevels}
            className="bg-white/10 backdrop-blur-xl text-white py-4 rounded-[1.5rem] flex flex-col items-center justify-center gap-0.5 border border-white/10 transition-all hover:bg-white/20"
          >
            <span className="text-[8px] font-black tracking-widest opacity-50">BEYOND</span>
            <span className="text-xs font-black italic">LEVELS</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEditor}
            className="bg-amber-500/10 backdrop-blur-xl text-amber-300 py-4 rounded-[1.5rem] flex flex-col items-center justify-center gap-0.5 border border-amber-500/20 transition-all hover:bg-amber-500/20"
          >
            <span className="text-[8px] font-black tracking-widest opacity-50 text-amber-400">DESIGNER</span>
            <span className="text-xs font-black italic text-amber-300">CUSTOM</span>
          </motion.button>
        </div>

        <motion.button
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={onTournament}
           className="w-full h-12 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl flex items-center justify-center gap-2 border border-yellow-500/20 mt-2 group"
        >
          <Trophy size={14} className="text-yellow-500 group-hover:animate-bounce" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500/80">Weekend Tournament Live!</span>
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-0 right-0 text-center"
      >
        <p className="text-[10px] font-black tracking-[0.8em] text-white/10 uppercase">Never Stop Flowing</p>
      </motion.div>
    </div>
  );
};
