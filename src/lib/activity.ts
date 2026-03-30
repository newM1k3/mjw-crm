import { pb } from './pocketbase';

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
  await pb.collection('activities').create({
    user_id: userId,
    type,
    title,
    description,
    entity_id: entityId || null,
    entity_type: entityType,
  });
};
