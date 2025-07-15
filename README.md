# LDAP to PostgreSQL User Migration Tool

A robust NestJS-based CLI tool for migrating user data from Red Hat IDM (LDAP) to PostgreSQL database.

## 🎯 Overview

This tool extracts user data from LDAP directory structure and migrates it to a normalized PostgreSQL database schema. It handles password hash conversion, maintains referential integrity, and provides comprehensive logging and error handling.

## 🏗 Architecture

```
LDAP Directory Structure:
dc=example,dc=com
└── ou=clients
    ├── ou=clientA
    │   ├── uid=user1
    │   └── uid=user2
    └── ou=clientB
        └── uid=user3

PostgreSQL Schema:
├── clients (id, client_id, name, timestamps)
└── users (id, client_id, username, first_name, last_name, email, password_hash, ldap_dn, timestamps)
```

## 🚀 Features

- **Comprehensive Logging**: Winston-based logging with multiple levels and file rotation
- **Password Conversion**: Converts LDAP password hashes to bcrypt format
- **Batch Processing**: Configurable batch sizes for large datasets
- **Error Handling**: Graceful error handling with detailed reporting
- **Dry Run Mode**: Test migration without making changes
- **Configuration Validation**: Pre-flight checks for connections and settings
- **Progress Tracking**: Real-time progress reporting
- **Idempotent Operations**: Safe to run multiple times

## 📋 Prerequisites

- **Node.js**: Version 18+ (required for latest dependencies)
- **PostgreSQL**: 12+ with appropriate permissions
- **LDAP Access**: Read access to Red Hat IDM directory
- **Environment**: Proper network connectivity to both LDAP and PostgreSQL

## 🛠 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/thedineshbabu/ldap-postgresql.git
   cd ldap-postgresql
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

## ⚙ Configuration

Create a `.env` file with the following variables:

```env
# LDAP Configuration
LDAP_URL=ldap://idm.example.com:389
LDAP_BIND_DN=cn=Directory Manager
LDAP_BIND_PASSWORD=your_ldap_password
LDAP_BASE_DN=ou=clients,dc=example,dc=com
LDAP_SEARCH_SCOPE=sub

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=usersdb
DB_SCHEMA=public

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
LOG_FILE_PATH=./logs/migration.log

# Migration Configuration
DRY_RUN=false
BATCH_SIZE=100
MAX_CONCURRENT_USERS=10
```

## 🗄 Database Setup

1. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE usersdb;
   ```

2. **Run schema initialization**:
   ```bash
   psql -d usersdb -f database/schema.sql
   ```

## 📖 Usage

### Basic Migration

```bash
# Run full migration
npm run migrate

# Run with dry-run mode (no database changes)
npm run migrate:dry-run

# Validate configuration only
npm run validate:config
```

### Command Line Options

```bash
# Direct execution
npx ts-node src/main.ts

# With dry-run flag
npx ts-node src/main.ts --dry-run

# Validate configuration
npx ts-node src/main.ts --validate-config
```

### Environment-Specific Runs

```bash
# Development mode
NODE_ENV=development npm run migrate

# Production mode with custom config
NODE_ENV=production LOG_LEVEL=warn npm run migrate
```

## 📊 Output and Logging

### Console Output
```
[2024-01-15 10:30:00] [INFO]: Starting LDAP to PostgreSQL Migration Tool
[2024-01-15 10:30:01] [INFO]: Configuration loaded
[2024-01-15 10:30:02] [INFO]: LDAP connecting
[2024-01-15 10:30:03] [INFO]: LDAP connected
[2024-01-15 10:30:04] [INFO]: Found 5 clients to migrate
[2024-01-15 10:30:05] [INFO]: Migration progress: 1/5 clients (20%)
[2024-01-15 10:30:06] [INFO]: Processing client: clientA
[2024-01-15 10:30:07] [INFO]: Found 25 users for client clientA
[2024-01-15 10:30:08] [INFO]: Migration progress: 25/25 users in clientA (100%)
[2024-01-15 10:30:15] [INFO]: ✅ Migration completed successfully
```

### Log Files
- `./logs/migration.log` - Main application logs
- `./logs/migration.error.log` - Error-only logs

## 🔧 Development

### Project Structure
```
ldap-postgresql/
├── src/
│   ├── config/           # Configuration management
│   ├── entities/         # TypeORM entities
│   ├── services/         # Business logic services
│   ├── utils/           # Utility functions
│   ├── app.module.ts    # NestJS module
│   └── main.ts          # CLI entry point
├── database/
│   └── schema.sql       # Database schema
├── logs/                # Log files
└── env.example          # Environment template
```

### Available Scripts

```bash
# Build the project
npm run build

# Run in development mode
npm run start:dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:e2e
```

### Manual Testing
1. Set up test LDAP environment
2. Configure test PostgreSQL database
3. Run with `--dry-run` flag
4. Verify logs and database state

## 🔍 Troubleshooting

### Common Issues

1. **LDAP Connection Failed**
   - Verify LDAP URL and credentials
   - Check network connectivity
   - Ensure LDAP server is running

2. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database exists

3. **Password Conversion Issues**
   - Check LDAP password hash format
   - Verify bcrypt compatibility
   - Review password utility logs

4. **Memory Issues**
   - Reduce batch size
   - Increase Node.js memory limit
   - Monitor system resources

### Debug Mode
```bash
LOG_LEVEL=debug npm run migrate
```

## 📈 Performance

### Optimization Tips

1. **Batch Size**: Adjust `BATCH_SIZE` based on available memory
2. **Concurrency**: Tune `MAX_CONCURRENT_USERS` for optimal throughput
3. **Database**: Use appropriate PostgreSQL settings for bulk operations
4. **Network**: Ensure stable LDAP and database connections

### Expected Performance
- **Small datasets** (< 1K users): 1-2 minutes
- **Medium datasets** (1K-10K users): 5-15 minutes
- **Large datasets** (> 10K users): 30+ minutes

## 🔒 Security Considerations

1. **Credentials**: Store sensitive data in environment variables
2. **Network**: Use encrypted connections (LDAPS, SSL)
3. **Passwords**: Handle password hashes securely
4. **Logs**: Avoid logging sensitive information
5. **Access**: Restrict database and LDAP access appropriately

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- **Dineshbabu Manoharan** - Initial work

## 🙏 Acknowledgments

- NestJS team for the excellent framework
- TypeORM for database abstraction
- Winston for logging capabilities
- ldapts for LDAP connectivity

---

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Create an issue on GitHub
4. Contact the development team

**Note**: This tool is designed for one-time migration scenarios. For ongoing synchronization, consider implementing a different solution. 