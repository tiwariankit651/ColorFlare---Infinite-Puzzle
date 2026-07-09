import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export let authReady: Promise<void>;

// Test connection and auto-sign in anonymously for leaderboard
async function initFirebase() {
  try {
    const signIn = async () => {
      try {
        if (!auth.currentUser) {
          console.log("Attempting anonymous sign-in...");
          await signInAnonymously(auth);
          console.log("Anonymous sign-in successful:", auth.currentUser?.uid);
        }
      } catch (err: any) {
        console.warn("Firebase Auth Error:", err.code, err.message);
        if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
          console.warn("ACTION REQUIRED: Please enable 'Anonymous' Sign-in provider in your Firebase Console (Authentication > Sign-in method).");
        }
      }
    };
    
    authReady = signIn();
    await authReady;
    
    // Connectivity check (silent)
    getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    
    console.log("Firebase initialized");
  } catch (error) {
    console.warn("Firebase initialization skipped or failed:", error);
  }
}

initFirebase();
