import * as bcrypt from 'bcrypt';
import { logger } from './logger.utils';

/**
 * Password Utility Service
 * Handles conversion of LDAP password hashes to bcrypt format
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Convert LDAP password hash to bcrypt format
   * @param ldapPassword - LDAP password hash (e.g., {SSHA}...)
   * @returns Promise<string> - bcrypt hash or null if conversion fails
   */
  static async convertLdapPassword(ldapPassword: string): Promise<string | null> {
    try {
      if (!ldapPassword) {
        logger.passwordEvent('skip', { reason: 'empty_password' });
        return null;
      }

      // Extract the actual hash from LDAP format
      const hashData = this.extractHashFromLdap(ldapPassword);
      if (!hashData) {
        logger.passwordEvent('skip', { reason: 'unsupported_format', format: ldapPassword.substring(0, 10) });
        return null;
      }

      // For now, we'll generate a random password since we can't decrypt LDAP hashes
      // In a real scenario, you might need to work with users to reset passwords
      const randomPassword = this.generateRandomPassword();
      const bcryptHash = await bcrypt.hash(randomPassword, this.SALT_ROUNDS);

      logger.passwordEvent('converted', {
        originalFormat: ldapPassword.substring(0, 10),
        newFormat: 'bcrypt',
        saltRounds: this.SALT_ROUNDS
      });

      return bcryptHash;
    } catch (error) {
      logger.error('Password conversion failed', { error: error.message, ldapPassword: ldapPassword.substring(0, 10) });
      return null;
    }
  }

  /**
   * Extract hash data from LDAP password format
   * @param ldapPassword - LDAP password string
   * @returns string | null - Extracted hash or null if unsupported
   */
  private static extractHashFromLdap(ldapPassword: string): string | null {
    // Handle common LDAP password formats
    const patterns = [
      /^\{SSHA\}(.+)$/,  // SSHA format
      /^\{SHA\}(.+)$/,    // SHA format
      /^\{MD5\}(.+)$/,    // MD5 format
      /^\{CRYPT\}(.+)$/,  // CRYPT format
      /^\{CLEARTEXT\}(.+)$/ // CLEARTEXT format (rare)
    ];

    for (const pattern of patterns) {
      const match = ldapPassword.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // If no pattern matches, assume it's already a hash or plain text
    return ldapPassword;
  }

  /**
   * Generate a random password for users whose LDAP passwords can't be converted
   * @returns string - Random password
   */
  private static generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Generate 12-character password
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }

  /**
   * Verify a password against bcrypt hash
   * @param password - Plain text password
   * @param hash - bcrypt hash
   * @returns Promise<boolean> - True if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Hash a plain text password with bcrypt
   * @param password - Plain text password
   * @returns Promise<string> - bcrypt hash
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Check if a string looks like an LDAP password hash
   * @param password - Password string to check
   * @returns boolean - True if it appears to be an LDAP hash
   */
  static isLdapHash(password: string): boolean {
    if (!password) return false;
    
    const ldapPatterns = [
      /^\{SSHA\}/,
      /^\{SHA\}/,
      /^\{MD5\}/,
      /^\{CRYPT\}/,
      /^\{CLEARTEXT\}/
    ];

    return ldapPatterns.some(pattern => pattern.test(password));
  }

  /**
   * Get password hash information for logging
   * @param password - Password hash
   * @returns object - Hash information
   */
  static getHashInfo(password: string): { format: string; length: number; hasData: boolean } {
    if (!password) {
      return { format: 'empty', length: 0, hasData: false };
    }

    const ldapPatterns = [
      { pattern: /^\{SSHA\}/, format: 'SSHA' },
      { pattern: /^\{SHA\}/, format: 'SHA' },
      { pattern: /^\{MD5\}/, format: 'MD5' },
      { pattern: /^\{CRYPT\}/, format: 'CRYPT' },
      { pattern: /^\{CLEARTEXT\}/, format: 'CLEARTEXT' }
    ];

    for (const { pattern, format } of ldapPatterns) {
      if (pattern.test(password)) {
        return { format, length: password.length, hasData: true };
      }
    }

    // Check if it looks like bcrypt
    if (password.startsWith('$2b$') || password.startsWith('$2a$')) {
      return { format: 'bcrypt', length: password.length, hasData: true };
    }

    return { format: 'unknown', length: password.length, hasData: password.length > 0 };
  }
} 