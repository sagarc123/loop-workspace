import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  UserGroupIcon, 
  VideoCameraIcon,
  ChatBubbleLeftIcon,
  FolderIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import CreateTeamModal from './CreateTeamModal';
import JoinTeamModal from './JoinTeamModal';
import { Menu } from '@headlessui/react';

const TeamsList = ({ onUserClick, onTeamAction, onLeaveTeam, onTeamChanged }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { userProfile } = useAuthStore();
  const [leavingTeamId, setLeavingTeamId] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState({});

  useEffect(() => {
    fetchTeams();
  }, [userProfile]);

  useEffect(() => {
    const fetchMemberProfiles = async () => {
      const allMemberUids = Array.from(new Set(teams.flatMap(team => team.members || [])));
      const profiles = {};
      for (const uid of allMemberUids) {
        if (!uid) continue;
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            profiles[uid] = userDoc.data();
          }
        } catch {}
      }
      setMemberProfiles(profiles);
    };
    if (teams.length > 0) fetchMemberProfiles();
  }, [teams]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('members', 'array-contains', userProfile?.uid));
      const querySnapshot = await getDocs(q);
      
      const teamsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      const teamRef = await addDoc(collection(db, 'teams'), {
        ...teamData,
        creator: userProfile.uid,
        members: [userProfile.uid],
        memberRoles: {
          [userProfile.uid]: 'creator'
        },
        createdAt: new Date(),
        meetingLink: `meeting-${Date.now()}`,
        chatId: `chat-${Date.now()}`
      });

      await updateDoc(doc(db, 'users', userProfile.uid), {
        teams: arrayUnion(teamRef.id)
      });

      toast.success('Team created successfully!');
      setShowCreateModal(false);
      fetchTeams();
      if (onTeamChanged) await onTeamChanged();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleJoinTeam = async (inviteCode) => {
    try {
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('inviteCode', '==', inviteCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Invalid invite code');
        return;
      }

      const teamDoc = querySnapshot.docs[0];
      const teamData = teamDoc.data();

      if (teamData.members.includes(userProfile.uid)) {
        toast.error('You are already a member of this team');
        return;
      }

      await updateDoc(doc(db, 'teams', teamDoc.id), {
        members: arrayUnion(userProfile.uid),
        memberRoles: {
          ...teamData.memberRoles,
          [userProfile.uid]: 'member'
        }
      });

      await updateDoc(doc(db, 'users', userProfile.uid), {
        teams: arrayUnion(teamDoc.id)
      });

      toast.success('Joined team successfully!');
      setShowJoinModal(false);
      fetchTeams();
      if (onTeamChanged) await onTeamChanged();
    } catch (error) {
      console.error('Error joining team:', error);
      toast.error('Failed to join team');
    }
  };

  const handleLeaveTeam = async (team) => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    setLeavingTeamId(team.id);
    try {
      await onLeaveTeam(team);
      toast.success('You have left the team.');
      fetchTeams();
      if (onTeamChanged) await onTeamChanged();
    } catch (err) {
      toast.error('Failed to leave the team.');
    } finally {
      setLeavingTeamId(null);
    }
  };

  const getRoleBadge = (team) => {
    const role = team.memberRoles?.[userProfile?.uid] || 'member';
    const colors = {
      creator: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      member: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {role}
      </span>
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your team collaborations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary flex items-center"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Join Team
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Team
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No teams yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new team or joining an existing one.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Team
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary flex items-center"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Join Team
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                {/* Team Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {team.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {team.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(team)}
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </Menu.Button>
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white dark:bg-dark-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'text-red-600 dark:text-red-400'}`}
                                onClick={() => handleLeaveTeam(team)}
                                disabled={leavingTeamId === team.id}
                              >
                                {leavingTeamId === team.id ? 'Leaving...' : 'Leave Team'}
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Menu>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{team.members?.length || 0} members</span>
                  <span>Created {new Date(team.createdAt?.toDate()).toLocaleDateString()}</span>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button className="flex items-center justify-center p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-md transition-colors duration-200"
                    title="Open team chat"
                    disabled={!team.members?.includes(userProfile?.uid)}
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                    Chat
                  </button>
                  <button className="flex items-center justify-center p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-md transition-colors duration-200"
                    onClick={() => onTeamAction && onTeamAction(team, 'team-files')}
                    title="View and share team files"
                    disabled={!team.members?.includes(userProfile?.uid)}
                  >
                    <FolderIcon className="h-4 w-4 mr-1" />
                    Files
                  </button>
                  <button className="flex items-center justify-center p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-md transition-colors duration-200"
                    onClick={() => onTeamAction && onTeamAction(team, 'team-calendar')}
                    title="View team events and calendar"
                    disabled={!team.members?.includes(userProfile?.uid)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Events
                  </button>
                </div>

                {/* Invite Code */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-md">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invite Code:</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {team.inviteCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(team.inviteCode);
                        toast.success('Invite code copied!');
                      }}
                      className="text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Team Members */}
                {team.members && team.members.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Members:</h4>
                    <div className="flex flex-wrap gap-2">
                      {team.members.map(memberId => {
                        const profile = memberProfiles[memberId];
                        const displayName = profile?.name || profile?.email || memberId;
                        return (
                          <button
                            key={memberId}
                            className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                            onClick={() => onUserClick && onUserClick(memberId)}
                            title="View Profile"
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTeam}
        />
      )}

      {showJoinModal && (
        <JoinTeamModal
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinTeam}
        />
      )}
    </div>
  );
};

export default TeamsList; 