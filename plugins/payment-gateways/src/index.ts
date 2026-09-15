/**
 * Payment Gateways Plugin — Multiple payment gateway support.
 *
 * Supported Gateways:
 *   - Stripe (credit/debit cards)
 *   - PayPal
 *   - Bank Transfer (manual)
 *   - Cash on Delivery
 *
 * Each gateway implements a common PaymentGateway interface.
 * In production, integrate with real payment APIs.
 */
import { define_plugin } from '@typepress/plugin-sdk';

export type GatewayType = 'stripe' | 'paypal' | 'bank_transfer' | 'cash_on_delivery';

export interface PaymentGateway {
  id: string;
  name: string;
  type: GatewayType;
  enabled: boolean;
  process_payment(amount: number, currency: string): Promise<PaymentResult>;
  refund(transaction_id: string, amount: number): Promise<PaymentResult>;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

// Gateway implementations
class StripeGateway implements PaymentGateway {
  id = 'stripe';
  name = 'Stripe';
  type: GatewayType = 'stripe';
  enabled = true;

  async process_payment(amount: number, currency: string): Promise<PaymentResult> {
    // Simulate Stripe API call
    console.log(`[Stripe] Processing $${amount} ${currency}`);
    return {
      success: true,
      transaction_id: `pi_${Date.now()}`,
      status: 'completed',
    };
  }

  async refund(transaction_id: string, amount: number): Promise<PaymentResult> {
    console.log(`[Stripe] Refunding ${transaction_id}: $${amount}`);
    return { success: true, transaction_id: `re_${Date.now()}`, status: 'refunded' };
  }
}

class PayPalGateway implements PaymentGateway {
  id = 'paypal';
  name = 'PayPal';
  type: GatewayType = 'paypal';
  enabled = true;

  async process_payment(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`[PayPal] Processing $${amount} ${currency}`);
    return {
      success: true,
      transaction_id: `pp_${Date.now()}`,
      status: 'completed',
    };
  }

  async refund(transaction_id: string, amount: number): Promise<PaymentResult> {
    console.log(`[PayPal] Refunding ${transaction_id}: $${amount}`);
    return { success: true, transaction_id: `ppr_${Date.now()}`, status: 'refunded' };
  }
}

class BankTransferGateway implements PaymentGateway {
  id = 'bank_transfer';
  name = 'Bank Transfer';
  type: GatewayType = 'bank_transfer';
  enabled = true;

  async process_payment(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`[BankTransfer] Awaiting manual transfer of $${amount} ${currency}`);
    return { success: true, transaction_id: `bt_${Date.now()}`, status: 'pending' };
  }

  async refund(transaction_id: string, amount: number): Promise<PaymentResult> {
    return { success: false, error: 'Bank transfer refunds require manual processing', status: 'failed' as const };
  }
}

class CashOnDeliveryGateway implements PaymentGateway {
  id = 'cash_on_delivery';
  name = 'Cash on Delivery';
  type: GatewayType = 'cash_on_delivery';
  enabled = true;

  async process_payment(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`[COD] Order will be paid on delivery: $${amount} ${currency}`);
    return { success: true, transaction_id: `cod_${Date.now()}`, status: 'pending' };
  }

  async refund(transaction_id: string, amount: number): Promise<PaymentResult> {
    return { success: false, error: 'COD refunds require manual processing', status: 'failed' as const };
  }
}

const gateways: PaymentGateway[] = [
  new StripeGateway(),
  new PayPalGateway(),
  new BankTransferGateway(),
  new CashOnDeliveryGateway(),
];

export function get_gateway(type: GatewayType): PaymentGateway | undefined {
  return gateways.find((g) => g.type === type);
}

export function get_enabled_gateways(): PaymentGateway[] {
  return gateways.filter((g) => g.enabled);
}

export default define_plugin({
  name: 'payment-gateways',
  version: '1.0.0',
  description: 'Multiple payment gateway support',

  register(_api) {
    console.log(`[PaymentGateways] Loaded ${gateways.length} gateways: ${gateways.map((g) => g.name).join(', ')}`);
  },
});

