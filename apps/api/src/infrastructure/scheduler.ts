import { create_logger } from "./logger";
const log = create_logger("Scheduler");
import { db, contents } from '@typepress/db';
import { and, eq, isNotNull, lte } from 'drizzle-orm';

/**
 * Scheduler — Publishes scheduled content automatically.
 *
 * Checks for content with published_at in the past and status DRAFT,
 * then publishes it. Runs every minute via setInterval.
 */
export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;

  start(interval_ms = 60000): void {
    log.info(` Started (checking every ${interval_ms / 1000}s)`);
    this.interval = setInterval(() => this.check_scheduled(), interval_ms);
    // Run immediately on start
    this.check_scheduled();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[Scheduler] Stopped');
    }
  }

  private async check_scheduled(): Promise<void> {
    try {
      const now = new Date();

      // Find content that should be published now
      const to_publish = await db
        .select({ id: contents.id, title: contents.title })
        .from(contents)
        .where(
          and(
            eq(contents.status, 'DRAFT'),
            isNotNull(contents.published_at),
            lte(contents.published_at, now),
          ),
        );

      if (to_publish.length === 0) return;

      log.info(` Publishing ${to_publish.length} scheduled post(s)`);

      for (const content of to_publish) {
        await db
          .update(contents)
          .set({ status: 'PUBLISHED' })
          .where(eq(contents.id, content.id));
        log.info(` Published: "${content.title}" (${content.id})`);
      }
    } catch (error) {
      console.error('[Scheduler] Error checking scheduled content:', error);
    }
  }
}

export const scheduler = new Scheduler();
