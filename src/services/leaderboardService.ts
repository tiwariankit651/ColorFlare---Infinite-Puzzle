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
  getDocsFromServer,
  where,
  getCountFromServer
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
  rank?: number;
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
        const existingData = allTimeDoc.exists() ? allTimeDoc.data() as LeaderboardEntry & { lastProfileUpdate?: any } : null;

        const existingStars = isNaN(Number(existingData?.totalStars)) ? 0 : Number(existingData?.totalStars);
        const existingLevel = isNaN(Number(existingData?.currentLevel)) ? 1 : Number(existingData?.currentLevel);
        const existingDaily = isNaN(Number(existingData?.dailyChallenges)) ? 0 : Number(existingData?.dailyChallenges);

        // Anti-Cheat: Maximum stars per level is 3 (plus daily challenges, achievements, and daily login rewards)
        const maxLevelsStars = safeInputLevel * 3;
        const maxDailyStars = safeInputDaily * 10; // Allow generous estimate per daily challenge including possible bonus
        const maxAchievementStars = 500; // Sum of all achievement reward stars is ~475
        const loginRewardBuffer = 1000; // Buffer for daily login rewards claimed over time
        const maxPossibleStars = maxLevelsStars + maxDailyStars + maxAchievementStars + loginRewardBuffer;

        if (safeInputStars > maxPossibleStars) {
          console.warn(`Anti-Cheat: Rejecting score sync because stars (${safeInputStars}) exceed max possible (${maxPossibleStars}).`);
          return;
        }

        // Anti-Cheat: Level number can only increase by a reasonable jump (e.g., 50 levels max jump to allow bulk offline sync, or if existingLevel is 1/empty)
        if (existingData && existingLevel > 1 && safeInputLevel > existingLevel + 50) {
          console.warn("Anti-Cheat: Rejecting level jump.");
          return;
        }

        // Anti-Cheat: Daily challenges completed check (allow reasonable bulk offline sync of up to 10 completed)
        if (existingData && safeInputDaily > existingDaily + 10) {
          console.warn("Anti-Cheat: Rejecting daily challenge jump.");
          return;
        }

        // Anti-Cheat: Timestamp validation (minimum 1 second between level increases to prevent instant level-skip hacks)
        if (existingData && existingData.updatedAt && safeInputLevel > existingLevel) {
          const lastUpdate = existingData.updatedAt.toDate ? existingData.updatedAt.toDate() : new Date(existingData.updatedAt);
          const timeDiffSeconds = (Date.now() - lastUpdate.getTime()) / 1000;
          if (timeDiffSeconds < 1) {
            console.warn("Anti-Cheat: Rejecting fast level solve.");
            return;
          }
        }

        // Anti-Cheat: Username/avatar changes limited to once per hour
        let finalUsername = username || existingData?.username || 'Anonymous Player';
        let finalAvatarEmoji = avatarEmoji || existingData?.avatarEmoji || '🎮';
        let isProfileChanging = false;
        
        if (existingData) {
          const hasUsernameChanged = username && existingData.username && username !== existingData.username;
          const hasAvatarChanged = avatarEmoji && existingData.avatarEmoji && avatarEmoji !== existingData.avatarEmoji;
          if (hasUsernameChanged || hasAvatarChanged) {
            isProfileChanging = true;
            if (existingData.lastProfileUpdate) {
              const lastProfileUpdate = existingData.lastProfileUpdate.toDate ? existingData.lastProfileUpdate.toDate() : new Date(existingData.lastProfileUpdate);
              const hoursSinceLastUpdate = (Date.now() - lastProfileUpdate.getTime()) / (1000 * 60 * 60);
              if (hoursSinceLastUpdate < 1) {
                console.warn("Anti-Cheat: Username/avatar change limited to once per hour. Reverting to previous profile.");
                finalUsername = existingData.username;
                finalAvatarEmoji = existingData.avatarEmoji;
                isProfileChanging = false;
              }
            }
          }
        }

        // ONLY update if values are actually higher OR if they are basic info (username/emoji)
        // This prevents race conditions from multiple devices downgrading scores
        const finalStars = Math.max(safeInputStars, existingStars);
        const finalLevel = Math.max(safeInputLevel, existingLevel);
        const finalDaily = Math.max(safeInputDaily, existingDaily);

        const updatePayload = {
          userId,
          username: finalUsername,
          avatarEmoji: finalAvatarEmoji,
          totalStars: finalStars,
          currentLevel: finalLevel,
          dailyChallenges: finalDaily,
          updatedAt: serverTimestamp(),
          lastProfileUpdate: isProfileChanging ? serverTimestamp() : (existingData?.lastProfileUpdate || null)
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

  async getUserRank(category: LeaderboardCategory, timeframe: LeaderboardTimeframe, userId: string, userScore: number): Promise<number> {
    const dailyKey = this.getDailyKey();
    const weeklyKey = this.getWeeklyKey();
    let collectionName = 'leaderboard';
    if (timeframe === 'daily') collectionName = `leaderboard_daily_${dailyKey}`;
    if (timeframe === 'weekly') collectionName = `leaderboard_weekly_${weeklyKey}`;

    const fieldMap: Record<LeaderboardCategory, string> = {
      stars: 'totalStars',
      level: 'currentLevel',
      daily: 'dailyChallenges'
    };

    const targetField = fieldMap[category];

    try {
      const q = query(
        collection(db, collectionName),
        where(targetField, '>', userScore)
      );
      const countSnap = await getCountFromServer(q);
      return countSnap.data().count + 1;
    } catch (e) {
      console.error("Failed to calculate user rank via count:", e);
      return 0;
    }
  },

  async submitTournamentScore(username: string, avatarEmoji: string, score: number, timeSpent: number, movesCount: number, levelsCompleted: number = 3) {
    if (authReady) await authReady;
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const weeklyKey = this.getWeeklyKey();
    const collectionName = `leaderboard_tournament_${weeklyKey}`;

    // Anti-Cheat for Weekly Tournament Score
    const maxWeeklyScore = 1750; // 7 days * 250 max daily score
    if (score > maxWeeklyScore) {
      console.warn("Anti-Cheat: Rejecting tournament weekly score exceeding maximum allowed points.");
      return;
    }
    if (levelsCompleted > 49) { // 7 days * 7 levels
      console.warn("Anti-Cheat: Rejecting tournament levels completed exceeding maximum allowed.");
      return;
    }
    if (levelsCompleted > 0 && movesCount < levelsCompleted) {
      console.warn("Anti-Cheat: Rejecting tournament moves fewer than levels completed.");
      return;
    }
    if (levelsCompleted > 0 && timeSpent < levelsCompleted * 0.5) {
      console.warn("Anti-Cheat: Rejecting physically impossible completion speed in tournament.");
      return;
    }

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

    // Anti-Cheat for Tournament Daily Score
    const maxDailyScore = 250; // Max points across 7 tournament levels (10+15+25+30+45+50+75)
    if (dailyScore > maxDailyScore) {
      console.warn("Anti-Cheat: Rejecting tournament daily score exceeding maximum allowed points.");
      return;
    }
    if (dailyLevels > 7) {
      console.warn("Anti-Cheat: Rejecting tournament daily completion exceeding 7 levels.");
      return;
    }
    if (dailyLevels > 0 && dailyMoves < dailyLevels) {
      console.warn("Anti-Cheat: Rejecting tournament run with fewer moves than levels completed.");
      return;
    }
    if (dailyLevels > 0 && dailyTime < dailyLevels * 0.5) {
      console.warn("Anti-Cheat: Rejecting physically impossible completion speed in tournament.");
      return;
    }

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
