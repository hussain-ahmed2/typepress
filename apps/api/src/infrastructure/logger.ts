/**
 * Logger — Structured logging for Typepress.
 *
 * Replaces console.log with structured logging.
 * In production, logs to stdout as JSON.
 * In development, logs with colors and timestamps.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const log_entry = {
      timestamp,
      level,
      module: this.prefix,
      message,
      ...(data ? { data } : {}),
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(log_entry));
    } else {
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
      };
      console.log(`${colors[level]}[${this.prefix}]${'\x1b[0m'} ${message}`);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }
}

export function create_logger(prefix: string): Logger {
  return new Logger(prefix);
}
