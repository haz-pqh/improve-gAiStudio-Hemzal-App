import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyD8PVd9v61cAmKoe_RjB2Wc1AswASLIFWo",
  authDomain: "staffportal-f740f.firebaseapp.com",
  databaseURL: "https://staffportal-f740f-default-rtdb.firebaseio.com",
  projectId: "staffportal-f740f",
  storageBucket: "staffportal-f740f.firebasestorage.app",
  messagingSenderId: "739455943513",
  appId: "1:739455943513:web:84850f115af46cafcb8248",
  measurementId: "G-2BK6WZV8TC"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
