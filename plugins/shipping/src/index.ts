/**
 * Shipping Plugin — Shipping zones and rate calculation.
 *
 * Features:
 *   - Define shipping zones by country/region
 *   - Flat rate shipping per zone
 *   - Free shipping threshold
 *   - Weight-based shipping
 *   - Shipping methods (standard, express, overnight)
 *   - Calculate shipping cost for cart
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  methods: ShippingMethod[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  rate: number;
  free_threshold: number;
  estimated_days: string;
}

export interface ShippingRate {
  method_id: string;
  method_name: string;
  cost: number;
  estimated_days: string;
}

// Default shipping zones
const shipping_zones: ShippingZone[] = [
  {
    id: 'us',
    name: 'United States',
    countries: ['US'],
    methods: [
      { id: 'standard', name: 'Standard Shipping', rate: 5.99, free_threshold: 50, estimated_days: '5-7 business days' },
      { id: 'express', name: 'Express Shipping', rate: 12.99, free_threshold: 100, estimated_days: '2-3 business days' },
      { id: 'overnight', name: 'Overnight Shipping', rate: 24.99, free_threshold: 200, estimated_days: '1 business day' },
    ],
  },
  {
    id: 'eu',
    name: 'Europe',
    countries: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'PT', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'GR'],
    methods: [
      { id: 'standard', name: 'Standard International', rate: 12.99, free_threshold: 100, estimated_days: '7-14 business days' },
      { id: 'express', name: 'Express International', rate: 29.99, free_threshold: 200, estimated_days: '3-5 business days' },
    ],
  },
  {
    id: 'international',
    name: 'International',
    countries: ['*'],
    methods: [
      { id: 'standard', name: 'Standard International', rate: 19.99, free_threshold: 150, estimated_days: '10-21 business days' },
      { id: 'express', name: 'Express International', rate: 39.99, free_threshold: 300, estimated_days: '5-10 business days' },
    ],
  },
];

export function get_zone_for_country(country_code: string): ShippingZone | undefined {
  // Check specific zones first
  const specific = shipping_zones.find(
    (z) => z.id !== 'international' && z.countries.includes(country_code),
  );
  if (specific) return specific;

  // Fall back to international
  return shipping_zones.find((z) => z.id === 'international');
}

export function calculate_shipping(
  country_code: string,
  subtotal: number,
): ShippingRate[] {
  const zone = get_zone_for_country(country_code);
  if (!zone) return [];

  return zone.methods.map((method) => ({
    method_id: method.id,
    method_name: method.name,
    cost: subtotal >= method.free_threshold ? 0 : method.rate,
    estimated_days: method.estimated_days,
  }));
}

export function get_all_zones(): ShippingZone[] {
  return shipping_zones;
}

export function add_zone(zone: ShippingZone): void {
  shipping_zones.push(zone);
}

export default define_plugin({
  name: 'shipping',
  version: '1.0.0',
  description: 'Shipping zones and rate calculation',

  register(_api) {
    console.log(`[Shipping] Loaded ${shipping_zones.length} shipping zones`);
  },
});

