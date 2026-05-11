
import React, { useState } from 'react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: (username: string, avatarEmoji: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😀');
  const avatars = ['😀', '😎', '🤩', '🥳', '😺', '🦊', '🐸', '🦄', '🎮', '🚀', '⭐', '🔥'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim(), selectedAvatar);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col items-center justify-center p-8 text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black italic tracking-tighter">🎨 ColorFlow</h1>
          <p className="text-white/50 text-sm mt-2 font-bold uppercase tracking-widest">Create your profile</p>
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
            disabled={!username.trim()}
            className="w-full bg-accent text-black py-5 rounded-2xl font-black italic tracking-widest disabled:opacity-50 disabled:grayscale transition-all"
          >
            START PLAYING
          </motion.button>

          <button
            type="button"
            onClick={() => onLogin('Player', '😀')}
            className="w-full text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white/50 transition-colors"
          >
            Skip for now
          </button>
        </form>
      </motion.div>
    </div>
  );
};
