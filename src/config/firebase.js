import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase configuration
// Use environment variables for production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJUbszZKoggRGXF41d6prEXrxNQ5Bk2yg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "meeting-e9c95.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "meeting-e9c95",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "meeting-e9c95.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "597490989215",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:597490989215:web:e7a2f41df276362f654aaa",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-28H0JNJ6E7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// FCM token management
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'your-vapid-key'
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Handle foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

export default app; 