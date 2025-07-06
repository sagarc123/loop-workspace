# 🔥 Firebase Authentication Setup Guide

This guide will help you configure Firebase authentication for production deployment to support multiple simultaneous logins and Google authentication.

## 📋 Prerequisites

- Firebase project created
- Vercel deployment ready
- Domain configured

## 🔧 Step 1: Firebase Console Configuration

### 1.1 Enable Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Sign-in method**
4. Enable the following providers:

#### Email/Password
- ✅ Enable Email/Password
- ✅ Enable Email link (optional)

#### Google
- ✅ Enable Google
- Add your support email
- Configure OAuth consent screen if needed

### 1.2 Configure Authorized Domains

1. In **Authentication** > **Settings** > **Authorized domains**
2. Add your production domain:
   - `your-app.vercel.app` (your Vercel domain)
   - `your-custom-domain.com` (if you have one)
   - `localhost` (for development)

### 1.3 Configure OAuth Consent Screen (Google Auth)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Configure:
   - App name: "Loop Workspace"
   - User support email
   - Developer contact information
   - Authorized domains: Add your production domain

## 🔧 Step 2: Environment Variables Setup

### 2.1 Local Development (.env)

Create a `.env` file in your project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# App Configuration
VITE_APP_NAME=Loop
VITE_APP_VERSION=1.0.0
```

### 2.2 Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add all the variables from your `.env` file
4. Set them for **Production**, **Preview**, and **Development**

## 🔧 Step 3: Firebase Security Rules

### 3.1 Firestore Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Team members can read/write team data
    match /teams/{teamId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.members;
    }
    
    // Team messages
    match /teams/{teamId}/messages/{messageId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    }
    
    // Direct messages
    match /directMessages/{conversationId}/messages/{messageId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in conversationId.split('_');
    }
    
    // Team files
    match /teams/{teamId}/files/{fileId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    }
    
    // Team events
    match /teams/{teamId}/events/{eventId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    }
  }
}
```

### 3.2 Storage Security Rules (if using Firebase Storage)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Team files
    match /teams/{teamId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.uid in firestore.get(/databases/(default)/documents/teams/$(teamId)).data.members;
    }
    
    // User avatars
    match /users/{userId}/avatar/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔧 Step 4: Multiple Simultaneous Logins

### 4.1 Session Management

The application already supports multiple simultaneous logins through:

- **Firebase Auth State Persistence**: Users stay logged in across browser sessions
- **Real-time Updates**: All users see changes in real-time
- **Independent Sessions**: Each browser/tab maintains its own session

### 4.2 Testing Multiple Logins

1. **Open Multiple Browser Windows/Tabs**
2. **Sign in with Different Accounts**
3. **Create or Join the Same Team**
4. **Start Chatting - Messages appear in real-time**
5. **Upload Files - Visible to all team members**

## 🔧 Step 5: Google Authentication Troubleshooting

### 5.1 Common Issues and Solutions

#### Issue: "Pop-up blocked" error
**Solution:**
- Ensure pop-ups are allowed for your domain
- Add proper error handling (already implemented)
- Use `signInWithRedirect` as fallback

#### Issue: "Unauthorized domain" error
**Solution:**
- Add your production domain to Firebase Auth authorized domains
- Add your domain to Google OAuth consent screen

#### Issue: Google sign-in not working in production
**Solution:**
- Verify environment variables are set correctly in Vercel
- Check Firebase project settings
- Ensure domain is authorized

### 5.2 Fallback Authentication

If Google pop-up fails, the app will show helpful error messages:

```javascript
// Already implemented in Login.jsx and SignUp.jsx
switch (error.code) {
  case 'auth/popup-blocked':
    errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site';
    break;
  case 'auth/popup-closed-by-user':
    errorMessage = 'Sign-in was cancelled';
    break;
  // ... more error cases
}
```

## 🔧 Step 6: Production Deployment Checklist

### 6.1 Pre-Deployment

- [ ] Firebase project configured
- [ ] Authentication methods enabled
- [ ] Authorized domains added
- [ ] Environment variables set in Vercel
- [ ] Security rules updated
- [ ] OAuth consent screen configured

### 6.2 Post-Deployment

- [ ] Test email/password authentication
- [ ] Test Google authentication
- [ ] Test multiple simultaneous logins
- [ ] Test real-time features
- [ ] Verify error handling

## 🔧 Step 7: Monitoring and Analytics

### 7.1 Firebase Analytics

1. Enable Firebase Analytics in your project
2. Monitor authentication events
3. Track user engagement

### 7.2 Error Monitoring

1. Set up Firebase Crashlytics
2. Monitor authentication errors
3. Track failed login attempts

## 🚨 Troubleshooting

### Authentication Not Working

1. **Check Environment Variables**
   ```bash
   # Verify in Vercel dashboard
   VITE_FIREBASE_API_KEY=your_actual_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   ```

2. **Check Authorized Domains**
   - Go to Firebase Console > Authentication > Settings
   - Verify your domain is listed

3. **Check OAuth Consent Screen**
   - Go to Google Cloud Console
   - Verify your domain is authorized

### Multiple Logins Not Working

1. **Clear Browser Cache**
2. **Test in Incognito Mode**
3. **Check Firebase Auth State**
4. **Verify Real-time Listeners**

## 📞 Support

If you encounter issues:

1. Check Firebase Console logs
2. Review browser console errors
3. Verify environment variables
4. Test with different browsers
5. Check network connectivity

---

**Your Loop application should now support multiple simultaneous logins with Google authentication working in production! 🎉** 