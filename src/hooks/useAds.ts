import { useState, useCallback, useEffect } from 'react';
import { ADS_CONFIG, AdPlacement } from '../config/ads.config';

export const useAds = () => {
  const isEnabled = !!ADS_CONFIG.publisherId;

  const [lastAdTime, setLastAdTime] = useState<number>(() => {
    const saved = sessionStorage.getItem('colorflow_last_ad_time');
    return saved ? parseInt(saved, 10) : 0;
  });

  const trackAdImpression = useCallback((placement: AdPlacement) => {
    const now = Date.now();
    sessionStorage.setItem('colorflow_last_ad_time', now.toString());
    setLastAdTime(now);
    console.log(`[AdSystem] Ad impression tracked for placement: ${placement}`);
  }, []);

  const canShowAd = useCallback((placement: AdPlacement, levelNum?: number): boolean => {
    if (!isEnabled) return false;

    // Don't show ads before level 4
    if (levelNum !== undefined && levelNum < ADS_CONFIG.rules.firstAdAfterLevel) {
      return false;
    }

    if (placement === 'interstitial') {
      const now = Date.now();
      const timeSinceLastAd = now - lastAdTime;
      const cooldownMs = ADS_CONFIG.rules.interstitialCooldownMs;

      if (timeSinceLastAd < cooldownMs) {
        console.log(`[AdSystem] Interstitial blocked by cooldown. Remaining: ${Math.max(0, Math.ceil((cooldownMs - timeSinceLastAd) / 1000))}s`);
        return false;
      }

      if (levelNum !== undefined) {
        // Show after every N levels (e.g. levels 6, 9, 12...)
        const isCorrectInterval = levelNum % ADS_CONFIG.rules.interstitialFrequency === 0;
        return isCorrectInterval;
      }
    }

    return true;
  }, [isEnabled, lastAdTime]);

  return {
    isEnabled,
    canShowAd,
    trackAdImpression,
    lastAdTime
  };
};
