/**
 * Cache Repository Tests
 */

import { getCacheRepository } from '@/lib/server/db/cacheRepository';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import type { DeparturesResponse } from '@/types';

// Mock Supabase client
jest.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient: jest.fn(),
  isSupabaseAvailable: jest.fn(() => Promise.resolve(true)),
}));

describe('CacheRepository', () => {
  const mockSupabase: Record<string, any> = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('get', () => {
    it('should return cached data when valid', async () => {
      const mockData: DeparturesResponse = {
        inbound: [],
        outbound: [],
        total: 0,
      };
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      const timestamp = new Date().toISOString();

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            data: mockData,
            expiresAt,
            timestamp,
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      const repo = getCacheRepository();
      const result = await repo.get('test-key');

      expect(result).toEqual({
        data: mockData,
        expiresAt,
        timestamp,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('cache_entries');
    });

    it('should return null when cache entry does not exist', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      const repo = getCacheRepository();
      const result = await repo.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null when cache entry is expired', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            data: { inbound: [], outbound: [], total: 0 },
            expiresAt: new Date(Date.now() - 60000).toISOString(),
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      const repo = getCacheRepository();
      const result = await repo.get('expired-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should upsert cache entry', async () => {
      const mockData: DeparturesResponse = {
        inbound: [],
        outbound: [],
        total: 0,
      };

      const mockUpsert = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockUpsert);

      const repo = getCacheRepository();
      const expiresAt = new Date(Date.now() + 60000);
      await repo.set('test-key', mockData, expiresAt);

      expect(mockSupabase.from).toHaveBeenCalledWith('cache_entries');
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          expiresAt: expiresAt.toISOString(),
        }),
        { onConflict: 'key' }
      );
    });
  });

  describe('delete', () => {
    it('should delete cache entry by key', async () => {
      const mockDelete = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockDelete);

      const repo = getCacheRepository();
      await repo.delete('test-key');

      expect(mockSupabase.from).toHaveBeenCalledWith('cache_entries');
      expect(mockDelete.delete).toHaveBeenCalled();
      expect(mockDelete.eq).toHaveBeenCalledWith('key', 'test-key');
    });
  });

  describe('cleanupExpired', () => {
    it('should clean up expired entries', async () => {
      const mockDelete = {
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockDelete);
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: 5,
        error: null,
      });

      const repo = getCacheRepository();
      const count = await repo.cleanupExpired();

      expect(mockSupabase.from).toHaveBeenCalledWith('cache_entries');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});



