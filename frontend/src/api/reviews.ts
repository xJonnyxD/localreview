import api from './client';
import type { Comment, PaginatedResponse, Review } from '../types';

export async function getBusinessReviews(businessId: string, params?: Record<string, string | number>): Promise<PaginatedResponse<Review>> {
  const { data } = await api.get(`/reviews/business/${businessId}`, { params });
  return data;
}

export async function createReview(body: { business_id: string; rating: number; title?: string; text: string; tags?: string[] }): Promise<Review> {
  const { data } = await api.post('/reviews', body);
  return data;
}

export async function toggleHelpful(reviewId: string): Promise<Review> {
  const { data } = await api.post(`/reviews/${reviewId}/helpful`);
  return data;
}

export async function getComments(reviewId: string): Promise<Comment[]> {
  const { data } = await api.get(`/reviews/${reviewId}/comments`);
  return data;
}

export async function addComment(reviewId: string, text: string): Promise<Comment> {
  const { data } = await api.post(`/reviews/${reviewId}/comments`, { text });
  return data;
}

export async function respondToReview(reviewId: string, text: string): Promise<Review> {
  const { data } = await api.post(`/reviews/${reviewId}/respond`, { text });
  return data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api.delete(`/reviews/${reviewId}`);
}
