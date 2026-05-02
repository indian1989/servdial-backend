class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttl = 3600) {
    const expiresAt = Date.now() + ttl * 1000;

    this.store.set(key, {
      value,
      expiresAt,
    });
  }

  get(key) {
    const data = this.store.get(key);

    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return data.value;
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const memoryCache = new MemoryCache();

/* =========================================================
   COMPATIBILITY LAYER (🔥 FIX YOUR ERRORS)
   THIS FIXES:
   - import { getCache }
   - import { setCache }
   ========================================================= */

export const getCache = (key) => memoryCache.get(key);
export const setCache = (key, value, ttl) =>
  memoryCache.set(key, value, ttl);
export const delCache = (key) => memoryCache.del(key);

export default memoryCache;