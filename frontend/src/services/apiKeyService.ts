import api from './api';

export interface ApiKeyItem {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  raw_api_key?: string;
}

export interface CreateApiKeyDto {
  name: string;
  scopes: string[];
  expires_in_days?: number | null;
}

export interface SignStreamDto {
  episode_id: number;
  expires_in_seconds?: number;
}

export interface SignStreamResult {
  episode_id: number;
  expires_at: number;
  signature: string;
  signed_url: string;
  direct_stream_path: string;
}

export interface BulkImportDto {
  anime_id: number;
  episodes: {
    episode_number: number;
    title?: string;
    video_url: string;
    is_free?: boolean;
  }[];
}

export const apiKeyService = {
  listKeys: async (): Promise<ApiKeyItem[]> => {
    const res = await api.get('/admin/api-keys');
    return res.data;
  },

  createKey: async (dto: CreateApiKeyDto): Promise<ApiKeyItem> => {
    const res = await api.post('/admin/api-keys', dto);
    return res.data;
  },

  toggleKey: async (keyId: number): Promise<{ id: number; is_active: boolean }> => {
    const res = await api.patch(`/admin/api-keys/${keyId}/toggle`);
    return res.data;
  },

  deleteKey: async (keyId: number): Promise<void> => {
    await api.delete(`/admin/api-keys/${keyId}`);
  },

  signStreamUrl: async (dto: SignStreamDto): Promise<SignStreamResult> => {
    const res = await api.post('/stream/sign', dto);
    return res.data;
  },

  bulkImportEpisodes: async (dto: BulkImportDto) => {
    const res = await api.post('/stream/bulk-import', dto);
    return res.data;
  },
};
