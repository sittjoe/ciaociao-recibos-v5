import { BaseUseCase } from './base/UseCase.js';
import { Injectable, Inject } from '../../infrastructure/di/index.js';
import { PricingService } from '../services/PricingService.js';

export interface PriceCalculationItem {
  weight: number;
  material: 'gold' | 'silver' | 'platinum' | 'palladium';
  karat?: number;
  laborHours?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  gemstones?: Array<{
    type: string;
    carat?: number;
    quantity: number;
    pricePerCarat?: number;
  }>;
}

export interface CalculatePriceRequest {
  items: PriceCalculationItem[];
  markupPercentage?: number;
  discountPercentage?: number;
  includeLabor?: boolean;
  includeGemstones?: boolean;
}

export interface PriceBreakdown {
  materialCost: number;
  laborCost: number;
  gemstoneCost: number;
  subtotal: number;
  markup: number;
  discount: number;
  total: number;
  pricePerGram?: number;
  itemBreakdowns: Array<{
    item: PriceCalculationItem;
    materialCost: number;
    laborCost: number;
    gemstoneCost: number;
    total: number;
  }>;
}

@Injectable()
export class CalculatePriceUseCase extends BaseUseCase<CalculatePriceRequest, PriceBreakdown> {
  constructor(@Inject(PricingService) private pricingService: PricingService) {
    super();
  }

  async validate(request: CalculatePriceRequest): Promise<string[]> {
    const errors: string[] = [];

    if (!request.items || request.items.length === 0) {
      errors.push('At least one item is required');
      return errors;
    }

    request.items.forEach((item, index) => {
      if (item.weight <= 0) {
        errors.push(`Item ${index + 1}: Weight must be greater than 0`);
      }

      if (!['gold', 'silver', 'platinum', 'palladium'].includes(item.material)) {
        errors.push(`Item ${index + 1}: Invalid material`);
      }

      if (item.material === 'gold' && item.karat && (item.karat < 1 || item.karat > 24)) {
        errors.push(`Item ${index + 1}: Gold karat must be between 1 and 24`);
      }

      if (item.laborHours && item.laborHours < 0) {
        errors.push(`Item ${index + 1}: Labor hours cannot be negative`);
      }

      if (item.gemstones) {
        item.gemstones.forEach((gemstone, gemIndex) => {
          if (gemstone.quantity <= 0) {
            errors.push(
              `Item ${index + 1}, Gemstone ${gemIndex + 1}: Quantity must be greater than 0`
            );
          }
          if (gemstone.carat && gemstone.carat <= 0) {
            errors.push(
              `Item ${index + 1}, Gemstone ${gemIndex + 1}: Carat must be greater than 0`
            );
          }
        });
      }
    });

    if (request.markupPercentage && request.markupPercentage < 0) {
      errors.push('Markup percentage cannot be negative');
    }

    if (request.discountPercentage && (request.discountPercentage < 0 || request.discountPercentage > 100)) {
      errors.push('Discount percentage must be between 0 and 100');
    }

    return errors;
  }

  async execute(request: CalculatePriceRequest): Promise<PriceBreakdown> {
    const itemBreakdowns: PriceBreakdown['itemBreakdowns'] = [];
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalGemstoneCost = 0;
    let totalWeight = 0;

    for (const item of request.items) {
      // Calculate material cost
      const materialCost = await this.pricingService.calculateMaterialCost(
        item.material,
        item.weight,
        item.karat
      );

      // Calculate labor cost
      let laborCost = 0;
      if (request.includeLabor !== false && item.laborHours) {
        laborCost = await this.pricingService.calculateLaborCost(
          item.laborHours,
          item.complexity || 'moderate'
        );
      }

      // Calculate gemstone cost
      let gemstoneCost = 0;
      if (request.includeGemstones !== false && item.gemstones) {
        for (const gemstone of item.gemstones) {
          gemstoneCost += await this.pricingService.calculateGemstoneCost(
            gemstone.type,
            gemstone.carat || 1,
            gemstone.quantity,
            gemstone.pricePerCarat
          );
        }
      }

      const itemTotal = materialCost + laborCost + gemstoneCost;

      itemBreakdowns.push({
        item,
        materialCost,
        laborCost,
        gemstoneCost,
        total: itemTotal,
      });

      totalMaterialCost += materialCost;
      totalLaborCost += laborCost;
      totalGemstoneCost += gemstoneCost;
      totalWeight += item.weight;
    }

    const subtotal = totalMaterialCost + totalLaborCost + totalGemstoneCost;

    // Apply markup
    const markupPercentage = request.markupPercentage || 50;
    const markup = (subtotal * markupPercentage) / 100;

    // Apply discount
    const discountPercentage = request.discountPercentage || 0;
    const discount = ((subtotal + markup) * discountPercentage) / 100;

    const total = subtotal + markup - discount;
    const pricePerGram = totalWeight > 0 ? total / totalWeight : undefined;

    return {
      materialCost: totalMaterialCost,
      laborCost: totalLaborCost,
      gemstoneCost: totalGemstoneCost,
      subtotal,
      markup,
      discount,
      total,
      pricePerGram,
      itemBreakdowns,
    };
  }
}
