import { v5 as uuidv5 } from 'uuid';

export const CLERK_UUID_NAMESPACE = "a7f3c8d2-1e4b-4c8f-9a2d-5b6e7f8a9b0c";

/**
 * Maps a string Clerk user ID to a deterministic UUID
 * using UUIDv5 with a fixed namespace.
 * 
 * @param clerkUserId The user.id from Clerk
 * @returns A standard UUID string
 */
export function mapClerkIdToUUID(clerkUserId: string): string {
  return uuidv5(clerkUserId, CLERK_UUID_NAMESPACE);
}
