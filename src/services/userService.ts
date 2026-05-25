import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { StorageData } from '../logic/storage';

export const UserService = {
  async saveProgress(data: StorageData) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    try {
      await setDoc(doc(db, 'users', userId), {
        ...data,
        uid: userId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Cloud save failed:", e);
    }
  },

  async loadProgress(): Promise<Partial<StorageData> | null> {
    if (!auth.currentUser) return null;
    const userId = auth.currentUser.uid;
    
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return snap.data() as StorageData;
      }
    } catch (e) {
      console.error("Cloud load failed:", e);
    }
    return null;
  }
};
