import api from './client';
import type { TokenResponse, User } from '../types';

export async function register(
  email: string,
  password: string,
  display_name: string,
  is_business_owner = false,
): Promise<User> {
  const { data } = await api.post('/auth/register', { email, password, display_name, is_business_owner });
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
