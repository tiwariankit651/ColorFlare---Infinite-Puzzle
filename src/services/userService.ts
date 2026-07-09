import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { StorageData } from '../logic/storage';

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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeData(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }
  
  // Safeguard: Only sanitize plain objects. Leave classes (FieldValue, Timestamp, etc.) as-is.
  const isPlain = !obj.constructor || obj.constructor === Object;
  if (!isPlain) {
    return obj;
  }

  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = sanitizeData(val);
    }
  }
  return clean;
}

export const UserService = {
  async saveProgress(data: StorageData) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const path = `users/${userId}`;
    
    try {
      const sanitized = sanitizeData({
        ...data,
        uid: userId,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'users', userId), sanitized, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async loadProgress(): Promise<Partial<StorageData> | null> {
    if (!auth.currentUser) return null;
    const userId = auth.currentUser.uid;
    const path = `users/${userId}`;
    
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return snap.data() as StorageData;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
    return null;
  }
};
