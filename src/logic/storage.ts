
import { ThemeName, MusicStyle, AccentColor } from '../types';

const STORAGE_KEY = 'colorflow_storage';

export interface StorageData {
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
  lastDailyChallengeDate?: string;
  dailyStreak: number;
  streakDays: number;
  lastClaimedRewardDate?: string;
  totalPathsCreated: number;
  fastestLevelTimes: Record<number, number>;
  themeUsage: Record<string, number>;
  levelStars: Record<number, number>;
  username: string;
  avatarEmoji: string;
  theme?: ThemeName;
  palette?: string[];
  musicStyle: MusicStyle;
  accentColor: AccentColor;
  volume: number;
  tournamentRank?: number;
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
  hintsRemaining: 0,
  achievements: [],
  dailyStreak: 0,
  streakDays: 0,
  totalPathsCreated: 0,
  fastestLevelTimes: {},
  themeUsage: {},
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
      const parsed = JSON.parse(saved);
      // Ensure we merge with defaults to handle new fields added in updates
      return { ...DEFAULT_DATA, ...parsed };
    } catch (e) {
      console.error("Failed to load game data", e);
      return DEFAULT_DATA;
    }
  },

  saveData(data: StorageData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Log to console for verification during development if needed
      // console.log("Progress Saved:", data.level, "Stars:", data.stars);
    } catch (e) {
      console.error("Failed to save game data", e);
    }
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
