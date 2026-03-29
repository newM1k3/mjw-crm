import React, { useState } from 'react';
import { Shield, Smartphone, CheckCircle } from 'lucide-react';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isEnabled }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  if (isEnabled) {
    return (
      <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500 mt-0.5">Your account is protected with two-factor authentication.</p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <CheckCircle className="w-3 h-3" /> Enabled
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Add an extra layer of security to your account using an authenticator app.
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full mb-4 block w-fit">
            Not enabled
          </span>
          <div>
            <button
              type="button"
              onClick={() => setShowComingSoon(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              Set Up 2FA
            </button>
            {showComingSoon && (
              <p className="mt-3 text-xs text-primary-700 font-medium bg-primary-50 border border-primary-200 px-3 py-2 rounded-lg flex items-center gap-1.5 w-fit">
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                Coming Soon — Two-factor authentication will be available in a future update.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
