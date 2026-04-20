import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy handled in vite.config.js
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
