# Team Workspace Web App

A modern, collaborative team workspace web application designed for seamless communication, file sharing, event management, and productivity. Built with a minimalistic, attractive, and user-friendly interface.

---

## 🚀 Features

### Team Management
- **Create & Join Teams:** Easily create new teams or join existing ones with invite codes.
- **Team List:** View and access all your teams from a unified dashboard.

### Chat System
- **Team Chat:** Real-time messaging within teams.
- **Direct Chat:** One-on-one messaging between users.
- **Emoji Support:** Express yourself with emojis in chat messages.

### File Management
- **Team Files:** Upload, preview, and manage files within each team.
- **Direct Files:** Share and manage files in direct conversations.
- **File Previews:** Instantly preview images, documents, and videos in the browser.

### Calendar & Events
- **Team Calendar:** Organize and view team events and meetings.
- **Event Reminders:** Receive notifications for upcoming events, including 5-minute reminders before meetings.

### Notifications
- **Real-Time Notifications:** Stay updated on team invites, file uploads, events, and chat messages.
- **Manage Notifications:** Mark as read or delete notifications easily.

### User Profile & Authentication
- **User Profiles:** Personalize your experience with a profile and avatar.
- **Authentication:** Secure login and user management (powered by Firebase Auth).

### Dashboard
- **Personal Dashboard:** Overview of your teams, recent activity, and upcoming events.
- **Quick Actions:** Create/join teams or start chats directly from the dashboard.

### Minimalistic & Responsive UI
- **Modern Design:** Clean, minimal, and attractive interface.
- **Dark Mode Support:** Toggle between light and dark themes.
- **Sidebar Navigation:** Quick access to all major features.

---

## 🛠️ Tech Stack

### Frontend
- **React**: Interactive user interfaces
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Heroicons**: Beautiful SVG icon set
- **React Router**: Client-side routing
- **react-hot-toast**: Toast notifications

### Backend / Cloud
- **Firebase**:
  - **Firestore**: Real-time NoSQL database
  - **Firebase Auth**: User authentication
  - **Firebase Storage**: File uploads and storage

### State Management
- **React Context / Custom Hooks**: Authentication and user state
- **Local State**: UI and component-level state

### Other Libraries
- **date-fns** (or similar): Date formatting and manipulation

---

## 🖥️ User Experience
- **Simple, Clean, and Fast:** Designed for speed and clarity, focusing on essential team collaboration features.
- **Minimal Clutter:** Only the most useful features are present, with a distraction-free interface.

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** (v16 or higher recommended)
- **npm** or **yarn**
- **Firebase Project:** Set up a Firebase project and obtain your config (see below).

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <project-directory>
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Firebase
- Create a `.env` file in the root directory with your Firebase config:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- You can find these values in your Firebase project settings.

### 4. Start the Development Server
```bash
npm run dev
# or
yarn dev
```

- The app will be available at `http://localhost:5173` (or the port shown in your terminal).

### 5. Build for Production
```bash
npm run build
# or
yarn build
```

---

## �� Project Structure

```
src/
  components/      # React components (chat, teams, files, calendar, etc.)
  contexts/        # React context providers
  store/           # State management (auth, etc.)
  config/          # Firebase and app config
  index.css        # Tailwind and global styles
  App.jsx          # Main app component
  main.jsx         # Entry point
```

---

## 🙌 Contributing
Pull requests and suggestions are welcome! Please open an issue or submit a PR to contribute.

---

## 📄 License
This project is licensed under the MIT License.

---

**Loop** - Where Teams Work in Sync. 🚀 