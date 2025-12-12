/**
 * Simple logging utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple console-based logger
 */
export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, meta !== undefined ? meta : '');
    }
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, meta !== undefined ? meta : '');
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, meta !== undefined ? meta : '');
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, meta?: any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error || '', meta !== undefined ? meta : '');
    }
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
