import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from './client.entity';

/**
 * User Entity
 * Represents a user from LDAP migrated to PostgreSQL with UUID primary key
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'uuid', 
    nullable: false,
    comment: 'Foreign key to clients table (UUID)'
  })
  client_id: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: false,
    comment: 'LDAP uid attribute'
  })
  username: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'LDAP givenName attribute'
  })
  first_name: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'LDAP sn attribute'
  })
  last_name: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'LDAP mail attribute'
  })
  email: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'bcrypt hashed password'
  })
  password_hash: string;

  @Column({ 
    type: 'text', 
    nullable: false,
    comment: 'Full LDAP DN of user entry'
  })
  ldap_dn: string;

  @CreateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Record creation timestamp'
  })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Record last update timestamp'
  })
  updated_at: Date;

  // Relationship with client
  @ManyToOne(() => Client, client => client.users, { 
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  /**
   * Create a new User instance
   * @param username - LDAP uid
   * @param clientId - Database client UUID
   * @param ldapDn - Full LDAP DN
   */
  constructor(username?: string, clientId?: string, ldapDn?: string) {
    if (username) {
      this.username = username;
    }
    if (clientId) {
      this.client_id = clientId;
    }
    if (ldapDn) {
      this.ldap_dn = ldapDn;
    }
  }

  /**
   * Get user information for logging (without sensitive data)
   * @returns object - User information
   */
  toLogInfo(): object {
    return {
      id: this.id,
      username: this.username,
      client_id: this.client_id,
      first_name: this.first_name,
      last_name: this.last_name,
      email: this.email,
      has_password: !!this.password_hash,
      ldap_dn: this.ldap_dn
    };
  }

  /**
   * Get full name of the user
   * @returns string - Full name or username if no name available
   */
  getFullName(): string {
    if (this.first_name && this.last_name) {
      return `${this.first_name} ${this.last_name}`;
    } else if (this.first_name) {
      return this.first_name;
    } else if (this.last_name) {
      return this.last_name;
    }
    return this.username;
  }
} 