import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CheckIcon, 
  XMarkIcon,
  TrashIcon,
  EnvelopeIcon,
  UserPlusIcon,
  CalendarIcon,
  DocumentIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const { userProfile } = useAuthStore();

  useEffect(() => {
    console.log('Notifications useEffect: userProfile', userProfile);
    if (userProfile?.uid) {
      const unsubscribe = fetchNotifications();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      setLoading(false);
      setNotifications([]);
      console.warn('No userProfile.uid set for notifications filtering!');
    }
  }, [userProfile]);

  const fetchNotifications = () => {
    console.log('Fetching notifications for UID:', userProfile?.uid);
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    try {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('onSnapshot fired, docs:', snapshot.docs.length);
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notificationsData);
        setLoading(false);
      }, (error) => {
        console.error('onSnapshot error:', error);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err) {
      console.error('fetchNotifications error:', err);
      setLoading(false);
      return undefined;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      });
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true,
          readAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;

    try {
      const deletePromises = notifications.map(notification =>
        deleteDoc(doc(db, 'notifications', notification.id))
      );
      
      await Promise.all(deletePromises);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const sendTestNotification = async () => {
    if (!userProfile?.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: userProfile.uid,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification.',
        createdAt: serverTimestamp(),
        read: false
      });
      toast.success('Test notification sent!');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-blue-500" />;
      case 'file_upload':
        return <DocumentIcon className="h-5 w-5 text-green-500" />;
      case 'event':
        return <CalendarIcon className="h-5 w-5 text-orange-500" />;
      case 'team_invite':
        return <UserPlusIcon className="h-5 w-5 text-indigo-500" />;
      default:
        return <EnvelopeIcon className="h-5 w-5 text-gray-500" />;
    }
  };

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

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!userProfile?.uid) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No user profile found. Please log in again or refresh the page.
          </h3>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={sendTestNotification}
            className="btn-secondary text-xs"
          >
            Send Test Notification
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary text-sm"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="btn-secondary text-sm text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 mb-6 p-1 bg-gray-100 dark:bg-dark-700 rounded-lg">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'read'
              ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? 'You\'ll see notifications here when you receive them.'
              : `You don't have any ${filter} notifications.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card transition-all duration-200 ${
                !notification.read 
                  ? 'border-l-4 border-l-primary-500 bg-primary-50 dark:bg-primary-900/10' 
                  : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          !notification.read 
                            ? 'text-gray-900 dark:text-gray-100' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete notification"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {notification.actionUrl && (
                      <div className="mt-3">
                        <a
                          href={notification.actionUrl}
                          className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
                        >
                          View Details →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications; 