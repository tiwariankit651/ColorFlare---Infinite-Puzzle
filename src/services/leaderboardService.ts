import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  runTransaction,
  getDocsFromServer
} from 'firebase/firestore';
import { auth, db, authReady } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('https://console.firebase.google.com')) {
    console.error("🔥 INDEX NEEDED! Click this link to fix the leaderboard: ", errorMessage);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarEmoji: string;
  totalStars: number;
  currentLevel: number;
  dailyChallenges?: number;
  reactions?: Record<string, number>;
  updatedAt: any;
}

export type LeaderboardCategory = 'stars' | 'level' | 'daily';
export type LeaderboardTimeframe = 'daily' | 'weekly' | 'all';

export const LeaderboardService = {
  getDailyKey() {
    return new Date().toISOString().split('T')[0];
  },

  getWeeklyKey() {
    const d = new Date();
    // Monday as start of week, using UTC for consistency
    const day = d.getUTCDay() || 7; // Sunday (0) becomes 7
    const date = d.getUTCDate();
    const diff = date - day + 1; // 1 = Monday
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return `w_${d.toISOString().split('T')[0]}`;
  },

  async submitScore(username: string, avatarEmoji: string, totalStars: number, currentLevel: number, dailyChallenges: number = 0) {
    if (authReady) await authReady;
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    // Strict sanitization of input values to prevent NaN propagation
    const safeInputStars = isNaN(Number(totalStars)) ? 0 : Math.max(0, Number(totalStars));
    const safeInputLevel = isNaN(Number(currentLevel)) ? 1 : Math.max(1, Number(currentLevel));
    const safeInputDaily = isNaN(Number(dailyChallenges)) ? 0 : Math.max(0, Number(dailyChallenges));

    try {
      await runTransaction(db, async (transaction) => {
        const dailyKey = this.getDailyKey();
        const weeklyKey = this.getWeeklyKey();
        
        const allTimeRef = doc(db, 'leaderboard', userId);
        const dailyRef = doc(db, `leaderboard_daily_${dailyKey}`, userId);
        const weeklyRef = doc(db, `leaderboard_weekly_${weeklyKey}`, userId);
        const userRef = doc(db, 'users', userId);

        const allTimeDoc = await transaction.get(allTimeRef);
        const existingData = allTimeDoc.exists() ? allTimeDoc.data() as LeaderboardEntry : null;

        const existingStars = isNaN(Number(existingData?.totalStars)) ? 0 : Number(existingData?.totalStars);
        const existingLevel = isNaN(Number(existingData?.currentLevel)) ? 1 : Number(existingData?.currentLevel);
        const existingDaily = isNaN(Number(existingData?.dailyChallenges)) ? 0 : Number(existingData?.dailyChallenges);

        // ONLY update if values are actually higher OR if they are basic info (username/emoji)
        // This prevents race conditions from multiple devices downgrading scores
        const finalStars = Math.max(safeInputStars, existingStars);
        const finalLevel = Math.max(safeInputLevel, existingLevel);
        const finalDaily = Math.max(safeInputDaily, existingDaily);

        const updatePayload = {
          userId,
          username: username || existingData?.username || 'Anonymous Player',
          avatarEmoji: avatarEmoji || existingData?.avatarEmoji || '🎮',
          totalStars: finalStars,
          currentLevel: finalLevel,
          dailyChallenges: finalDaily,
          updatedAt: serverTimestamp()
        };

        transaction.set(allTimeRef, updatePayload, { merge: true });
        transaction.set(dailyRef, updatePayload, { merge: true });
        transaction.set(weeklyRef, updatePayload, { merge: true });
        transaction.set(userRef, {
          uid: userId,
          username: updatePayload.username,
          avatarEmoji: updatePayload.avatarEmoji,
          lastActive: serverTimestamp()
        }, { merge: true });
      });

      console.log(`Success: Score synced for ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leaderboard-transaction/${userId}`);
    }
  },

  async getLeaderboard(category: LeaderboardCategory = 'stars', timeframe: LeaderboardTimeframe = 'all', limitCount = 50) {
    let collectionName = 'leaderboard';
    if (timeframe === 'daily') collectionName = `leaderboard_daily_${this.getDailyKey()}`;
    if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${this.getWeeklyKey()}`;

    const fieldMap: Record<LeaderboardCategory, string> = {
      stars: 'totalStars',
      level: 'currentLevel',
      daily: 'dailyChallenges'
    };

    const sanitizeDocs = (docs: any[]): LeaderboardEntry[] => {
      return docs.map(d => {
        const rawData = d.data();
        const uid = d.id;
        
        let currentLevel = Number(rawData.currentLevel);
        if (isNaN(currentLevel) || currentLevel < 1) {
          currentLevel = 1;
        }

        let totalStars = Number(rawData.totalStars);
        if (isNaN(totalStars) || totalStars < 0) {
          // A friendly fallback: approximate based on completed levels (averaging 2.5 stars per level)
          totalStars = Math.max(0, Math.round((currentLevel - 1) * 2.5));
        }
        
        let dailyChallenges = Number(rawData.dailyChallenges);
        if (isNaN(dailyChallenges) || dailyChallenges < 0) {
          dailyChallenges = 0;
        }

        return {
          ...rawData,
          userId: uid,
          username: rawData.username || 'Anonymous Player',
          avatarEmoji: rawData.avatarEmoji || '🎮',
          totalStars,
          currentLevel,
          dailyChallenges
        } as LeaderboardEntry;
      });
    };

    let rawEntries: LeaderboardEntry[] = [];
    try {
      const q = query(
        collection(db, collectionName), 
        orderBy(fieldMap[category], 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocsFromServer(q);
      
      if (snapshot.empty && timeframe !== 'all') {
        const cachedSnapshot = await getDocs(q);
        rawEntries = sanitizeDocs(cachedSnapshot.docs);
      } else {
        rawEntries = sanitizeDocs(snapshot.docs);
      }
    } catch (error) {
      console.warn("Server fetch failed, falling back to cache", error);
      try {
        const q = query(
          collection(db, collectionName), 
          orderBy(fieldMap[category], 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        rawEntries = sanitizeDocs(snapshot.docs);
      } catch (innerError) {
        rawEntries = [];
      }
    }

    // Filter out mock/bot players to keep standard gameplay 100% authentic and separate from Weekend Arena!
    const realEntries = rawEntries.filter(entry => !entry.userId.startsWith('bot_'));

    const sortField = fieldMap[category] as keyof LeaderboardEntry;
    realEntries.sort((a, b) => {
      const valA = (a[sortField] as number) || 0;
      const valB = (b[sortField] as number) || 0;
      return valB - valA;
    });

    return realEntries.slice(0, limitCount);
  },

  async submitTournamentScore(username: string, avatarEmoji: string, score: number, timeSpent: number, movesCount: number, levelsCompleted: number = 3) {
    if (authReady) await authReady;
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const weeklyKey = this.getWeeklyKey();
    const collectionName = `leaderboard_tournament_${weeklyKey}`;

    try {
      const docRef = doc(db, collectionName, userId);
      const payload = {
        userId,
        username: username || 'Anonymous Flow',
        avatarEmoji: avatarEmoji || '🎮',
        score,
        time: timeSpent,
        moves: movesCount,
        levelsCompleted,
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, payload, { merge: true });
      console.log(`Tournament score submitted for ${userId}:`, payload);
    } catch (e) {
      console.error("Failed to submit tournament score:", e);
    }
  },

  getPreviousWeeklyKey() {
    const d = new Date();
    const day = d.getUTCDay() || 7; // Sunday is 7, Monday is 1
    const date = d.getUTCDate();
    const diff = date - day + 1 - 7; // Get Monday of previous week
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return `w_${d.toISOString().split('T')[0]}`;
  },

  async submitTournamentDailyScore(
    username: string, 
    avatarEmoji: string, 
    dayIndex: number, 
    dailyScore: number, 
    dailyTime: number, 
    dailyMoves: number, 
    dailyLevels: number
  ) {
    if (authReady) await authReady;
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const weeklyKey = this.getWeeklyKey();
    const collectionName = `leaderboard_tournament_${weeklyKey}`;
    const docRef = doc(db, collectionName, userId);

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        let runs: Record<string, any> = {};
        let existingDocData: any = {};
        
        if (snap.exists()) {
          existingDocData = snap.data();
          runs = existingDocData.runs || {};
        }

        const runKey = `day_${dayIndex}`;
        const existingRun = runs[runKey];

        let shouldUpdateRun = false;
        if (!existingRun) {
          shouldUpdateRun = true;
        } else {
          if (dailyScore > existingRun.score) {
            shouldUpdateRun = true;
          } else if (dailyScore === existingRun.score) {
            if (dailyMoves < existingRun.moves) {
              shouldUpdateRun = true;
            } else if (dailyMoves === existingRun.moves) {
              if (dailyTime < existingRun.time) {
                shouldUpdateRun = true;
              }
            }
          }
        }

        if (shouldUpdateRun) {
          runs[runKey] = {
            score: dailyScore,
            time: dailyTime,
            moves: dailyMoves,
            levelsCompleted: dailyLevels,
            updatedAt: Date.now()
          };
        }

        let totalScore = 0;
        let totalTime = 0;
        let totalMoves = 0;
        let totalLevels = 0;

        Object.keys(runs).forEach(k => {
          const r = runs[k];
          totalScore += r.score || 0;
          totalTime += r.time || 0;
          totalMoves += r.moves || 0;
          totalLevels += r.levelsCompleted || 0;
        });

        const payload = {
          userId,
          username: username || existingDocData.username || 'Anonymous Flow',
          avatarEmoji: avatarEmoji || existingDocData.avatarEmoji || '🎮',
          runs,
          score: totalScore,
          time: totalTime,
          moves: totalMoves,
          levelsCompleted: totalLevels,
          updatedAt: serverTimestamp()
        };

        transaction.set(docRef, payload, { merge: true });
        console.log(`Tournament daily score submitted/updated in transaction for Day ${dayIndex}:`, payload);
      });
    } catch (e) {
      console.error("Failed to submit tournament daily score transaction:", e);
    }
  },

  async getPreviousTournamentLeaderboard(limitCount = 15) {
    const prevWeeklyKey = this.getPreviousWeeklyKey();
    const collectionName = `leaderboard_tournament_${prevWeeklyKey}`;
    
    let rawEntries: any[] = [];
    try {
      const q = query(
        collection(db, collectionName), 
        orderBy('score', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocsFromServer(q);
      
      if (snapshot.empty) {
        const cachedSnapshot = await getDocs(q);
        rawEntries = cachedSnapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      } else {
        rawEntries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      }
    } catch (error) {
      console.warn("Previous tournament fetch from server failed, falling back to cache", error);
      try {
        const q = query(
          collection(db, collectionName), 
          orderBy('score', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        rawEntries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      } catch (innerError) {
        rawEntries = [];
      }
    }

    const merged = [...rawEntries];

    merged.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.moves !== b.moves) {
        return a.moves - b.moves;
      }
      return a.time - b.time;
    });
    return merged.slice(0, limitCount);
  },

  async getTournamentLeaderboard(limitCount = 15) {
    const weeklyKey = this.getWeeklyKey();
    const collectionName = `leaderboard_tournament_${weeklyKey}`;
    
    let rawEntries: any[] = [];
    try {
      const q = query(
        collection(db, collectionName), 
        orderBy('score', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocsFromServer(q);
      
      if (snapshot.empty) {
        const cachedSnapshot = await getDocs(q);
        rawEntries = cachedSnapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      } else {
        rawEntries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      }
    } catch (error) {
      console.warn("Tournament fetch from server failed, falling back to cache", error);
      try {
        const q = query(
          collection(db, collectionName), 
          orderBy('score', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        rawEntries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as any));
      } catch (innerError) {
        rawEntries = [];
      }
    }

    const merged = [...rawEntries];

    merged.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.moves !== b.moves) {
        return a.moves - b.moves;
      }
      return a.time - b.time;
    });
    return merged.slice(0, limitCount);
  },

  async addReaction(userId: string, emoji: string, timeframe: LeaderboardTimeframe = 'all') {
    if (!auth.currentUser) return;
    const dailyKey = this.getDailyKey();
    const weeklyKey = this.getWeeklyKey();
    
    let collectionName = 'leaderboard';
    if (timeframe === 'daily') collectionName = `leaderboard_daily_${dailyKey}`;
    if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${weeklyKey}`;

    const docRef = doc(db, collectionName, userId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        const reactions = data.reactions || {};
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        
        transaction.update(docRef, { reactions });
      });
    } catch (error) {
       console.error("Reaction failed:", error);
    }
  }
};
