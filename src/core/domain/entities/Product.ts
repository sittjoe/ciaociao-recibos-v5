import { v4 as uuidv4 } from 'uuid';

export type ProductCategory = 'rings' | 'necklaces' | 'bracelets' | 'earrings' | 'watches' | 'loose-stones' | 'custom' | 'repair' | 'other';

export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium' | 'stainless-steel' | 'titanium' | 'other';

export type GemstoneType = 'diamond' | 'ruby' | 'sapphire' | 'emerald' | 'pearl' | 'opal' | 'turquoise' | 'amethyst' | 'topaz' | 'other';

export interface ProductSpecs {
  metal?: MetalType;
  karat?: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
  };
  gemstones?: {
    type: GemstoneType;
    carat?: number;
    clarity?: string;
    color?: string;
    cut?: string;
    quantity: number;
  }[];
  certification?: string;
  origin?: string;
}

export interface ProductPricing {
  baseCost: number;
  laborCost: number;
  materialCost: number;
  markupPercentage: number;
  sellingPrice: number;
  wholesalePrice?: number;
}

export class Product {
  public readonly id: string;
  public sku: string;
  public name: string;
  public description?: string;
  public category: ProductCategory;
  public specs: ProductSpecs;
  public pricing: ProductPricing;
  public stockQuantity: number;
  public lowStockThreshold: number;
  public isActive: boolean;
  public isCustom: boolean;
  public images: string[];
  public tags: string[];
  public notes?: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    sku: string,
    name: string,
    category: ProductCategory,
    baseCost: number,
    laborCost: number = 0,
    materialCost: number = 0,
    markupPercentage: number = 50
  ) {
    this.id = uuidv4();
    this.sku = sku;
    this.name = name;
    this.category = category;
    this.specs = {};
    this.pricing = {
      baseCost,
      laborCost,
      materialCost,
      markupPercentage,
      sellingPrice: 0,
    };
    this.stockQuantity = 0;
    this.lowStockThreshold = 1;
    this.isActive = true;
    this.isCustom = false;
    this.images = [];
    this.tags = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.calculateSellingPrice();
  }

  public updateSpecs(specs: Partial<ProductSpecs>): void {
    this.specs = { ...this.specs, ...specs };
    this.updatedAt = new Date();
  }

  public updatePricing(pricing: Partial<ProductPricing>): void {
    this.pricing = { ...this.pricing, ...pricing };
    this.calculateSellingPrice();
    this.updatedAt = new Date();
  }

  public addGemstone(gemstone: NonNullable<ProductSpecs['gemstones']>[0]): void {
    if (!this.specs.gemstones) {
      this.specs.gemstones = [];
    }
    this.specs.gemstones.push(gemstone);
    this.updatedAt = new Date();
  }

  public removeGemstone(index: number): void {
    if (this.specs.gemstones && this.specs.gemstones[index]) {
      this.specs.gemstones.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  public addImage(imageUrl: string): void {
    if (!this.images.includes(imageUrl)) {
      this.images.push(imageUrl);
      this.updatedAt = new Date();
    }
  }

  public removeImage(imageUrl: string): void {
    this.images = this.images.filter(img => img !== imageUrl);
    this.updatedAt = new Date();
  }

  public addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      this.updatedAt = new Date();
    }
  }

  public removeTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim();
    this.tags = this.tags.filter(t => t !== normalizedTag);
    this.updatedAt = new Date();
  }

  public adjustStock(quantity: number, _reason?: string): void {
    this.stockQuantity += quantity;
    if (this.stockQuantity < 0) {
      this.stockQuantity = 0;
    }
    this.updatedAt = new Date();
  }

  public isLowStock(): boolean {
    return this.stockQuantity <= this.lowStockThreshold;
  }

  public isOutOfStock(): boolean {
    return this.stockQuantity === 0;
  }

  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  public markAsCustom(): void {
    this.isCustom = true;
    this.updatedAt = new Date();
  }

  public getTotalCost(): number {
    return this.pricing.baseCost + this.pricing.laborCost + this.pricing.materialCost;
  }

  public getProfit(): number {
    return this.pricing.sellingPrice - this.getTotalCost();
  }

  public getProfitMargin(): number {
    if (this.pricing.sellingPrice === 0) return 0;
    return (this.getProfit() / this.pricing.sellingPrice) * 100;
  }

  public getFormattedSpecs(): string {
    const specs: string[] = [];
    
    if (this.specs.metal) {
      specs.push(`${this.specs.metal}${this.specs.karat ? ` ${this.specs.karat}k` : ''}`);
    }
    
    if (this.specs.weight) {
      specs.push(`${this.specs.weight}g`);
    }
    
    if (this.specs.gemstones && this.specs.gemstones.length > 0) {
      const gemstoneDesc = this.specs.gemstones.map(gem => 
        `${gem.quantity > 1 ? `${gem.quantity}x ` : ''}${gem.type}${gem.carat ? ` ${gem.carat}ct` : ''}`
      ).join(', ');
      specs.push(gemstoneDesc);
    }
    
    return specs.join(' | ');
  }

  private calculateSellingPrice(): void {
    const totalCost = this.getTotalCost();
    this.pricing.sellingPrice = totalCost * (1 + this.pricing.markupPercentage / 100);
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      category: this.category,
      specs: this.specs,
      pricing: this.pricing,
      stockQuantity: this.stockQuantity,
      lowStockThreshold: this.lowStockThreshold,
      isActive: this.isActive,
      isCustom: this.isCustom,
      images: this.images,
      tags: this.tags,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}