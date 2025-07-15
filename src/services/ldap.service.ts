import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Client as LdapClient, SearchEntry, SearchOptions } from 'ldapts';
import { ConfigurationService } from '../config/configuration';
import { logger } from '../utils/logger.utils';

/**
 * LDAP Service
 * Handles connection and queries to LDAP directory
 */
@Injectable()
export class LdapService implements OnModuleDestroy {
  private client: LdapClient;
  private isConnected = false;

  constructor(private configService: ConfigurationService) {
    this.client = new LdapClient({
      url: this.configService.ldapUrl,
      timeout: 10000,
      connectTimeout: 10000
    });
  }

  /**
   * Connect to LDAP server
   * @returns Promise<void>
   */
  async connect(): Promise<void> {
    try {
      logger.ldapEvent('connecting', { url: this.configService.ldapUrl });
      
      await this.client.bind(this.configService.ldapBindDn, this.configService.ldapBindPassword);
      this.isConnected = true;
      
      logger.ldapEvent('connected', { 
        bindDN: this.configService.ldapBindDn,
        baseDN: this.configService.ldapBaseDn 
      });
    } catch (error) {
      logger.error('LDAP connection failed', { 
        error: error.message,
        url: this.configService.ldapUrl,
        bindDN: this.configService.ldapBindDn
      });
      throw new Error(`LDAP connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from LDAP server
   * @returns Promise<void>
   */
  async disconnect(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.unbind();
        this.isConnected = false;
        logger.ldapEvent('disconnected');
      } catch (error) {
        logger.warn('LDAP disconnect error', { error: error.message });
      }
    }
  }

  /**
   * Search for client organizational units
   * @returns Promise<Array<{ou: string, dn: string}>>
   */
  async searchClients(): Promise<Array<{ou: string, dn: string}>> {
    if (!this.isConnected) {
      throw new Error('LDAP not connected');
    }

    try {
      logger.ldapEvent('searching_clients', { baseDN: this.configService.ldapBaseDn });

      const searchOptions: SearchOptions = {
        scope: 'one',
        filter: '(objectClass=organizationalUnit)',
        attributes: ['ou']
      };

      const searchResult = await this.client.search(this.configService.ldapBaseDn, searchOptions);
      
      const clients = searchResult.searchEntries.map(entry => ({
        ou: (entry.attributes.ou as string[])?.[0] || '',
        dn: entry.dn
      })).filter(client => client.ou && client.ou !== 'clients');

      logger.ldapEvent('clients_found', { 
        count: clients.length,
        clients: clients.map(c => c.ou)
      });

      return clients;
    } catch (error) {
      logger.error('LDAP client search failed', { 
        error: error.message,
        baseDN: this.configService.ldapBaseDn
      });
      throw new Error(`LDAP client search failed: ${error.message}`);
    }
  }

  /**
   * Search for users within a client OU
   * @param clientOU - Client organizational unit name
   * @returns Promise<Array<UserData>>
   */
  async searchUsers(clientOU: string): Promise<Array<UserData>> {
    if (!this.isConnected) {
      throw new Error('LDAP not connected');
    }

    try {
      const searchDN = `ou=${clientOU},${this.configService.ldapBaseDn}`;
      logger.ldapEvent('searching_users', { clientOU, searchDN });

      const searchOptions: SearchOptions = {
        scope: 'sub',
        filter: '(objectClass=inetOrgPerson)',
        attributes: ['uid', 'givenName', 'sn', 'mail', 'userPassword']
      };

      const searchResult = await this.client.search(searchDN, searchOptions);
      
      const users: UserData[] = searchResult.searchEntries.map(entry => {
        const attributes = entry.attributes;
        return {
          uid: (attributes.uid as string[])?.[0] || '',
          givenName: (attributes.givenName as string[])?.[0] || '',
          sn: (attributes.sn as string[])?.[0] || '',
          mail: (attributes.mail as string[])?.[0] || '',
          userPassword: (attributes.userPassword as string[])?.[0] || '',
          dn: entry.dn
        };
      }).filter(user => user.uid); // Only include users with uid

      logger.ldapEvent('users_found', { 
        clientOU,
        count: users.length,
        users: users.map(u => u.uid)
      });

      return users;
    } catch (error) {
      logger.error('LDAP user search failed', { 
        error: error.message,
        clientOU,
        searchDN: `ou=${clientOU},${this.configService.ldapBaseDn}`
      });
      throw new Error(`LDAP user search failed for ${clientOU}: ${error.message}`);
    }
  }

  /**
   * Test LDAP connection
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      logger.info('LDAP connection test successful');
      return true;
    } catch (error) {
      logger.error('LDAP connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get LDAP server information
   * @returns Promise<object>
   */
  async getServerInfo(): Promise<object> {
    if (!this.isConnected) {
      throw new Error('LDAP not connected');
    }

    try {
      const searchOptions: SearchOptions = {
        scope: 'base',
        filter: '(objectClass=*)',
        attributes: ['namingContexts', 'supportedSASLMechanisms', 'supportedLDAPVersion']
      };

      const searchResult = await this.client.search('', searchOptions);
      const rootDSE = searchResult.searchEntries[0];

      return {
        namingContexts: (rootDSE.attributes.namingContexts as string[]) || [],
        supportedSASLMechanisms: (rootDSE.attributes.supportedSASLMechanisms as string[]) || [],
        supportedLDAPVersion: (rootDSE.attributes.supportedLDAPVersion as string[]) || []
      };
    } catch (error) {
      logger.error('Failed to get LDAP server info', { error: error.message });
      return {};
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.disconnect();
  }
}

/**
 * User data structure from LDAP
 */
export interface UserData {
  uid: string;
  givenName: string;
  sn: string;
  mail: string;
  userPassword: string;
  dn: string;
} 