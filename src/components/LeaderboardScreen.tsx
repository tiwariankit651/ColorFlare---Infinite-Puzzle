import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trophy, Star, Hash } from 'lucide-react';
import { LeaderboardService, LeaderboardEntry } from '../services/leaderboardService';
import { auth, authReady } from '../firebase';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [uid, setUid] = useState<string | undefined>(auth.currentUser?.uid);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        if (authReady) await authReady;
        setUid(auth.currentUser?.uid);
        const data = await LeaderboardService.getGlobalLeaderboard(50);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col z-[100]">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <ChevronLeft size={24} />
        </motion.button>
        <div className="flex flex-col items-center">
            <h1 className="text-xl font-black italic tracking-widest uppercase">Global Ranks</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Top 50 Players</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center">
          <Trophy size={20} className="text-yellow-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-white/10 border-t-yellow-500 rounded-full"
            />
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto pb-10">
            {entries.length === 0 ? (
                <div className="text-center py-20 text-white/20">
                    <Trophy size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold italic">No rankings yet.</p>
                    <p className="text-xs uppercase tracking-widest mt-2">Be the first to complete a level!</p>
                </div>
            ) : entries.map((entry, index) => (
              <motion.div
                key={entry.userId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl border transition-colors
                  ${entry.userId === uid 
                    ? 'bg-yellow-500/10 border-yellow-500/30' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'}
                `}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {index === 0 ? <span className="text-2xl">🥇</span> : 
                   index === 1 ? <span className="text-2xl">🥈</span> :
                   index === 2 ? <span className="text-2xl">🥉</span> :
                   <span className="text-white/40 font-black italic text-lg">{index + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shadow-inner">
                  <span className="text-2xl">{entry.avatarEmoji}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black italic tracking-wide truncate uppercase text-sm">
                      {entry.username}
                    </p>
                    {entry.userId === uid && (
                      <span className="bg-yellow-500 text-black text-[8px] font-black px-1 rounded uppercase">YOU</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    LVL {entry.currentLevel}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-black italic text-lg">{entry.totalStars}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!loading && entries.length > 0 && (
          <div className="p-4 bg-white/5 border-t border-white/5 text-center">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
                Rankings update automatically
              </p>
          </div>
      )}
    </div>
  );
};
