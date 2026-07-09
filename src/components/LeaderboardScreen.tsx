import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  Medal, 
  TrendingUp, 
  RefreshCw, 
  X, 
  Award, 
  Sparkles, 
  Zap,
  TrendingDown
} from 'lucide-react';
import { LeaderboardService, LeaderboardEntry, LeaderboardCategory, LeaderboardTimeframe } from '../services/leaderboardService';
import { auth, authReady, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GameStorage } from '../logic/storage';

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
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);

  // Load the current user's local stats for robust fallback comparison
  const localStats = GameStorage.getData();

  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (authReady) await authReady;
      const currentUid = auth.currentUser?.uid;
      setUid(currentUid);
      
      const limitToFetch = 100; // Increased limit from 50 to 100 to show more records
      const data = await LeaderboardService.getLeaderboard(category, timeframe, limitToFetch);
      
      // Secondary absolute protection against NaN values in state
      const sanitizedData = data.map((e, index) => ({
        ...e,
        rank: index + 1,
        totalStars: isNaN(Number(e.totalStars)) ? 0 : Number(e.totalStars),
        currentLevel: isNaN(Number(e.currentLevel)) ? 1 : Number(e.currentLevel),
        dailyChallenges: isNaN(Number(e.dailyChallenges)) ? 0 : Number(e.dailyChallenges)
      }));
      
      // Let's get the user's score based on the category
      const myStars = localStats.stars ?? 0;
      const myLevel = localStats.level ?? 1;
      const myChallenges = localStats.dailyChallengesCompleted ?? 0;

      let scoreToCompare = 0;
      if (category === 'stars') scoreToCompare = myStars;
      else if (category === 'level') scoreToCompare = myLevel;
      else scoreToCompare = myChallenges;

      // Find user in sanitizedData
      const userIndexInTop = sanitizedData.findIndex(e => e.userId === currentUid);
      
      let finalEntriesList: LeaderboardEntry[] = [...sanitizedData];
      let finalUserRank = 0;

      if (userIndexInTop !== -1) {
        finalUserRank = userIndexInTop + 1;
      } else if (currentUid) {
        // Calculate exact rank count dynamically from Firestore
        const exactRank = await LeaderboardService.getUserRank(category, timeframe, currentUid, scoreToCompare);
        finalUserRank = exactRank;

        // Populate user global details if available
        let profileUsername = auth.currentUser?.displayName || localStats.username || 'Anonymous Player';
        let profileEmoji = localStats.avatarEmoji || '🎮';

        let collectionName = 'leaderboard';
        if (timeframe === 'daily') collectionName = `leaderboard_daily_${LeaderboardService.getDailyKey()}`;
        if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${LeaderboardService.getWeeklyKey()}`;

        try {
          const userDoc = await getDoc(doc(db, collectionName, currentUid));
          if (userDoc.exists()) {
            const raw = userDoc.data();
            profileUsername = raw.username || profileUsername;
            profileEmoji = raw.avatarEmoji || profileEmoji;
          }
        } catch (e) {
          console.warn("Couldn't read profile path for manual entry:", e);
        }

        const userManualEntry: LeaderboardEntry = {
          userId: currentUid,
          username: profileUsername,
          avatarEmoji: profileEmoji,
          totalStars: myStars,
          currentLevel: myLevel,
          dailyChallenges: myChallenges,
          rank: exactRank,
          reactions: {},
          updatedAt: null
        };

        // Append to the list so that the user is guaranteed to be rendered!
        finalEntriesList.push(userManualEntry);
      }

      setEntries(finalEntriesList);
      setUserRank(finalUserRank);

      if (currentUid) {
          let collectionName = 'leaderboard';
          if (timeframe === 'daily') collectionName = `leaderboard_daily_${LeaderboardService.getDailyKey()}`;
          if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${LeaderboardService.getWeeklyKey()}`;
          
          const userDoc = await getDoc(doc(db, collectionName, currentUid));
          if (userDoc.exists()) {
              const rawUserDoc = userDoc.data();
              setUserGlobalData({
                ...rawUserDoc,
                totalStars: isNaN(Number(rawUserDoc?.totalStars)) ? localStats.stars : Number(rawUserDoc?.totalStars),
                currentLevel: isNaN(Number(rawUserDoc?.currentLevel)) ? localStats.level : Number(rawUserDoc?.currentLevel),
                dailyChallenges: isNaN(Number(rawUserDoc?.dailyChallenges)) ? localStats.dailyChallengesCompleted : Number(rawUserDoc?.dailyChallenges)
              });
          } else {
              // Graceful local memory fallback
              setUserGlobalData({
                totalStars: localStats.stars,
                currentLevel: localStats.level,
                dailyChallenges: localStats.dailyChallengesCompleted || 0
              });
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
    if (category === 'stars') return isNaN(Number(entry.totalStars)) ? 0 : Number(entry.totalStars);
    if (category === 'level') return isNaN(Number(entry.currentLevel)) ? 1 : Number(entry.currentLevel);
    return isNaN(Number(entry.dailyChallenges)) ? 0 : Number(entry.dailyChallenges);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard(true);
  };

  const getRankBadgeAndColor = (rank: number) => {
    if (rank === 1) return { title: 'GRAND CHAMPION 👑', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/40' };
    if (rank <= 3) return { title: 'ZENITH MASTER 🏆', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' };
    if (rank <= 10) return { title: 'APEX LEGEND ✨', color: 'bg-purple-500/10 text-purple-400 border-purple-500/40' };
    if (rank <= 20) return { title: 'FLOW VETERAN 💎', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/40' };
    return { title: 'RISING STAR 🌟', color: 'bg-white/5 text-white/50 border-white/10' };
  };

  // Compare active stats to user stats
  const getComparisonStats = (player: LeaderboardEntry) => {
    const myStars = userGlobalData?.totalStars ?? localStats.stars ?? 0;
    const myLevel = userGlobalData?.currentLevel ?? localStats.level ?? 1;
    const myChallenges = userGlobalData?.dailyChallenges ?? localStats.dailyChallengesCompleted ?? 0;

    const starDiff = player.totalStars - myStars;
    const levelDiff = player.currentLevel - myLevel;
    const challengeDiff = (player.dailyChallenges || 0) - myChallenges;

    return {
      myStars,
      myLevel,
      myChallenges,
      starDiff,
      levelDiff,
      challengeDiff
    };
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
    <div className="fixed inset-0 bg-[#07130f] text-white flex flex-col z-[100] overflow-hidden select-none">
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
            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-1 font-mono">Global Hall of Fame</p>
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
                        timeframe === tf.id ? 'bg-white/10 text-white shadow-inner font-bold' : 'text-white/30 hover:text-white/60'
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
                ${category === cat.id ? 'bg-white shadow-xl' : 'hover:bg-white/5'}
              `}
            >
              <cat.icon size={14} className={category === cat.id ? 'text-black' : 'text-white/40'} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${category === cat.id ? 'text-black font-extrabold' : 'text-white/40'}`}>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 font-mono">Syncing with cosmos...</p>
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
                        onClick={() => setSelectedPlayer(topThree[1])}
                        className="flex-1 flex flex-col items-center cursor-pointer group"
                      >
                         <div className="relative mb-3">
                           <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-3xl shadow-xl transition-transform group-hover:scale-105">
                             {topThree[1].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-400 rounded-full border-4 border-[#07130f] flex items-center justify-center text-xs font-black italic text-black">2</div>
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
                        onClick={() => setSelectedPlayer(topThree[0])}
                        className="flex-1 flex flex-col items-center -mb-4 cursor-pointer group"
                      >
                         <div className="relative mb-3">
                           <motion.div 
                            animate={{ scale: [1, 1.1, 1] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2"
                           >
                             <Trophy size={20} className="text-yellow-500 fill-yellow-500 shadow-glow" />
                           </motion.div>
                           <div className="w-20 h-20 bg-yellow-500/10 rounded-2xl border-2 border-yellow-500/40 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(234,179,8,0.2)] transition-transform group-hover:scale-105">
                             {topThree[0].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 text-black rounded-full border-4 border-[#07130f] flex items-center justify-center text-sm font-black italic shadow-lg">1</div>
                         </div>
                         <p className="text-xs font-black uppercase truncate w-full text-center mb-1 text-yellow-500">{topThree[0].username}</p>
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
                        onClick={() => setSelectedPlayer(topThree[2])}
                        className="flex-1 flex flex-col items-center cursor-pointer group"
                      >
                         <div className="relative mb-3">
                           <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-3xl shadow-xl transition-transform group-hover:scale-105">
                             {topThree[2].avatarEmoji}
                           </div>
                           <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-700/80 rounded-full border-4 border-[#07130f] flex items-center justify-center text-xs font-black italic text-white">3</div>
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
                    const actualRank = entry.rank || (index + 4);
                    const val = displayValue(entry);
                    const isCurrentUser = entry.userId === uid;
                    const tier = getRankBadgeAndColor(actualRank);
                    const showGap = index > 0 && entry.rank && remaining[index - 1].rank && (entry.rank - (remaining[index - 1].rank || 0) > 1);

                    return (
                      <React.Fragment key={entry.userId}>
                        {showGap && (
                          <div className="flex items-center justify-center py-4 my-2 text-white/25 font-black text-[9px] tracking-[0.2em] uppercase italic bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                            •••••• ranking continues underneath ••••••
                          </div>
                        )}
                        <motion.div
                          key={entry.userId}
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          onClick={() => setSelectedPlayer(entry)}
                          transition={{ delay: 0.05 + Math.min(index, 20) * 0.02 }}
                          className={`
                            flex items-center gap-4 p-4 rounded-[2rem] border transition-all relative overflow-hidden group cursor-pointer
                            ${isCurrentUser 
                              ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.08)]' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                          `}
                        >
                          {isCurrentUser && (
                             <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 animate-shimmer pointer-events-none" />
                          )}
                          <div className={`w-8 text-center font-black italic text-sm ${isCurrentUser ? 'text-yellow-500' : 'text-white/20'}`}>
                            #{actualRank}
                          </div>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${isCurrentUser ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'bg-white/10 text-2xl'}`}>
                            <span className={isCurrentUser ? 'text-2xl' : ''}>{entry.avatarEmoji}</span>
                          </div>
                          <div className="flex-1 min-w-0 px-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={`font-black italic uppercase tracking-wider text-sm truncate ${isCurrentUser ? 'text-yellow-500 font-extrabold' : ''}`}>
                                {entry.username}
                              </p>
                              {isCurrentUser && (
                                <span className="bg-yellow-500 text-black text-[7px] px-1.5 py-0.5 rounded-full font-black tracking-tight uppercase">YOU</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                                LVL {entry.currentLevel} • {entry.totalStars} ⭐ {category === 'daily' && `• ${entry.dailyChallenges || 0} 🔥`}
                              </span>
                              <span className={`text-[7px] px-1.5 py-0.2 rounded border font-semibold scale-95 font-mono ${tier.color}`}>
                                {tier.title.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end pr-2">
                            <span className={`font-black italic text-lg ${isCurrentUser ? 'text-yellow-500' : ''}`}>{val}</span>
                            <span className="text-[7px] font-black uppercase text-white/20 tracking-wider">
                              {category === 'stars' ? 'STARS' : category === 'level' ? 'MAX LVL' : 'CHALLENGES'}
                            </span>
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
                                   // Instantly trigger reactive sound
                                 }}
                                 className="p-1.5 hover:bg-white/10 rounded-lg text-lg grayscale hover:grayscale-0 transition-all relative"
                               >
                                 {emoji}
                                 {entry.reactions?.[emoji] && (
                                   <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black scale-90">
                                     {entry.reactions[emoji]}
                                   </span>
                                 )}
                               </motion.button>
                             ))}
                          </div>
                        </motion.div>
                      </React.Fragment>
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
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60 truncate max-w-[100px] font-mono`}>Your {timeframe} Rank</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black italic">
                      {userRank > 0 ? `#${userRank}` : userGlobalData ? 'TOP 20+' : 'Unranked'}
                    </span>
                    {userRank > 0 && userRank <= 10 && (
                       <div className="bg-black/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono">Top Tier</div>
                    )}
                  </div>
                </div>
                
                <div className="ml-auto flex items-center gap-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60 font-mono">My {category === 'stars' ? 'Stars' : category === 'level' ? 'Level' : 'Challenges'}</span>
                    <span className="text-xl font-black italic">
                      {userGlobalData ? 
                        (category === 'stars' ? userGlobalData.totalStars : 
                         category === 'level' ? userGlobalData.currentLevel : 
                         userGlobalData.dailyChallenges) 
                        : (category === 'stars' ? localStats.stars : category === 'level' ? localStats.level : localStats.dailyChallengesCompleted)
                      }
                    </span>
                  </div>
                  <TrendingUp size={24} className="opacity-25" />
                </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Advanced Interactive Player Comparison Card (Modal Bottom Sheet) */}
      <AnimatePresence>
        {selectedPlayer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayer(null)}
              className="fixed inset-0 bg-black z-[110]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#071712] border-t border-white/10 rounded-t-[3rem] p-6 pb-12 z-[120] overflow-y-auto overflow-x-hidden text-white"
            >
              {/* Header handle lever */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              <div className="max-w-md mx-auto">
                {/* Profile header */}
                <div className="flex items-start justify-between relative mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] border-2 border-white/10 flex items-center justify-center text-4xl shadow-inner shadow-black relative">
                      {selectedPlayer.avatarEmoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black italic uppercase tracking-tight">{selectedPlayer.username}</h3>
                        {selectedPlayer.userId === uid && (
                          <span className="bg-yellow-500 text-black text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">YOU</span>
                        )}
                      </div>
                      <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 mt-1 rounded border scale-95 font-mono ${
                        getRankBadgeAndColor(entries.findIndex(p => p.userId === selectedPlayer.userId) + 1).color
                      }`}>
                        {getRankBadgeAndColor(entries.findIndex(p => p.userId === selectedPlayer.userId) + 1).title}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sub-header descriptor */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-wider">
                    <Award size={14} className="text-yellow-500 animate-bounce" />
                    <span>COSMOS FOOTPRINT</span>
                  </div>
                  <span className="text-[10px] font-mono text-yellow-500 font-extrabold uppercase">ONLINE VERIFIED</span>
                </div>

                {/* Stats comparison grid */}
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 px-1">Progression duel</h4>
                
                <div className="space-y-3 mb-6">
                  {/* Stars comparison */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
                        <Star size={18} fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">TOTAL STARS</p>
                        <p className="text-sm font-black italic">{selectedPlayer.totalStars} ⭐ vs {getComparisonStats(selectedPlayer).myStars} ⭐</p>
                      </div>
                    </div>
                    {/* Diff pill */}
                    <div className={`p-2 py-1 rounded-xl flex items-center gap-1 text-[10px] font-black italic ${
                      getComparisonStats(selectedPlayer).starDiff >= 0 
                        ? 'bg-amber-400/10 text-amber-300' 
                        : 'bg-red-400/10 text-red-300'
                    }`}>
                      {getComparisonStats(selectedPlayer).starDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>
                        {getComparisonStats(selectedPlayer).starDiff >= 0 ? '+' : ''}
                        {getComparisonStats(selectedPlayer).starDiff}
                      </span>
                    </div>
                  </div>

                  {/* Level comparison */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <Target size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">MAX COMPLETED LEVEL</p>
                        <p className="text-sm font-black italic">LVL {selectedPlayer.currentLevel} vs LVL {getComparisonStats(selectedPlayer).myLevel}</p>
                      </div>
                    </div>
                    {/* Diff pill */}
                    <div className={`p-2 py-1 rounded-xl flex items-center gap-1 text-[10px] font-black italic ${
                      getComparisonStats(selectedPlayer).levelDiff >= 0 
                        ? 'bg-emerald-400/10 text-emerald-300' 
                        : 'bg-red-400/10 text-red-301'
                    }`}>
                      {getComparisonStats(selectedPlayer).levelDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>
                        {getComparisonStats(selectedPlayer).levelDiff >= 0 ? '+' : ''}
                        {getComparisonStats(selectedPlayer).levelDiff}
                      </span>
                    </div>
                  </div>

                  {/* Daily wins comparison */}
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400">
                        <Flame size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">CONSISTENCY SCORE</p>
                        <p className="text-sm font-black italic">{selectedPlayer.dailyChallenges ?? 0} 🔥 vs {getComparisonStats(selectedPlayer).myChallenges} 🔥</p>
                      </div>
                    </div>
                    {/* Diff pill */}
                    <div className={`p-2 py-1 rounded-xl flex items-center gap-1 text-[10px] font-black italic ${
                      getComparisonStats(selectedPlayer).challengeDiff >= 0 
                        ? 'bg-orange-400/10 text-orange-300' 
                        : 'bg-red-400/10 text-red-301'
                    }`}>
                      {getComparisonStats(selectedPlayer).challengeDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>
                        {getComparisonStats(selectedPlayer).challengeDiff >= 0 ? '+' : ''}
                        {getComparisonStats(selectedPlayer).challengeDiff}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Achievements Showcase */}
                <div className="flex items-center justify-between mb-3 px-1 mt-6">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Earned milestone credentials</h4>
                  <span className="text-[9px] font-black uppercase text-yellow-500 tracking-wider flex items-center gap-1">
                    <Sparkles size={10} />
                    DYNAMIC ESTIMATE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {/* Unlocked condition 1 */}
                  <div className={`border p-4 rounded-3xl flex flex-col justify-between transition-all ${
                    selectedPlayer.totalStars >= 50 
                      ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400/80 shadow-[0_0_15px_rgba(234,179,8,0.02)]' 
                      : 'bg-white/5 border-white/5 text-white/20'
                  }`}>
                    <div className="text-2xl mb-1">⭐</div>
                    <div>
                      <p className="font-black italic text-xs uppercase text-white truncate tracking-tighter">Star Magnet</p>
                      <p className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider ${selectedPlayer.totalStars >= 50 ? 'text-yellow-500/60' : 'text-white/25'}`}>
                        {selectedPlayer.totalStars >= 50 ? 'UNLOCKED' : 'LOCKED (50 stars)'}
                      </p>
                    </div>
                  </div>

                  {/* Unlocked condition 2 */}
                  <div className={`border p-4 rounded-3xl flex flex-col justify-between transition-all ${
                    selectedPlayer.currentLevel >= 50 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.02)]' 
                      : 'bg-white/5 border-white/5 text-white/20'
                  }`}>
                    <div className="text-2xl mb-1">🎯</div>
                    <div>
                      <p className="font-black italic text-xs uppercase text-white truncate tracking-tighter">Flow Scholar</p>
                      <p className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider ${selectedPlayer.currentLevel >= 50 ? 'text-emerald-500/60' : 'text-white/25'}`}>
                        {selectedPlayer.currentLevel >= 50 ? 'UNLOCKED' : 'LOCKED (Lvl 50+)'}
                      </p>
                    </div>
                  </div>

                  {/* Unlocked condition 3 */}
                  <div className={`border p-4 rounded-3xl flex flex-col justify-between transition-all ${
                    (selectedPlayer.dailyChallenges || 0) >= 10 
                      ? 'bg-orange-500/5 border-orange-500/20 text-orange-400/80' 
                      : 'bg-white/5 border-white/5 text-white/20'
                  }`}>
                    <div className="text-2xl mb-1">🔥</div>
                    <div>
                      <p className="font-black italic text-xs uppercase text-white truncate tracking-tighter">Iron Will</p>
                      <p className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider ${(selectedPlayer.dailyChallenges || 0) >= 10 ? 'text-orange-500/60' : 'text-white/25'}`}>
                        {(selectedPlayer.dailyChallenges || 0) >= 10 ? 'UNLOCKED' : 'LOCKED (10+ wins)'}
                      </p>
                    </div>
                  </div>

                  {/* Unlocked condition 4 */}
                  <div className={`border p-4 rounded-3xl flex flex-col justify-between transition-all ${
                    entries.findIndex(p => p.userId === selectedPlayer.userId) === 0 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.04)] animate-pulse' 
                      : 'bg-white/5 border-white/5 text-white/20'
                  }`}>
                    <div className="text-2xl mb-1">👑</div>
                    <div>
                      <p className="font-black italic text-xs uppercase text-white truncate tracking-tighter">Sun God</p>
                      <p className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider ${entries.findIndex(p => p.userId === selectedPlayer.userId) === 0 ? 'text-amber-500' : 'text-white/25'}`}>
                        {entries.findIndex(p => p.userId === selectedPlayer.userId) === 0 ? 'COSMOS EMPEROR' : 'LOCKED (Rank 1)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Send Kudos Area */}
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 px-1">Send quick kudos</h4>
                
                <div className="flex gap-2 bg-white/5 p-3 rounded-3xl border border-white/5 justify-around">
                  {['👏', '🔥', '🏆', '✨'].map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2, rotate: 8 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        LeaderboardService.addReaction(selectedPlayer.userId, emoji, timeframe);
                        // Instantly reflect kudos locally for incredible feedback loop!
                        setSelectedPlayer(prev => {
                          if (!prev) return null;
                          const reactions = { ...prev.reactions };
                          reactions[emoji] = (reactions[emoji] || 0) + 1;
                          return { ...prev, reactions };
                        });
                        // Update in core list too
                        setEntries(prevList => prevList.map(item => {
                          if (item.userId === selectedPlayer.userId) {
                            const rx = { ...item.reactions };
                            rx[emoji] = (rx[emoji] || 0) + 1;
                            return { ...item, reactions: rx };
                          }
                          return item;
                        }));
                      }}
                      className="text-3xl hover:bg-white/5 p-2 rounded-2xl grayscale hover:grayscale-0 transition-all flex flex-col items-center gap-1"
                    >
                      <span>{emoji}</span>
                      <span className="text-[10px] font-black text-white/30 font-mono">
                        {selectedPlayer.reactions?.[emoji] || 0}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
