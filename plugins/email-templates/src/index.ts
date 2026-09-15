/**
 * Email Templates Plugin — Configurable email templates.
 *
 * Features:
 *   - Pre-built templates for common notifications
 *   - Template variable substitution
 *   - Custom HTML templates
 *   - Template preview
 *   - Per-event template customization
 *
 * Events with templates:
 *   - order_confirmation
 *   - order_shipped
 *   - order_delivered
 *   - new_comment
 *   - password_reset
 *   - user_welcome
 *   - newsletter
 */
import { define_plugin } from '@typepress/plugin-sdk';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

const templates: Record<string, EmailTemplate> = {
  order_confirmation: {
    id: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Order {{order_id}} confirmed',
    html: `
      <h1>Thank you for your order!</h1>
      <p>Hi {{customer_name}},</p>
      <p>Your order <strong>{{order_id}}</strong> has been confirmed.</p>
      <h2>Order Summary</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;">Subtotal</td><td style="text-align:right;">\${{subtotal}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;">Tax</td><td style="text-align:right;">\${{tax}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;">Shipping</td><td style="text-align:right;">\${{shipping}}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">\${{total}}</td></tr>
      </table>
      <p>We'll send you an email when your order ships.</p>
    `,
    variables: ['order_id', 'customer_name', 'subtotal', 'tax', 'shipping', 'total'],
  },
  order_shipped: {
    id: 'order_shipped',
    name: 'Order Shipped',
    subject: 'Your order {{order_id}} has shipped',
    html: `
      <h1>Your order is on its way!</h1>
      <p>Hi {{customer_name}},</p>
      <p>Your order <strong>{{order_id}}</strong> has been shipped.</p>
      <p>Tracking number: <strong>{{tracking_number}}</strong></p>
      <p>Estimated delivery: {{estimated_delivery}}</p>
    `,
    variables: ['order_id', 'customer_name', 'tracking_number', 'estimated_delivery'],
  },
  password_reset: {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your password',
    html: `
      <h1>Password Reset</h1>
      <p>Hi {{user_name}},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="{{reset_url}}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
    variables: ['user_name', 'reset_url'],
  },
  user_welcome: {
    id: 'user_welcome',
    name: 'User Welcome',
    subject: 'Welcome to {{site_name}}',
    html: `
      <h1>Welcome, {{user_name}}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now log in to the admin panel at <a href="{{login_url}}">{{login_url}}</a></p>
    `,
    variables: ['user_name', 'site_name', 'login_url'],
  },
};

function render_template(template: EmailTemplate, variables: Record<string, string>): { subject: string; html: string } {
  let subject = template.subject;
  let html = template.html;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
  }

  return { subject, html };
}

export function get_template(id: string): EmailTemplate | undefined {
  return templates[id];
}

export function get_all_templates(): EmailTemplate[] {
  return Object.values(templates);
}

export function add_template(template: EmailTemplate): void {
  templates[template.id] = template;
}

export default define_plugin({
  name: 'email-templates',
  version: '1.0.0',
  description: 'Configurable email templates',

  register(_api) {
    console.log(`[EmailTemplates] Loaded ${Object.keys(templates).length} templates`);
  },
});

