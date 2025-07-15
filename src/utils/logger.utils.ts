import * as winston from 'winston';
import * as path from 'path';

/**
 * Winston Logger Configuration
 * Provides comprehensive logging for the LDAP to PostgreSQL migration process
 */
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    // Define log format with timestamp, level, and message
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    );

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'ldap-migration' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: consoleFormat,
          level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        }),
        // File transport for persistent logging
        new winston.transports.File({
          filename: process.env.LOG_FILE_PATH || './logs/migration.log',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        // Error file transport
        new winston.transports.File({
          filename: process.env.LOG_FILE_PATH?.replace('.log', '.error.log') || './logs/migration.error.log',
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Log initialization
    this.logger.info('Logger service initialized', {
      logLevel: process.env.LOG_LEVEL || 'info',
      logFile: process.env.LOG_FILE_PATH || './logs/migration.log',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Log information message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log debug message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log migration progress
   * @param current - Current count
   * @param total - Total count
   * @param type - Type of migration (clients/users)
   */
  progress(current: number, total: number, type: string): void {
    const percentage = Math.round((current / total) * 100);
    this.info(`Migration progress: ${current}/${total} ${type} (${percentage}%)`, {
      current,
      total,
      percentage,
      type
    });
  }

  /**
   * Log LDAP connection events
   * @param event - Connection event
   * @param details - Connection details
   */
  ldapEvent(event: string, details?: any): void {
    this.info(`LDAP ${event}`, { event, ...details });
  }

  /**
   * Log database operations
   * @param operation - Database operation
   * @param details - Operation details
   */
  dbOperation(operation: string, details?: any): void {
    this.debug(`Database ${operation}`, { operation, ...details });
  }

  /**
   * Log password hashing events
   * @param event - Hashing event
   * @param details - Hashing details
   */
  passwordEvent(event: string, details?: any): void {
    this.debug(`Password ${event}`, { event, ...details });
  }
}

// Export singleton instance
export const logger = new LoggerService(); 