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

  // ---------------------------------------------------------------------------
  // Auto-update last_contact on the parent client record.
  //
  // When any activity is logged against a client entity, we stamp today's date
  // on that client's last_contact field. This keeps the "gone cold" priority
  // rule accurate — it reads last_contact to determine how long since the
  // client was engaged.
  //
  // Conditions:
  //   - entityType must be 'client' (not contact, note, event, etc.)
  //   - entityId must be present (the client's PocketBase record ID)
  //
  // This is also fire-and-forget — if the update fails it must not surface
  // as an error to the user. The activity itself has already been logged.
  // ---------------------------------------------------------------------------
  if (entityType === 'client' && entityId) {
    try {
      await pb.collection('clients').update(entityId, {
        last_contact: new Date().toISOString().split('T')[0],
      });
    } catch {
      // Intentionally swallowed — last_contact update is non-critical.
    }
  }
};
