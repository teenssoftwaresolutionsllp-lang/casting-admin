export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://casting-be-1.onrender.com')
  .trim()
  .replace(/\/+$/, '');

export async function apiRequest(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const endpoint = `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
  const response = await fetch(endpoint, {
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
