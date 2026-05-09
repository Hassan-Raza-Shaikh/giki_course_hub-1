import axios from 'axios';

// In production (Vercel), VITE_API_URL points to the deployed Flask backend.
// In local dev, the Vite proxy rewrites /api → http://localhost:5001/api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
