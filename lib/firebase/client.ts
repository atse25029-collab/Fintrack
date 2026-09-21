import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getFirebaseConfig, isFirebaseConfigured } from './config';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  if (!firebaseApp) {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
    } else {
      const config = getFirebaseConfig();
      try {
        firebaseApp = initializeApp(config);
      } catch (err) {
        console.warn('[Firebase] Initialization error:', err);
        return null;
      }
    }
  }
  return firebaseApp;
}

export function getFirestoreDb(): Firestore | null {
  if (typeof window === 'undefined') return null;

  if (!firestoreDb) {
    const app = getFirebaseApp();
    if (!app) return null;

    try {
      // Enable IndexedDB offline persistence with multi-tab support
      firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback if already initialized
      try {
        firestoreDb = getFirestore(app);
      } catch (err) {
        console.warn('[Firebase] Firestore initialization fallback error:', err);
        return null;
      }
    }
  }
  return firestoreDb;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null;

  if (!firebaseAuth) {
    const app = getFirebaseApp();
    if (!app) return null;
    try {
      firebaseAuth = getAuth(app);
    } catch (err) {
      console.warn('[Firebase] Auth initialization error:', err);
      return null;
    }
  }
  return firebaseAuth;
}

export { isFirebaseConfigured };
