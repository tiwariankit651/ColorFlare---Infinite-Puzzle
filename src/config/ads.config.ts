const metaEnv = (import.meta as any).env || {};

export const ADS_CONFIG = {
  publisherId: (metaEnv.VITE_ADSENSE_PUBLISHER_ID as string) || '',
  slots: {
    homeBanner: (metaEnv.VITE_AD_SLOT_HOME_BANNER as string) || '',
    levelCompleteBanner: (metaEnv.VITE_AD_SLOT_LEVEL_COMPLETE as string) || '',
    hintRewarded: (metaEnv.VITE_AD_SLOT_HINT_REWARDED as string) || '',
    interstitial: (metaEnv.VITE_AD_SLOT_INTERSTITIAL as string) || '',
  },
  rules: {
    interstitialFrequency: 3, // Show after every N levels
    interstitialCooldownMs: 180000, // Min 3 min between interstitials
    firstAdAfterLevel: 4, // Don't show ads before level 4
    hintAdDurationMs: 30000, // 30 sec for hint reward
    hintSkipAfterMs: 15000, // Skip available after 15 sec
  }
};

export type AdPlacement = 'home_banner' | 'level_complete' | 'hint_reward' | 'interstitial';
