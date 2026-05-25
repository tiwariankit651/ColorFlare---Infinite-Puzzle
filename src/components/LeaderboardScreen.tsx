import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Star, Target, Flame, Medal, TrendingUp, RefreshCw } from 'lucide-react';
import { LeaderboardService, LeaderboardEntry, LeaderboardCategory, LeaderboardTimeframe } from '../services/leaderboardService';
import { auth, authReady, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<LeaderboardCategory>('stars');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [uid, setUid] = useState<string | undefined>(auth.currentUser?.uid);
  const [userGlobalData, setUserGlobalData] = useState<any>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (authReady) await authReady;
      const currentUid = auth.currentUser?.uid;
      setUid(currentUid);
      
      const data = await LeaderboardService.getLeaderboard(category, timeframe, 50);
      setEntries(data);

      const userPos = data.findIndex(e => e.userId === currentUid);
      setUserRank(userPos !== -1 ? userPos + 1 : 0);

      if (currentUid) {
          let collectionName = 'leaderboard';
          if (timeframe === 'daily') collectionName = `leaderboard_daily_${LeaderboardService.getDailyKey()}`;
          if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${LeaderboardService.getWeeklyKey()}`;
          
          const userDoc = await getDoc(doc(db, collectionName, currentUid));
          if (userDoc.exists()) {
              setUserGlobalData(userDoc.data());
          } else {
              setUserGlobalData(null);
          }
      }
    } catch (err) {
      console.error("Failed to load leaderboard", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category, timeframe]);

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);
  
  const displayValue = (entry: LeaderboardEntry) => {
    if (category === 'stars') return entry.totalStars;
    if (category === 'level') return entry.currentLevel;
    return entry.dailyChallenges || 0;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard(true);
  };

  const categories = [
    { id: 'stars', name: 'Elite', icon: Star, color: 'text-yellow-500' },
    { id: 'level', name: 'Progress', icon: Target, color: 'text-emerald-500' },
    { id: 'daily', name: 'Consistency', icon: Flame, color: 'text-orange-500' },
  ];

  const timeframes = [
    { id: 'daily', name: 'Daily' },
    { id: 'weekly', name: 'Weekly' },
    { id: 'all', name: 'All-Time' },
  ];

  return (
    <div className="fixed inset-0 bg-[#07130f] text-white flex flex-col z-[100] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.05)_0%,transparent_70%)]"
        />
      </div>

      {/* Header with Tabs */}
      <div className="pt-8 pb-4 px-6 bg-black/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2.5 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 shadow-xl"
          >
            <ChevronLeft size={24} />
          </motion.button>
          
          <div className="text-center">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2 justify-center">
              <Medal className="text-yellow-500 animate-pulse" />
              Champions
            </h1>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-1">Global Hall of Fame</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-xl ${
              refreshing ? 'bg-white/5 border-white/5 opacity-50' : 'bg-yellow-500 border-yellow-400 text-black shadow-yellow-500/20'
            }`}
          >
            <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-4 max-w-xs mx-auto border border-white/5">
            {timeframes.map(tf => (
                <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as LeaderboardTimeframe)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        timeframe === tf.id ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/60'
                    }`}
                >
                    {tf.name}
                </button>
            ))}
        </div>

        {/* Category Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 max-w-sm mx-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                if (category !== cat.id) setCategory(cat.id as LeaderboardCategory);
              }}
              className={`
                flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all relative
                ${category === cat.id ? 'bg-white shadow-xl isolate' : 'hover:bg-white/5'}
              `}
            >
              <cat.icon size={14} className={category === cat.id ? 'text-black' : 'text-white/40'} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${category === cat.id ? 'text-black' : 'text-white/40'}`}>
                {cat.name}
              </span>
              {category === cat.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-xl -z-10"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-white/10 border-t-yellow-500 rounded-full"
            />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing with cosmos...</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto w-full px-4 pb-32">
            {entries.length === 0 ? (
                <div className="text-center py-24 px-6">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="relative w-32 h-32 mx-auto mb-8"
                    >
                      <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl animate-pulse" />
                      <Trophy size={128} strokeWidth={0.5} className="text-white/5 relative z-10" />
                    </motion.div>
                    <h2 className="font-black italic text-2xl uppercase tracking-tighter mb-2">Claim the Throne</h2>
                    <p className="text-sm font-bold text-white/30 uppercase tracking-[0.25em] leading-relaxed max-w-[200px] mx-auto">
                      Be the first to leave your mark in this {timeframe} hall of fame.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onBack}
                      className="mt-10 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 transition-all font-mono"
                    >
                      Wait for a challenger
                    </motion.button>
                </div>
            ) : (
              <>
                {/* Podium */}
                {topThree.length > 0 && (
                  <div className="flex items-end justify-center gap-2 mb-12 mt-16 px-4">
                    {/* Rank 2 */}
                    {topThree[1] && (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1 flex flex-col items-center"
                      >
                         <div className="relative mb-3">
                           <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-3xl shadow-xl">
                             {topThree[1].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-400 rounded-full border-4 border-[#07130f] flex items-center justify-center text-xs font-black italic">2</div>
                         </div>
                         <p className="text-[10px] font-black uppercase truncate w-full text-center mb-1">{topThree[1].username}</p>
                         <div className="h-20 w-full bg-white/10 rounded-t-2xl border-x border-t border-white/5 flex flex-col items-center justify-center">
                            <span className="text-sm font-black italic">
                              {displayValue(topThree[1])}
                            </span>
                         </div>
                      </motion.div>
                    )}

                    {/* Rank 1 */}
                    {topThree[0] && (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex-1 flex flex-col items-center -mb-4"
                      >
                         <div className="relative mb-3">
                           <motion.div 
                            animate={{ scale: [1, 1.1, 1] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2"
                           >
                             <Trophy size={20} className="text-yellow-500 fill-yellow-500 shadow-glow" />
                           </motion.div>
                           <div className="w-20 h-20 bg-yellow-500/10 rounded-2xl border-2 border-yellow-500/40 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                             {topThree[0].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 text-black rounded-full border-4 border-[#07130f] flex items-center justify-center text-sm font-black italic shadow-lg">1</div>
                         </div>
                         <p className="text-xs font-black uppercase truncate w-full text-center mb-1">{topThree[0].username}</p>
                         <div className="h-32 w-full bg-yellow-500/20 rounded-t-2xl border-x border-t border-yellow-500/30 flex flex-col items-center justify-center">
                            <span className="text-lg font-black italic text-yellow-500">
                             {displayValue(topThree[0])}
                            </span>
                         </div>
                      </motion.div>
                    )}

                    {/* Rank 3 */}
                    {topThree[2] && (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex-1 flex flex-col items-center"
                      >
                         <div className="relative mb-3">
                           <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-3xl shadow-xl">
                             {topThree[2].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-700/80 rounded-full border-4 border-[#07130f] flex items-center justify-center text-xs font-black italic">3</div>
                         </div>
                         <p className="text-[10px] font-black uppercase truncate w-full text-center mb-1">{topThree[2].username}</p>
                         <div className="h-16 w-full bg-white/10 rounded-t-2xl border-x border-t border-white/5 flex flex-col items-center justify-center">
                            <span className="text-sm font-black italic">
                              {displayValue(topThree[2])}
                            </span>
                         </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* List of other players */}
                <div className="space-y-2 mt-8">
                  {remaining.map((entry, index) => {
                    const actualRank = index + 4;
                    const val = displayValue(entry);

                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 + index * 0.03 }}
                        className={`
                          flex items-center gap-4 p-5 rounded-[2rem] border transition-all relative overflow-hidden group
                          ${entry.userId === uid 
                            ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.1)]' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'}
                        `}
                      >
                        {entry.userId === uid && (
                           <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 animate-shimmer pointer-events-none" />
                        )}
                        <div className={`w-6 text-center font-black italic text-sm ${entry.userId === uid ? 'text-yellow-500' : 'text-white/20'}`}>
                          {actualRank}
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${entry.userId === uid ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white/10 text-2xl'}`}>
                          <span className={entry.userId === uid ? 'text-2xl' : ''}>{entry.avatarEmoji}</span>
                        </div>
                        <div className="flex-1 min-w-0 px-1">
                          <p className={`font-black italic uppercase tracking-wider text-sm truncate ${entry.userId === uid ? 'text-yellow-500' : ''}`}>
                            {entry.username}
                          </p>
                          <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                            LVL {entry.currentLevel} • {entry.totalStars} ⭐ {category === 'daily' && `• ${entry.dailyChallenges || 0} 🔥`}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`font-black italic text-xl ${entry.userId === uid ? 'text-yellow-500' : ''}`}>{val}</span>
                          <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">{category === 'stars' ? 'STARS' : category === 'level' ? 'MAX LVL' : 'CHALLENGES'}</span>
                        </div>

                        {/* Reactions Overlay */}
                        <div className="absolute top-0 right-0 h-full flex items-center pr-2 translate-x-full group-hover:translate-x-0 transition-transform bg-gradient-to-l from-[#07130f] to-transparent pl-8">
                           {['👏', '🔥', '🏆', '✨'].map(emoji => (
                             <motion.button
                               key={emoji}
                               whileHover={{ scale: 1.2 }}
                               whileTap={{ scale: 0.9 }}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 LeaderboardService.addReaction(entry.userId, emoji, timeframe);
                               }}
                               className="p-2 hover:bg-white/10 rounded-lg text-lg grayscale hover:grayscale-0 transition-all"
                             >
                               {emoji}
                               {entry.reactions?.[emoji] && (
                                 <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black">
                                   {entry.reactions[emoji]}
                                 </span>
                               )}
                             </motion.button>
                           ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Persistent User Rank Footer */}
      {!loading && (
        <AnimatePresence>
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="p-6 bg-black/60 backdrop-blur-3xl border-t border-white/10 z-30"
          >
            <div className={`
                max-w-md mx-auto flex items-center gap-4 p-5 rounded-[2rem] border
                ${userRank > 0 && userRank <= 3 ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/5 border-white/10 shadow-2xl shadow-black/80'}
            `}>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60 truncate max-w-[100px]`}>Your {timeframe} Rank</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black italic">
                      {userRank > 0 ? `#${userRank}` : userGlobalData ? 'TOP 100+' : 'Unranked'}
                    </span>
                    {userRank > 0 && userRank <= 10 && (
                       <div className="bg-black/10 px-2 py-0.5 rounded text-[8px] font-black uppercase">Top Tier</div>
                    )}
                  </div>
                </div>
                
                <div className="ml-auto flex items-center gap-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">My {category === 'stars' ? 'Stars' : category === 'level' ? 'Level' : 'Challenges'}</span>
                    <span className="text-xl font-black italic">
                      {userGlobalData ? 
                        (category === 'stars' ? userGlobalData.totalStars : 
                         category === 'level' ? userGlobalData.currentLevel : 
                         userGlobalData.dailyChallenges) 
                        : 0
                      }
                    </span>
                  </div>
                  <TrendingUp size={24} className="opacity-20" />
                </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
