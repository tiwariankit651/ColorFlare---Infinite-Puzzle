
import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LogOut, Star, Trophy, Gamepad2, Lightbulb, Clock, TrendingUp, Cloud, Check } from 'lucide-react';
import { GameStorage } from '../logic/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell } from 'recharts';
import { ACHIEVEMENTS } from '../services/achievementService';

interface ProfileScreenProps {
  data: any;
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ data, onBack, onLogout }) => {

  const chartData = [
    { name: 'Moves', value: data.totalMoves, color: '#6366f1' },
    { name: 'Time', value: Math.round(data.totalTimeSeconds / 60), color: '#06b6d4' },
    { name: 'Games', value: data.totalGamesPlayed, color: '#8b5cf6' },
  ];

  const threeStarRate = data.level > 1 ? Math.round((data.threeStarLevels / (data.level - 1)) * 100) : 0;
  
  const earnedAchievements = data.achievements || [];

  const StatItem = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
    <div className="bg-white/5 rounded-3xl p-5 flex items-center justify-between border border-white/5 shadow-inner">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
          <Icon className={color.replace('bg-', 'text-')} size={20} />
        </div>
        <span className="text-white/50 font-bold text-sm uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-black italic">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#064e3b] p-8 text-white overflow-y-auto overflow-x-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-[80vw] h-[80vw] bg-yellow-500 rounded-full opacity-10 blur-[100px]"
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
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
            <Cloud size={10} className="text-green-500" />
            <Check size={8} className="text-green-500" />
            <span className="text-green-500 text-[8px] font-black uppercase tracking-[0.2em]">Cloud Synced</span>
          </div>
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
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-6 text-center">Achievements</h3>
          <div className="grid grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isEarned = earnedAchievements.includes(a.id);
              return (
                <div 
                  key={a.id}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isEarned ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-white/5 grayscale opacity-20'
                  }`}
                  title={`${a.title}: ${a.description}`}
                >
                  <span className="text-xl">{a.icon}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-6 text-center">Activity Overview</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
    </div>
  );
};
