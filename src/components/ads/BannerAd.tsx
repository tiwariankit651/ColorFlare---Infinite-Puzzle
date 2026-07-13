import React, { useEffect, useRef } from 'react';
import { ADS_CONFIG } from '../../config/ads.config';

interface BannerAdProps {
  slot: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const BannerAd: React.FC<BannerAdProps> = ({ slot, className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);
  const initializedRef = useRef(false);

  const publisherId = ADS_CONFIG.publisherId;

  useEffect(() => {
    if (!publisherId || !slot) return;

    // Load AdSense script if not present
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Initialize the ad slot
    if (!initializedRef.current && adRef.current) {
      try {
        const adsbygoogle = window.adsbygoogle || [];
        adsbygoogle.push({});
        initializedRef.current = true;
        console.log(`[AdSystem] Banner ad loaded for slot: ${slot}`);
      } catch (err) {
        console.error('[AdSystem] Error pushing to adsbygoogle:', err);
      }
    }
  }, [publisherId, slot]);

  if (!publisherId || !slot) {
    // In dev mode, can show a subtle dashed box representing the banner
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`w-full max-w-md mx-auto my-2 p-3 border-2 border-dashed border-white/10 rounded-lg text-center bg-white/5 ${className}`}>
          <p className="text-[10px] text-white/40 font-mono tracking-wider">
            [AdSense Banner Placeholder - Slot: {slot}]
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`w-full max-w-md mx-auto my-2 overflow-hidden flex justify-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '250px', minHeight: '50px' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
};
