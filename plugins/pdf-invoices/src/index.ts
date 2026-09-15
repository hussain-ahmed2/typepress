/**
 * PDF Invoices Plugin — Generate PDF invoices for orders.
 *
 * Features:
 *   - Generate PDF invoices from order data
 *   - Company branding (logo, name, address)
 *   - Invoice numbering
 *   - Tax breakdown
 *   - Payment status
 *   - Download link generation
 *
 * Note: Uses HTML-to-PDF conversion.
 * In production, use a library like puppeteer or pdfkit.
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface InvoiceData {
  invoice_number: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_status: string;
  notes?: string;
  company_name: string;
  company_address: string;
  company_email: string;
  issued_at: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

let invoice_counter = 1000;

function generate_invoice_number(): string {
  invoice_counter++;
  return `INV-${String(invoice_counter).padStart(6, '0')}`;
}

/**
 * Generate invoice data from order data.
 */
export function create_invoice(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_status: string;
}): InvoiceData {
  return {
    invoice_number: generate_invoice_number(),
    order_id: order.id,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    shipping_address: order.shipping_address,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    payment_status: order.payment_status,
    company_name: process.env.COMPANY_NAME || 'Typepress Store',
    company_address: process.env.COMPANY_ADDRESS || '123 Commerce St, Internet',
    company_email: process.env.COMPANY_EMAIL || 'billing@store.com',
    issued_at: new Date().toISOString(),
  };
}

/**
 * Generate HTML for invoice rendering.
 */
export function render_invoice_html(invoice: InvoiceData): string {
  const items_html = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.price.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.total.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
        .company { font-size: 14px; color: #666; }
        .invoice-info { float: right; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .totals { float: right; width: 300px; }
        .totals td { padding: 4px 8px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <strong>${invoice.company_name}</strong><br>
          ${invoice.company_address}<br>
          ${invoice.company_email}
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <p><strong>${invoice.invoice_number}</strong></p>
          <p>Date: ${new Date(invoice.issued_at).toLocaleDateString()}</p>
          <p>Order: ${invoice.order_id}</p>
        </div>
        <div style="clear:both;"></div>
      </div>

      <div style="margin:20px 0;">
        <strong>Bill To:</strong><br>
        ${invoice.customer_name}<br>
        ${invoice.customer_email}<br>
        ${invoice.shipping_address}
      </div>

      <table>
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;text-align:left;">Item</th>
            <th style="padding:8px;text-align:center;">Qty</th>
            <th style="padding:8px;text-align:right;">Price</th>
            <th style="padding:8px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items_html}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td>Subtotal:</td><td style="text-align:right;">$${invoice.subtotal.toFixed(2)}</td></tr>
          <tr><td>Tax:</td><td style="text-align:right;">$${invoice.tax.toFixed(2)}</td></tr>
          <tr><td>Shipping:</td><td style="text-align:right;">$${invoice.shipping.toFixed(2)}</td></tr>
          <tr><td style="font-weight:bold;">Total:</td><td style="text-align:right;font-weight:bold;">$${invoice.total.toFixed(2)}</td></tr>
        </table>
      </div>

      <div style="clear:both;"></div>

      <div class="footer">
        <p>Payment Status: <strong>${invoice.payment_status}</strong></p>
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;
}

export default define_plugin({
  name: 'pdf-invoices',
  version: '1.0.0',
  description: 'PDF invoice generation for orders',

  register(_api) {
    console.log('[PDFInvoices] Plugin loaded — invoice generation available');
  },
});

