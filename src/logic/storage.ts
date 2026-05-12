
import { ThemeName, MusicStyle, AccentColor } from '../types';

const STORAGE_KEY = 'colorflow_storage';

interface StorageData {
  level: number;
  stars: number;
  bestLevel: number;
  soundOn: boolean;
  musicOn: boolean;
  totalGamesPlayed: number;
  totalMoves: number;
  totalTimeSeconds: number;
  threeStarLevels: number;
  longestWinStreak: number;
  dailyChallengesCompleted: number;
  hintsUsed: number;
  hintsRemaining: number;
  achievements: string[];
  lastDailyVisit?: string;
  dailyStreak: number;
  levelStars: Record<number, number>;
  username: string;
  avatarEmoji: string;
  theme?: ThemeName;
  palette?: string[];
  musicStyle: MusicStyle;
  accentColor: AccentColor;
  volume: number;
}

const DEFAULT_DATA: StorageData = {
  level: 1,
  stars: 0,
  bestLevel: 1,
  soundOn: true,
  musicOn: true,
  totalGamesPlayed: 0,
  totalMoves: 0,
  totalTimeSeconds: 0,
  threeStarLevels: 0,
  longestWinStreak: 0,
  dailyChallengesCompleted: 0,
  hintsUsed: 0,
  hintsRemaining: 3,
  achievements: [],
  dailyStreak: 0,
  levelStars: {},
  username: '',
  avatarEmoji: '😀',
  musicStyle: 'calm',
  accentColor: 'green',
  volume: 0.5
};

export const GameStorage = {
  getData(): StorageData {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_DATA;
    try {
      return { ...DEFAULT_DATA, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_DATA;
    }
  },

  saveData(data: Partial<StorageData>) {
    const current = this.getData();
    const next = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
