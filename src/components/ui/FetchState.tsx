/**
 * FetchState.tsx — MJW CRM shared fetch-state UI components
 *
 * Provides three distinct, visually differentiated states that replace
 * blank screens and infinite spinners:
 *
 *   <EmptyState>       — Collection returned 0 records
 *   <PermissionDenied> — PocketBase returned 403 Forbidden
 *   <TimedOut>         — Request exceeded the 10-second timeout
 *
 * Also exports `useFetchState`, a hook that wraps any PocketBase fetch
 * with a 10-second timeout, classifies the error type, and returns the
 * correct state flag for the calling component to render.
 *
 * Usage:
 *   const { status, run } = useFetchState();
 *   // status: 'idle' | 'loading' | 'success' | 'empty' | 'forbidden' | 'timeout' | 'error'
 *   await run(() => pb.collection('clients').getFullList(...));
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  FolderOpen,
  ShieldOff,
  Clock,
  AlertCircle,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FetchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'forbidden'
  | 'timeout'
  | 'error';

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon?: LucideIcon;
  /** Primary headline, e.g. "No Clients Found" */
  message: string;
  /** Secondary helper text, e.g. "Click 'Add Client' to get started." */
  sub?: string;
  /** Optional action button rendered below the sub-text */
  action?: React.ReactNode;
  /** Extra Tailwind classes for the wrapper */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderOpen,
  message,
  sub,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-gray-400" />
    </div>
    <p className="text-sm font-semibold text-gray-700">{message}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 max-w-xs">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─── PermissionDenied ─────────────────────────────────────────────────────────

interface PermissionDeniedProps {
  /** Optional context, e.g. "clients" */
  resource?: string;
  /** Extra Tailwind classes for the wrapper */
  className?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  resource = 'this data',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <ShieldOff className="w-7 h-7 text-red-400" />
    </div>
    <p className="text-sm font-semibold text-gray-800">Permission Denied</p>
    <p className="text-xs text-gray-500 mt-1 max-w-xs">
      You don't have permission to access {resource}. This is usually a PocketBase API rule
      configuration issue — check that your collection rules include{' '}
      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
        user_id = @request.auth.id
      </code>{' '}
      and that you are signed in.
    </p>
    <a
      href="mailto:admin@mjwdesign.ca"
      className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:underline"
    >
      <Mail className="w-3.5 h-3.5" />
      Contact Admin
    </a>
  </div>
);

// ─── TimedOut ─────────────────────────────────────────────────────────────────

interface TimedOutProps {
  /** Called when the user clicks Retry */
  onRetry: () => void;
  /** Extra Tailwind classes for the wrapper */
  className?: string;
}

export const TimedOut: React.FC<TimedOutProps> = ({ onRetry, className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
      <Clock className="w-7 h-7 text-orange-400" />
    </div>
    <p className="text-sm font-semibold text-gray-800">Request Timed Out</p>
    <p className="text-xs text-gray-500 mt-1 max-w-xs">
      The server took too long to respond. Check your internet connection and try again.
    </p>
    <button
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white text-xs font-medium rounded hover:bg-primary-800 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Retry
    </button>
  </div>
);

// ─── FetchError (generic, non-403 errors) ─────────────────────────────────────

interface FetchErrorProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export const FetchError: React.FC<FetchErrorProps> = ({
  message = 'Something went wrong while loading data.',
  onRetry,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <AlertCircle className="w-7 h-7 text-gray-400" />
    </div>
    <p className="text-sm font-semibold text-gray-800">Failed to Load</p>
    <p className="text-xs text-gray-500 mt-1 max-w-xs">{message}</p>
    <button
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white text-xs font-medium rounded hover:bg-primary-800 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Retry
    </button>
  </div>
);

// ─── useFetchState hook ───────────────────────────────────────────────────────

const TIMEOUT_MS = 10_000; // 10 seconds

interface UseFetchStateReturn {
  status: FetchStatus;
  /** Run a PocketBase fetch wrapped in a 10-second timeout.
   *  Returns the result of the fetch, or null on error/timeout.
   *  Sets `status` to the appropriate value automatically. */
  run: <T>(fn: () => Promise<T>) => Promise<T | null>;
  /** Manually reset status back to 'idle' */
  reset: () => void;
}

/**
 * Wraps a PocketBase fetch with:
 *   - A 10-second timeout that sets status to 'timeout'
 *   - 403 detection that sets status to 'forbidden'
 *   - Empty-array detection that sets status to 'empty'
 *   - Generic error fallback that sets status to 'error'
 *
 * Example:
 *   const { status, run } = useFetchState();
 *   const clients = await run(() => pb.collection('clients').getFullList(...));
 *   if (status === 'forbidden') return <PermissionDenied resource="clients" />;
 *   if (status === 'timeout') return <TimedOut onRetry={refresh} />;
 *   if (status === 'empty') return <EmptyState ... />;
 */
export function useFetchState(): UseFetchStateReturn {
  const [status, setStatus] = useState<FetchStatus>('idle');

  const reset = useCallback(() => setStatus('idle'), []);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setStatus('loading');
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('__TIMEOUT__')), TIMEOUT_MS)
        ),
      ]);

      // Detect empty collections (arrays and ResultList)
      if (Array.isArray(result) && result.length === 0) {
        setStatus('empty');
      } else if (
        result !== null &&
        typeof result === 'object' &&
        'items' in (result as object) &&
        Array.isArray((result as any).items) &&
        (result as any).items.length === 0
      ) {
        setStatus('empty');
      } else {
        setStatus('success');
      }

      return result;
    } catch (err: any) {
      if (err?.message === '__TIMEOUT__') {
        setStatus('timeout');
        return null;
      }
      // PocketBase SDK throws ClientResponseError with a `status` field
      if (err?.status === 403 || err?.response?.code === 403) {
        setStatus('forbidden');
        return null;
      }
      if (err?.status === 401 || err?.response?.code === 401) {
        // The global afterSend interceptor in pocketbase.ts will handle the
        // logout/redirect — we just set a forbidden state here for the UI.
        setStatus('forbidden');
        return null;
      }
      setStatus('error');
      return null;
    }
  }, []);

  return { status, run, reset };
}
