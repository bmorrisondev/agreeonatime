import { ConvexError } from 'convex/values';

/** User-facing message from a failed Convex mutation (handles ConvexError.data). */
export function formatMutationError(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const { data } = error;
    if (typeof data === 'string' && data.length > 0) {
      return data;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}
