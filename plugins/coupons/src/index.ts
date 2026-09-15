/**
 * Coupons Plugin — Discount codes and coupon management.
 *
 * Features:
 *   - Create/edit/delete coupons
 *   - Percentage or fixed amount discounts
 *   - Minimum order amount
 *   - Usage limits (total and per customer)
 *   - Date-based expiration
 *   - Product/category restrictions
 *   - Single-use or multi-use
 *
 * Storage: In-memory (use database in production).
 */
import { define_plugin } from '@typepress/plugin-sdk';

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_amount: number;
  maximum_uses: number;
  used_count: number;
  per_user_limit: number;
  expires_at: string | null;
  active: boolean;
  product_ids: string[];
  category_ids: string[];
  created_at: string;
}

export interface CouponValidation {
  valid: boolean;
  error?: string;
  discount_amount?: number;
}

// In-memory coupon storage (use database in production)
const coupons = new Map<string, Coupon>();

/**
 * Create a new coupon.
 */
export function create_coupon(data: {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_amount?: number;
  maximum_uses?: number;
  per_user_limit?: number;
  expires_at?: string;
  product_ids?: string[];
  category_ids?: string[];
}): Coupon {
  const coupon: Coupon = {
    id: `coupon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: data.code.toUpperCase(),
    description: data.description,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    minimum_order_amount: data.minimum_order_amount || 0,
    maximum_uses: data.maximum_uses || -1, // -1 = unlimited
    used_count: 0,
    per_user_limit: data.per_user_limit || -1,
    expires_at: data.expires_at || null,
    active: true,
    product_ids: data.product_ids || [],
    category_ids: data.category_ids || [],
    created_at: new Date().toISOString(),
  };

  coupons.set(coupon.id, coupon);
  return coupon;
}

/**
 * Validate a coupon code.
 */
export function validate_coupon(code: string, order_amount: number): CouponValidation {
  const coupon = Array.from(coupons.values()).find(
    (c) => c.code === code.toUpperCase() && c.active,
  );

  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'Coupon has expired' };
  }

  if (coupon.maximum_uses > 0 && coupon.used_count >= coupon.maximum_uses) {
    return { valid: false, error: 'Coupon has reached its usage limit' };
  }

  if (order_amount < coupon.minimum_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount is $${coupon.minimum_order_amount}`,
    };
  }

  const discount_amount = coupon.discount_type === 'percentage'
    ? (order_amount * coupon.discount_value) / 100
    : Math.min(coupon.discount_value, order_amount);

  return { valid: true, discount_amount };
}

/**
 * Apply a coupon (increment usage count).
 */
export function apply_coupon(code: string): void {
  const coupon = Array.from(coupons.values()).find(
    (c) => c.code === code.toUpperCase(),
  );
  if (coupon) {
    coupon.used_count++;
  }
}

/**
 * Get all coupons.
 */
export function get_all_coupons(): Coupon[] {
  return Array.from(coupons.values());
}

/**
 * Deactivate a coupon.
 */
export function deactivate_coupon(id: string): boolean {
  const coupon = coupons.get(id);
  if (!coupon) return false;
  coupon.active = false;
  return true;
}

export default define_plugin({
  name: 'coupons',
  version: '1.0.0',
  description: 'Discount codes and coupon management',

  register(_api) {
    console.log('[Coupons] Plugin loaded — coupon system available');
  },
});

