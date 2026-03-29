import { supabase } from './supabase';

interface LogActivityParams {
  userId: string;
  type: string;
  title: string;
  description?: string;
  entityId?: string;
  entityType?: string;
}

export const logActivity = async ({
  userId,
  type,
  title,
  description = '',
  entityId,
  entityType = '',
}: LogActivityParams): Promise<void> => {
  await supabase.from('activities').insert([{
    user_id: userId,
    type,
    title,
    description,
    entity_id: entityId || null,
    entity_type: entityType,
  }]);
};
