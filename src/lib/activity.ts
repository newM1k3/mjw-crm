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
  // Fire-and-forget: activity logging must NEVER block or throw to the caller.
  // If the activities collection is unavailable or the rule rejects the write,
  // we swallow the error silently so the primary action (create/update/delete)
  // always completes successfully from the user's perspective.
  try {
    await pb.collection('activities').create({
      user_id: userId,
      type,
      title,
      description,
      entity_id: entityId || null,
      entity_type: entityType,
    });
  } catch {
    // Intentionally swallowed — activity log is non-critical.
  }
};
