import { apiClient, setAccessToken, clearAccessToken } from './client';
import { User, AuthResponse, RefreshResponse } from '../types/auth';

export async function loginApi(email: string, password: string): Promise<User> {
  const data = await apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });

  const token = data.accessToken || data.token;
  if (token) setAccessToken(token);
  return data.user;
}

export async function registerApi(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<User> {
  const data = await apiClient<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone }),
    skipAuth: true,
  });

  const token = data.accessToken || data.token;
  if (token) setAccessToken(token);
  return data.user;
}

export async function refreshApi(): Promise<string> {
  const data = await apiClient<RefreshResponse>('/api/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    retryOnExpire: false,
  });

  const token = data.accessToken || data.token;
  if (!token) throw new Error('No access token returned');
  setAccessToken(token);
  return token;
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient('/api/auth/logout', {
      method: 'POST',
      skipAuth: true,
    });
  } finally {
    clearAccessToken();
  }
}

export async function getMeApi(): Promise<User> {
  return apiClient<User>('/api/auth/me');
}
