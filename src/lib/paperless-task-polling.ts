export const DEFAULT_PAPERLESS_TASK_UNAVAILABLE_ATTEMPTS = 10;

export type PaperlessTaskAvailability = {
  consecutiveUnavailable: number;
  unavailable: boolean;
};

/** Paperless may briefly return no task while an accepted job becomes visible.
 * Require consecutive empty responses so one transient gap cannot strand or
 * prematurely fail a durable upload. */
export function advancePaperlessTaskAvailability(
  consecutiveUnavailable: number,
  taskAvailable: boolean,
  unavailableAttempts = DEFAULT_PAPERLESS_TASK_UNAVAILABLE_ATTEMPTS,
): PaperlessTaskAvailability {
  if (taskAvailable) return { consecutiveUnavailable: 0, unavailable: false };
  const threshold = Math.max(1, Math.floor(unavailableAttempts));
  const nextCount = Math.max(0, consecutiveUnavailable) + 1;
  return {
    consecutiveUnavailable: nextCount,
    unavailable: nextCount >= threshold,
  };
}
