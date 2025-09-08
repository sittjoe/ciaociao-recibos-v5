import { Product, ProductCategory } from '../entities/Product.js';
import { IPaginatedRepository } from './base/IRepository.js';

export interface ProductFilter {
  category?: ProductCategory;
  isActive?: boolean;
  isCustom?: boolean;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  tags?: string[];
  sku?: string;
}

export interface IProductRepository extends IPaginatedRepository<Product, ProductFilter> {
  findBySku(sku: string): Promise<Product | null>;
  findByCategory(category: ProductCategory): Promise<Product[]>;
  findLowStockProducts(): Promise<Product[]>;
  findOutOfStockProducts(): Promise<Product[]>;
  findByTags(tags: string[]): Promise<Product[]>;
  findActiveProducts(): Promise<Product[]>;
  findCustomProducts(): Promise<Product[]>;
  searchByName(query: string): Promise<Product[]>;
  getTotalInventoryValue(): Promise<number>;
  getProductCountByCategory(): Promise<Record<ProductCategory, number>>;
  getLowStockCount(): Promise<number>;
  getOutOfStockCount(): Promise<number>;
}
