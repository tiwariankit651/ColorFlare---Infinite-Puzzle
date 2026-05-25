
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface GlobalEvent {
  id: string;
  title: string;
  description: string;
  startDate: any;
  endDate: any;
  levelIds: number[];
  bannerUrl?: string;
  rewardBadge?: string;
  participantsCount: number;
}

export const GlobalEventService = {
  async getActiveEvent(): Promise<GlobalEvent | null> {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'global_events'),
        where('endDate', '>', now)
      );
      
      const snap = await getDocs(q);
      if (snap.empty) return null;
      
      // Return the one that has started
      const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalEvent));
      return events.find(e => e.startDate.toDate() <= now) || null;
    } catch (e) {
      console.error("Failed to fetch global event", e);
      return null;
    }
  },

  async joinEvent(eventId: string) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    try {
      await setDoc(doc(db, `global_events/${eventId}/participants`, userId), {
        userId,
        joinedAt: serverTimestamp(),
        scores: {}
      }, { merge: true });
      
      // Increment participant count
      const eventRef = doc(db, 'global_events', eventId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (snap.exists()) {
          transaction.update(eventRef, { 
            participantsCount: (snap.data().participantsCount || 0) + 1 
          });
        }
      });
    } catch (e) {
      console.error("Failed to join event", e);
    }
  }
};
