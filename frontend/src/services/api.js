import axios from 'axios';
import { auth } from './firebase';

// In production (Vercel), VITE_API_URL points to the deployed Flask backend.
// In local dev, the Vite proxy rewrites /api → http://localhost:5001/api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://giki-course-hub-backend.onrender.com/api',
  withCredentials: true,
  timeout: 60000, // Global 60s timeout to prevent infinite hanging
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach Firebase token (Bypasses mobile cookie blocking)
api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Failed to attach Firebase token", err);
    }
  }
  return config;
});

// The backend asks for a verified email before uploads, reports and issues. A
// user who has just clicked the verification link still holds a token that says
// unverified, so reload their Firebase profile and retry once with a fresh token.
api.interceptors.response.use(undefined, async (error) => {
  const { response, config } = error;
  if (response?.status === 403 && response.data?.code === 'email_unverified'
      && auth.currentUser && config && !config._verifyRetried) {
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        await auth.currentUser.getIdToken(true);
        return api.request({ ...config, _verifyRetried: true });
      }
    } catch (err) {
      console.warn("Could not refresh email verification", err);
    }
  }
  return Promise.reject(error);
});

// Cache high-traffic, low-churn endpoints (TTL: 15 minutes)
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHED_ENDPOINTS = [
  '/courses',
  '/categories',
  '/stats',
  '/faculties',
  '/instructors',
  '/admin/faculties-programs'
];

const originalGet = api.get;

api.get = async (url, config) => {
  // Check if this endpoint should be cached
  const isCacheable = CACHED_ENDPOINTS.some(endpoint => 
    url === endpoint || url.startsWith(`${endpoint}?`)
  );
  
  if (isCacheable) {
    const cacheKey = `api_cache_${url}`;
    let cachedData = null;
    try {
      cachedData = localStorage.getItem(cacheKey);
    } catch {
      // Storage blocked (private mode, disabled cookies): just fetch
    }

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // If cache is fresh, return it wrapped in an Axios response format
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return Promise.resolve({
            data: parsed.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: config || {},
            request: {},
            cached: true // custom flag for debugging
          });
        }
      } catch (e) {
        // Corrupted cache, just ignore and fetch new
        try { localStorage.removeItem(cacheKey); } catch { /* storage unavailable */ }
      }
    }
  }

  // If no cache or cache expired, fetch normally
  const response = await originalGet.call(api, url, config);
  
  // If successful and cacheable, save to localStorage
  if (isCacheable && response.status === 200 && response.data?.success) {
    try {
      localStorage.setItem(`api_cache_${url}`, JSON.stringify({
        timestamp: Date.now(),
        data: response.data
      }));
    } catch {
      // Quota full or storage blocked: caching is optional, the response is still good
    }
  }
  
  return response;
};

// Drop a cached GET (e.g. after an admin changes the data behind it)
export const clearApiCache = (url) => {
  try { localStorage.removeItem(`api_cache_${url}`); } catch { /* storage unavailable */ }
};

export default api;
