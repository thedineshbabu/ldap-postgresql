import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConfigurationService } from '../config/configuration';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { logger } from '../utils/logger.utils';

/**
 * Database Service
 * Handles PostgreSQL operations using TypeORM
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private dataSource: DataSource;
  private clientRepository: Repository<Client>;
  private userRepository: Repository<User>;

  constructor(private configService: ConfigurationService) {
    this.initializeDataSource();
  }

  /**
   * Initialize TypeORM data source
   */
  private async initializeDataSource(): Promise<void> {
    try {
      this.dataSource = new DataSource({
        type: 'postgres',
        host: this.configService.dbHost,
        port: this.configService.dbPort,
        username: this.configService.dbUser,
        password: this.configService.dbPassword,
        database: this.configService.dbName,
        schema: this.configService.dbSchema,
        entities: [Client, User],
        synchronize: false, // Never auto-sync in production
        logging: this.configService.nodeEnv === 'development'
      });

      await this.dataSource.initialize();
      
      this.clientRepository = this.dataSource.getRepository(Client);
      this.userRepository = this.dataSource.getRepository(User);

      logger.dbOperation('initialized', {
        host: this.configService.dbHost,
        database: this.configService.dbName,
        schema: this.configService.dbSchema
      });
    } catch (error) {
      logger.error('Database initialization failed', { error: error.message });
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Test database connection
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Initialize database tables
   * @returns Promise<void>
   */
  async initializeTables(): Promise<void> {
    try {
      // Create tables if they don't exist
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          client_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          username VARCHAR(255) NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          password_hash TEXT,
          ldap_dn TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(client_id, username)
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS migration_log (
          id SERIAL PRIMARY KEY,
          migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_clients INTEGER DEFAULT 0,
          total_users INTEGER DEFAULT 0,
          successful_clients INTEGER DEFAULT 0,
          successful_users INTEGER DEFAULT 0,
          failed_clients INTEGER DEFAULT 0,
          failed_users INTEGER DEFAULT 0,
          error_log TEXT,
          dry_run BOOLEAN DEFAULT FALSE
        )
      `);

      logger.dbOperation('tables_initialized');
    } catch (error) {
      logger.error('Table initialization failed', { error: error.message });
      throw new Error(`Table initialization failed: ${error.message}`);
    }
  }

  /**
   * Upsert client record
   * @param clientId - Client OU name
   * @param name - Optional client name
   * @returns Promise<Client>
   */
  async upsertClient(clientId: string, name?: string): Promise<Client> {
    try {
      let client = await this.clientRepository.findOne({ where: { client_id: clientId } });

      if (client) {
        // Update existing client
        client.name = name || client.name;
        client = await this.clientRepository.save(client);
        logger.dbOperation('client_updated', { clientId, name });
      } else {
        // Create new client
        client = this.clientRepository.create({ client_id: clientId, name });
        client = await this.clientRepository.save(client);
        logger.dbOperation('client_created', { clientId, name });
      }

      return client;
    } catch (error) {
      logger.error('Client upsert failed', { error: error.message, clientId });
      throw new Error(`Client upsert failed for ${clientId}: ${error.message}`);
    }
  }

  /**
   * Upsert user record
   * @param userData - User data from LDAP
   * @param clientId - Database client ID
   * @returns Promise<User>
   */
  async upsertUser(userData: any, clientId: number): Promise<User> {
    try {
      let user = await this.userRepository.findOne({ 
        where: { client_id: clientId, username: userData.uid } 
      });

      if (user) {
        // Update existing user
        user.first_name = userData.givenName || user.first_name;
        user.last_name = userData.sn || user.last_name;
        user.email = userData.mail || user.email;
        user.password_hash = userData.password_hash || user.password_hash;
        user.ldap_dn = userData.dn;
        user = await this.userRepository.save(user);
        logger.dbOperation('user_updated', { username: userData.uid, clientId });
      } else {
        // Create new user
        user = this.userRepository.create({
          client_id: clientId,
          username: userData.uid,
          first_name: userData.givenName,
          last_name: userData.sn,
          email: userData.mail,
          password_hash: userData.password_hash,
          ldap_dn: userData.dn
        });
        user = await this.userRepository.save(user);
        logger.dbOperation('user_created', { username: userData.uid, clientId });
      }

      return user;
    } catch (error) {
      logger.error('User upsert failed', { error: error.message, username: userData.uid, clientId });
      throw new Error(`User upsert failed for ${userData.uid}: ${error.message}`);
    }
  }

  /**
   * Get client by OU name
   * @param clientId - Client OU name
   * @returns Promise<Client | null>
   */
  async getClientByOU(clientId: string): Promise<Client | null> {
    try {
      return await this.clientRepository.findOne({ where: { client_id: clientId } });
    } catch (error) {
      logger.error('Get client failed', { error: error.message, clientId });
      return null;
    }
  }

  /**
   * Get migration statistics
   * @returns Promise<object>
   */
  async getMigrationStats(): Promise<object> {
    try {
      const clientCount = await this.clientRepository.count();
      const userCount = await this.userRepository.count();

      return {
        clients: clientCount,
        users: userCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get migration stats failed', { error: error.message });
      return { clients: 0, users: 0, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Log migration run
   * @param stats - Migration statistics
   * @returns Promise<void>
   */
  async logMigrationRun(stats: any): Promise<void> {
    try {
      await this.dataSource.query(`
        INSERT INTO migration_log (
          total_clients, total_users, successful_clients, successful_users,
          failed_clients, failed_users, error_log, dry_run
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        stats.totalClients || 0,
        stats.totalUsers || 0,
        stats.successfulClients || 0,
        stats.successfulUsers || 0,
        stats.failedClients || 0,
        stats.failedUsers || 0,
        stats.errorLog || null,
        stats.dryRun || false
      ]);

      logger.dbOperation('migration_logged', stats);
    } catch (error) {
      logger.error('Migration logging failed', { error: error.message });
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      logger.info('Database connection closed');
    }
  }
} 