// TypeScript type definitions for MER DONGHUA

export type UserRole = 'USER' | 'ADMIN' | 'STAFF' | 'OWNER';
export type AnimeType = 'ANIME' | 'DONGHUA' | 'DRAMA' | 'MOVIE';
export type AnimeStatus = 'ONGOING' | 'COMPLETED' | 'UPCOMING' | 'HIATUS';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  is_vip: boolean;
  vip_plan?: string | null;
  vip_started_at?: string | null;
  vip_expires_at?: string | null;
  is_vip_active: boolean;
  unlocked_movies?: string[];
  phone_number?: string | null;
  telegram_username?: string | null;
  telegram_id?: string | null;
  login_source?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UserStats {
  favorites_count: number;
  history_count: number;
  comments_count: number;
  ratings_count: number;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface Anime {
  id: number;
  title: string;
  slug: string;
  alt_title?: string;
  description?: string;
  poster_url?: string;
  banner_url?: string;
  trailer_url?: string;
  year?: number;
  season?: number;
  status: AnimeStatus;
  studio?: string;
  country?: string;
  airing_day?: string;
  heat_score: number;
  type: AnimeType;
  is_featured: boolean;
  is_trending: boolean;
  is_published: boolean;
  is_free?: boolean;
  view_count: number;
  average_rating: number;
  rating_count: number;
  episode_count: number;
  genres: Genre[];
  created_at: string;
  updated_at?: string;
}

export interface Episode {
  id: number;
  anime_id: number;
  episode_number: number;
  title?: string;
  description?: string;
  video_url?: string;
  subtitle_url?: string;
  thumbnail_url?: string;
  duration_seconds: number;
  is_published: boolean;
  is_free?: boolean;
  is_vip?: boolean;
  is_vip_only?: boolean;
  view_count: number;
  created_at: string;
}

export interface DanmakuItem {
  id: number;
  episode_id: number;
  user_id?: number;
  text: string;
  time_seconds: number;
  color: string;
  position: 'scroll' | 'top' | 'bottom';
  created_at: string;
}

export interface CommentAuthor {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface Comment {
  id: number;
  anime_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  likes_count: number;
  is_reported: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  user?: CommentAuthor;
  replies: Comment[];
}

export interface WatchHistoryItem {
  id: number;
  user_id: number;
  anime_id: number;
  episode_id: number;
  progress_seconds: number;
  duration_seconds: number;
  last_watched_at: string;
  anime_title: string;
  anime_slug: string;
  anime_poster: string;
  episode_number: number;
  episode_thumbnail: string;
}

export interface Rating {
  id: number;
  anime_id: number;
  user_id: number;
  score: number;
  created_at: string;
}

export interface Banner {
  id: number;
  anime_id?: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  order_index: number;
}

export interface AdminStats {
  total_users: number;
  total_anime: number;
  total_donghua: number;
  total_drama?: number;
  total_movies?: number;
  total_episodes: number;
  total_views: number;
  active_users: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type WeeklySchedule = Record<string, Anime[]>;

export interface VIPPlan {
  key: string;
  title: string;
  days: number;
  amount_usd: number;
  amount_khr: number;
  description: string;
  badge?: string;
}

export interface PaymentTransactionResponse {
  transaction_id: string;
  bill_number: string;
  plan_type: string;
  plan_title: string;
  duration_days: number;
  amount: number;
  currency: string;
  amount_khr: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  khqr_string: string;
  deeplink: string;
  expires_at: string;
  created_at: string;
}

export interface PaymentStatusCheck {
  transaction_id: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  paid_at?: string | null;
  is_vip_active: boolean;
  vip_plan?: string | null;
  vip_expires_at?: string | null;
  message?: string;
}

