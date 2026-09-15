/**
 * Cart Plugin — Shopping cart with session persistence.
 *
 * Features:
 *   - Add/remove items from cart
 *   - Update quantities
 *   - Cart totals calculation
 *   - Session-based cart persistence
 *   - Coupon code support
 *   - Tax calculation placeholder
 *
 * Storage: In-memory with session persistence.
 * In production, store in Redis or database.
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon_code?: string;
}

// In-memory cart storage (use session/Redis in production)
const carts = new Map<string, Cart>();

function create_empty_cart(): Cart {
  return {
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  };
}

function calculate_totals(cart: Cart): Cart {
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cart.tax = cart.subtotal * 0.1; // 10% tax placeholder
  cart.total = cart.subtotal - cart.discount + cart.tax;
  return cart;
}

export function get_cart(session_id: string): Cart {
  if (!carts.has(session_id)) {
    carts.set(session_id, create_empty_cart());
  }
  return carts.get(session_id)!;
}

export function add_to_cart(session_id: string, item: Omit<CartItem, 'quantity'> & { quantity?: number }): Cart {
  const cart = get_cart(session_id);
  const quantity = item.quantity || 1;

  const existing = cart.items.find(
    (i) => i.product_id === item.product_id && i.variation === item.variation,
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }

  calculate_totals(cart);
  return cart;
}

export function remove_from_cart(session_id: string, product_id: string, variation?: string): Cart {
  const cart = get_cart(session_id);
  cart.items = cart.items.filter(
    (i) => !(i.product_id === product_id && i.variation === variation),
  );
  calculate_totals(cart);
  return cart;
}

export function update_quantity(session_id: string, product_id: string, quantity: number): Cart {
  const cart = get_cart(session_id);
  const item = cart.items.find((i) => i.product_id === product_id);

  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.product_id !== product_id);
    } else {
      item.quantity = quantity;
    }
  }

  calculate_totals(cart);
  return cart;
}

export function clear_cart(session_id: string): Cart {
  const cart = create_empty_cart();
  carts.set(session_id, cart);
  return cart;
}

export function apply_coupon(session_id: string, code: string, discount: number): Cart {
  const cart = get_cart(session_id);
  cart.coupon_code = code;
  cart.discount = discount;
  calculate_totals(cart);
  return cart;
}

export default define_plugin({
  name: 'cart',
  version: '1.0.0',
  description: 'Shopping cart with session persistence',

  register(_api) {
    console.log('[Cart] Plugin loaded — shopping cart available');
  },
});

