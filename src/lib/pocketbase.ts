import PocketBase from 'pocketbase';

const pbUrl = import.meta.env.VITE_POCKETBASE_URL as string;

if (!pbUrl) {
  throw new Error('Missing VITE_POCKETBASE_URL environment variable');
}

export const pb = new PocketBase(pbUrl);

// Keep the auth store synced across tabs
pb.authStore.onChange(() => {
  // PocketBase handles this automatically via localStorage
}, true);
