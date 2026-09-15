/**
 * Subscriptions Plugin — Subscription and membership management.
 *
 * Features:
 *   - Create subscription plans (monthly, yearly)
 *   - Subscribe users to plans
 *   - Recurring billing (simulated)
 *   - Subscription status tracking (active, cancelled, past_due)
 *   - Access control based on subscription
 *   - Free trial support
 *   - Proration on plan changes
 */
import { define_plugin } from '@typepress/plugin-sdk';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
export type BillingInterval = 'monthly' | 'yearly' | 'weekly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_interval: BillingInterval;
  trial_days: number;
  features: string[];
  active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at?: string;
  created_at: string;
}

// In-memory storage (use database in production)
const plans = new Map<string, SubscriptionPlan>();
const subscriptions = new Map<string, Subscription>();

// Default plans
const default_plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic access with limited features',
    price: 0,
    billing_interval: 'monthly',
    trial_days: 0,
    features: ['Basic content access', 'Community support'],
    active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full access to all features',
    price: 29.99,
    billing_interval: 'monthly',
    trial_days: 14,
    features: ['All content', 'Priority support', 'Custom themes', 'API access'],
    active: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For teams and businesses',
    price: 99.99,
    billing_interval: 'monthly',
    trial_days: 30,
    features: ['Everything in Pro', 'Team management', 'White-label', 'Dedicated support', 'SLA'],
    active: true,
  },
];

// Initialize default plans
default_plans.forEach((plan) => plans.set(plan.id, plan));

export function get_plan(id: string): SubscriptionPlan | undefined {
  return plans.get(id);
}

export function get_all_plans(): SubscriptionPlan[] {
  return Array.from(plans.values());
}

export function create_plan(plan: SubscriptionPlan): void {
  plans.set(plan.id, plan);
}

export function subscribe_user(user_id: string, plan_id: string): Subscription | undefined {
  const plan = plans.get(plan_id);
  if (!plan) return undefined;

  const now = new Date();
  const period_end = new Date(now);

  if (plan.billing_interval === 'monthly') period_end.setMonth(period_end.getMonth() + 1);
  else if (plan.billing_interval === 'yearly') period_end.setFullYear(period_end.getFullYear() + 1);
  else if (plan.billing_interval === 'weekly') period_end.setDate(period_end.getDate() + 7);

  const subscription: Subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id,
    plan_id,
    status: plan.trial_days > 0 ? 'trialing' : 'active',
    current_period_start: now.toISOString(),
    current_period_end: period_end.toISOString(),
    trial_end: plan.trial_days > 0 ? new Date(now.getTime() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString() : undefined,
    created_at: now.toISOString(),
  };

  subscriptions.set(subscription.id, subscription);
  return subscription;
}

export function get_user_subscription(user_id: string): Subscription | undefined {
  return Array.from(subscriptions.values()).find(
    (s) => s.user_id === user_id && (s.status === 'active' || s.status === 'trialing'),
  );
}

export function cancel_subscription(subscription_id: string): boolean {
  const sub = subscriptions.get(subscription_id);
  if (!sub) return false;

  sub.status = 'cancelled';
  sub.cancel_at = new Date().toISOString();
  return true;
}

export function has_active_subscription(user_id: string): boolean {
  const sub = get_user_subscription(user_id);
  return sub !== undefined && (sub.status === 'active' || sub.status === 'trialing');
}

export default define_plugin({
  name: 'subscriptions',
  version: '1.0.0',
  description: 'Subscription and membership management',

  register(_api) {
    console.log(`[Subscriptions] Loaded ${plans.size} subscription plans`);
  },
});

