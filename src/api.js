export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://casting-be.vercel.app';

export async function apiRequest(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}
