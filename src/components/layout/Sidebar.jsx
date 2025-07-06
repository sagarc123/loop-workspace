import React, { useState, useEffect } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  FolderIcon,
  CalendarIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import useAuthStore from '../../store/authStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

const Sidebar = ({ currentModule, setCurrentModule, selectedTeam, setSelectedTeam, selectedDM, setSelectedDM, onUserClick }) => {
  const [teams, setTeams] = useState([]);
  const [showTeams, setShowTeams] = useState(false);
  const [users, setUsers] = useState([]);
  const [showDMs, setShowDMs] = useState(false);
  const { userProfile, setUserProfile } = useAuthStore();

  useEffect(() => {
    if (userProfile?.uid) {
      fetchUserTeams();
      fetchUsers();
    }
  }, [userProfile]);

  useEffect(() => {
    if (teams.length === 1 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam, setSelectedTeam]);

  const fetchUserTeams = async () => {
    try {
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('members', 'array-contains', userProfile.uid));
      const querySnapshot = await getDocs(q);
      const teamsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== userProfile.uid);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Navigation for dashboard and notifications
  const mainNav = [
    { name: 'Dashboard', icon: HomeIcon, module: 'dashboard', onClick: () => setCurrentModule('dashboard') },
    { name: 'Teams', icon: UserGroupIcon, module: 'teams', onClick: () => setCurrentModule('teams') },
    { name: 'Notifications', icon: BellIcon, module: 'notifications', onClick: () => setCurrentModule('notifications') },
    { name: 'Profile', icon: UserIcon, module: 'profile', onClick: () => setCurrentModule('profile') },
  ];

  // Team sub-navigation
  const teamNav = [
    { name: 'Team Chat', icon: ChatBubbleLeftIcon, module: 'team-chat' },
    { name: 'Team Files', icon: FolderIcon, module: 'team-files' },
    { name: 'Team Calendar', icon: CalendarIcon, module: 'team-calendar' },
  ];

  // DM sub-navigation
  const dmNav = [
    { name: 'Direct Chat', icon: ChatBubbleLeftIcon, module: 'dm-chat' },
    { name: 'Direct Files', icon: FolderIcon, module: 'dm-files' },
  ];

  return (
    <div className="w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="loop-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#06b6d4" />
                  <stop offset="1" stop-color="#6366f1" />
                </linearGradient>
              </defs>
              <path d="M20 6
                a14 14 0 1 1 -9.9 4.1" stroke="url(#loop-gradient)" stroke-width="4" stroke-linecap="round" fill="none"/>
              <circle cx="20" cy="20" r="16" stroke="url(#loop-gradient)" stroke-width="2" fill="none" opacity="0.15"/>
              <circle cx="20" cy="6" r="2.5" fill="#06b6d4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Loop
          </h1>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {mainNav.map((item) => (
          <button
            key={item.name}
            onClick={item.onClick}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentModule === item.module
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </button>
        ))}

        {/* Teams Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teams</span>
            <button
              onClick={() => setShowTeams(!showTeams)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showTeams ? 'Hide' : 'Show'}
            </button>
          </div>
          {showTeams && (
            <div className="space-y-2">
              {teams.length === 0 && (
                <div className="text-xs text-gray-400">No teams yet</div>
              )}
              {teams.map((team) => (
                <div key={team.id}>
                  <button
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setSelectedDM(null);
                      setCurrentModule('team-chat');
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedTeam === team.id && currentModule.startsWith('team-')
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    {team.name}
                  </button>
                  {/* Team sub-navigation */}
                  {selectedTeam === team.id && currentModule.startsWith('team-') && (
                    <div className="ml-6 mt-1 space-y-1">
                      {teamNav.map((item) => (
                        <button
                          key={item.module}
                          onClick={() => setCurrentModule(item.module)}
                          className={`w-full flex items-center px-2 py-1 text-xs rounded-md transition-colors ${
                            currentModule === item.module
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                          }`}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direct Messages</span>
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showDMs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDMs && (
            <div className="space-y-2">
              {users.length === 0 && (
                <div className="text-xs text-gray-400">No users found</div>
              )}
              {users.map((user) => (
                <div key={user.id} className="flex items-center">
                  <button
                    onClick={() => {
                      setSelectedDM(user.id);
                      setSelectedTeam(null);
                      setCurrentModule('dm-chat');
                    }}
                    className={`flex-1 flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedDM === user.id && currentModule.startsWith('dm-')
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    {user.name || user.email}
                  </button>
                  <button
                    className="ml-2 text-xs text-primary-600 hover:underline"
                    title="View Profile"
                    onClick={() => onUserClick && onUserClick(user.id)}
                  >
                    Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Profile & Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-3 mb-3">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt={userProfile.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {userProfile?.name?.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {userProfile?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {userProfile?.email}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 