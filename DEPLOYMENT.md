# 🚀 Loop - Vercel Deployment Guide

This guide will walk you through deploying your Loop project to Vercel.

## 📋 Prerequisites

- [Git](https://git-scm.com/) installed
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Vercel CLI](https://vercel.com/cli) (optional, for local testing)
- A [Vercel account](https://vercel.com/signup)

## 🔧 Pre-Deployment Setup

### 1. Environment Variables

Create a `.env` file in your project root with your Firebase configuration:

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

### 2. Firebase Configuration

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the configuration values to your `.env` file

### 3. Test Build Locally

```bash
npm run build
```

If the build succeeds, you're ready to deploy!

## 🌐 Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import your repository

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Set Environment Variables**
   - In the Vercel dashboard, go to Project Settings > Environment Variables
   - Add all the variables from your `.env` file
   - Make sure to set them for **Production**, **Preview**, and **Development**

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow the prompts**
   - Link to existing project or create new
   - Set environment variables when prompted

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update your DNS settings as instructed

### 2. Environment Variables for Production

Make sure all environment variables are set in Vercel:
- Go to Project Settings > Environment Variables
- Add all variables from your `.env` file
- Set them for all environments (Production, Preview, Development)

### 3. Firebase Hosting Rules

If you're using Firebase Hosting alongside Vercel, update your `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is compatible
   - Check build logs in Vercel dashboard

2. **Environment Variables Not Working**
   - Verify variables are set in Vercel dashboard
   - Check that variable names start with `VITE_`
   - Redeploy after adding variables

3. **Firebase Connection Issues**
   - Verify Firebase config in environment variables
   - Check Firebase project settings
   - Ensure Firebase services are enabled

4. **Routing Issues**
   - The `vercel.json` file handles SPA routing
   - If issues persist, check your React Router configuration

### Performance Optimization

1. **Bundle Size**
   - The build shows some large chunks
   - Consider code splitting for better performance
   - Use dynamic imports for heavy components

2. **Caching**
   - Static assets are cached for 1 year
   - Update cache headers if needed

## 📊 Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in your project settings
2. Monitor performance and user behavior
3. Set up alerts for build failures

### Firebase Analytics

1. Enable Firebase Analytics in your Firebase console
2. Monitor app usage and performance
3. Set up custom events for important actions

## 🔄 Continuous Deployment

### Automatic Deployments

- Every push to `main` branch triggers a deployment
- Preview deployments are created for pull requests
- Environment variables are automatically available

### Manual Deployments

```bash
vercel --prod
```

## 📞 Support

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

---

**Your Loop app should now be live on Vercel! 🎉**

Visit your deployment URL and test all features to ensure everything works correctly. 