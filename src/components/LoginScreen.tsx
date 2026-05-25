
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginScreenProps {
  onLogin: (username: string, avatarEmoji: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('😀');
  const avatars = ['😀', '😎', '🤩', '🥳', '😺', '🦊', '🐸', '🦄', '🎮', '🚀', '⭐', '🔥'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim(), selectedAvatar);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onLogin(result.user.displayName || 'Player', '🎮');
      }
    } catch (e) {
      console.error("Google Login failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col items-center justify-center p-8 text-white overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm py-8"
      >
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl font-black italic tracking-tighter">🎨 ColorFlow</h1>
          <p className="text-white/50 text-sm mt-2 font-bold uppercase tracking-widest">Create your profile</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 mb-8 shadow-xl transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {isLoading ? 'Connecting...' : 'Sign in with Google'}
        </motion.button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">or regular profile</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <div className="mb-8">
          <label className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 block">Choose Avatar:</label>
          <div className="grid grid-cols-6 gap-3">
            {avatars.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedAvatar(emoji)}
                className={`aspect-square flex items-center justify-center text-2xl rounded-2xl transition-colors ${
                  selectedAvatar === emoji ? 'bg-accent' : 'bg-white/5'
                }`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              {selectedAvatar}
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border-none rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 focus:ring-2 focus:ring-accent focus:outline-none font-bold"
              autoFocus
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!username.trim() || isLoading}
            className="w-full bg-accent text-black py-5 rounded-2xl font-black italic tracking-widest disabled:opacity-50 disabled:grayscale transition-all"
          >
            START PLAYING
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLogin('Player', '😀')}
            className="w-full text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white/50 transition-colors"
          >
            Skip for now
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
