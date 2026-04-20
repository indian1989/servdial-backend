// backend/utils/memoryCache.js
const cache = new Map();

/* ================= SET CACHE ================= */
export const setCache = (key, value, ttl = 60) => {
  const expires = Date.now() + ttl * 1000;

  cache.set(key, {
    value,
    expires,
  });
};

/* ================= GET CACHE ================= */
export const getCache = (key) => {
  const data = cache.get(key);

  if (!data) return null;

  if (Date.now() > data.expires) {
    cache.delete(key);
    return null;
  }

  return data.value;
};

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();

  for (const [key, data] of cache.entries()) {
    if (now > data.expires) {
      cache.delete(key);
    }
  }
}, 60000);

export const deleteCache = (key) => {
  if (!key) return;

  if (cache.has(key)) {
    cache.delete(key);
  }
};

/* ================= CLEAR CACHE ================= */
export const clearCache = () => {
  cache.clear();
};