/**
 * Web: Metro would resolve `zustand/middleware` to `esm/middleware.mjs` (import.meta).
 * Import the published CJS file by path so only `middleware.js` is bundled.
 */
export { createJSONStorage, persist } from '../../node_modules/zustand/middleware.js';
