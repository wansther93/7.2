import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  type Firestore 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Inicialização oficial do Cloud Firestore conforme especificação do Firebase Skill
export const db: Firestore = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erro ao fazer login com o Google:', error);
    throw error;
  }
};

export const signInWithGoogle = loginWithGoogle;

export const loginWithEmail = async (email: string, pass: string): Promise<User | null> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return result.user;
  } catch (error) {
    console.error('Erro ao fazer login com Email:', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name?: string): Promise<User | null> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name.trim() });
    }
    return result.user;
  } catch (error) {
    console.error('Erro ao cadastrar com Email:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Erro ao sair da conta:', error);
    throw error;
  }
};

export { onAuthStateChanged };
export type { User };
