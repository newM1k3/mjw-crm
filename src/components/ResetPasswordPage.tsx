import React, { useEffect, useState } from 'react';
import { pb } from '../lib/pocketbase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// PocketBase password reset flow (v0.21)
// ---------------------------------------------------------------------------
// 1. User requests a reset: AuthPage calls
//      pb.collection('users').requestPasswordReset(email)
//    PocketBase sends an email containing a link like:
//      https://mjwdesign.ca/#reset-password?token=<TOKEN>
//
// 2. User clicks the link → App.tsx detects the hash and renders this page.
//    We extract the token from the URL hash query string.
//
// 3. User enters a new password → we call:
//      pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
//    This is the ONLY PocketBase v0.21 API for completing a password reset.
//    There is NO pb.auth.onAuthStateChange or pb.auth.updateUser in PocketBase.
//
// 4. On success we redirect to the login screen (App.tsx clears the hash).
// ---------------------------------------------------------------------------

interface ResetPasswordPageProps {
  onDone: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onDone }) => {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract the reset token from the URL hash on mount.
  // PocketBase email links use the format:
  //   https://yourapp.com/#reset-password?token=<TOKEN>
  // We parse both the query-string style (?token=) and the path style (/token/).
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#reset-password?token=abc123"
    const queryStart = hash.indexOf('?');
    if (queryStart !== -1) {
      const params = new URLSearchParams(hash.slice(queryStart));
      const t = params.get('token');
      if (t) { setToken(t); return; }
    }
    // Fallback: some PocketBase email templates embed the token as a path segment
    const pathMatch = hash.match(/[?&/]token[=/]([^&]+)/);
    if (pathMatch) { setToken(pathMatch[1]); return; }

    // No token found — the link is malformed or expired.
    setError('Invalid or expired reset link. Please request a new one.');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Missing reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    try {
      // PocketBase v0.21 password reset confirmation.
      // This call does NOT require the user to be authenticated — the token
      // itself is the proof of identity.
      await pb.collection('users').confirmPasswordReset(token, password, password);
      setSuccess(true);
      // Give the user 3 seconds to read the success message, then redirect.
      setTimeout(() => {
        window.location.hash = '';
        onDone();
      }, 3000);
    } catch (err: any) {
      // Surface PocketBase field-level validation errors (e.g. "password too short")
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const firstField = Object.values(data)[0] as any;
        if (firstField?.message) { setError(firstField.message); setLoading(false); return; }
      }
      setError(
        err?.response?.message ||
        err?.message ||
        'Failed to reset password. The link may have expired — please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-10 py-3 border border-gray-300 rounded text-sm outline-none transition-all duration-200 focus:border-primary-700 focus:border-2 bg-white";

  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Too short', color: 'bg-red-400', width: 'w-1/4' };
    if (password.length < 8) return { label: 'Fair', color: 'bg-orange-400', width: 'w-2/4' };
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (hasUpper && hasNum && hasSymbol) return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
    if (hasNum || hasUpper) return { label: 'Good', color: 'bg-green-400', width: 'w-3/4' };
    return { label: 'Fair', color: 'bg-orange-400', width: 'w-2/4' };
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-700 mb-4 md-elevation-2">
            <span className="text-xl font-medium text-white">M</span>
          </div>
          <h1 className="text-2xl font-medium text-gray-900">MJW Design</h1>
          <p className="text-sm text-gray-500 mt-1">CRM Dashboard</p>
        </div>

        <div className="bg-white rounded-lg md-elevation-1 overflow-hidden">
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Set a new password</h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose a strong password for your account.
            </p>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Password updated</p>
                  <p className="text-xs text-gray-500">
                    Your password has been changed successfully. Redirecting you to sign in…
                  </p>
                </div>
              </div>
            ) : !token && error ? (
              // Token is missing / malformed — show a clear error with a CTA
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Invalid reset link</p>
                  <p className="text-xs text-gray-500 mb-4">
                    This link is invalid or has expired. Please request a new password reset.
                  </p>
                  <button
                    type="button"
                    onClick={() => { window.location.hash = ''; onDone(); }}
                    className="text-sm text-primary-700 font-medium hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{passwordStrength.label}</p>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {confirm && password !== confirm && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Passwords do not match
                  </div>
                )}

                {error && (
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || password !== confirm || !token}
                  className="w-full py-3 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 md-elevation-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
