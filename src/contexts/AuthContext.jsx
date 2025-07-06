import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const { 
    setUser, 
    setUserProfile, 
    setLoading: setStoreLoading,
    logout: logoutStore 
  } = useAuthStore();

  // Create user profile in Firestore
  const createUserProfile = async (user, additionalData = {}) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const userProfile = {
          uid: user.uid,
          name: user.displayName || additionalData.name || '',
          email: user.email,
          photoURL: user.photoURL || '',
          role: 'user', // Default role
          bio: '',
          teams: [],
          teamRoles: {},
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
          notificationPreferences: {
            email: true,
            push: true,
            sms: false
          },
          ...additionalData
        };

        await setDoc(userRef, userProfile);
        setUserProfile(userProfile);
        return userProfile;
      } else {
        const userData = userSnap.data();
        setUserProfile(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      toast.error('Failed to create user profile');
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, name) => {
    try {
      setStoreLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(user, { displayName: name });
      
      // Create user profile
      await createUserProfile(user, { name });
      
      toast.success('Account created successfully!');
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error(error.message);
      throw error;
    } finally {
      setStoreLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setStoreLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user profile
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
      }
      
      toast.success('Signed in successfully!');
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error.message);
      throw error;
    } finally {
      setStoreLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setStoreLoading(true);
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Create or get user profile
      await createUserProfile(user);
      
      toast.success('Signed in with Google successfully!');
      return user;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error(error.message);
      throw error;
    } finally {
      setStoreLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      logoutStore();
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { ...updates, lastLogin: serverTimestamp() }, { merge: true });
      
      // Update local state
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Get user profile from Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserProfile(userData);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setUserProfile]);

  const value = {
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 