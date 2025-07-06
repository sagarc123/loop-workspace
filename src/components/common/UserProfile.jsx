import React, { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const UserProfile = ({ userProfile, teams, isOwnProfile, onEditProfile }) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const { setUserProfile } = useAuthStore();

  console.log('UserProfile teams:', teams);
  console.log('UserProfile userProfile:', userProfile);

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setName(userProfile?.name || '');
    setPhotoURL(userProfile?.photoURL || '');
  };

  const handleSave = async () => {
    if (!userProfile?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        name,
        photoURL
      });
      setUserProfile({ ...userProfile, name, photoURL });
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-400">?</span>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No user profile found.
        </h3>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto card p-8">
      <div className="flex items-center space-x-6 mb-6">
        {editMode ? (
          <input
            type="text"
            value={photoURL}
            onChange={e => setPhotoURL(e.target.value)}
            placeholder="Photo URL"
            className="w-20 h-20 rounded-full border border-gray-300 p-2"
          />
        ) : userProfile.photoURL ? (
          <img src={userProfile.photoURL} alt={userProfile.name} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-gray-600">
            {userProfile.name?.charAt(0) || '?'}
          </div>
        )}
        <div>
          {editMode ? (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-300 mb-2"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userProfile.name}</h2>
          )}
          <p className="text-gray-500 dark:text-gray-400">{userProfile.email}</p>
          <p className="text-sm text-gray-400 mt-1">Role: {userProfile.role || 'user'}</p>
          {isOwnProfile && !editMode && (
            <button className="btn-secondary btn-xs mt-2" onClick={handleEdit}>Edit Profile</button>
          )}
          {isOwnProfile && editMode && (
            <div className="flex space-x-2 mt-2">
              <button className="btn-primary btn-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn-secondary btn-xs" onClick={handleCancel} disabled={saving}>Cancel</button>
            </div>
          )}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Teams</h3>
        {teams && teams.length > 0 ? (
          <ul className="space-y-2">
            {teams.map(team => (
              <li key={team.id} className="flex items-center space-x-2">
                <UserGroupIcon className="h-5 w-5 text-blue-500" />
                <span className="text-gray-800 dark:text-gray-200">{team.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No teams joined yet.</p>
        )}
      </div>
      {/* Add more user info fields here as needed */}
    </div>
  );
};

export default UserProfile; 