import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
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
  return credential.user;
}

export async function loginAnonymously(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');

  const credential = await signInAnonymously(auth);
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
  return onAuthStateChanged(auth, callback);
}

export function getCurrentFirebaseUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
}
