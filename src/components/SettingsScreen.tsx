import React from 'react';
import { motion } from 'motion/react';
import { ThemeName, MusicStyle, AccentColor } from '../types';
import { ChevronLeft, Volume2, VolumeX, Music, Music2, Share2, Star, Wind, Zap, Moon, Leaf, Cloud, Activity, Sun, Palette, Sparkles, Layers, HelpCircle } from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
  soundOn: boolean;
  musicOn: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  preferredTheme?: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
  preferredPalette?: string[];
  onSelectPalette: (palette: string[]) => void;
  onResetProgress?: () => void;
  musicStyle: MusicStyle;
  onSelectMusicStyle: (style: MusicStyle) => void;
  accentColor: AccentColor;
  onSelectAccentColor: (color: AccentColor) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  hardModeOn: boolean;
  onToggleHardMode: () => void;
  onHowToPlay: () => void;
}

const THEMES: ThemeName[] = [
  'forest', 'ocean', 'space', 'candy', 'desert',
  'arctic', 'volcano', 'garden', 'city', 'clouds',
  'cyber', 'zen',
];

const PALETTES = [
  { name: 'Classic', colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#84CC16', '#A855F7', '#14B8A6', '#F43F5E'] },
  { name: 'Pastel', colors: ['#FCA5A5', '#93C5FD', '#6EE7B7', '#FCD34D', '#C4B5FD', '#67E8F9', '#F9A8D4', '#FDA4AF', '#FED7AA', '#D9F99D', '#99F6E4', '#F5D0FE'] },
  { name: 'Neon', colors: ['#FF0000', '#00FFFF', '#00FF00', '#FFFF00', '#FF00FF', '#0000FF', '#FFA500', '#FFFFFF', '#FF007F', '#CCFF00', '#7F00FF', '#007FFF'] },
  { name: 'Earth', colors: ['#78350F', '#064E3B', '#1E3A8A', '#7C2D12', '#4C1D95', '#164E63', '#831843', '#3F3F46', '#451A03', '#B45309', '#15803D', '#78716C'] },
];

const ACCENT_COLORS: { id: AccentColor, color: string, name: string }[] = [
  { id: 'green', color: '#10B981', name: 'Green' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'orange', color: '#F59E0B', name: 'Orange' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'amber', color: '#D97706', name: 'Amber' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  onBack, 
  soundOn, 
  musicOn, 
  onToggleSound, 
  onToggleMusic,
  preferredTheme,
  onSelectTheme,
  preferredPalette,
  onSelectPalette,
  onResetProgress,
  musicStyle,
  onSelectMusicStyle,
  accentColor,
  onSelectAccentColor,
  volume,
  onVolumeChange,
  hardModeOn,
  onToggleHardMode,
  onHowToPlay
}) => {
  const [shareToast, setShareToast] = React.useState<string | null>(null);
  const [rateToast, setRateToast] = React.useState<string | null>(null);

  const handleShare = async () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.colorflow.zen.puzzle';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ColorFlow: Zen Puzzle',
          text: 'Play ColorFlow: Zen Puzzle, the super addictive and relaxing color routing puzzle game!',
          url: playStoreUrl
        });
        setShareToast('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(playStoreUrl);
        setShareToast('Link copied to clipboard! Share it with your friends.');
      }
    } catch (err) {
      console.error("Failed to share", err);
      try {
        await navigator.clipboard.writeText(playStoreUrl);
        setShareToast('Link copied to clipboard!');
      } catch (e) {
        setShareToast('Store Link: ' + playStoreUrl);
      }
    }
    setTimeout(() => setShareToast(null), 4000);
  };

  const handleRateUs = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.colorflow.zen.puzzle';
    setRateToast('Opening Google Play Store... Please leave some feedback!');
    setTimeout(() => {
      setRateToast(null);
      window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
    }, 1500);
  };

  const getThemeColors = (themeName: ThemeName) => {
    switch (themeName) {
      case 'forest': return { bg: 'bg-[#064e3b]', accent: '#10b981', secondary: '#065f46' };
      case 'ocean': return { bg: 'bg-[#0c4a6e]', accent: '#0ea5e9', secondary: '#075985' };
      case 'space': return { bg: 'bg-[#1e1b4b]', accent: '#8b5cf6', secondary: '#312e81' };
      case 'candy': return { bg: 'bg-[#831843]', accent: '#ec4899', secondary: '#9d174d' };
      case 'desert': return { bg: 'bg-[#7c2d12]', accent: '#f97316', secondary: '#9a3412' };
      case 'arctic': return { bg: 'bg-[#334155]', accent: '#94a3b8', secondary: '#1e293b' };
      case 'volcano': return { bg: 'bg-[#7f1d1d]', accent: '#ef4444', secondary: '#991b1b' };
      case 'garden': return { bg: 'bg-[#14532d]', accent: '#22c55e', secondary: '#166534' };
      case 'city': return { bg: 'bg-[#0f172a]', accent: '#64748b', secondary: '#1e293b' };
      case 'clouds': return { bg: 'bg-[#1e3a8a]', accent: '#60a5fa', secondary: '#1e40af' };
      case 'cyber': return { bg: 'bg-[#0a0a0a]', accent: '#f0abfc', secondary: '#701a75' };
      case 'zen': return { bg: 'bg-[#1c1917]', accent: '#d6d3d1', secondary: '#44403c' };
      default: return { bg: 'bg-[#064e3b]', accent: '#10b981', secondary: '#065f46' };
    }
  };

  const colors = getThemeColors(preferredTheme || 'forest');

  const getThemeGradient = (themeName: ThemeName) => {
    switch (themeName) {
      case 'forest': return 'from-green-900 to-green-500';
      case 'ocean': return 'from-blue-900 to-blue-400';
      case 'space': return 'from-indigo-950 to-purple-600';
      case 'candy': return 'from-pink-800 to-yellow-500';
      case 'desert': return 'from-orange-800 to-yellow-600';
      case 'arctic': return 'from-slate-800 to-slate-400';
      case 'volcano': return 'from-red-900 to-orange-600';
      case 'garden': return 'from-green-800 to-green-300';
      case 'city': return 'from-slate-900 to-gray-600';
      case 'clouds': return 'from-indigo-700 to-blue-100';
      case 'cyber': return 'from-black to-fuchsia-900';
      case 'zen': return 'from-stone-900 to-stone-400';
      default: return 'from-green-900 to-green-500';
    }
  };

  return (
    <div className={`fixed inset-0 ${colors.bg} flex flex-col text-white overflow-hidden transition-colors duration-500`}>
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full opacity-35 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[90vw] h-[90vw] rounded-full opacity-25 blur-[140px]"
          style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
        />
      </div>

      <header className="flex items-center p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack} 
          className="p-2 hover:bg-white/10 rounded-xl transition-colors mr-4 bg-white/5"
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h2 className="text-xl font-black italic tracking-tighter uppercase px-2">Settings</h2>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-5 overflow-y-auto z-10 custom-scrollbar">
        <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={onToggleSound}
            className="w-full flex items-center justify-between p-6 transition-colors"
          >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${soundOn ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/30'}`}>
                    {soundOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </div>
                <span className="text-lg font-bold">Sound Effects</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${soundOn ? 'bg-accent' : 'bg-white/10'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${soundOn ? 'translate-x-6' : ''}`} />
            </div>
          </motion.button>

          <div className="h-[1px] bg-white/5 mx-6" />

          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={onToggleMusic}
            className="w-full flex items-center justify-between p-6 transition-colors"
          >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${musicOn ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/30'}`}>
                    {musicOn ? <Music2 size={24} /> : <Music size={24} />}
                </div>
                <span className="text-lg font-bold">Background Music</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${musicOn ? 'bg-accent' : 'bg-white/10'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${musicOn ? 'translate-x-6' : ''}`} />
            </div>
          </motion.button>

          <div className="h-[1px] bg-white/5 mx-6" />

          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={onToggleHardMode}
            className="w-full flex items-center justify-between p-6 transition-colors"
          >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${hardModeOn ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white/30'}`}>
                    <Zap size={24} className={hardModeOn ? 'text-red-500 animate-pulse' : ''} />
                </div>
                <div className="text-left font-sans">
                  <span className="text-lg font-bold block leading-tight">Hard Mode</span>
                  <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block mt-1">Rotators & Teleporters Active</span>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${hardModeOn ? 'bg-red-500' : 'bg-white/10'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hardModeOn ? 'translate-x-6' : ''}`} />
            </div>
          </motion.button>
        </div>

        <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5 p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/30">Music Library</h3>
          
          {musicOn && (
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
              <Volume2 size={16} className="text-white/40" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'calm', name: 'Calm', icon: Moon, color: 'text-indigo-400' },
              { id: 'upbeat', name: 'Upbeat', icon: Zap, color: 'text-yellow-400' },
              { id: 'lofi', name: 'Lo-Fi', icon: Wind, color: 'text-orange-400' },
              { id: 'nature', name: 'Nature', icon: Leaf, color: 'text-green-400' },
              { id: 'retro', name: 'Retro', icon: Zap, color: 'text-purple-400' },
              { id: 'jazz', name: 'Jazz', icon: Music2, color: 'text-pink-400' },
              { id: 'ambient', name: 'Ambient', icon: Cloud, color: 'text-blue-300' },
              { id: 'deep', name: 'Deep', icon: Layers, color: 'text-slate-400' },
              { id: 'pulse', name: 'Pulse', icon: Activity, color: 'text-red-400' },
              { id: 'ethereal', name: 'Ethereal', icon: Sun, color: 'text-cyan-300' },
            ].map(style => (
              <motion.button
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectMusicStyle(style.id as MusicStyle)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  musicStyle === style.id 
                    ? 'bg-white text-black border-white shadow-lg shadow-white/20' 
                    : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className={`p-2 rounded-xl ${musicStyle === style.id ? 'bg-black/5' : 'bg-white/5'}`}>
                  <style.icon size={18} className={musicStyle === style.id ? 'text-black' : style.color} />
                </div>
                <span className="font-bold text-sm tracking-tight">{style.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5 p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/30">Accent Color</h3>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => onSelectAccentColor(color.id)}
                className={`w-10 h-10 rounded-full border-2 transition-all relative ${
                  accentColor === color.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
                style={{ backgroundColor: color.color }}
              >
                {accentColor === color.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5 p-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/30">Color Palette</h3>
          <div className="grid grid-cols-1 gap-3">
            {PALETTES.map(palette => (
              <button
                key={palette.name}
                onClick={() => onSelectPalette(palette.colors)}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                  JSON.stringify(preferredPalette) === JSON.stringify(palette.colors) 
                    ? 'bg-white text-black border-white shadow-lg' 
                    : 'bg-white/5 border-transparent text-white/60 hover:border-white/20'
                }`}
              >
                <span className="font-bold text-sm tracking-tight">{palette.name}</span>
                <div className="flex gap-1">
                  {palette.colors.slice(0, 5).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-[40px] overflow-hidden border border-white/10 p-8 space-y-6 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Sparkles size={48} />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-2xl">
              <Palette className="text-accent" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white">Visual Themes</h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Transform your world</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {THEMES.map(theme => (
              <motion.button
                key={theme}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectTheme(theme)}
                className={`group relative flex flex-col items-center gap-3 p-1 rounded-3xl border-2 transition-all overflow-hidden ${
                  preferredTheme === theme 
                    ? 'border-white bg-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                    : 'border-transparent bg-white/5 grayscale hover:grayscale-0'
                }`}
              >
                <div className={`w-full aspect-square rounded-[1.25rem] bg-gradient-to-br ${getThemeGradient(theme)} shadow-inner flex items-center justify-center relative overflow-hidden`}>
                  {preferredTheme === theme && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="py-2 px-3 w-full flex items-center justify-between">
                  <span className={`capitalize font-black italic text-[11px] tracking-tight ${preferredTheme === theme ? 'text-white' : 'text-white/40'}`}>
                    {theme}
                  </span>
                  {preferredTheme === theme && (
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', x: 4 }}
            onClick={onHowToPlay}
            className="w-full flex items-center gap-4 p-6 transition-colors"
          >
            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400">
                <HelpCircle size={24} />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-lg font-bold">How to Play</span>
              <span className="text-xs text-white/40">Learn the interactive basics of routing colors!</span>
            </div>
          </motion.button>

          <div className="h-[1px] bg-white/5 mx-6" />

          {shareToast && (
            <div className="bg-indigo-500/25 text-indigo-200 text-xs text-center py-2 px-4 border-b border-indigo-500/10">
              {shareToast}
            </div>
          )}
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', x: 4 }}
            onClick={handleShare}
            className="w-full flex items-center gap-4 p-6 transition-colors"
          >
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-500">
                <Share2 size={24} />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-lg font-bold">Share App</span>
              <span className="text-xs text-white/40">Invite your friends to play!</span>
            </div>
          </motion.button>
          
          <div className="h-[1px] bg-white/5 mx-6" />

          {rateToast && (
            <div className="bg-yellow-500/25 text-yellow-200 text-xs text-center py-2 px-4 border-b border-yellow-500/10">
              {rateToast}
            </div>
          )}
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', x: 4 }}
            onClick={handleRateUs}
            className="w-full flex items-center gap-4 p-6 transition-colors"
          >
            <div className="p-3 rounded-2xl bg-yellow-500/20 text-yellow-500">
                <Star size={24} />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-lg font-bold">Rate Us</span>
              <span className="text-xs text-white/40">Submit feedback or rate 5 stars!</span>
            </div>
          </motion.button>

          <div className="h-[1px] bg-white/5 mx-6" />

          <button 
            onClick={() => {
              if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                onResetProgress?.();
              }
            }}
            className="w-full flex items-center gap-4 p-6 hover:bg-red-500/10 transition-colors text-red-500"
          >
            <div className="p-3 rounded-2xl bg-red-500/10">
                <Music size={24} className="rotate-45" />
            </div>
            <span className="text-lg font-bold">Reset All Progress</span>
          </button>
        </div>

        <div className="pt-12 pb-20 text-center text-white/20">
            <p className="text-xs font-black uppercase tracking-[0.5em]">ColorFlow Pro</p>
            <p className="text-[10px] mt-2 font-bold mb-4">VERSION 1.8.0</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Check for Updates
            </button>
        </div>
      </main>
    </div>
  );
};
