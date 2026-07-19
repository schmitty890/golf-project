import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import ReferralShare from '../components/ReferralShare';
import neighborhoods from '../data/neighborhoods';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const fieldClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';

const EMPTY_ADDRESS = {
  street: '', unit: '', neighborhood: '', notes: '',
};

function Account() {
  const {
    user, token, logout, refreshUser,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [newsletter, setNewsletter] = useState(false);
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
      setPhone(user.phone || '');
      setAddress({ ...EMPTY_ADDRESS, ...(user.address || {}) });
      setNewsletter(Boolean(user.newsletterSubscribed));
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');

    try {
      await axios.put(
        `${API_URL}/api/auth/profile`,
        {
          firstName, lastName, phone, address, newsletterSubscribed: newsletter,
        },
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
      <ReferralShare className="mb-8" />
      <form onSubmit={handleProfileSubmit}>
        <div className="space-y-12">
          {/* Profile Section */}
          <div className="border-b border-cream-300 pb-12">
            <h2 className="text-base/7 font-semibold text-walnut">Profile</h2>
            <p className="mt-1 text-sm/6 text-walnut-400">
              Update your personal information and profile photo.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              {/* Profile Photo */}
              <div className="col-span-full">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="photo" className="block text-sm/6 font-medium text-walnut">
                  Photo
                </label>
                <div className="mt-2 flex items-center gap-x-3">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()}
                      alt="Profile"
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon aria-hidden="true" className="size-12 text-walnut-200" />
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-walnut shadow-sm ring-1 ring-inset ring-cream-300 hover:bg-cream"
                  >
                    {avatarUploading ? 'Uploading...' : 'Change'}
                    <input
                      id="avatar-upload"
                      name="avatar-upload"
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
                      className="text-sm font-semibold text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {avatarMessage && (
                  <p className={`mt-2 text-sm ${avatarMessage.includes('success') || avatarMessage === 'Avatar removed' ? 'text-green-600' : 'text-red-600'}`}>
                    {avatarMessage}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div className="sm:col-span-3">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="firstName" className="block text-sm/6 font-medium text-walnut">
                  First name
                </label>
                <div className="mt-2">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="sm:col-span-3">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="lastName" className="block text-sm/6 font-medium text-walnut">
                  Last name
                </label>
                <div className="mt-2">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="sm:col-span-4">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="email" className="block text-sm/6 font-medium text-walnut">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={user?.email || ''}
                    disabled
                    className="block w-full rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 text-base text-walnut-300"
                  />
                </div>
                <p className="mt-1 text-sm/6 text-walnut-400">
                  Email cannot be changed.
                </p>
              </div>

              {/* Phone */}
              <div className="sm:col-span-3">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="phone" className="block text-sm/6 font-medium text-walnut">
                  Phone
                </label>
                <div className="mt-2">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <p className="mt-1 text-sm/6 text-walnut-400">
                  Saved so we can auto-fill your next order.
                </p>
              </div>
            </div>

            {/* Saved delivery address */}
            <h3 className="mt-8 text-sm/7 font-semibold text-walnut">Default delivery address</h3>
            <p className="mt-1 text-sm/6 text-walnut-400">
              We&apos;ll pre-fill this when you order. You can always change it at checkout.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-4">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="street" className="block text-sm/6 font-medium text-walnut">Street address</label>
                <div className="mt-2">
                  <input id="street" type="text" autoComplete="street-address" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className={fieldClass} />
                </div>
              </div>
              <div className="sm:col-span-2">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="unit" className="block text-sm/6 font-medium text-walnut">Unit (optional)</label>
                <div className="mt-2">
                  <input id="unit" type="text" value={address.unit} onChange={(e) => setAddress({ ...address, unit: e.target.value })} className={fieldClass} />
                </div>
              </div>
              <div className="sm:col-span-3">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="neighborhood" className="block text-sm/6 font-medium text-walnut">Neighborhood (optional)</label>
                <div className="mt-2">
                  <select id="neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} className={fieldClass}>
                    <option value="">Select…</option>
                    {neighborhoods.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sm:col-span-6">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="notes" className="block text-sm/6 font-medium text-walnut">Delivery notes (optional)</label>
                <div className="mt-2">
                  <textarea id="notes" rows={2} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} className={fieldClass} />
                </div>
              </div>
            </div>

            {profileMessage && (
              <p className={`mt-4 text-sm ${profileMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {profileMessage}
              </p>
            )}
          </div>

          {/* Newsletter Section */}
          <div className="border-b border-cream-300 pb-12">
            <h2 className="text-base/7 font-semibold text-walnut">Newsletter</h2>
            <p className="mt-1 text-sm/6 text-walnut-400">
              Get seasonal firewood tips, restock alerts, and neighbor-only deals in your inbox.
            </p>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="newsletter" className="mt-6 flex items-center gap-3 text-sm font-medium text-walnut">
              <input
                id="newsletter"
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="h-4 w-4 rounded border-cream-300 text-ember focus:ring-ember"
              />
              Email me VOLW Firewood updates
            </label>
          </div>

          {/* Change Password Section */}
          <div className="border-b border-cream-300 pb-12">
            <h2 className="text-base/7 font-semibold text-walnut">Change Password</h2>
            <p className="mt-1 text-sm/6 text-walnut-400">
              Update your password to keep your account secure.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              {/* Current Password */}
              <div className="sm:col-span-4">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="currentPassword" className="block text-sm/6 font-medium text-walnut">
                  Current password
                </label>
                <div className="mt-2">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="sm:col-span-4">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="newPassword" className="block text-sm/6 font-medium text-walnut">
                  New password
                </label>
                <div className="mt-2">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
                <p className="mt-1 text-sm/6 text-walnut-400">
                  Must be at least 6 characters.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="sm:col-span-4">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="confirmPassword" className="block text-sm/6 font-medium text-walnut">
                  Confirm new password
                </label>
                <div className="mt-2">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-x-4">
              <button
                type="button"
                onClick={handlePasswordSubmit}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className="rounded-xl bg-ember px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMessage}
                </p>
              )}
            </div>
          </div>

          {/* Sign Out Section */}
          <div className="border-b border-cream-300 pb-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base/7 font-semibold text-walnut">Sign out</h2>
                <p className="mt-1 text-sm/6 text-walnut-400">Sign out of your account on this device.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-walnut shadow-sm ring-1 ring-inset ring-cream-300 hover:bg-cream"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Danger Zone Section */}
          <div className="pb-12">
            <h2 className="text-base/7 font-semibold text-red-600">Danger Zone</h2>
            <p className="mt-1 text-sm/6 text-walnut-400">
              Irreversible actions for your account.
            </p>

            <div className="mt-10">
              {/* Delete Account */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm/6 font-medium text-walnut">Delete account</h3>
                  <p className="text-sm/6 text-walnut-400">Permanently delete your account and all data.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="mt-6 flex items-center justify-end gap-x-6 border-t border-cream-300 pt-6">
          <button
            type="button"
            onClick={() => {
              setFirstName(user?.firstName || '');
              setLastName(user?.lastName || '');
              setProfileMessage('');
            }}
            className="text-sm/6 font-semibold text-walnut"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-ember px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-walnut/60 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowDeleteModal(false)}
              role="button"
              tabIndex={0}
              aria-label="Close modal"
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <h3 className="text-base/7 font-semibold text-walnut mb-4">
                  Delete Account
                </h3>
                <p className="text-sm/6 text-walnut-400 mb-4">
                  This action cannot be undone. Please enter your password to confirm.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
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
                  className="inline-flex w-full justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-walnut shadow-sm ring-1 ring-inset ring-cream-300 hover:bg-cream sm:col-start-1 sm:mt-0"
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
