import api from './client';
import type { Business, Category, PaginatedResponse } from '../types';

export async function getBusinesses(params?: Record<string, string | number>): Promise<PaginatedResponse<Business>> {
  const { data } = await api.get('/businesses', { params });
  return data;
}

export async function getBusiness(id: string): Promise<Business> {
  const { data } = await api.get(`/businesses/${id}`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get('/businesses/categories');
  return data;
}

export async function searchBusinesses(params: Record<string, string | number>): Promise<PaginatedResponse<Business>> {
  const { data } = await api.get('/search', { params });
  return data;
}

export async function createBusiness(payload: Record<string, unknown>): Promise<Business> {
  const { data } = await api.post('/businesses', payload);
  return data;
}

export async function updateBusiness(id: string, payload: Record<string, unknown>): Promise<Business> {
  const { data } = await api.patch(`/businesses/${id}`, payload);
  return data;
}
