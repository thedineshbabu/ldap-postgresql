import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationService } from './config/configuration';
import { LdapService } from './services/ldap.service';
import { DatabaseService } from './services/database.service';
import { MigrationService } from './services/migration.service';
import { Client } from './entities/client.entity';
import { User } from './entities/user.entity';

/**
 * Main Application Module
 * Configures all services and dependencies for the LDAP migration application
 */
@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development', '.env.production']
    }),
    
    // TypeORM module for database operations
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigurationService) => configService.getDatabaseConfig(),
      inject: [ConfigurationService]
    }),
    
    // Entity registration
    TypeOrmModule.forFeature([Client, User])
  ],
  
  providers: [
    // Configuration and utility services
    ConfigurationService,
    
    // Core business services
    LdapService,
    DatabaseService,
    MigrationService
  ],
  
  exports: [
    // Export services for use in CLI
    ConfigurationService,
    LdapService,
    DatabaseService,
    MigrationService
  ]
})
export class AppModule {} 