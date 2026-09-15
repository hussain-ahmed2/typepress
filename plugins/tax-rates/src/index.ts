/**
 * Tax Rates Plugin — Tax rate management by country/region.
 *
 * Features:
 *   - Define tax rates per country/region
 *   - Percentage-based taxes
 *   - Inclusive vs exclusive tax
 *   - Tax name customization (VAT, GST, Sales Tax)
 *   - Calculate tax for order total
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface TaxRate {
  id: string;
  country_code: string;
  name: string;
  rate: number;
  inclusive: boolean;
  priority: number;
  active: boolean;
}

export interface TaxCalculation {
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
  inclusive: boolean;
}

// Default tax rates
const tax_rates: TaxRate[] = [
  { id: 'us_ca', country_code: 'US', name: 'California Sales Tax', rate: 0.0725, inclusive: false, priority: 1, active: true },
  { id: 'us_ny', country_code: 'US', name: 'New York Sales Tax', rate: 0.08, inclusive: false, priority: 1, active: true },
  { id: 'us_default', country_code: 'US', name: 'US Sales Tax', rate: 0.05, inclusive: false, priority: 2, active: true },
  { id: 'gb_vat', country_code: 'GB', name: 'UK VAT', rate: 0.20, inclusive: true, priority: 1, active: true },
  { id: 'de_vat', country_code: 'DE', name: 'German VAT', rate: 0.19, inclusive: true, priority: 1, active: true },
  { id: 'fr_vat', country_code: 'FR', name: 'French VAT', rate: 0.20, inclusive: true, priority: 1, active: true },
  { id: 'au_gst', country_code: 'AU', name: 'Australian GST', rate: 0.10, inclusive: true, priority: 1, active: true },
  { id: 'ca_gst', country_code: 'CA', name: 'Canadian GST', rate: 0.05, inclusive: false, priority: 1, active: true },
];

export function get_tax_rates_for_country(country_code: string): TaxRate[] {
  return tax_rates.filter((t) => t.country_code === country_code && t.active);
}

export function calculate_tax(subtotal: number, country_code: string): TaxCalculation[] {
  const rates = get_tax_rates_for_country(country_code);
  return rates
    .sort((a, b) => a.priority - b.priority)
    .map((rate) => ({
      tax_name: rate.name,
      tax_rate: rate.rate,
      tax_amount: rate.inclusive ? subtotal - (subtotal / (1 + rate.rate)) : subtotal * rate.rate,
      inclusive: rate.inclusive,
    }));
}

export function get_all_tax_rates(): TaxRate[] {
  return tax_rates;
}

export function add_tax_rate(rate: TaxRate): void {
  tax_rates.push(rate);
}

export function update_tax_rate(id: string, updates: Partial<TaxRate>): boolean {
  const rate = tax_rates.find((t) => t.id === id);
  if (!rate) return false;
  Object.assign(rate, updates);
  return true;
}

export default define_plugin({
  name: 'tax-rates',
  version: '1.0.0',
  description: 'Tax rate management by country/region',

  register(_api) {
    console.log(`[TaxRates] Loaded ${tax_rates.length} tax rates`);
  },
});

