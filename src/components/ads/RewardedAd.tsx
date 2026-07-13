import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, SkipForward, CheckCircle, Award } from 'lucide-react';
import { BannerAd } from './BannerAd';
import { ADS_CONFIG } from '../../config/ads.config';

interface RewardedAdProps {
  isVisible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
  slot: string;
}

export const RewardedAd: React.FC<RewardedAdProps> = ({ isVisible, onRewardEarned, onClose, slot }) => {
  const durationSec = Math.round(ADS_CONFIG.rules.hintAdDurationMs / 1000);
  const skipSec = Math.round(ADS_CONFIG.rules.hintSkipAfterMs / 1000);

  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [canSkip, setCanSkip] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);

  const publisherId = ADS_CONFIG.publisherId;

  useEffect(() => {
    if (!isVisible) return;

    setTimeLeft(durationSec);
    setCanSkip(false);
    setRewardEarned(false);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextVal = prev - 1;

        // Check if skip is available
        const elapsed = durationSec - nextVal;
        if (elapsed >= skipSec) {
          setCanSkip(true);
        }

        // Check if finished
        if (nextVal <= 0) {
          clearInterval(timer);
          setRewardEarned(true);
          onRewardEarned();
          return 0;
        }

        return nextVal;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, durationSec, skipSec, onRewardEarned]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between items-center p-6 text-white"
      >
        {/* Header with status/skip */}
        <div className="w-full flex justify-between items-center max-w-md">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Watch to unlock hint</span>
          </div>

          <div className="flex items-center space-x-2">
            {rewardEarned ? (
              <div className="flex items-center space-x-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Hint Unlocked!</span>
              </div>
            ) : (
              <div className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-mono font-medium tracking-wide text-white/80">
                Reward in {timeLeft}s
              </div>
            )}

            {/* Skip / Close Button */}
            {(canSkip || rewardEarned) && (
              <button
                onClick={onClose}
                className="flex items-center space-x-1 text-xs bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-1.5 rounded-full font-medium"
                id="btn-skip-rewarded"
              >
                {rewardEarned ? (
                  <span>Done</span>
                ) : (
                  <>
                    <span>Skip</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Ad Space */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md my-8 space-y-6">
          {publisherId ? (
            <div className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <BannerAd slot={slot} className="w-full" />
            </div>
          ) : (
            /* Dev/Test Placeholder Rewarded Ad */
            <div className="w-full h-80 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center relative shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-amber-400 fill-amber-400/20" />
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Unlock Solution Instant Hints!</h3>
              <p className="text-xs text-white/60 max-w-xs mb-4 leading-relaxed">
                Stuck on a tricky board? Watch this quick ad sponsor to instantly reveal a path dot connection on your board.
              </p>

              {/* Progress bar */}
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2 max-w-xs">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${((durationSec - timeLeft) / durationSec) * 100}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                  className="bg-amber-500 h-full"
                />
              </div>

              <span className="text-[10px] text-white/30 font-mono mt-4">[No publisherId set. Dev Mode simulation]</span>
            </div>
          )}

          <div className="text-center max-w-xs">
            <h4 className="text-sm font-semibold tracking-wide mb-1">Sponsored Message</h4>
            <p className="text-xs text-white/40 leading-normal">
              Your hint is being prepared. Connect the flow smoothly once unlocked.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="w-full text-center py-2">
          <p className="text-[9px] text-white/20 font-bold tracking-[0.2em] uppercase">Powered by Google AdSense</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
