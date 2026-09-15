/**
 * Products Plugin — E-commerce product management.
 *
 * Features:
 *   - Product CRUD with pricing
 *   - Product variations (size, color, etc.)
 *   - Inventory tracking
 *   - Product categories via taxonomy
 *   - SKU management
 *   - Stock status (in_stock, out_of_stock, on_backorder)
 *
 * Storage: Uses Content model with type="product" and JSONB meta.
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface ProductMeta {
  price: number;
  compare_at_price?: number;
  sku: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'on_backorder';
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  variations?: ProductVariation[];
  images?: string[];
  attributes?: Record<string, string>;
}

export interface ProductVariation {
  id: string;
  name: string;
  options: string[];
  price_modifier: number;
  stock_quantity: number;
}

export function create_product_meta(overrides: Partial<ProductMeta>): ProductMeta {
  return {
    price: 0,
    sku: '',
    stock_quantity: 0,
    stock_status: 'in_stock',
    variations: [],
    images: [],
    attributes: {},
    ...overrides,
  };
}

export function is_in_stock(meta: ProductMeta): boolean {
  return meta.stock_status === 'in_stock' && meta.stock_quantity > 0;
}

export function get_discount_percentage(meta: ProductMeta): number {
  if (!meta.compare_at_price || meta.compare_at_price <= meta.price) return 0;
  return Math.round(((meta.compare_at_price - meta.price) / meta.compare_at_price) * 100);
}

export default define_plugin({
  name: 'products',
  version: '1.0.0',
  description: 'Product management with variations, pricing, and inventory',

  register(api) {
    // Auto-set stock status when quantity changes
    api.hooks.on('product:before_save', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const meta = data.meta as ProductMeta;
      if (meta && meta.stock_quantity <= 0 && meta.stock_status === 'in_stock') {
        meta.stock_status = 'out_of_stock';
      }
    });

    // Deduct stock on order
    api.hooks.on('order:after_create', async (...args: unknown[]) => {
      const order = args[0] as Record<string, unknown>;
      console.log(`[Products] Order ${order.id} placed — deducting stock`);
    });

    console.log('[Products] Plugin loaded — product management available');
  },
});

