import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

/**
 * Client Entity
 * Represents a client organization unit from LDAP with UUID primary key
 */
@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    unique: true, 
    nullable: false,
    comment: 'Unique client OU name from LDAP'
  })
  client_id: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'Optional client display name'
  })
  name: string;

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

  // Relationship with users
  @OneToMany(() => User, user => user.client, { 
    cascade: true,
    onDelete: 'CASCADE'
  })
  users: User[];

  /**
   * Create a new Client instance
   * @param clientId - LDAP client OU name
   * @param name - Optional client display name
   */
  constructor(clientId?: string, name?: string) {
    if (clientId) {
      this.client_id = clientId;
    }
    if (name) {
      this.name = name;
    }
  }

  /**
   * Get client information for logging
   * @returns object - Client information
   */
  toLogInfo(): object {
    return {
      id: this.id,
      client_id: this.client_id,
      name: this.name,
      user_count: this.users?.length || 0
    };
  }
} 