import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  updateDoc
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
  
  // Explicitly log the index link if it exists in the message
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
  updatedAt: any;
}

export const LeaderboardService = {
  async submitScore(username: string, avatarEmoji: string, totalStars: number, currentLevel: number) {
    if (authReady) await authReady;
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const path = `leaderboard/${userId}`;

    try {
      await setDoc(doc(db, 'leaderboard', userId), {
        userId,
        username: username || 'Anonymous Player',
        avatarEmoji: avatarEmoji || '🎮',
        totalStars,
        currentLevel,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also update user profile
      await setDoc(doc(db, 'users', userId), {
        username: username || 'Anonymous Player',
        avatarEmoji: avatarEmoji || '🎮',
        lastActive: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getGlobalLeaderboard(limitCount = 20) {
    const path = 'leaderboard';
    try {
      const q = query(
        collection(db, 'leaderboard'), 
        orderBy('totalStars', 'desc'),
        orderBy('currentLevel', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
};
