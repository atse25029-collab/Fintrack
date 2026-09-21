import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './client';

export interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
}

export async function loginWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  return credential.user;
}

export async function loginAnonymously(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');

  const credential = await signInAnonymously(auth);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  return credential.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  return credential.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    if (user?.uid && typeof window !== 'undefined') {
      localStorage.setItem('fintrack_firebase_uid', user.uid);
    }
    callback(user);
  });
}

export function getCurrentFirebaseUser(): User | null {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser || null;
  if (user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', user.uid);
  }
  return user;
}

/**
 * Returns the currently active Firebase user or initializes an anonymous user session.
 * Uses cached credentials if available.
 */
export async function getOrInitFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fintrack_firebase_uid', auth.currentUser.uid);
    }
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (resolved) return;
      if (user) {
        resolved = true;
        unsubscribe();
        if (typeof window !== 'undefined') {
          localStorage.setItem('fintrack_firebase_uid', user.uid);
        }
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolved = true;
          unsubscribe();
          if (cred.user?.uid && typeof window !== 'undefined') {
            localStorage.setItem('fintrack_firebase_uid', cred.user.uid);
          }
          resolve(cred.user);
        } catch (err) {
          console.warn('[Firebase] Anonymous sign-in error:', err);
          resolved = true;
          unsubscribe();
          resolve(null);
        }
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(auth.currentUser);
      }
    }, 2500);
  });
}

/**
 * Returns the most accurate known Firebase UID.
 * Fallback to the user document populated during migration if auth is still initializing.
 */
export function getActiveFirebaseUid(): string {
  const user = getCurrentFirebaseUser();
  if (user?.uid) return user.uid;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('fintrack_firebase_uid');
    if (stored) return stored;
  }
  return '7LgmzR1aKhThP7C4kFyRXEJaYEl1';
}
