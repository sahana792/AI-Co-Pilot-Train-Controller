// RailControl AI v7 — API Service
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  get: (path: string) => fetch(`${BASE}${path}`).then(r => r.json()),
  post: (path: string, body: any) => fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json()),
  patch: (path: string, body: any) => fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json()),
};

export const getTrains      = () => api.get('/trains/');
export const getPlatforms   = () => api.get('/platforms/');
export const getSignals     = () => api.get('/signals/');
export const getAlerts      = () => api.get('/alerts/');
export const getOverview    = () => api.get('/trains/stats/summary');
export const chatbot        = (message: string) => api.post('/chatbot/message', { message });
export const controlSignal  = (signal_id: string, status: string) => api.patch(`/signals/${signal_id}`, { status });
export const updatePlatform = (platform_id: string, action: 'assign'|'release') => 
  api.post(`/platforms/${platform_id}/${action}`, {});
export const predictDelay   = (body: any) => api.post('/trains/stats/summary', body);