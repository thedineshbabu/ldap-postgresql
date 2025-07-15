import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MigrationService } from './services/migration.service';
import { ConfigurationService } from './config/configuration';
import { logger } from './utils/logger.utils';

/**
 * Main CLI Entry Point
 * Handles command line arguments and orchestrates the migration process
 */
async function bootstrap() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isValidateConfig = args.includes('--validate-config');

    // Set environment variables based on CLI args
    if (isDryRun) {
      process.env.DRY_RUN = 'true';
    }

    logger.info('Starting LDAP to PostgreSQL Migration Tool', {
      version: '1.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      dryRun: isDryRun,
      validateConfig: isValidateConfig
    });

    // Create NestJS application
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose']
    });

    // Get services
    const migrationService = app.get(MigrationService);
    const configService = app.get(ConfigurationService);

    // Log configuration summary
    logger.info('Configuration loaded', configService.getConfigSummary());

    if (isValidateConfig) {
      // Validate configuration and connections
      logger.info('Running configuration validation...');
      const isValid = await migrationService.validateSetup();
      
      if (isValid) {
        logger.info('✅ Configuration validation passed');
        process.exit(0);
      } else {
        logger.error('❌ Configuration validation failed');
        process.exit(1);
      }
    } else {
      // Execute migration
      logger.info('Starting migration process...');
      const result = await migrationService.migrate();

      // Log final results
      if (result.success) {
        logger.info('✅ Migration completed successfully', {
          duration: `${result.duration}ms`,
          clients: `${result.stats.successfulClients}/${result.stats.totalClients}`,
          users: `${result.stats.successfulUsers}/${result.stats.totalUsers}`
        });
      } else {
        logger.warn('⚠️ Migration completed with errors', {
          duration: `${result.duration}ms`,
          failedClients: result.stats.failedClients,
          failedUsers: result.stats.failedUsers,
          errorCount: result.stats.errors.length
        });

        // Log detailed errors
        if (result.stats.errors.length > 0) {
          logger.error('Migration errors:', result.stats.errors);
        }
      }

      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    }

  } catch (error) {
    logger.error('Application startup failed', { error: error.message });
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
bootstrap(); 