import { useState, useEffect, useCallback } from 'react';
import { pb } from './pocketbase';
import { useAuth } from '../contexts/AuthContext';

export interface TagColor {
  name: string;
  color: string;
}

let cache: TagColor[] | null = null;
let cacheUserId: string | null = null;
const listeners: Array<() => void> = [];

const notify = () => listeners.forEach(fn => fn());

export const invalidateTagCache = () => {
  cache = null;
  notify();
};

export function useTagColors(): Record<string, string> {
  const { user } = useAuth();
  const [map, setMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    if (cache && cacheUserId === user.id) {
      const m: Record<string, string> = {};
      cache.forEach(t => { m[t.name] = t.color; });
      setMap(m);
      return;
    }
    const records = await pb.collection('tags').getFullList({
      filter: `user_id = '${user.id}'`,
      fields: 'name,color',
    });
    cache = records as unknown as TagColor[];
    cacheUserId = user.id;
    const m: Record<string, string> = {};
    cache.forEach(t => { m[t.name] = t.color; });
    setMap(m);
  }, [user]);

  useEffect(() => {
    load();
    listeners.push(load);
    return () => {
      const idx = listeners.indexOf(load);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [load]);

  return map;
}
