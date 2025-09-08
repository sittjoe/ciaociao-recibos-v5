import { Injectable, Inject } from '../di/index.js';
import { BaseApiClient } from './BaseApiClient.js';
import { CircuitBreakerFactory } from './CircuitBreaker.js';
import { MetalPrice } from '../../application/services/PricingService.js';

export interface MetalPriceApiResponse {
  metal: string;
  price_usd: number;
  currency: string;
  timestamp: string;
  unit: 'oz' | 'g';
}

export interface MetalPriceProviderConfig {
  apiKey?: string;
  baseUrl: string;
  rateLimit?: number;
}

@Injectable()
export class MetalPriceApiClient extends BaseApiClient {
  private circuitBreaker;
  private lastRequestTime = 0;
  private rateLimit: number;
  private cache = new Map<string, { data: MetalPrice; timestamp: number }>();
  private readonly cacheTimeout = 60 * 60 * 1000; // 1 hour

  constructor(
    @Inject(CircuitBreakerFactory) circuitBreakerFactory: CircuitBreakerFactory,
    config: MetalPriceProviderConfig = {
      baseUrl: 'https://api.metals.live/v1/spot',
      rateLimit: 1000, // 1 request per second
    }
  ) {
    super({
      baseURL: config.baseUrl,
      timeout: 15000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });

    this.rateLimit = config.rateLimit || 1000;
    this.circuitBreaker = circuitBreakerFactory.getInstance('metal-prices', {
      failureThreshold: 3,
      resetTimeout: 120000, // 2 minutes
      monitoringPeriod: 600000, // 10 minutes
    });
  }

  /**
   * Get current price for a specific metal
   */
  async getCurrentPrice(metal: string): Promise<MetalPrice | null> {
    const normalizedMetal = metal.toLowerCase();
    
    // Check cache first
    const cached = this.getCachedPrice(normalizedMetal);
    if (cached) {
      return cached;
    }

    // Rate limiting
    await this.enforceRateLimit();

    try {
      return await this.circuitBreaker.execute(async () => {
        const price = await this.fetchMetalPrice(normalizedMetal);
        if (price) {
          this.cachePrice(normalizedMetal, price);
        }
        return price;
      });
    } catch (error) {
      console.warn(`Failed to fetch price for ${metal}:`, error);
      // Return stale cache if available
      return this.getCachedPrice(normalizedMetal, true) || null;
    }
  }

  /**
   * Get prices for multiple metals
   */
  async getMultiplePrices(metals: string[]): Promise<Record<string, MetalPrice | null>> {
    const results: Record<string, MetalPrice | null> = {};
    
    // Process metals in parallel but respect rate limits
    const promises = metals.map(async (metal, index) => {
      // Stagger requests to respect rate limits
      if (index > 0) {
        await this.delay(this.rateLimit / metals.length);
      }
      
      const price = await this.getCurrentPrice(metal);
      results[metal] = price;
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Get all supported metals and their prices
   */
  async getAllPrices(): Promise<Record<string, MetalPrice | null>> {
    const supportedMetals = ['gold', 'silver', 'platinum', 'palladium'];
    return this.getMultiplePrices(supportedMetals);
  }

  /**
   * Get historical price data (if supported by API)
   */
  async getHistoricalPrice(
    metal: string,
    date: Date
  ): Promise<MetalPrice | null> {
    const normalizedMetal = metal.toLowerCase();
    const dateString = date.toISOString().split('T')[0];

    try {
      return await this.circuitBreaker.execute(async () => {
        const response = await this.get<MetalPriceApiResponse>(
          `/historical/${normalizedMetal}?date=${dateString}`
        );
        return this.transformResponse(response.data);
      });
    } catch (error) {
      console.warn(`Failed to fetch historical price for ${metal} on ${dateString}:`, error);
      return null;
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ metal: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([metal, { timestamp }]) => ({
      metal,
      age: now - timestamp,
    }));
    
    return { size: this.cache.size, entries };
  }

  private async fetchMetalPrice(metal: string): Promise<MetalPrice | null> {
    try {
      // Different API endpoints might have different URL structures
      // This is a generic implementation
      const response = await this.get<MetalPriceApiResponse>(`/${metal}`);
      return this.transformResponse(response.data);
    } catch (error: any) {
      // Try alternative endpoints or fallback methods
      if (error.status === 404) {
        // Try alternative URL structure
        try {
          const response = await this.get<MetalPriceApiResponse>(`/spot/${metal}`);
          return this.transformResponse(response.data);
        } catch {
          // API might not support this metal
          return null;
        }
      }
      throw error;
    }
  }

  private transformResponse(data: MetalPriceApiResponse): MetalPrice {
    const pricePerOunce = data.unit === 'oz' ? data.price_usd : data.price_usd * 31.1035;
    const pricePerGram = data.unit === 'g' ? data.price_usd : data.price_usd / 31.1035;

    return {
      metal: data.metal.toLowerCase(),
      pricePerOunce,
      pricePerGram,
      currency: data.currency,
      lastUpdated: new Date(data.timestamp),
    };
  }

  private getCachedPrice(metal: string, includeExpired = false): MetalPrice | null {
    const cached = this.cache.get(metal);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired && !includeExpired) return null;

    return cached.data;
  }

  private cachePrice(metal: string, price: MetalPrice): void {
    this.cache.set(metal, {
      data: price,
      timestamp: Date.now(),
    });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit) {
      await this.delay(this.rateLimit - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
