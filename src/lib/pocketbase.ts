import PocketBase from 'pocketbase';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL as string;

if (!pbUrl) {
  throw new Error('Missing VITE_POCKETBASE_URL environment variable');
}

export const pb = new PocketBase(pbUrl);

// Keep the auth store synced across tabs
pb.authStore.onChange(() => {
  // PocketBase handles localStorage persistence automatically
}, true);

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
  // authRefresh is a no-op if the token is still fresh.
  try {
    await pb.collection('users').authRefresh();
  } catch {
    // If the refresh itself fails the token is truly expired — clear it so the
    // AuthContext listener redirects the user to the login screen.
    pb.authStore.clear();
    throw new Error('Session expired. Please sign in again.');
  }
}
