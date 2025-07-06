import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import useAuthStore from './store/authStore';
import { ChatBubbleLeftIcon, VideoCameraIcon, FolderIcon, CalendarIcon } from '@heroicons/react/24/outline';

// Components
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import UserDashboard from './components/dashboard/UserDashboard';
import AdminDashboard from './components/dashboard/AdminDashboard';
import FirebaseTest from './components/test/FirebaseTest';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Import all modules
import TeamsList from './components/teams/TeamsList';
import ChatInterface from './components/chat/ChatInterface';
import FileManager from './components/files/FileManager';
import Calendar from './components/calendar/Calendar';
import Notifications from './components/notifications/Notifications';
import UserProfile from './components/common/UserProfile';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
          <div className="text-center p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple Test Component
const TestComponent = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
      <div className="text-center p-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Loop is Working! 🎉
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          The app is loading successfully. You should see the login page now.
        </p>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>✅ React is working</p>
          <p>✅ Tailwind CSS is working</p>
          <p>✅ Components are loading</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  // Move all hooks to the top, before any return
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [error, setError] = useState(null);
  const [showTest, setShowTest] = useState(false); // Don't show test component by default
  const { setUserProfile, userProfile } = useAuthStore();
  // Video call popup state
  const [activeCall, setActiveCall] = useState(null); // { type: 'team'|'dm', id: string }
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  // Draggable popup position (all hooks at top level)
  const [popupPos, setPopupPos] = useState({ x: 24, y: 24 });
  const popupRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [profileTeams, setProfileTeams] = useState([]);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handlePopupMouseMove);
      window.addEventListener('mouseup', handlePopupMouseUp);
    } else {
      window.removeEventListener('mousemove', handlePopupMouseMove);
      window.removeEventListener('mouseup', handlePopupMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePopupMouseMove);
      window.removeEventListener('mouseup', handlePopupMouseUp);
    };
  }, [dragging]);

  useEffect(() => {
    console.log('App useEffect running...'); // Debug log
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user); // Debug log
      try {
        if (user) {
          setUser(user);
          // Fetch user profile from Firestore
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./config/firebase');
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUserProfile({
                uid: user.uid,
                email: user.email,
                name: userDoc.data().name || user.displayName || 'User',
                photoURL: user.photoURL || userDoc.data().photoURL,
                role: userDoc.data().role || 'user'
              });
            } else {
              setUserProfile({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'User',
                photoURL: user.photoURL,
                role: 'user'
              });
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile({
              uid: user.uid,
              email: user.email,
              name: user.displayName || 'User',
              photoURL: user.photoURL,
              role: 'user'
            });
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [setUserProfile]);

  // Effect to hang up previous call when switching to a new video call module
  useEffect(() => {
    if (currentModule === 'team-video' || currentModule === 'dm-video') {
      handleHangUp();
    }
    // Only run when currentModule changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModule]);

  // Fetch teams for profile page
  const refreshProfileTeams = async (uidOverride) => {
    const uid = uidOverride || selectedProfileUserId || userProfile?.uid;
    if (uid) {
      // Try to get the user's teams array from their user document
      const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./config/firebase');
      const userDoc = await getDoc(doc(db, 'users', uid));
      let teamIds = [];
      if (userDoc.exists() && userDoc.data().teams) {
        teamIds = userDoc.data().teams;
      }
      let teamsData = [];
      if (teamIds.length > 0) {
        // Fetch each team by ID
        for (const teamId of teamIds) {
          const teamDoc = await getDoc(doc(db, 'teams', teamId));
          if (teamDoc.exists()) {
            teamsData.push({ id: teamId, ...teamDoc.data() });
          }
        }
      } else {
        // Fallback: query all teams where user is a member
        const teamsRef = collection(db, 'teams');
        const q = (await import('firebase/firestore')).query(teamsRef, (await import('firebase/firestore')).where('members', 'array-contains', uid));
        const querySnapshot = await getDocs(q);
        teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setProfileTeams(teamsData);
    }
  };

  useEffect(() => {
    refreshProfileTeams();
  }, [userProfile, selectedProfileUserId]);

  // Fetch selected user profile for profile page
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  useEffect(() => {
    const uid = selectedProfileUserId;
    if (uid && uid !== userProfile?.uid) {
      const fetchUser = async () => {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./config/firebase');
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setSelectedUserProfile({ uid, ...userDoc.data() });
        } else {
          setSelectedUserProfile(null);
        }
      };
      fetchUser();
    } else {
      setSelectedUserProfile(null);
    }
  }, [selectedProfileUserId, userProfile]);

  // Drag handlers (must be defined after hooks)
  function handlePopupMouseDown(e) {
    setDragging(true);
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function handlePopupMouseMove(e) {
    if (dragging) {
      setPopupPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  }
  function handlePopupMouseUp() {
    setDragging(false);
  }

  // Centralized hang up logic
  function handleHangUp() {
    setActiveCall(null);
    setIsCallMinimized(false);
    // Optionally, reset any other call-related state here
    // (e.g., selectedTeam/selectedDM if you want to leave context)
  }

  // Early returns for UI (after all hooks)
  if (showTest) {
    return <TestComponent />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading App</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload Page
            </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/test-firebase" element={<FirebaseTest />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  const renderModule = () => {
    // Team context
    if (currentModule.startsWith('team-')) {
      if (!selectedTeam) {
        return <div className="p-6 text-center">Select a team to use this feature.</div>;
      }
      switch (currentModule) {
        case 'team-chat':
          return <ChatInterface teamId={selectedTeam} />;
        case 'team-files':
          return <FileManager teamId={selectedTeam} />;
        case 'team-calendar':
          return <Calendar teamId={selectedTeam} />;
        default:
          return <UserDashboard />;
      }
    }
    // Direct Message context
    if (currentModule.startsWith('dm-')) {
      if (!selectedDM) {
        return <div className="p-6 text-center">Select a user to start a direct conversation.</div>;
      }
      switch (currentModule) {
        case 'dm-chat':
          return <ChatInterface userId={selectedDM} />;
        case 'dm-files':
          return <FileManager userId={selectedDM} />;
        default:
          return <UserDashboard />;
      }
    }
    // Main navigation
    switch (currentModule) {
      case 'profile':
        return <UserProfile userProfile={selectedUserProfile || userProfile} teams={profileTeams} isOwnProfile={!selectedProfileUserId || selectedProfileUserId === userProfile?.uid} onEditProfile={() => setCurrentModule('edit-profile')} />;
      case 'teams':
        return <TeamsList 
          onUserClick={uid => { setCurrentModule('profile'); setSelectedProfileUserId(uid); }}
          onTeamAction={(team, action) => {
            setSelectedTeam(team.id);
            setCurrentModule(action);
          }}
          onLeaveTeam={async (team) => {
            if (!window.confirm('Are you sure you want to leave this team?')) return;
            const { arrayRemove, updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'teams', team.id), {
              members: arrayRemove(userProfile.uid)
            });
            toast.success('You have left the team.');
            await refreshProfileTeams();
            // Optionally, refresh the teams list or redirect
          }}
          onTeamChanged={refreshProfileTeams}
        />;
      case 'notifications':
        return <Notifications />;
      case 'dashboard':
      default:
        return userProfile?.role === 'admin' ? <AdminDashboard /> : <UserDashboard />;
    }
  };

  // Floating video call popup
  const renderFloatingCall = () => {
    if (!activeCall || !isCallMinimized) return null;
    return (
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          left: popupPos.x,
          top: `calc(100vh - ${popupPos.y + 200}px)`,
          zIndex: 1000,
          width: 320,
          height: 200,
          background: '#222',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handlePopupMouseDown}
      >
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
          <button className="btn-primary btn-xs" onClick={e => {
            e.stopPropagation();
            setIsCallMinimized(false);
            setCurrentModule(activeCall.type === 'team' ? 'team-video' : 'dm-video');
          }}>Return to Call</button>
          <button className="btn-secondary btn-xs" onClick={e => {
            e.stopPropagation();
            handleHangUp();
          }}>Hang Up</button>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <Toaster position="top-right" />
          
          {user && (
            <div className="flex h-screen">
              <Sidebar 
                currentModule={currentModule}
                setCurrentModule={setCurrentModule}
                selectedTeam={selectedTeam}
                setSelectedTeam={setSelectedTeam}
                selectedDM={selectedDM}
                setSelectedDM={setSelectedDM}
                onUserClick={uid => { setCurrentModule('profile'); setSelectedProfileUserId(uid); }}
              />
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} setCurrentModule={setCurrentModule} onProfileClick={() => { setCurrentModule('profile'); setSelectedProfileUserId(null); }} />
                
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
                  {renderModule()}
                  {renderFloatingCall()}
                </main>
              </div>
            </div>
          )}
          
          <Routes>
            <Route path="/test-firebase" element={<FirebaseTest />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 