export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  preferences: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: number | null;
}

export interface BusinessHours {
  id: number;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  price_level: number | null;
  is_verified: boolean;
  is_active: boolean;
  avg_rating: number;
  review_count: number;
  photo_url: string | null;
  categories: Category[];
  hours: BusinessHours[];
  created_at: string;
  updated_at: string;
}

export interface Photo {
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
}

export interface OwnerResponse {
  text: string;
  responded_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  user_display_name: string;
  user_avatar_url: string | null;
  rating: number;
  title: string | null;
  text: string;
  tags: string[];
  photos: Photo[];
  helpful_count: number;
  status: string;
  owner_response: OwnerResponse | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  review_id: string;
  business_id: string;
  user_id: string;
  user_display_name: string;
  text: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
