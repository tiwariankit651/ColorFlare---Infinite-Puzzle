
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, LogOut, Star, Trophy, Gamepad2, Lightbulb, Clock, TrendingUp, Cloud, Check, ShieldCheck } from 'lucide-react';
import { GameStorage } from '../logic/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell } from 'recharts';
import { ACHIEVEMENTS } from '../services/achievementService';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth';
import { ThemeName } from '../types';

interface ProfileScreenProps {
  data: any;
  theme?: ThemeName;
  onBack: () => void;
  onLogout: () => void;
  onRefreshData?: () => void;
  onOpenAchievements: () => void;
  onUpdateProfile?: (username: string, avatarEmoji: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  data, 
  theme = 'forest',
  onBack, 
  onLogout, 
  onRefreshData, 
  onOpenAchievements,
  onUpdateProfile
}) => {
  const [isLinking, setIsLinking] = useState(false);
  const user = auth.currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.username || '');
  const [editAvatar, setEditAvatar] = useState(data.avatarEmoji || '🎮');
  const [errorMsg, setErrorMsg] = useState('');

  const getThemeColors = (themeName: string) => {
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

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      setErrorMsg('Username cannot be empty');
      return;
    }
    if (editName.trim().length > 15) {
      setErrorMsg('Username is too long (max 15 chars)');
      return;
    }

    const lastChange = localStorage.getItem('colorflow_last_profile_change');
    const now = Date.now();
    const oneHour = 3600 * 1000;
    
    if (lastChange) {
      const elapsed = now - parseInt(lastChange);
      if (elapsed < oneHour) {
        const minutesLeft = Math.ceil((oneHour - elapsed) / 60000);
        setErrorMsg(`Updates are limited to once per hour. Wait ${minutesLeft}m.`);
        return;
      }
    }

    localStorage.setItem('colorflow_last_profile_change', now.toString());
    if (onUpdateProfile) {
      onUpdateProfile(editName.trim(), editAvatar);
    }
    setIsEditing(false);
    setErrorMsg('');
  };

  const handleGoogleLink = async () => {
    setIsLinking(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error("Link failed", e);
    } finally {
      setIsLinking(false);
    }
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = [
    { name: 'Moves', value: data.totalMoves, color: '#6366f1' },
    { name: 'Time', value: Math.round(data.totalTimeSeconds / 60), color: '#06b6d4' },
    { name: 'Games', value: data.totalGamesPlayed, color: '#8b5cf6' },
  ];

  const threeStarRate = data.level > 1 ? Math.round((data.threeStarLevels / (data.level - 1)) * 100) : 0;
  
  const earnedAchievements = data.achievements || [];

  const StatItem = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
    <motion.div 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white/5 rounded-3xl p-5 flex items-center justify-between border border-white/5 shadow-inner cursor-default"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
          <Icon className={color.replace('bg-', 'text-')} size={20} />
        </div>
        <span className="text-white/50 font-bold text-sm uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-black italic">{value}</span>
    </motion.div>
  );

  return (
    <div className={`fixed inset-0 ${colors.bg} p-8 text-white overflow-y-auto overflow-x-hidden transition-colors duration-500`}>
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-[80vw] h-[80vw] rounded-full opacity-10 blur-[100px]"
          style={{ background: `radial-gradient(circle, var(--accent-color) 0%, transparent 70%)` }}
        />
      </div>

      <div className="max-w-md mx-auto z-10 relative">
        <div className="flex items-center justify-between mb-12">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <h2 className="text-xl font-black italic tracking-tight">PROFILE</h2>
          <div className="w-12" />
        </div>

        <div className="flex flex-col items-center mb-12">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-yellow-500/20 rounded-[32px] flex items-center justify-center text-5xl mb-4 border-2 border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)]"
          >
            {data.avatarEmoji}
          </motion.div>
          <h1 className="text-3xl font-black italic tracking-tight">{data.username || 'Anonymous'}</h1>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditName(data.username || '');
              setEditAvatar(data.avatarEmoji || '🎮');
              setErrorMsg('');
              setIsEditing(true);
            }}
            className="mt-2 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10"
          >
            Edit Profile
          </motion.button>
          
          {data.tournamentRank !== undefined && data.tournamentRank > 0 && (
            <div className={`mt-3 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border shadow-sm ${
              data.tournamentRank <= 3 
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' 
                : data.tournamentRank <= 10 
                  ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30' 
                  : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
            }`}>
              {data.tournamentRank <= 3 ? '👑 ECLIPSE LEGEND' : data.tournamentRank <= 10 ? '💎 ELITE CHALLENGER' : '✨ ARENA CONTENDER'} (RANK #{data.tournamentRank})
            </div>
          )}
          
          {user ? (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <Cloud size={10} className="text-green-500" />
              <Check size={8} className="text-green-500" />
              <span className="text-green-500 text-[8px] font-black uppercase tracking-[0.2em]">Cloud Synced</span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoogleLink}
              disabled={isLinking}
              className="flex items-center gap-2 mt-4 px-4 py-2 bg-white text-black rounded-xl font-bold text-xs shadow-lg"
            >
              <ShieldCheck size={14} />
              {isLinking ? 'SYNCING...' : 'PROTECT PROGRESS WITH GOOGLE'}
            </motion.button>
          )}

          <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Certified Flow Master</p>
        </div>

        <div className="space-y-3 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 px-2 mb-2">Detailed Stats</h3>
          <StatItem label="3-Star Rate" value={`${threeStarRate}%`} icon={Star} color="bg-yellow-500" />
          <StatItem label="Max Streak" value={data.longestWinStreak} icon={TrendingUp} color="bg-green-500" />
          <StatItem label="Daily Wins" value={data.dailyChallengesCompleted} icon={Clock} color="bg-blue-500" />
          <div className="h-4" />
          <StatItem label="Current Level" value={data.level} icon={Trophy} color="bg-yellow-500" />
          <StatItem label="Total Stars" value={data.stars} icon={Star} color="bg-orange-500" />
          <StatItem label="Best Level" value={data.bestLevel} icon={Gamepad2} color="bg-blue-500" />
          <StatItem label="Games Played" value={data.totalGamesPlayed} icon={Gamepad2} color="bg-purple-500" />
          <StatItem 
            label="Avg. Moves" 
            value={data.totalGamesPlayed > 0 ? Math.round(data.totalMoves / data.totalGamesPlayed) : 0} 
            icon={Gamepad2} 
            color="bg-indigo-500" 
          />
          <StatItem 
            label="Avg. Time" 
            value={data.totalGamesPlayed > 0 ? (data.totalTimeSeconds / data.totalGamesPlayed).toFixed(1) + 's' : '0s'} 
            icon={Gamepad2} 
            color="bg-cyan-500" 
          />
          <StatItem label="Hints Used" value={data.hintsUsed} icon={Lightbulb} color="bg-green-500" />
        </div>

        <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 px-2 mb-6 text-center">Advanced Records</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-2xl">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Fastest Solve</span>
              <span className="font-black italic text-lg text-cyan-400">
                {Object.values(data.fastestLevelTimes || {}).length > 0 
                  ? Math.min(...Object.values(data.fastestLevelTimes as Record<number, number>)).toFixed(1) + 's'
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-2xl">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Total Paths</span>
              <span className="font-black italic text-lg text-purple-400">{data.totalPathsCreated || 0}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-2xl">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Favorite Theme</span>
              <span className="font-black italic text-lg text-green-400 uppercase">
                {Object.entries(data.themeUsage || {}).length > 0
                  ? Object.entries(data.themeUsage as Record<string, number>).sort((a,b) => b[1] - a[1])[0][0]
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 mb-12">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Achievements</h3>
            <button 
              onClick={onOpenAchievements}
              className="text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isEarned = earnedAchievements.includes(a.id);
              return (
                <motion.div 
                  key={a.id}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isEarned ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-white/5 grayscale opacity-20'
                  }`}
                  title={`${a.title}: ${a.description}`}
                >
                  <span className="text-xl">{a.icon}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-6 text-center">Activity Overview</h3>
          <div className="h-48 w-full font-sans">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#ffffff33" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {chartData.map((entry, index) => (
                      <ReCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-6 text-center">Mastery Progress</h3>
          <div className="flex gap-2 h-12">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all ${
                  i < (data.bestLevel / 10) ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-white/5'
                }`} 
              />
            ))}
          </div>
          <p className="text-center text-[10px] font-bold text-white/20 mt-4 uppercase tracking-widest">
            {Math.floor(data.bestLevel / 10)} / 12 MILESTONES REACHED
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl flex items-center justify-center gap-3 font-black underline-offset-4 mb-8 transition-colors"
        >
          <LogOut size={20} />
          <span className="italic tracking-widest">CHANGE PROFILE</span>
        </motion.button>

        <p className="text-center text-white/10 text-[10px] font-black uppercase tracking-[0.5em]">ColorFlow v1.0.0</p>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-black italic text-white uppercase tracking-tight text-center">Edit Profile</h3>
              
              {errorMsg && (
                <div className="bg-red-500/20 text-red-300 text-xs text-center p-3 rounded-xl border border-red-500/20 font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Username</label>
                <input
                  type="text"
                  maxLength={15}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:border-yellow-500/50 transition-colors"
                  placeholder="Enter name..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Avatar</label>
                <div className="grid grid-cols-4 gap-2">
                  {['🎮', '👑', '⚡', '🚀', '✨', '🔥', '🔮', '🍀', '🌟', '👾', '🌈', '🎨'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditAvatar(emoji)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        editAvatar === emoji 
                          ? 'bg-yellow-500/20 border-2 border-yellow-500 scale-110 shadow-lg' 
                          : 'bg-white/5 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-white/5 text-white/60 hover:text-white rounded-2xl font-bold text-xs border border-white/5 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-yellow-500 text-black rounded-2xl font-black italic tracking-widest hover:scale-105 active:scale-95 transition-transform"
                >
                  SAVE ▶
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
