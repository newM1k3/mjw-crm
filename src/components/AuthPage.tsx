import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await pb.collection('users').create({
          name,
          email,
          password,
          passwordConfirm: password,
        });
        // Auto sign-in after registration
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').authWithPassword(email, password);
      }
    } catch (err: any) {
      setError(err?.response?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await pb.collection('users').requestPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 border border-gray-300 rounded text-sm outline-none transition-all duration-200 focus:border-primary-700 focus:border-2 bg-white";

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
          {mode === 'forgot' ? (
            <div className="p-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-700 transition-colors duration-200 mb-5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>

              <h2 className="text-base font-semibold text-gray-900 mb-1">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {resetSent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Check your email</p>
                    <p className="text-xs text-gray-500">
                      We sent a password reset link to{' '}
                      <span className="font-medium text-gray-700">{email}</span>.
                      The link expires in 1 hour.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="mt-2 text-sm text-primary-700 font-medium hover:underline"
                  >
                    Return to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>

                  {error && (
                    <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 md-elevation-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${
                    mode === 'login'
                      ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-200 ${
                    mode === 'register'
                      ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'login' && (
                    <div className="mt-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-gray-500 hover:text-primary-700 transition-colors duration-200"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 md-elevation-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                    : (mode === 'login' ? 'Sign In' : 'Create Account')
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {mode !== 'forgot' && (
          <p className="text-center text-xs text-gray-400 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary-700 font-medium hover:underline"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
