import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { BannerAd } from './BannerAd';
import { ADS_CONFIG } from '../../config/ads.config';

interface InterstitialAdProps {
  isVisible: boolean;
  onClose: () => void;
  slot: string;
}

export const InterstitialAd: React.FC<InterstitialAdProps> = ({ isVisible, onClose, slot }) => {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  const publisherId = ADS_CONFIG.publisherId;

  useEffect(() => {
    if (!isVisible) return;

    setCountdown(5);
    setCanClose(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between items-center p-6 text-white"
      >
        {/* Header */}
        <div className="w-full flex justify-between items-center max-w-md">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Advertisement</span>
          </div>
          {canClose ? (
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full"
              id="btn-close-interstitial"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          ) : (
            <div className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-mono font-medium tracking-wide text-white/80">
              Close in {countdown}s
            </div>
          )}
        </div>

        {/* Ad Body Content */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md my-8 space-y-6">
          {publisherId ? (
            <div className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <BannerAd slot={slot} className="w-full" />
            </div>
          ) : (
            /* Dev Placeholder Ad */
            <div className="w-full h-80 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center relative shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-indigo-400">Ad</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Beautiful ColorFlow Pro</h3>
              <p className="text-xs text-white/60 max-w-xs mb-4 leading-relaxed">
                Connect the matching color nodes and fill the board to solve gorgeous puzzles. Get the full visual flow experience!
              </p>
              <span className="text-[10px] text-white/30 font-mono">[No publisherId set. Dev Mode simulation]</span>
            </div>
          )}

          <div className="text-center max-w-xs">
            <h4 className="text-sm font-semibold tracking-wide mb-1">ColorFlow Fun Puzzles</h4>
            <p className="text-xs text-white/40 leading-normal">
              Thank you for playing. Ads help keep this game free to enjoy.
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
