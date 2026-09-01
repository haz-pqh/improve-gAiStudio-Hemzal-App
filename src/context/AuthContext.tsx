import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, onDisconnect, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db, googleProvider } from '../lib/firebase';
import { ALLOWED_EMAILS } from '../lib/constants';
import { StaffProfile } from '../types';
import { useToast } from './ToastContext';

interface AuthContextType {
  currentUser: User | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  isAuthorized: boolean;
  loginWithGoogle: () => Promise<void>;
  loginDemoStaff: (email?: string, name?: string) => void;
  logout: () => Promise<void>;
  userEmail: string;
  userName: string;
  userEmpId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUser, setDemoUser] = useState<{ email: string; displayName: string; uid: string } | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = (user.email || '').toLowerCase();
        if (!ALLOWED_EMAILS.includes(email)) {
          // If not in standard whitelist, warn but allow signout or demo switch
          firebaseSignOut(auth).then(() => {
            showToast(`Access Denied: ${email} is not on the authorized staff whitelist.`, 'error', 'Authorization Failed');
          });
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
          setDemoUser(null);
          setupPresence(user.uid, email);
          listenStaffProfile(email);
        }
      } else {
        setCurrentUser(null);
        if (!demoUser) {
          setStaffProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoUser]);

  const setupPresence = (uid: string, email: string) => {
    try {
      const userPresenceRef = ref(db, `presence/${uid}`);
      const connectedRef = ref(db, '.info/connected');

      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(userPresenceRef).set({
            status: 'OFFLINE',
            email,
            lastSeen: serverTimestamp(),
          });

          set(userPresenceRef, {
            status: 'ONLINE',
            email,
            lastSeen: serverTimestamp(),
          });
        }
      });
    } catch (e) {
      console.warn('Presence setup skipped or unavailable in sandbox', e);
    }
  };

  const listenStaffProfile = (email: string) => {
    try {
      const staffQuery = query(ref(db, 'staff'), orderByChild('email'), equalTo(email.toLowerCase()));
      onValue(staffQuery, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const records = Object.keys(val).map((k) => ({ key: k, ...val[k] }));
          if (records.length > 0) {
            setStaffProfile(records[0]);
            return;
          }
        }
        // Fallback default staff record if not yet created by admin
        setStaffProfile({
          name: email.split('@')[0].toUpperCase(),
          email,
          position: 'Staff Crew',
          branch: 'Cawangan Cheras Utama',
          status: 'ACTIVE',
        });
      });
    } catch {
      setStaffProfile({
        name: email.split('@')[0].toUpperCase(),
        email,
        position: 'Staff Crew',
        branch: 'Cawangan Cheras Utama',
        status: 'ACTIVE',
      });
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase();
      if (!ALLOWED_EMAILS.includes(email)) {
        await firebaseSignOut(auth);
        showToast(`Access Denied: ${email} is not in the authorized whitelist.`, 'error');
        return;
      }
      showToast(`Welcome back, ${result.user.displayName || email}!`, 'success', 'Signed In');
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        showToast('Login popup was blocked by the browser. Please allow popups or use Demo Account.', 'info');
      } else {
        showToast(err.message || 'Failed to sign in with Google.', 'error');
      }
    }
  };

  const loginDemoStaff = (email = 'hassanhazril@gmail.com', name = 'Hassan Hazril') => {
    const uid = 'HEMZAL_STAFF_' + email.substring(0, 5).toUpperCase();
    const mock = { email, displayName: name, uid };
    setDemoUser(mock);
    listenStaffProfile(email);
    showToast(`Signed in as Authorized Staff (${email})`, 'success', 'Demo Session Ready');
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await firebaseSignOut(auth);
      }
      setDemoUser(null);
      setCurrentUser(null);
      setStaffProfile(null);
      showToast('You have been signed out.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const activeEmail = currentUser?.email || demoUser?.email || '';
  const activeName = staffProfile?.name || currentUser?.displayName || demoUser?.displayName || (activeEmail ? activeEmail.split('@')[0] : 'Staff Member');
  const activeEmpId = (currentUser?.uid || demoUser?.uid || 'STAFF01').substring(0, 8).toUpperCase();
  const isAuthorized = Boolean(activeEmail && ALLOWED_EMAILS.includes(activeEmail.toLowerCase()));

  return (
    <AuthContext.Provider
      value={{
        currentUser: currentUser || (demoUser as unknown as User),
        staffProfile,
        loading,
        isAuthorized,
        loginWithGoogle,
        loginDemoStaff,
        logout,
        userEmail: activeEmail,
        userName: activeName,
        userEmpId: activeEmpId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
