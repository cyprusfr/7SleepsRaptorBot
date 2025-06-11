import { 
  users, 
  discordKeys, 
  discordUsers, 
  discordServers, 
  activityLogs, 
  botSettings,
  type User, 
  type InsertUser,
  type DiscordKey,
  type InsertDiscordKey,
  type DiscordUser,
  type InsertDiscordUser,
  type DiscordServer,
  type InsertDiscordServer,
  type ActivityLog,
  type InsertActivityLog,
  type BotSetting,
  type InsertBotSetting,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Discord Keys
  createDiscordKey(key: InsertDiscordKey): Promise<DiscordKey>;
  getDiscordKey(id: number): Promise<DiscordKey | undefined>;
  getDiscordKeyByKeyId(keyId: string): Promise<DiscordKey | undefined>;
  getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]>;
  getDiscordKeysByHwid(hwid: string): Promise<DiscordKey[]>;
  getAllDiscordKeys(): Promise<DiscordKey[]>;
  revokeDiscordKey(keyId: string, revokedBy: string): Promise<void>;
  linkKeyToUser(keyId: string, userId: string, username: string): Promise<void>;
  updateDiscordKey(id: number, updates: Partial<DiscordKey>): Promise<void>;

  // Discord Users
  upsertDiscordUser(user: InsertDiscordUser): Promise<DiscordUser>;
  getDiscordUser(id: number): Promise<DiscordUser | undefined>;
  getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined>;
  getAllDiscordUsers(): Promise<DiscordUser[]>;
  updateDiscordUserLastSeen(discordId: string): Promise<void>;

  // Discord Servers
  upsertDiscordServer(server: InsertDiscordServer): Promise<DiscordServer>;
  getDiscordServer(id: number): Promise<DiscordServer | undefined>;
  getDiscordServerByServerId(serverId: string): Promise<DiscordServer | undefined>;
  getAllDiscordServers(): Promise<DiscordServer[]>;
  updateServerStatus(serverId: string, isActive: boolean): Promise<void>;
  updateDiscordServer(id: number, updates: Partial<DiscordServer>): Promise<void>;

  // Activity Logs
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]>;

  // Bot Settings
  setBotSetting(key: string, value: string): Promise<void>;
  getBotSetting(key: string): Promise<string | undefined>;
  getAllBotSettings(): Promise<BotSetting[]>;

  // Rate Limiting
  getRateLimit(key: string): Promise<number>;
  setRateLimit(key: string, count: number, ttl: number): Promise<void>;

  // Dashboard Stats
  getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private discordKeys: Map<number, DiscordKey>;
  private discordUsers: Map<number, DiscordUser>;
  private discordServers: Map<number, DiscordServer>;
  private activityLogs: Map<number, ActivityLog>;
  private botSettings: Map<string, string>;
  private rateLimits: Map<string, { count: number; expires: number }>;
  
  private currentUserId: number;
  private currentDiscordKeyId: number;
  private currentDiscordUserId: number;
  private currentDiscordServerId: number;
  private currentActivityLogId: number;

  constructor() {
    this.users = new Map();
    this.discordKeys = new Map();
    this.discordUsers = new Map();
    this.discordServers = new Map();
    this.activityLogs = new Map();
    this.botSettings = new Map();
    this.rateLimits = new Map();
    
    this.currentUserId = 1;
    this.currentDiscordKeyId = 1;
    this.currentDiscordUserId = 1;
    this.currentDiscordServerId = 1;
    this.currentActivityLogId = 1;

    // Initialize default bot settings
    this.botSettings.set('bot_status', 'online');
    this.botSettings.set('last_sync', new Date().toISOString());
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Discord Keys
  async createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey> {
    const id = this.currentDiscordKeyId++;
    const now = new Date();
    const key: DiscordKey = {
      id,
      keyId: insertKey.keyId,
      userId: insertKey.userId || null,
      discordUsername: insertKey.discordUsername || null,
      hwid: insertKey.hwid || null,
      status: insertKey.status || 'active',
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
      revokedBy: null,
    };
    this.discordKeys.set(id, key);
    
    // Log activity
    await this.logActivity({
      type: 'key_generated',
      userId: insertKey.userId || 'system',
      description: `Key ${insertKey.keyId} generated`,
      metadata: { keyId: insertKey.keyId },
    });
    
    return key;
  }

  async getDiscordKey(id: number): Promise<DiscordKey | undefined> {
    return this.discordKeys.get(id);
  }

  async getDiscordKeyByKeyId(keyId: string): Promise<DiscordKey | undefined> {
    return Array.from(this.discordKeys.values()).find(key => key.keyId === keyId);
  }

  async getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]> {
    return Array.from(this.discordKeys.values()).filter(key => key.userId === userId);
  }

  async getDiscordKeysByHwid(hwid: string): Promise<DiscordKey[]> {
    return Array.from(this.discordKeys.values()).filter(key => key.hwid === hwid);
  }

  async getAllDiscordKeys(): Promise<DiscordKey[]> {
    return Array.from(this.discordKeys.values());
  }

  async revokeDiscordKey(keyId: string, revokedBy: string): Promise<void> {
    const key = await this.getDiscordKeyByKeyId(keyId);
    if (key) {
      key.status = 'revoked';
      key.revokedAt = new Date();
      key.revokedBy = revokedBy;
      key.updatedAt = new Date();
      
      await this.logActivity({
        type: 'key_revoked',
        userId: revokedBy,
        targetId: keyId,
        description: `Key ${keyId} revoked by ${revokedBy}`,
        metadata: { keyId, revokedBy },
      });
    }
  }

  async linkKeyToUser(keyId: string, userId: string, username: string): Promise<void> {
    const key = await this.getDiscordKeyByKeyId(keyId);
    if (key) {
      key.userId = userId;
      key.discordUsername = username;
      key.updatedAt = new Date();
      
      await this.logActivity({
        type: 'user_linked',
        userId: userId,
        targetId: keyId,
        description: `Key ${keyId} linked to ${username}`,
        metadata: { keyId, userId, username },
      });
    }
  }

  async updateDiscordKey(id: number, updates: Partial<DiscordKey>): Promise<void> {
    const key = this.discordKeys.get(id);
    if (key) {
      Object.assign(key, updates, { updatedAt: new Date() });
    }
  }

  // Discord Users
  async upsertDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser> {
    const existing = Array.from(this.discordUsers.values()).find(
      user => user.discordId === insertUser.discordId
    );

    if (existing) {
      Object.assign(existing, insertUser, { lastSeen: new Date() });
      return existing;
    }

    const id = this.currentDiscordUserId++;
    const now = new Date();
    const user: DiscordUser = {
      id,
      discordId: insertUser.discordId,
      username: insertUser.username,
      discriminator: insertUser.discriminator || null,
      avatarUrl: insertUser.avatarUrl || null,
      joinedAt: now,
      lastSeen: now,
      roles: insertUser.roles || [],
      metadata: insertUser.metadata || {},
    };
    this.discordUsers.set(id, user);
    return user;
  }

  async getDiscordUser(id: number): Promise<DiscordUser | undefined> {
    return this.discordUsers.get(id);
  }

  async getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined> {
    return Array.from(this.discordUsers.values()).find(user => user.discordId === discordId);
  }

  async getAllDiscordUsers(): Promise<DiscordUser[]> {
    return Array.from(this.discordUsers.values());
  }

  async updateDiscordUserLastSeen(discordId: string): Promise<void> {
    const user = await this.getDiscordUserByDiscordId(discordId);
    if (user) {
      user.lastSeen = new Date();
    }
  }

  // Discord Servers
  async upsertDiscordServer(insertServer: InsertDiscordServer): Promise<DiscordServer> {
    const existing = Array.from(this.discordServers.values()).find(
      server => server.serverId === insertServer.serverId
    );

    if (existing) {
      Object.assign(existing, insertServer, { lastDataSync: new Date() });
      return existing;
    }

    const id = this.currentDiscordServerId++;
    const now = new Date();
    const server: DiscordServer = {
      id,
      serverId: insertServer.serverId,
      serverName: insertServer.serverName,
      memberCount: insertServer.memberCount || 0,
      botJoinedAt: now,
      lastDataSync: now,
      permissions: insertServer.permissions || {},
      isActive: insertServer.isActive !== undefined ? insertServer.isActive : true,
    };
    this.discordServers.set(id, server);
    return server;
  }

  async getDiscordServer(id: number): Promise<DiscordServer | undefined> {
    return this.discordServers.get(id);
  }

  async getDiscordServerByServerId(serverId: string): Promise<DiscordServer | undefined> {
    return Array.from(this.discordServers.values()).find(server => server.serverId === serverId);
  }

  async getAllDiscordServers(): Promise<DiscordServer[]> {
    return Array.from(this.discordServers.values());
  }

  async updateServerStatus(serverId: string, isActive: boolean): Promise<void> {
    const server = await this.getDiscordServerByServerId(serverId);
    if (server) {
      server.isActive = isActive;
      server.lastDataSync = new Date();
    }
  }

  async updateDiscordServer(id: number, updates: Partial<DiscordServer>): Promise<void> {
    const server = this.discordServers.get(id);
    if (server) {
      Object.assign(server, updates, { lastDataSync: new Date() });
    }
  }

  // Activity Logs
  async logActivity(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentActivityLogId++;
    const activity: ActivityLog = {
      id,
      type: insertActivity.type,
      userId: insertActivity.userId || null,
      targetId: insertActivity.targetId || null,
      description: insertActivity.description,
      metadata: insertActivity.metadata || {},
      timestamp: new Date(),
    };
    this.activityLogs.set(id, activity);
    return activity;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getActivityLogsByType(type: string, limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Bot Settings
  async setBotSetting(key: string, value: string): Promise<void> {
    this.botSettings.set(key, value);
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    return this.botSettings.get(key);
  }

  async getAllBotSettings(): Promise<BotSetting[]> {
    return Array.from(this.botSettings.entries()).map(([key, value], index) => ({
      id: index + 1,
      key,
      value,
      updatedAt: new Date(),
    }));
  }

  // Rate Limiting
  async getRateLimit(key: string): Promise<number> {
    const limit = this.rateLimits.get(key);
    if (!limit || Date.now() > limit.expires) {
      this.rateLimits.delete(key);
      return 0;
    }
    return limit.count;
  }

  async setRateLimit(key: string, count: number, ttl: number): Promise<void> {
    this.rateLimits.set(key, {
      count,
      expires: Date.now() + (ttl * 1000),
    });
  }

  // Dashboard Stats
  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }> {
    const keys = Array.from(this.discordKeys.values());
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'active').length,
      totalUsers: this.discordUsers.size,
      connectedServers: Array.from(this.discordServers.values()).filter(s => s.isActive).length,
    };
  }
}

export const storage = new MemStorage();
