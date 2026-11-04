/**
 * Game-balance values, not real flight speeds. Each completed session stores the rate that
 * was in force when it finished, so changing this later never rewrites past arrivals.
 */
export const TRAVEL_CONFIG = {
  kmPerMinute: 50,
  /** Number of next-destination suggestions in guided mode. */
  guidedSuggestions: 3,
} as const;
