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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from './client';

export const SUPER_ADMIN_EMAILS = [
  'smohamedfarook2024@gmail.com',
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
];

export const SUPER_ADMIN_UIDS = [
  '7LgmzR1aKhThP7C4kFyRXEJaYEl1',
];

export type UserRole = 'admin' | 'tester';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: number;
  lastActive: number;
  provider: 'google' | 'password' | 'anonymous';
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
}

/**
 * Checks whether a given user or email has Super Admin privileges.
 */
export function isUserAdmin(user: User | null | { email?: string | null; uid?: string }): boolean {
  if (!user) return false;
  if (user.uid && SUPER_ADMIN_UIDS.includes(user.uid)) return true;
  const email = user.email?.toLowerCase().trim();
  if (email && SUPER_ADMIN_EMAILS.includes(email)) return true;
  return false;
}

/**
 * Retrieves the signed Firebase JWT ID Token for authorized server/API calls.
 * Automatically refreshes expired tokens.
 */
export async function getAuthIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('[Firebase Auth] Failed to retrieve JWT ID Token:', err);
    return null;
  }
}

/**
 * Registers or updates a user profile document in Firestore (`users/{uid}`)
 * for admin tracking and multi-tenant management.
 */
export async function registerOrUpdateUserProfile(user: User): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  if (!db || !user?.uid) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);

    const isAdmin = isUserAdmin(user);
    const role: UserRole = isAdmin ? 'admin' : 'tester';

    let provider: 'google' | 'password' | 'anonymous' = 'anonymous';
    if (user.providerData && user.providerData.length > 0) {
      const providerId = user.providerData[0].providerId;
      if (providerId.includes('google')) provider = 'google';
      else if (providerId.includes('password')) provider = 'password';
    } else if (!user.isAnonymous) {
      provider = 'password';
    }

    const now = Date.now();
    let profile: UserProfile;

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      profile = {
        uid: user.uid,
        email: user.email || data.email || null,
        displayName: user.displayName || data.displayName || null,
        photoURL: user.photoURL || data.photoURL || null,
        role: (data.role as UserRole) === 'admin' || isAdmin ? 'admin' : 'tester',
        createdAt: data.createdAt || now,
        lastActive: now,
        provider: provider !== 'anonymous' ? provider : (data.provider || 'anonymous'),
      };
      await setDoc(userRef, profile, { merge: true });
    } else {
      profile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || (user.isAnonymous ? 'Guest Tester' : null),
        photoURL: user.photoURL || null,
        role,
        createdAt: now,
        lastActive: now,
        provider,
      };
      await setDoc(userRef, profile, { merge: true });
    }

    return profile;
  } catch (err) {
    console.warn('[Firebase Auth] Failed to register/update user profile:', err);
    return null;
  }
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
  // Register or update profile document asynchronously
  registerOrUpdateUserProfile(credential.user).catch(() => {});
  return credential.user;
}

export async function loginAnonymously(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');

  const credential = await signInAnonymously(auth);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  registerOrUpdateUserProfile(credential.user).catch(() => {});
  return credential.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  registerOrUpdateUserProfile(credential.user).catch(() => {});
  return credential.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  if (credential.user?.uid && typeof window !== 'undefined') {
    localStorage.setItem('fintrack_firebase_uid', credential.user.uid);
  }
  registerOrUpdateUserProfile(credential.user).catch(() => {});
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
      // Refresh user activity timestamp on auth change
      registerOrUpdateUserProfile(user).catch(() => {});
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
    registerOrUpdateUserProfile(auth.currentUser).catch(() => {});
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
        registerOrUpdateUserProfile(user).catch(() => {});
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolved = true;
          unsubscribe();
          if (cred.user?.uid && typeof window !== 'undefined') {
            localStorage.setItem('fintrack_firebase_uid', cred.user.uid);
          }
          registerOrUpdateUserProfile(cred.user).catch(() => {});
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
 * Fallback to the Super Admin document populated during migration if auth is still initializing.
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
