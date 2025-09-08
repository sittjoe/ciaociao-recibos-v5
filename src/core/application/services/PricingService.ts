import { Injectable, Inject } from '../../infrastructure/di/index.js';
import { MetalPriceApiClient } from '../../infrastructure/api/MetalPriceApiClient.js';

export interface MetalPrice {
  metal: string;
  pricePerOunce: number;
  pricePerGram: number;
  currency: string;
  lastUpdated: Date;
}

export interface LaborRate {
  complexity: 'simple' | 'moderate' | 'complex';
  hourlyRate: number;
}

export interface GemstonePrice {
  type: string;
  pricePerCarat: number;
  grade?: string;
}

@Injectable()
export class PricingService {
  private metalPrices = new Map<string, MetalPrice>();
  private laborRates: LaborRate[] = [
    { complexity: 'simple', hourlyRate: 25 },
    { complexity: 'moderate', hourlyRate: 40 },
    { complexity: 'complex', hourlyRate: 65 },
  ];
  private gemstoneBasePrices: GemstonePrice[] = [
    { type: 'diamond', pricePerCarat: 5000 },
    { type: 'ruby', pricePerCarat: 1200 },
    { type: 'sapphire', pricePerCarat: 800 },
    { type: 'emerald', pricePerCarat: 1500 },
    { type: 'pearl', pricePerCarat: 100 },
    { type: 'opal', pricePerCarat: 50 },
    { type: 'turquoise', pricePerCarat: 25 },
    { type: 'amethyst', pricePerCarat: 15 },
    { type: 'topaz', pricePerCarat: 30 },
  ];

  constructor(
    @Inject(MetalPriceApiClient) private metalPriceClient: MetalPriceApiClient
  ) {}

  /**
   * Calculate material cost based on metal type, weight, and karat
   */
  async calculateMaterialCost(
    metal: string,
    weight: number,
    karat?: number
  ): Promise<number> {
    const metalPrice = await this.getMetalPrice(metal);
    if (!metalPrice) {
      throw new Error(`Price not available for metal: ${metal}`);
    }

    let purity = 1;
    if (metal === 'gold' && karat) {
      purity = karat / 24; // Gold purity calculation
    }

    return metalPrice.pricePerGram * weight * purity;
  }

  /**
   * Calculate labor cost based on hours and complexity
   */
  async calculateLaborCost(
    hours: number,
    complexity: 'simple' | 'moderate' | 'complex'
  ): Promise<number> {
    const laborRate = this.laborRates.find(rate => rate.complexity === complexity);
    if (!laborRate) {
      throw new Error(`Labor rate not found for complexity: ${complexity}`);
    }

    return hours * laborRate.hourlyRate;
  }

  /**
   * Calculate gemstone cost
   */
  async calculateGemstoneCost(
    gemstoneType: string,
    carat: number,
    quantity: number,
    customPricePerCarat?: number
  ): Promise<number> {
    let pricePerCarat = customPricePerCarat;
    
    if (!pricePerCarat) {
      const gemstonePrice = this.gemstoneBasePrices.find(
        price => price.type.toLowerCase() === gemstoneType.toLowerCase()
      );
      pricePerCarat = gemstonePrice?.pricePerCarat || 50; // Default price
    }

    return carat * quantity * pricePerCarat;
  }

  /**
   * Get current metal price
   */
  async getMetalPrice(metal: string): Promise<MetalPrice | null> {
    const normalizedMetal = metal.toLowerCase();
    
    // Check cache first
    const cachedPrice = this.metalPrices.get(normalizedMetal);
    if (cachedPrice && this.isPriceCurrentlyValid(cachedPrice.lastUpdated)) {
      return cachedPrice;
    }

    try {
      // Fetch fresh price from API
      const freshPrice = await this.metalPriceClient.getCurrentPrice(normalizedMetal);
      if (freshPrice) {
        this.metalPrices.set(normalizedMetal, freshPrice);
        return freshPrice;
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${metal}, using cached or default:`, error);
    }

    // Return cached price even if stale, or default
    return cachedPrice || this.getDefaultMetalPrice(normalizedMetal);
  }

  /**
   * Update labor rates
   */
  updateLaborRate(complexity: 'simple' | 'moderate' | 'complex', hourlyRate: number): void {
    const rateIndex = this.laborRates.findIndex(rate => rate.complexity === complexity);
    if (rateIndex >= 0) {
      this.laborRates[rateIndex].hourlyRate = hourlyRate;
    } else {
      this.laborRates.push({ complexity, hourlyRate });
    }
  }

  /**
   * Get current labor rates
   */
  getLaborRates(): LaborRate[] {
    return [...this.laborRates];
  }

  /**
   * Update gemstone base price
   */
  updateGemstonePrice(type: string, pricePerCarat: number, grade?: string): void {
    const existingIndex = this.gemstoneBasePrices.findIndex(
      price => price.type.toLowerCase() === type.toLowerCase() && price.grade === grade
    );
    
    if (existingIndex >= 0) {
      this.gemstoneBasePrices[existingIndex].pricePerCarat = pricePerCarat;
    } else {
      this.gemstoneBasePrices.push({ type: type.toLowerCase(), pricePerCarat, grade });
    }
  }

  /**
   * Get gemstone base prices
   */
  getGemstoneBasePrices(): GemstonePrice[] {
    return [...this.gemstoneBasePrices];
  }

  /**
   * Calculate total item cost including markup
   */
  async calculateItemTotal(
    materialCost: number,
    laborCost: number,
    gemstoneCost: number,
    markupPercentage: number
  ): Promise<number> {
    const subtotal = materialCost + laborCost + gemstoneCost;
    return subtotal * (1 + markupPercentage / 100);
  }

  /**
   * Get price recommendations based on market data
   */
  async getPriceRecommendations(
    metal: string,
    weight: number,
    complexity: 'simple' | 'moderate' | 'complex'
  ): Promise<{
    conservative: number;
    market: number;
    premium: number;
  }> {
    const metalPrice = await this.getMetalPrice(metal);
    if (!metalPrice) {
      throw new Error(`Price not available for metal: ${metal}`);
    }

    const materialCost = metalPrice.pricePerGram * weight;
    const laborCost = await this.calculateLaborCost(2, complexity); // Assume 2 hours
    const baseCost = materialCost + laborCost;

    return {
      conservative: baseCost * 1.3, // 30% markup
      market: baseCost * 1.5,       // 50% markup
      premium: baseCost * 1.8,      // 80% markup
    };
  }

  private isPriceCurrentlyValid(lastUpdated: Date): boolean {
    const maxAge = 60 * 60 * 1000; // 1 hour
    return Date.now() - lastUpdated.getTime() < maxAge;
  }

  private getDefaultMetalPrice(metal: string): MetalPrice | null {
    const defaults: Record<string, number> = {
      gold: 65,      // $65 per gram
      silver: 0.8,   // $0.80 per gram
      platinum: 30,  // $30 per gram
      palladium: 25, // $25 per gram
    };

    const price = defaults[metal];
    if (!price) return null;

    return {
      metal,
      pricePerOunce: price * 31.1035, // Convert to per ounce
      pricePerGram: price,
      currency: 'USD',
      lastUpdated: new Date(),
    };
  }
}
