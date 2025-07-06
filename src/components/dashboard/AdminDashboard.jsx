import React, { useState } from 'react';
import { 
  UsersIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
import useAuthStore from '../../store/authStore';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuthStore();

  // Mock data - replace with real data from Firestore
  const stats = [
    { 
      name: 'Total Users', 
      value: '1,234', 
      change: '+12%', 
      changeType: 'increase',
      icon: UsersIcon, 
      color: 'bg-blue-500' 
    },
    { 
      name: 'Active Teams', 
      value: '89', 
      change: '+5%', 
      changeType: 'increase',
      icon: UserGroupIcon, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Storage Used', 
      value: '2.4 GB', 
      change: '+8%', 
      changeType: 'increase',
      icon: ChartBarIcon, 
      color: 'bg-purple-500' 
    },
    { 
      name: 'System Health', 
      value: '98%', 
      change: '+2%', 
      changeType: 'increase',
      icon: CheckCircleIcon, 
      color: 'bg-green-500' 
    },
  ];

  const recentUsers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'user',
      status: 'active',
      joinedAt: '2 hours ago',
      avatar: null
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike@example.com',
      role: 'user',
      status: 'pending',
      joinedAt: '4 hours ago',
      avatar: null
    },
    {
      id: 3,
      name: 'Emily Davis',
      email: 'emily@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: '1 day ago',
      avatar: null
    },
    {
      id: 4,
      name: 'Alex Thompson',
      email: 'alex@example.com',
      role: 'user',
      status: 'suspended',
      joinedAt: '2 days ago',
      avatar: null
    }
  ];

  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      title: 'High Storage Usage',
      description: 'Storage usage is approaching 80% capacity',
      time: '1 hour ago',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-500'
    },
    {
      id: 2,
      type: 'info',
      title: 'System Update Available',
      description: 'New version v2.1.0 is ready for deployment',
      time: '3 hours ago',
      icon: CogIcon,
      color: 'text-blue-500'
    },
    {
      id: 3,
      type: 'success',
      title: 'Backup Completed',
      description: 'Daily backup completed successfully',
      time: '6 hours ago',
      icon: CheckCircleIcon,
      color: 'text-green-500'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Welcome section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage your Loop platform.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.name}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center text-sm ${
                    stat.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.changeType === 'increase' ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                    )}
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Users */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Recent Users
                  </h3>
                  <button className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
                    View all
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={user.avatar}
                            alt={user.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <UsersIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                        <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Alerts */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  System Alerts
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {systemAlerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${getAlertColor(alert.type)}`}>
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-dark-700 ${alert.color}`}>
                          <alert.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {alert.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {alert.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {alert.time}
                          </p>
                        </div>
                        <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Quick Actions
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="flex items-center p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200 text-left">
                    <div className="p-2 rounded-lg bg-blue-500">
                      <UsersIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Manage Users
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Add, edit, or remove users
                      </p>
                    </div>
                  </button>
                  
                  <button className="flex items-center p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200 text-left">
                    <div className="p-2 rounded-lg bg-green-500">
                      <UserGroupIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Team Management
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Manage teams and permissions
                      </p>
                    </div>
                  </button>
                  
                  <button className="flex items-center p-4 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200 text-left">
                    <div className="p-2 rounded-lg bg-purple-500">
                      <ChartBarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        View Analytics
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Platform usage statistics
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 