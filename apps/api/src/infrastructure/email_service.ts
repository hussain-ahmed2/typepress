import { create_logger } from "./logger";
const log = create_logger("Email");
/**
 * Email Service — Email notifications for Typepress events.
 *
 * Uses Nodemailer for sending emails.
 * Configurable via environment variables.
 *
 * Events:
 *   - New comment notification
 *   - Content published notification
 *   - User registration notification
 */
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private transporter: { sendMail: (options: EmailOptions) => Promise<unknown> } | null = null;

  /**
   * Initialize the email transporter.
   * Call once at server startup.
   */
  init(): void {
    const smtp_host = process.env.SMTP_HOST;
    const smtp_port = process.env.SMTP_PORT;
    const smtp_user = process.env.SMTP_USER;
    const smtp_pass = process.env.SMTP_PASS;

    if (!smtp_host) {
      console.log('[Email] SMTP not configured — emails will be logged only');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port || '587', 10),
      secure: parseInt(smtp_port || '587', 10) === 465,
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
    });

    console.log('[Email] SMTP transporter initialized');
  }

  /**
   * Send an email.
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      log.info(` Would send to ${options.to}: ${options.subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return true;
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }
  }

  /**
   * Send new comment notification to content author.
   */
  async notify_new_comment(
    author_email: string,
    content_title: string,
    commenter_name: string,
  ): Promise<boolean> {
    return this.send({
      to: author_email,
      subject: `New comment on "${content_title}"`,
      html: `
        <h2>New Comment</h2>
        <p><strong>${commenter_name}</strong> commented on "${content_title}".</p>
        <p>Login to view and moderate the comment.</p>
      `,
    });
  }

  /**
   * Send content published notification to admin.
   */
  async notify_content_published(
    admin_email: string,
    content_title: string,
    author_name: string,
  ): Promise<boolean> {
    return this.send({
      to: admin_email,
      subject: `Content published: "${content_title}"`,
      html: `
        <h2>Content Published</h2>
        <p><strong>${author_name}</strong> published "${content_title}".</p>
      `,
    });
  }

  /**
   * Send welcome email to new user.
   */
  async notify_user_registered(
    user_email: string,
    user_name: string,
  ): Promise<boolean> {
    return this.send({
      to: user_email,
      subject: 'Welcome to Typepress',
      html: `
        <h2>Welcome, ${user_name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now log in to the admin panel.</p>
      `,
    });
  }
}

export const email_service = new EmailService();
