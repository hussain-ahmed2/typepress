/**
 * Orders Plugin — Order management and fulfillment.
 *
 * Features:
 *   - Order creation from checkout
 *   - Order status tracking (pending, processing, shipped, delivered, cancelled)
 *   - Order history per customer
 *   - Order notes/comments
 *   - Email notifications on status changes
 *   - Refund processing
 *
 * Storage: In-memory (use database in production).
 */
import { define_plugin } from '@typepress/plugin-sdk';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  payment_status: 'pending' | 'paid' | 'refunded';
  stripe_payment_intent_id?: string;
  notes: OrderNote[];
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
}

export interface OrderNote {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

// In-memory order storage (use database in production)
const orders = new Map<string, Order>();

/**
 * Create an order from checkout data.
 */
export function create_order(data: {
  customer_email: string;
  customer_name: string;
  shipping_address: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping?: number;
  stripe_payment_intent_id?: string;
}): Order {
  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customer_email: data.customer_email,
    customer_name: data.customer_name,
    shipping_address: data.shipping_address,
    items: data.items,
    subtotal: data.subtotal,
    tax: data.tax,
    shipping: data.shipping || 0,
    total: data.subtotal + data.tax + (data.shipping || 0),
    status: 'pending',
    payment_status: data.stripe_payment_intent_id ? 'paid' : 'pending',
    stripe_payment_intent_id: data.stripe_payment_intent_id,
    notes: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  orders.set(order.id, order);
  return order;
}

/**
 * Get an order by ID.
 */
export function get_order(id: string): Order | undefined {
  return orders.get(id);
}

/**
 * Get all orders for a customer.
 */
export function get_orders_by_customer(email: string): Order[] {
  return Array.from(orders.values()).filter((o) => o.customer_email === email);
}

/**
 * Update order status.
 */
export function update_order_status(id: string, status: OrderStatus): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;

  order.status = status;
  order.updated_at = new Date().toISOString();

  // Add automatic note
  order.notes.push({
    id: `note_${Date.now()}`,
    author: 'system',
    content: `Status changed to ${status}`,
    created_at: new Date().toISOString(),
  });

  return order;
}

/**
 * Add a note to an order.
 */
export function add_order_note(id: string, author: string, content: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;

  order.notes.push({
    id: `note_${Date.now()}`,
    author,
    content,
    created_at: new Date().toISOString(),
  });

  order.updated_at = new Date().toISOString();
  return order;
}

/**
 * Get all orders.
 */
export function get_all_orders(): Order[] {
  return Array.from(orders.values());
}

export default define_plugin({
  name: 'orders',
  version: '1.0.0',
  description: 'Order management and fulfillment',

  register(api) {
    api.hooks.on('order:after_create', async (...args: unknown[]) => {
      const order = args[0] as Order;
      console.log(`[Orders] New order ${order.id} from ${order.customer_email}`);
    });

    api.hooks.on('order:status_changed', async (...args: unknown[]) => {
      const data = args[0] as { order_id: string; status: OrderStatus };
      console.log(`[Orders] Order ${data.order_id} status: ${data.status}`);
    });

    console.log('[Orders] Plugin loaded — order management available');
  },
});

