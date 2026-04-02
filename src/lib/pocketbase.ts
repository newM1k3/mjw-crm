import PocketBase from 'pocketbase';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL as string;

if (!pbUrl) {
  throw new Error('Missing VITE_POCKETBASE_URL environment variable');
}

export const pb = new PocketBase(pbUrl);

// ---------------------------------------------------------------------------
// 1. Disable auto-cancellation
//    The SDK cancels an in-flight request when an identical one is dispatched
//    before it resolves. In React 18 StrictMode this fires as a spurious
//    "ClientResponseError 0: The request was autocancelled" on every double-
//    render. Disabling it globally is the SDK-recommended approach for React.
//    See: https://github.com/pocketbase/js-sdk#auto-cancellation
// ---------------------------------------------------------------------------
pb.autoCancellation(false);

// ---------------------------------------------------------------------------
// 2. Global 403 / 401 interceptor
//    PocketBase API rules return 403 when the auth token is missing, expired,
//    or does not satisfy the collection rule (e.g. user_id = @request.auth.id).
//    Without an interceptor the UI is left in an infinite loading spinner.
//    This hook fires BEFORE the error propagates to the calling component so
//    the auth store is cleared and a custom DOM event is dispatched. AuthContext
//    listens for this event and redirects the user to the login screen.
// ---------------------------------------------------------------------------
pb.beforeSend = (url, options) => {
  return { url, options };
};

pb.afterSend = (response, data) => {
  if (response.status === 401 || response.status === 403) {
    // Clear the stale token so pb.authStore.isValid becomes false everywhere.
    pb.authStore.clear();
    // Dispatch a DOM event so AuthContext (or any listener) can react without
    // creating a circular import between pocketbase.ts and AuthContext.tsx.
    window.dispatchEvent(new CustomEvent('pb:authError', { detail: { status: response.status } }));
  }
  return data;
};

// ---------------------------------------------------------------------------
// 3. Keep the auth store synced across browser tabs.
//    PocketBase handles localStorage persistence automatically.
// ---------------------------------------------------------------------------
pb.authStore.onChange(() => {}, true);

// ---------------------------------------------------------------------------
// 4. ensureAuth() — call before every write operation
//    Proactively refreshes the token so it never expires mid-session.
//    Throws a clear error (not a silent 403) if the user is not authenticated.
// ---------------------------------------------------------------------------

/**
 * Ensures the current auth token is valid before performing a write operation.
 *
 * PocketBase tokens expire after a period of inactivity. Calling this helper
 * before any create/update/delete request silently refreshes a stale-but-valid
 * token so the subsequent request carries a fresh Bearer token and does not
 * receive a 403 Forbidden response.
 *
 * Usage:
 *   await ensureAuth();
 *   await pb.collection('clients').create({ ... });
 *
 * @throws {Error} if the user is not authenticated at all (no token in store).
 */
export async function ensureAuth(): Promise<void> {
  if (!pb.authStore.isValid) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  // Proactively refresh the token so it never expires mid-session.
  try {
    await pb.collection('users').authRefresh();
  } catch {
    // If the refresh itself fails the token is truly expired — clear it so the
    // AuthContext onChange listener redirects the user to the login screen.
    pb.authStore.clear();
    throw new Error('Session expired. Please sign in again.');
  }
}
