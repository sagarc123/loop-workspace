import React, { useState, useEffect, useRef } from 'react';
import { 
  UserGroupIcon, 
  ChatBubbleLeftIcon,
  FolderIcon,
  CalendarIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const [teams, setTeams] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useAuthStore();
  const [events, setEvents] = useState([]);
  const reminderTimeouts = useRef([]);

  useEffect(() => {
    if (userProfile?.uid) {
      fetchDashboardData();
      fetchUpcomingEvents();
    } else {
      // If no user profile, still show dashboard with empty data
      setLoading(false);
    }
    // Cleanup timeouts on unmount
    return () => {
      reminderTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [userProfile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's teams
      try {
        const teamsRef = collection(db, 'teams');
        const teamsQuery = query(teamsRef, where('members', 'array-contains', userProfile.uid));
        const teamsSnapshot = await getDocs(teamsQuery);
        
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTeams(teamsData);
      } catch (teamsError) {
        console.warn('Could not fetch teams:', teamsError);
        setTeams([]);
      }

      // Fetch recent notifications
      try {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
          notificationsRef,
          where('recipientId', '==', userProfile.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        const notificationsData = notificationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentActivity(notificationsData);
      } catch (notificationsError) {
        console.warn('Could not fetch notifications:', notificationsError);
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load some dashboard data');
      // Don't show toast error, just set error state
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming events for all teams
  const fetchUpcomingEvents = async () => {
    try {
      // Get all teams the user is a member of
      const teamsRef = collection(db, 'teams');
      const teamsQuery = query(teamsRef, where('members', 'array-contains', userProfile.uid));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamIds = teamsSnapshot.docs.map(doc => doc.id);
      // Get upcoming events for each team
      let allEvents = [];
      const now = new Date();
      for (const teamId of teamIds) {
        const eventsRef = collection(db, 'teams', teamId, 'events');
        const eventsQuery = query(eventsRef, orderBy('startDate', 'asc'));
        const eventsSnapshot = await getDocs(eventsQuery);
        const teamEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, teamId, ...doc.data() }));
        allEvents = allEvents.concat(teamEvents);
      }
      // Only show events where user is an attendee and in the future
      const upcoming = allEvents.filter(e =>
        e.attendees?.includes(userProfile.uid) &&
        new Date(e.startDate.toDate ? e.startDate.toDate() : e.startDate) > now
      );
      setEvents(upcoming);
      // Schedule 5-min reminders
      reminderTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reminderTimeouts.current = [];
      upcoming.forEach(event => {
        const start = new Date(event.startDate.toDate ? event.startDate.toDate() : event.startDate);
        const msUntilReminder = start.getTime() - Date.now() - 5 * 60 * 1000;
        if (msUntilReminder > 0) {
          const timeout = setTimeout(() => {
            // Show local notification (toast)
            toast((t) => (
              <span>
                Reminder: <b>{event.title}</b> starts in 5 minutes.<br/>
                {event.meetingLink && (
                  <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Join Meeting</a>
                )}
              </span>
            ), { duration: 10000 });
          }, msUntilReminder);
          reminderTimeouts.current.push(timeout);
        }
      });
    } catch (err) {
      setEvents([]);
    }
  };

  const quickActions = [
    {
      name: 'Create Team',
      description: 'Start a new team collaboration',
      icon: PlusIcon,
      color: 'bg-blue-500',
      action: () => toast.success('Navigate to Teams to create a new team')
    },
    {
      name: 'Join Team',
      description: 'Join an existing team with invite code',
      icon: UserGroupIcon,
      color: 'bg-green-500',
      action: () => toast.success('Navigate to Teams to join a team')
    },
    {
      name: 'Start Chat',
      description: 'Begin a conversation with your team',
      icon: ChatBubbleLeftIcon,
      color: 'bg-purple-500',
      action: () => toast.success('Select a team and navigate to Chat')
    },
  ];

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back, {userProfile?.name || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your teams today.
        </p>
        {error && (
          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ {error} - Some data may not be available
            </p>
          </div>
        )}
      </div>

      {/* Quick Guide */}
      {teams.length === 0 && (
        <div className="mb-8">
          <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🚀 Getting Started with Loop
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <h3 className="font-medium mb-2">1. Create or Join a Team</h3>
                <p>Start by creating a new team or joining an existing one. Teams are the foundation for all collaboration features.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. Select Your Team</h3>
                <p>Once you have a team, select it from the sidebar to access chat, video calls, files, and calendar features.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. Start Collaborating</h3>
                <p>Use the navigation menu to switch between different collaboration tools like chat, video calls, and file sharing.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">4. Stay Updated</h3>
                <p>Check the notifications section to stay informed about team activities and updates.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Teams</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{teams.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <ChatBubbleLeftIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Chats</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{teams.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FolderIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Meetings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <BellIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recentActivity.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full flex items-center p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1 text-left">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Activity
          </h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center p-3 border border-gray-200 dark:border-dark-700 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BellIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.title || 'New notification'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No recent activity
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Start collaborating to see activity here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Teams Overview */}
      {teams.length > 0 && (
        <div className="mt-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Teams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                  <div className="flex items-center mb-2">
                    <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {team.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {team.description || 'No description'}
                  </p>
                  <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                    <span>{team.members?.length || 0} members</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Teams Call-to-Action */}
      {teams.length === 0 && (
        <div className="mt-8">
          <div className="card">
            <div className="text-center py-8">
              <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Get Started with Teams
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create your first team to start collaborating with others. Teams allow you to chat, share files, schedule meetings, and more.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.href = '#teams'}
                  className="btn-primary"
                >
                  Create Your First Team
                </button>
                <button
                  onClick={() => window.location.href = '#teams'}
                  className="btn-secondary"
                >
                  Join Existing Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <div className="mt-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upcoming Events & Meetings
            </h2>
            <div className="space-y-4">
              {events.map(event => (
                <div key={event.id} className="p-4 border border-gray-200 dark:border-dark-700 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{event.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {event.startDate && (new Date(event.startDate.toDate ? event.startDate.toDate() : event.startDate)).toLocaleString()}<br/>
                      Team: {teams.find(t => t.id === event.teamId)?.name || event.teamId}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Invited: {event.attendees?.length || 0}
                    </div>
                  </div>
                  {event.meetingLink && (
                    <div className="mt-2 md:mt-0">
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary btn-xs"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 