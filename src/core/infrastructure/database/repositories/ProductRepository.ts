import { Injectable, Inject } from '../../di/index.js';
import { Product, ProductCategory } from '../../../domain/entities/Product.js';
import { IProductRepository, ProductFilter } from '../../../domain/repositories/IProductRepository.js';
import { BaseRepository } from '../../../domain/repositories/base/IRepository.js';
import { DatabaseContext } from '../DatabaseContext.js';

@Injectable()
export class ProductRepository extends BaseRepository<Product, ProductFilter> implements IProductRepository {
  constructor(@Inject(DatabaseContext) private db: DatabaseContext) {
    super();
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.db.products.get(id);
    return product || null;
  }

  async findAll(): Promise<Product[]> {
    return this.db.products.orderBy('createdAt').reverse().toArray();
  }

  async save(entity: Product): Promise<Product> {
    await this.db.products.put(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    await this.db.products.put(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleteCount = await this.db.products.where('id').equals(id).delete();
    return deleteCount > 0;
  }

  async findByFilter(filter: ProductFilter): Promise<Product[]> {
    let query = this.db.products.toCollection();

    if (filter.category) {
      query = this.db.products.where('category').equals(filter.category);
    }

    if (filter.isActive !== undefined) {
      query = query.and(product => product.isActive === filter.isActive);
    }

    if (filter.isCustom !== undefined) {
      query = query.and(product => product.isCustom === filter.isCustom);
    }

    if (filter.isLowStock) {
      query = query.and(product => product.stockQuantity <= product.lowStockThreshold);
    }

    if (filter.isOutOfStock) {
      query = query.and(product => product.stockQuantity === 0);
    }

    if (filter.priceMin !== undefined) {
      query = query.and(product => product.pricing.sellingPrice >= filter.priceMin!);
    }

    if (filter.priceMax !== undefined) {
      query = query.and(product => product.pricing.sellingPrice <= filter.priceMax!);
    }

    if (filter.sku) {
      query = query.and(product => product.sku.includes(filter.sku!));
    }

    if (filter.tags && filter.tags.length > 0) {
      query = query.and(product => 
        filter.tags!.some(tag => product.tags.includes(tag.toLowerCase()))
      );
    }

    if (filter.search) {
      const searchTerms = filter.search.toLowerCase().split(' ').filter(term => term.length >= 2);
      query = query.and(product => {
        const searchableText = [
          product.sku,
          product.name,
          product.description,
          product.notes,
          product.category,
          ...product.tags
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    return query.reverse().sortBy('createdAt');
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.db.products.where('sku').equals(sku).first();
    return product || null;
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.db.products
      .where('category')
      .equals(category)
      .reverse()
      .sortBy('createdAt');
  }

  async findLowStockProducts(): Promise<Product[]> {
    const products = await this.db.products.toArray();
    return products.filter(product => product.stockQuantity <= product.lowStockThreshold);
  }

  async findOutOfStockProducts(): Promise<Product[]> {
    return this.db.products
      .where('stockQuantity')
      .equals(0)
      .toArray();
  }

  async findByTags(tags: string[]): Promise<Product[]> {
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const products = await this.db.products.toArray();
    
    return products.filter(product => 
      normalizedTags.some(tag => product.tags.includes(tag))
    );
  }

  async findActiveProducts(): Promise<Product[]> {
    return this.db.products
      .where('isActive')
      .equals(true)
      .toArray();
  }

  async findCustomProducts(): Promise<Product[]> {
    return this.db.products
      .where('isCustom')
      .equals(true)
      .toArray();
  }

  async searchByName(query: string): Promise<Product[]> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length >= 2);
    const products = await this.db.products.toArray();
    
    return products.filter(product => {
      const productName = product.name.toLowerCase();
      return searchTerms.every(term => productName.includes(term));
    });
  }

  async getTotalInventoryValue(): Promise<number> {
    const products = await this.db.products.toArray();
    return products.reduce((total, product) => {
      return total + (product.pricing.sellingPrice * product.stockQuantity);
    }, 0);
  }

  async getProductCountByCategory(): Promise<Record<ProductCategory, number>> {
    const products = await this.db.products.toArray();
    
    const counts: Record<ProductCategory, number> = {
      rings: 0,
      necklaces: 0,
      bracelets: 0,
      earrings: 0,
      watches: 0,
      'loose-stones': 0,
      custom: 0,
      repair: 0,
      other: 0,
    };
    
    products.forEach(product => {
      counts[product.category]++;
    });
    
    return counts;
  }

  async getLowStockCount(): Promise<number> {
    const lowStockProducts = await this.findLowStockProducts();
    return lowStockProducts.length;
  }

  async getOutOfStockCount(): Promise<number> {
    return this.db.products
      .where('stockQuantity')
      .equals(0)
      .count();
  }
}
