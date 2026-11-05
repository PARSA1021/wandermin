/**
 * Which cities have an illustrated postcard — without importing the scenes themselves, so the
 * main bundle stays light. A test keeps this list in sync with the scene registry.
 */
export const ILLUSTRATED = new Set([
  "seoul", "tokyo", "osaka", "kyoto", "taipei", "hong-kong", "singapore", "bangkok", "hanoi", "bali",
  "london", "paris", "rome", "venice", "barcelona", "amsterdam", "prague", "zurich", "vienna", "istanbul",
  "new-york", "los-angeles", "san-francisco", "vancouver", "toronto", "mexico-city",
  "sydney", "melbourne", "cairo", "cape-town",
  "busan", "jeju", "shanghai", "da-nang", "kuala-lumpur", "agra", "dubai",
  "lisbon", "athens", "reykjavik", "berlin", "marrakech", "nairobi", "zanzibar",
  "honolulu", "havana", "cusco", "rio-de-janeiro", "buenos-aires", "auckland",
]);
export const getSceneAvailable = (cityId: string) => ILLUSTRATED.has(cityId);
