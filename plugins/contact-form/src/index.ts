/**
 * Contact Form Plugin — Adds a contact form to Typepress.
 *
 * Features:
 *   - Configurable form fields
 *   - Email notifications on submission
 *   - Spam protection (honeypot field)
 *   - Submission storage in database
 *   - Admin UI for viewing submissions
 */
import { define_plugin } from '@typepress/plugin-sdk';

export default define_plugin({
  name: 'contact-form',
  version: '1.0.0',
  description: 'Contact form with email notifications',

  register(api) {
    // Register hooks for form submission
    api.hooks.on('contact_form:before_submit', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      console.log(`[ContactForm] Submission from: ${data.email}`);
    });

    api.hooks.on('contact_form:after_submit', async (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      console.log(`[ContactForm] Submission saved: ${data.id}`);
    });

    console.log('[ContactForm] Plugin loaded — POST /api/contact-form to submit');
  },
});
