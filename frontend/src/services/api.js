import axios from 'axios';
import { auth } from './firebase';

// In production (Vercel), VITE_API_URL points to the deployed Flask backend.
// In local dev, the Vite proxy rewrites /api → http://localhost:5001/api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://giki-course-hub-backend.onrender.com/api',
  withCredentials: true,
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

// Cache high-traffic, low-churn endpoints (TTL: 15 minutes)
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHED_ENDPOINTS = [
  '/courses',
  '/categories',
  '/stats',
  '/faculties',
  '/admin/faculties-programs'
];

const originalGet = api.get;

api.get = async (url, config) => {
  // Check if this endpoint should be cached
  const isCacheable = CACHED_ENDPOINTS.some(endpoint => url.includes(endpoint));
  
  if (isCacheable) {
    const cacheKey = `api_cache_${url}`;
    const cachedData = localStorage.getItem(cacheKey);
    
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
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // If no cache or cache expired, fetch normally
  const response = await originalGet.call(api, url, config);
  
  // If successful and cacheable, save to localStorage
  if (isCacheable && response.status === 200 && response.data?.success) {
    localStorage.setItem(`api_cache_${url}`, JSON.stringify({
      timestamp: Date.now(),
      data: response.data
    }));
  }
  
  return response;
};

export default api;
