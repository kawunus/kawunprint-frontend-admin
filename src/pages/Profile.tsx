import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';
import { User, UpdateProfileRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await usersApi.getMe();
      setUser(userData);
      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setEmail(userData.email);
      setPhoneNumber(userData.phoneNumber);
    } catch (err: any) {
      setError(err.response?.data?.message || t('profile.loadError') || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!firstName.trim()) {
      setError(t('profile.errors.firstNameRequired') || 'First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError(t('profile.errors.lastNameRequired') || 'Last name is required');
      return;
    }
    if (!email.trim()) {
      setError(t('profile.errors.emailRequired') || 'Email is required');
      return;
    }
    if (!phoneNumber.trim()) {
      setError(t('profile.errors.phoneRequired') || 'Phone number is required');
      return;
    }
    if (!currentPassword) {
      setError(t('profile.errors.currentPasswordRequired') || 'Current password is required to confirm changes');
      return;
    }

    // Password change validation
    if (showChangePassword) {
      if (!newPassword) {
        setError(t('profile.errors.newPasswordRequired') || 'New password is required');
        return;
      }
      if (newPassword.length < 6) {
        setError(t('profile.errors.passwordTooShort') || 'Password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t('profile.errors.passwordsDoNotMatch') || 'Passwords do not match');
        return;
      }
    }

    try {
      setSaving(true);
      const updateData: UpdateProfileRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        currentPassword,
        newPassword: showChangePassword && newPassword ? newPassword : undefined,
      };

      const updatedUser = await usersApi.updateMe(updateData);
      setUser(updatedUser);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data || t('profile.saveError') || 'Failed to update profile';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">{error || t('profile.notFound') || 'User not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('profile.title') || 'Profile'}</h1>
        <p className="text-gray-600 mt-1">{t('profile.subtitle') || 'Manage your account information'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">{t('profile.personalInfo') || 'Personal Information'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.firstName') || 'First Name'} *
              </label>
              <Input
                type="text"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                placeholder={t('profile.firstNamePlaceholder') || 'John'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.lastName') || 'Last Name'} *
              </label>
              <Input
                type="text"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                placeholder={t('profile.lastNamePlaceholder') || 'Doe'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.email') || 'Email'} *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder={t('profile.emailPlaceholder') || 'john.doe@example.com'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.phone') || 'Phone Number'} *
              </label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                placeholder={t('profile.phonePlaceholder') || '+375291234567'}
                required
              />
            </div>
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {user.telegramAccount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.telegram') || 'Telegram'}
                </label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                  {user.telegramAccount}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.role') || 'Role'}
              </label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'EMPLOYEE' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.status') || 'Status'}
              </label>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? (t('profile.active') || 'Active') : (t('profile.inactive') || 'Inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('profile.security') || 'Security'}</h2>
            {!showChangePassword && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowChangePassword(true)}
              >
                {t('profile.changePassword') || 'Change Password'}
              </Button>
            )}
          </div>

          {showChangePassword && (
            <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.newPassword') || 'New Password'} *
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  placeholder={t('profile.newPasswordPlaceholder') || 'Enter new password'}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.confirmPassword') || 'Confirm New Password'} *
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder={t('profile.confirmPasswordPlaceholder') || 'Confirm new password'}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.currentPassword') || 'Current Password'} *
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
              placeholder={t('profile.currentPasswordPlaceholder') || 'Enter current password to confirm changes'}
              required
              autoComplete="current-password"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('profile.currentPasswordHint') || 'Required to confirm any changes to your profile'}
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              {t('profile.saveSuccess') || 'Profile updated successfully!'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex-1"
          >
            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save Changes')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={loadUserData}
            disabled={saving}
          >
            {t('common.reset') || 'Reset'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
