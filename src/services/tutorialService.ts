import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const markTutorialComplete = async () => {
  localStorage.setItem('colorflow_tutorial_v2', 'done');
  sessionStorage.setItem('colorflow_tutorial_v2', 'done');
  
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        tutorialCompleted: true
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to update tutorialCompleted in Firestore:", e);
    }
  }
};

export const hasTutorialBeenCompleted = async (): Promise<boolean> => {
  // Check localStorage first (fastest)
  if (localStorage.getItem('colorflow_tutorial_v2') === 'done') return true;
  if (sessionStorage.getItem('colorflow_tutorial_v2') === 'done') return true;
  
  // Check Firebase if logged in
  if (auth.currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data()?.tutorialCompleted) {
        // Restore local storage markers
        localStorage.setItem('colorflow_tutorial_v2', 'done');
        sessionStorage.setItem('colorflow_tutorial_v2', 'done');
        return true;
      }
    } catch (e) {
      console.warn("Failed to fetch tutorialCompleted from Firestore:", e);
    }
  }
  
  // Check if user is past level 1 (they obviously know how to play)
  const savedLevel = localStorage.getItem('colorflow_level');
  if (savedLevel && parseInt(savedLevel, 10) > 1) {
    localStorage.setItem('colorflow_tutorial_v2', 'done');
    sessionStorage.setItem('colorflow_tutorial_v2', 'done');
    return true;
  }

  // Check from storage data too
  try {
    const savedStorage = localStorage.getItem('colorflow_storage');
    if (savedStorage) {
      const parsed = JSON.parse(savedStorage);
      if (parsed.level > 1 || parsed.bestLevel > 1) {
        localStorage.setItem('colorflow_tutorial_v2', 'done');
        sessionStorage.setItem('colorflow_tutorial_v2', 'done');
        return true;
      }
    }
  } catch (e) {
    // Ignore parsing issues
  }
  
  return false;
};
