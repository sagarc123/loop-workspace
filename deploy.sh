#!/bin/bash

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Build the project locally first to test
echo "📦 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🌐 Deploying to Vercel..."
    vercel --prod
else
    echo "❌ Build failed! Please fix the issues before deploying."
    exit 1
fi 