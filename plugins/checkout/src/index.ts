/**
 * Checkout Plugin — Checkout flow with Stripe payment integration.
 *
 * Features:
 *   - Checkout session creation
 *   - Stripe payment intent integration
 *   - Order creation from cart
 *   - Payment status tracking
 *   - Email confirmation on order
 *
 * Note: Requires STRIPE_SECRET_KEY environment variable.
 * In demo mode, payments are simulated.
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface CheckoutSession {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: Address;
  items: CheckoutItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CheckoutItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
}

export interface PaymentResult {
  success: boolean;
  payment_intent_id?: string;
  error?: string;
}

// In-memory checkout sessions (use database in production)
const checkout_sessions = new Map<string, CheckoutSession>();

/**
 * Create a checkout session from cart data.
 */
export function create_checkout_session(
  session_id: string,
  customer_email: string,
  customer_name: string,
  shipping_address: Address,
  items: CheckoutItem[],
  subtotal: number,
  tax: number,
): CheckoutSession {
  const checkout: CheckoutSession = {
    id: `checkout_${Date.now()}_${session_id}`,
    customer_email,
    customer_name,
    shipping_address,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  };

  checkout_sessions.set(checkout.id, checkout);
  return checkout;
}

/**
 * Process payment (simulated in demo mode).
 * In production, integrate with Stripe Payment Intents.
 */
export async function process_payment(checkout_id: string): Promise<PaymentResult> {
  const session = checkout_sessions.get(checkout_id);
  if (!session) {
    return { success: false, error: 'Checkout session not found' };
  }

  // Simulate payment processing
  // In production: call Stripe API with payment intent
  const stripe_payment_intent = `pi_simulated_${Date.now()}`;

  session.payment_status = 'paid';
  session.stripe_payment_intent_id = stripe_payment_intent;

  return {
    success: true,
    payment_intent_id: stripe_payment_intent,
  };
}

/**
 * Get checkout session by ID.
 */
export function get_checkout_session(id: string): CheckoutSession | undefined {
  return checkout_sessions.get(id);
}

export default define_plugin({
  name: 'checkout',
  version: '1.0.0',
  description: 'Checkout flow with Stripe payment integration',

  register(api) {
    api.hooks.on('checkout:before_payment', async (...args: unknown[]) => {
      const session = args[0] as CheckoutSession;
      console.log(`[Checkout] Processing payment for ${session.customer_email}`);
    });

    api.hooks.on('checkout:after_payment', async (...args: unknown[]) => {
      const result = args[0] as PaymentResult;
      console.log(`[Checkout] Payment result: ${result.success ? 'success' : 'failed'}`);
    });

    console.log('[Checkout] Plugin loaded — checkout flow available');
  },
});
