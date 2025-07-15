import { Injectable } from '@nestjs/common';
import { logger } from '../utils/logger.utils';

/**
 * Configuration Service
 * Manages application configuration from environment variables
 */
@Injectable()
export class ConfigurationService {
  // LDAP Configuration
  get ldapUrl(): string {
    return process.env.LDAP_URL || 'ldap://localhost:389';
  }

  get ldapBindDn(): string {
    return process.env.LDAP_BIND_DN || 'cn=Directory Manager';
  }

  get ldapBindPassword(): string {
    return process.env.LDAP_BIND_PASSWORD || '';
  }

  get ldapBaseDn(): string {
    return process.env.LDAP_BASE_DN || 'ou=clients,dc=example,dc=com';
  }

  get ldapSearchScope(): string {
    return process.env.LDAP_SEARCH_SCOPE || 'sub';
  }

  // Database Configuration
  get dbHost(): string {
    return process.env.DB_HOST || 'localhost';
  }

  get dbPort(): number {
    return parseInt(process.env.DB_PORT || '5432', 10);
  }

  get dbUser(): string {
    return process.env.DB_USER || 'postgres';
  }

  get dbPassword(): string {
    return process.env.DB_PASSWORD || 'postgres';
  }

  get dbName(): string {
    return process.env.DB_NAME || 'usersdb';
  }

  get dbSchema(): string {
    return process.env.DB_SCHEMA || 'public';
  }

  // Application Configuration
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }

  get logFilePath(): string {
    return process.env.LOG_FILE_PATH || './logs/migration.log';
  }

  // Migration Configuration
  get dryRun(): boolean {
    return process.env.DRY_RUN === 'true';
  }

  get batchSize(): number {
    return parseInt(process.env.BATCH_SIZE || '100', 10);
  }

  get maxConcurrentUsers(): number {
    return parseInt(process.env.MAX_CONCURRENT_USERS || '10', 10);
  }

  /**
   * Validate required configuration
   * @returns boolean - True if all required config is present
   */
  validate(): boolean {
    const requiredFields = [
      { name: 'LDAP_URL', value: this.ldapUrl },
      { name: 'LDAP_BIND_DN', value: this.ldapBindDn },
      { name: 'LDAP_BIND_PASSWORD', value: this.ldapBindPassword },
      { name: 'LDAP_BASE_DN', value: this.ldapBaseDn },
      { name: 'DB_HOST', value: this.dbHost },
      { name: 'DB_USER', value: this.dbUser },
      { name: 'DB_PASSWORD', value: this.dbPassword },
      { name: 'DB_NAME', value: this.dbName }
    ];

    const missingFields = requiredFields.filter(field => !field.value);

    if (missingFields.length > 0) {
      logger.error('Missing required configuration fields', {
        missingFields: missingFields.map(f => f.name)
      });
      return false;
    }

    logger.info('Configuration validation passed', {
      ldapUrl: this.ldapUrl,
      ldapBaseDn: this.ldapBaseDn,
      dbHost: this.dbHost,
      dbName: this.dbName,
      dryRun: this.dryRun,
      batchSize: this.batchSize
    });

    return true;
  }

  /**
   * Get database connection configuration
   * @returns object - Database connection config
   */
  getDatabaseConfig() {
    return {
      type: 'postgres' as const,
      host: this.dbHost,
      port: this.dbPort,
      username: this.dbUser,
      password: this.dbPassword,
      database: this.dbName,
      schema: this.dbSchema,
      synchronize: false, // Never auto-sync in production
      logging: this.nodeEnv === 'development',
      entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
      cli: {
        migrationsDir: 'database/migrations'
      }
    };
  }

  /**
   * Get LDAP connection configuration
   * @returns object - LDAP connection config
   */
  getLdapConfig() {
    return {
      url: this.ldapUrl,
      bindDN: this.ldapBindDn,
      bindPassword: this.ldapBindPassword,
      baseDN: this.ldapBaseDn,
      searchScope: this.ldapSearchScope
    };
  }

  /**
   * Get all configuration for logging (without sensitive data)
   * @returns object - Configuration summary
   */
  getConfigSummary(): object {
    return {
      ldap: {
        url: this.ldapUrl,
        bindDN: this.ldapBindDn,
        baseDN: this.ldapBaseDn,
        searchScope: this.ldapSearchScope
      },
      database: {
        host: this.dbHost,
        port: this.dbPort,
        user: this.dbUser,
        database: this.dbName,
        schema: this.dbSchema
      },
      application: {
        nodeEnv: this.nodeEnv,
        logLevel: this.logLevel,
        logFilePath: this.logFilePath
      },
      migration: {
        dryRun: this.dryRun,
        batchSize: this.batchSize,
        maxConcurrentUsers: this.maxConcurrentUsers
      }
    };
  }
} 