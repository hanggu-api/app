import prisma from '../database/prisma';
import logger from '../utils/logger';

/**
 * ProviderLocationCache: Cache LRU de providers próximos
 * - Reduz queries Haversine de O(n) para O(1)
 * - TTL: 30 segundos (troca de localização é comum)
 * - Invalidação ao mover provider (dispara por D1 update)
 */

interface CachedProviders {
  providers: any[];
  timestamp: number;
}

class ProviderLocationCache {
  private cache = new Map<string, CachedProviders>();
  private readonly TTL = 30000; // 30 segundos
  private readonly MAX_CACHE_SIZE = 100; // Max 100 caches em memória

  /**
   * Obter providers próximos com cache
   */
  async getNearbyCached(
    lat: number,
    lng: number,
    radius: number = 5,
    categoryId?: number
  ): Promise<any[]> {
    const cacheKey = this.generateCacheKey(lat, lng, radius, categoryId);

    // Verificar se está em cache e válido
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      logger.debug(`[ProviderCache] Cache hit: ${cacheKey}`);
      return cached.providers;
    }

    logger.debug(`[ProviderCache] Cache miss: ${cacheKey}, querying DB...`);

    // Cache miss: fazer query
    const providers = await this.queryNearbyProviders(
      lat,
      lng,
      radius,
      categoryId
    );

    // Armazenar em cache
    this.cache.set(cacheKey, {
      providers,
      timestamp: Date.now(),
    });

    // Cleanup: manter max size
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanupOldest();
    }

    return providers;
  }

  /**
   * Query direta ao banco (Haversine formula)
   */
  private async queryNearbyProviders(
    lat: number,
    lng: number,
    radius: number,
    categoryId?: number
  ): Promise<any[]> {
    try {
      // Usar raw query para performance (Haversine em SQLite)
      const providers = await prisma.$queryRaw`
        SELECT 
          p.id,
          p.users.full_name as name,
          pl.latitude,
          pl.longitude,
          p.rating,
          p.current_status,
          p.acceptance_rate,
          (6371 * ACOS(
            COS(RADIANS(${lat})) * 
            COS(RADIANS(pl.latitude)) * 
            COS(RADIANS(pl.longitude) - RADIANS(${lng})) + 
            SIN(RADIANS(${lat})) * 
            SIN(RADIANS(pl.latitude))
          )) AS distance_km
        FROM providers p
        LEFT JOIN provider_location pl ON p.id = pl.provider_id
        LEFT JOIN users ON p.id = users.id
        WHERE (6371 * ACOS(
          COS(RADIANS(${lat})) * 
          COS(RADIANS(pl.latitude)) * 
          COS(RADIANS(pl.longitude) - RADIANS(${lng})) + 
          SIN(RADIANS(${lat})) * 
          SIN(RADIANS(pl.latitude))
        )) <= ${radius}
          AND p.current_status = 'available'
          AND p.acceptance_rate > 0.4
          ${categoryId ? `AND p.category_id = ${categoryId}` : ''}
        ORDER BY distance_km ASC, p.rating DESC
        LIMIT 50
      `;

      return providers as any[];
    } catch (error) {
      logger.error(`[ProviderCache] Query error: ${error}`);
      return [];
    }
  }

  /**
   * Invalidar cache quando provider se move
   * (pode ser disparado por trigger ou callback)
   */
  invalidateProviderLocation(provider_id: string): void {
    // Estratégia simples: limpar todo o cache
    // Alternativa: limpar apenas caches relevantes (próximos ao provider)
    const oldSize = this.cache.size;
    this.cache.clear();
    logger.info(
      `[ProviderCache] Invalidado para provider ${provider_id} ` +
        `(${oldSize} caches limpos)`
    );
  }

  /**
   * Limpar cache manualmente
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`[ProviderCache] Cache limpo (${size} entries removidas)`);
  }

  /**
   * Obter status do cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.TTL,
    };
  }

  /**
   * Limpar entries mais antigas (LRU)
   */
  private cleanupOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`[ProviderCache] Cleanup: removido ${oldestKey}`);
    }
  }

  /**
   * Gerar chave de cache
   */
  private generateCacheKey(
    lat: number,
    lng: number,
    radius: number,
    categoryId?: number
  ): string {
    return `${lat.toFixed(2)}_${lng.toFixed(2)}_${radius}_${categoryId || '0'}`;
  }
}

// Singleton
export const providerLocationCache = new ProviderLocationCache();

/**
 * Cron job: limpar cache expirado (executar a cada 5 minutos)
 */
export async function cleanupExpiredCache(): Promise<void> {
  // Se não usarmos TTL, podemos deixar simples
  // Senão, implementar cleanup periódico via schedulerEOFError
  logger.debug('[ProviderCache] Cleanup job executado');
}
