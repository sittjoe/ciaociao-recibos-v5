import { Injectable, Inject } from '../di/index.js';
import { BaseApiClient } from './BaseApiClient.js';
import { CircuitBreakerFactory } from './CircuitBreaker.js';

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
  provider: string;
}

export interface ExchangeRateApiResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ExchangeRateConfig {
  apiKey?: string;
  baseUrl: string;
  baseCurrency?: string;
}

@Injectable()
export class ExchangeRateApiClient extends BaseApiClient {
  private circuitBreaker;
  private cache = new Map<string, { data: ExchangeRate; timestamp: number }>();
  private readonly cacheTimeout = 60 * 60 * 1000; // 1 hour
  private baseCurrency: string;

  constructor(
    @Inject(CircuitBreakerFactory) circuitBreakerFactory: CircuitBreakerFactory,
    config: ExchangeRateConfig = {
      baseUrl: 'https://api.exchangerate-api.com/v4/latest',
      baseCurrency: 'USD',
    }
  ) {
    super({
      baseURL: config.baseUrl,
      timeout: 10000,
      headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
    });

    this.baseCurrency = config.baseCurrency || 'USD';
    this.circuitBreaker = circuitBreakerFactory.getInstance('exchange-rates', {
      failureThreshold: 3,
      resetTimeout: 300000, // 5 minutes
      monitoringPeriod: 900000, // 15 minutes
    });
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    
    // Check cache first
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
        if (rate) {
          this.cacheRate(cacheKey, rate);
        }
        return rate;
      });
    } catch (error) {
      console.warn(`Failed to fetch exchange rate ${fromCurrency} to ${toCurrency}:`, error);
      // Return stale cache if available
      return this.getCachedRate(cacheKey, true) || null;
    }
  }

  /**
   * Get multiple exchange rates from base currency
   */
  async getMultipleRates(
    fromCurrency: string,
    toCurrencies: string[]
  ): Promise<Record<string, ExchangeRate | null>> {
    const results: Record<string, ExchangeRate | null> = {};
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const response = await this.get<ExchangeRateApiResponse>(`/${fromCurrency}`);
        
        for (const toCurrency of toCurrencies) {
          const rate = response.data.rates[toCurrency];
          if (rate) {
            const exchangeRate: ExchangeRate = {
              fromCurrency,
              toCurrency,
              rate,
              lastUpdated: new Date(response.data.date),
              provider: 'exchange-rate-api',
            };
            
            results[toCurrency] = exchangeRate;
            this.cacheRate(`${fromCurrency}-${toCurrency}`, exchangeRate);
          } else {
            results[toCurrency] = null;
          }
        }
        
        return results;
      });
    } catch (error) {
      console.warn(`Failed to fetch multiple exchange rates from ${fromCurrency}:`, error);
      
      // Try to get individual rates from cache
      for (const toCurrency of toCurrencies) {
        const cached = this.getCachedRate(`${fromCurrency}-${toCurrency}`, true);
        results[toCurrency] = cached || null;
      }
      
      return results;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; rate: ExchangeRate } | null> {
    if (fromCurrency === toCurrency) {
      const sameRate: ExchangeRate = {
        fromCurrency,
        toCurrency,
        rate: 1,
        lastUpdated: new Date(),
        provider: 'same-currency',
      };
      return { convertedAmount: amount, rate: sameRate };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    if (!rate) {
      return null;
    }

    return {
      convertedAmount: amount * rate.rate,
      rate,
    };
  }

  /**
   * Get all supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const response = await this.get<ExchangeRateApiResponse>(`/${this.baseCurrency}`);
        return Object.keys(response.data.rates).sort();
      });
    } catch (error) {
      console.warn('Failed to fetch supported currencies:', error);
      // Return common currencies as fallback
      return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD'];
    }
  }

  /**
   * Get historical exchange rate (if supported)
   */
  async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    const dateString = date.toISOString().split('T')[0];
    
    try {
      return await this.circuitBreaker.execute(async () => {
        // Note: This endpoint might not be available on all free APIs
        const response = await this.get<ExchangeRateApiResponse>(
          `/${dateString}?base=${fromCurrency}&symbols=${toCurrency}`
        );
        
        const rate = response.data.rates[toCurrency];
        if (!rate) return null;
        
        return {
          fromCurrency,
          toCurrency,
          rate,
          lastUpdated: new Date(response.data.date),
          provider: 'exchange-rate-api',
        };
      });
    } catch (error) {
      console.warn(`Failed to fetch historical rate for ${dateString}:`, error);
      return null;
    }
  }

  /**
   * Clear rate cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ pair: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([pair, { timestamp }]) => ({
      pair,
      age: now - timestamp,
    }));
    
    return { size: this.cache.size, entries };
  }

  private async fetchExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      const response = await this.get<ExchangeRateApiResponse>(
        `/${fromCurrency}?symbols=${toCurrency}`
      );
      
      const rate = response.data.rates[toCurrency];
      if (!rate) return null;
      
      return {
        fromCurrency,
        toCurrency,
        rate,
        lastUpdated: new Date(response.data.date),
        provider: 'exchange-rate-api',
      };
    } catch (error: any) {
      // Try alternative approach if direct conversion fails
      if (error.status === 400 || error.status === 422) {
        return this.fetchRateViaBase(fromCurrency, toCurrency);
      }
      throw error;
    }
  }

  private async fetchRateViaBase(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    // Get rates via USD base if direct conversion fails
    const [fromRate, toRate] = await Promise.all([
      this.getBaseRate(fromCurrency),
      this.getBaseRate(toCurrency),
    ]);
    
    if (!fromRate || !toRate) return null;
    
    const rate = toRate / fromRate;
    
    return {
      fromCurrency,
      toCurrency,
      rate,
      lastUpdated: new Date(),
      provider: 'calculated-via-base',
    };
  }

  private async getBaseRate(currency: string): Promise<number | null> {
    if (currency === this.baseCurrency) return 1;
    
    try {
      const response = await this.get<ExchangeRateApiResponse>(
        `/${this.baseCurrency}?symbols=${currency}`
      );
      return response.data.rates[currency] || null;
    } catch {
      return null;
    }
  }

  private getCachedRate(cacheKey: string, includeExpired = false): ExchangeRate | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired && !includeExpired) return null;

    return cached.data;
  }

  private cacheRate(cacheKey: string, rate: ExchangeRate): void {
    this.cache.set(cacheKey, {
      data: rate,
      timestamp: Date.now(),
    });
  }
}
