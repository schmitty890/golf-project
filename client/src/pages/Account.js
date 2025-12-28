import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function Account() {
  const {
    user, token, logout, refreshUser,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');

    try {
      await axios.put(
        `${API_URL}/api/auth/profile`,
        { firstName, lastName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await refreshUser();
      setProfileMessage('Profile updated successfully');
    } catch (error) {
      setProfileMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarMessage('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await axios.post(`${API_URL}/api/auth/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      await refreshUser();
      setAvatarMessage('Avatar uploaded successfully');
    } catch (error) {
      setAvatarMessage(error.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarMessage('');

    try {
      await axios.delete(`${API_URL}/api/auth/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser();
      setAvatarMessage('Avatar removed');
    } catch (error) {
      setAvatarMessage(error.response?.data?.error || 'Failed to remove avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);

    try {
      await axios.put(
        `${API_URL}/api/auth/password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPasswordMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);

    try {
      await axios.delete(`${API_URL}/api/auth/account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });
      logout();
      navigate('/login');
    } catch (error) {
      setDeleteError(error.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const getAvatarUrl = () => user?.profilePicture || null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

      {/* Profile Picture Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          {getAvatarUrl() ? (
            <img
              src={getAvatarUrl()}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="h-20 w-20 text-gray-300" />
          )}
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <span>{avatarUploading ? 'Uploading...' : 'Upload New'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
                className="sr-only"
              />
            </label>
            {user?.profilePicture && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={avatarUploading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {avatarMessage && (
          <p className={`mt-3 text-sm ${avatarMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {avatarMessage}
          </p>
        )}
      </div>

      {/* Personal Information Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm text-gray-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {profileMessage && (
              <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {profileMessage}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMessage}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Danger Zone Section */}
      <div className="bg-white shadow rounded-lg p-6 border border-red-200">
        <h2 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Sign Out</h3>
              <p className="text-sm text-gray-500">Sign out of your account on this device.</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                <p className="text-sm text-gray-500">Permanently delete your account and all data.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowDeleteModal(false)}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This action cannot be undone. Please enter your password to confirm.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                )}
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Account;
