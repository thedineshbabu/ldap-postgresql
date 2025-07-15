import { Injectable } from '@nestjs/common';
import { LdapService, UserData } from './ldap.service';
import { DatabaseService } from './database.service';
import { ConfigurationService } from '../config/configuration';
import { PasswordUtils } from '../utils/password.utils';
import { logger } from '../utils/logger.utils';

/**
 * Migration Service
 * Orchestrates the LDAP to PostgreSQL migration process
 */
@Injectable()
export class MigrationService {
  constructor(
    private ldapService: LdapService,
    private dbService: DatabaseService,
    private configService: ConfigurationService
  ) {}

  /**
   * Execute the complete migration process
   * @returns Promise<MigrationResult>
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const stats: MigrationStats = {
      totalClients: 0,
      totalUsers: 0,
      successfulClients: 0,
      successfulUsers: 0,
      failedClients: 0,
      failedUsers: 0,
      errors: []
    };

    try {
      logger.info('Starting LDAP to PostgreSQL migration', {
        dryRun: this.configService.dryRun,
        batchSize: this.configService.batchSize
      });

      // Step 1: Connect to LDAP and Database
      await this.ldapService.connect();
      await this.dbService.initializeTables();

      // Step 2: Get all clients from LDAP
      const clients = await this.ldapService.searchClients();
      stats.totalClients = clients.length;

      logger.info(`Found ${clients.length} clients to migrate`);

      // Step 3: Process each client
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        logger.progress(i + 1, clients.length, 'clients');

        try {
          await this.processClient(client, stats);
          stats.successfulClients++;
        } catch (error) {
          stats.failedClients++;
          stats.errors.push(`Client ${client.ou}: ${error.message}`);
          logger.error(`Failed to process client ${client.ou}`, { error: error.message });
        }
      }

      // Step 4: Log migration results
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: MigrationResult = {
        success: stats.failedClients === 0 && stats.failedUsers === 0,
        stats,
        duration,
        dryRun: this.configService.dryRun
      };

      await this.dbService.logMigrationRun(stats);

      logger.info('Migration completed', {
        success: result.success,
        duration: `${duration}ms`,
        stats: {
          clients: `${stats.successfulClients}/${stats.totalClients}`,
          users: `${stats.successfulUsers}/${stats.totalUsers}`
        }
      });

      return result;

    } catch (error) {
      logger.error('Migration failed', { error: error.message });
      throw error;
    } finally {
      // Cleanup connections
      await this.ldapService.disconnect();
    }
  }

  /**
   * Process a single client and its users
   * @param client - Client data from LDAP
   * @param stats - Migration statistics
   */
  private async processClient(client: { ou: string; dn: string }, stats: MigrationStats): Promise<void> {
    logger.info(`Processing client: ${client.ou}`);

    // Upsert client in database
    const dbClient = await this.dbService.upsertClient(client.ou);

    // Get users for this client
    const users = await this.ldapService.searchUsers(client.ou);
    stats.totalUsers += users.length;

    logger.info(`Found ${users.length} users for client ${client.ou}`);

    // Process users in batches
    const batchSize = this.configService.batchSize;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Process batch concurrently (with limit)
      const promises = batch.map(user => this.processUser(user, dbClient.id, stats));
      await Promise.allSettled(promises);

      logger.progress(Math.min(i + batchSize, users.length), users.length, `users in ${client.ou}`);
    }
  }

  /**
   * Process a single user
   * @param userData - User data from LDAP
   * @param clientId - Database client UUID
   * @param stats - Migration statistics
   */
  private async processUser(userData: UserData, clientId: string, stats: MigrationStats): Promise<void> {
    try {
      // Convert password hash if present
      let passwordHash = null;
      if (userData.userPassword) {
        passwordHash = await PasswordUtils.convertLdapPassword(userData.userPassword);
      }

      // Prepare user data for database
      const dbUserData = {
        ...userData,
        password_hash: passwordHash
      };

      // Upsert user in database
      await this.dbService.upsertUser(dbUserData, clientId);
      stats.successfulUsers++;

      logger.debug(`Processed user: ${userData.uid}`, {
        clientId,
        hasPassword: !!passwordHash,
        passwordFormat: PasswordUtils.getHashInfo(userData.userPassword).format
      });

    } catch (error) {
      stats.failedUsers++;
      stats.errors.push(`User ${userData.uid}: ${error.message}`);
      logger.error(`Failed to process user ${userData.uid}`, { 
        error: error.message,
        clientId,
        ldapDn: userData.dn
      });
    }
  }

  /**
   * Validate configuration and connections
   * @returns Promise<boolean>
   */
  async validateSetup(): Promise<boolean> {
    try {
      logger.info('Validating migration setup');

      // Validate configuration
      if (!this.configService.validate()) {
        return false;
      }

      // Test LDAP connection
      const ldapConnected = await this.ldapService.testConnection();
      if (!ldapConnected) {
        logger.error('LDAP connection test failed');
        return false;
      }

      // Test database connection
      const dbConnected = await this.dbService.testConnection();
      if (!dbConnected) {
        logger.error('Database connection test failed');
        return false;
      }

      logger.info('Setup validation successful');
      return true;

    } catch (error) {
      logger.error('Setup validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get migration statistics
   * @returns Promise<object>
   */
  async getStats(): Promise<object> {
    return await this.dbService.getMigrationStats();
  }
}

/**
 * Migration statistics interface
 */
export interface MigrationStats {
  totalClients: number;
  totalUsers: number;
  successfulClients: number;
  successfulUsers: number;
  failedClients: number;
  failedUsers: number;
  errors: string[];
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  stats: MigrationStats;
  duration: number;
  dryRun: boolean;
} 