import React from 'react';
import { useTranslation } from 'react-i18next';

const Profile: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('profile.title') || 'Profile'}</h1>
      <div className="text-gray-600">{t('profile.empty') || 'This page is under construction.'}</div>
    </div>
  );
};

export default Profile;
