/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Trophy, Lock, CheckCircle2, Star } from 'lucide-react';
import { ACHIEVEMENTS, Achievement } from '../services/achievementService';

interface AchievementsScreenProps {
  unlockedIds: string[];
  onBack: () => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ unlockedIds, onBack }) => {
  return (
    <div className="fixed inset-0 bg-[#064e3b] flex flex-col text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-6 gap-8 p-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <Trophy key={i} size={48} />
          ))}
        </div>
      </div>

      <header className="relative z-10 flex items-center justify-between p-6 pt-12 border-b border-white/5 bg-black/10 backdrop-blur-md">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          id="achievements-back-btn"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic tracking-tighter">ACHIEVEMENTS</h2>
        <div className="w-10 h-10 flex items-center justify-center">
            <Trophy className="text-amber-400 animate-pulse" size={24} />
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto z-10 pb-32">
        <div className="max-w-2xl mx-auto space-y-4">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isUnlocked 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-black/20 border-white/5 opacity-50 grayscale'
                }`}
              >
                <div className={`w-16 h-16 flex items-center justify-center text-3xl rounded-xl ${
                    isUnlocked ? 'bg-amber-500/20 shadow-inner' : 'bg-white/5'
                }`}>
                  {isUnlocked ? achievement.icon : <Lock size={24} className="text-white/20" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black tracking-tight text-lg">
                      {isUnlocked ? achievement.title : '???'}
                    </h3>
                    {isUnlocked && <CheckCircle2 className="text-green-400" size={16} />}
                  </div>
                  <p className="text-sm text-white/60 font-medium">
                    {achievement.description}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black text-amber-400">+{achievement.rewardStars}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-[#064e3b] via-[#064e3b] to-transparent pointer-events-none z-20">
          <div className="max-w-xl mx-auto flex justify-center opacity-40">
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">Keep Flowing to Unlock More</p>
          </div>
      </div>
    </div>
  );
};
