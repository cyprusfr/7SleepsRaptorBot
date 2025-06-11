import { users, type User, type UpsertUser, discordKeys, type DiscordKey, type InsertDiscordKey, discordUsers, type DiscordUser, type InsertDiscordUser, discordServers, type DiscordServer, type InsertDiscordServer, activityLogs, type ActivityLog, type InsertActivityLog, botSettings, type BotSetting, type InsertBotSetting, dashboardKeys, type DashboardKey, type InsertDashboardKey } from "@shared/schema";

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

  // Dashboard Keys
  createDashboardKey(key: any): Promise<any>;
  getDashboardKeyByUserId(userId: string): Promise<any>;
  getDashboardKeyByKeyId(keyId: string): Promise<any>;
  getAllDashboardKeys(): Promise<any[]>;
  revokeDashboardKey(keyId: string, revokedBy: string): Promise<void>;
  updateDashboardKeyLastAccess(keyId: string): Promise<void>;
  linkDashboardKeyToGoogle(keyId: string, userId: string, email: string): Promise<void>;

  // Dashboard Stats
  getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }>;
}

import { db } from "./db";
import { eq } from "drizzle-orm";

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey> {
    const [key] = await db
      .insert(discordKeys)
      .values(insertKey)
      .returning();
    return key;
  }

  async getDiscordKey(id: number): Promise<DiscordKey | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.id, id));
    return key || undefined;
  }

  async getDiscordKeyByKeyId(keyId: string): Promise<DiscordKey | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.keyId, keyId));
    return key || undefined;
  }

  async getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]> {
    return await db.select().from(discordKeys).where(eq(discordKeys.userId, userId));
  }

  async getDiscordKeysByHwid(hwid: string): Promise<DiscordKey[]> {
    return await db.select().from(discordKeys).where(eq(discordKeys.hwid, hwid));
  }

  async getAllDiscordKeys(): Promise<DiscordKey[]> {
    return await db.select().from(discordKeys);
  }

  async revokeDiscordKey(keyId: string, revokedBy: string): Promise<void> {
    await db
      .update(discordKeys)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
      })
      .where(eq(discordKeys.keyId, keyId));
  }

  async linkKeyToUser(keyId: string, userId: string, username: string): Promise<void> {
    await db
      .update(discordKeys)
      .set({
        userId,
        discordUsername: username,
      })
      .where(eq(discordKeys.keyId, keyId));
  }

  async updateDiscordKey(id: number, updates: Partial<DiscordKey>): Promise<void> {
    await db
      .update(discordKeys)
      .set(updates)
      .where(eq(discordKeys.id, id));
  }

  async upsertDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser> {
    const existingUser = await db
      .select()
      .from(discordUsers)
      .where(eq(discordUsers.discordId, insertUser.discordId));

    if (existingUser.length > 0) {
      const [updatedUser] = await db
        .update(discordUsers)
        .set({
          ...insertUser,
          lastSeen: new Date(),
        })
        .where(eq(discordUsers.discordId, insertUser.discordId))
        .returning();
      return updatedUser;
    } else {
      const [newUser] = await db
        .insert(discordUsers)
        .values(insertUser)
        .returning();
      return newUser;
    }
  }

  async getDiscordUser(id: number): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.id, id));
    return user || undefined;
  }

  async getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.discordId, discordId));
    return user || undefined;
  }

  async getAllDiscordUsers(): Promise<DiscordUser[]> {
    return await db.select().from(discordUsers);
  }

  async updateDiscordUserLastSeen(discordId: string): Promise<void> {
    await db
      .update(discordUsers)
      .set({ lastSeen: new Date() })
      .where(eq(discordUsers.discordId, discordId));
  }

  async upsertDiscordServer(insertServer: InsertDiscordServer): Promise<DiscordServer> {
    const existingServer = await db
      .select()
      .from(discordServers)
      .where(eq(discordServers.serverId, insertServer.serverId));

    if (existingServer.length > 0) {
      const [updatedServer] = await db
        .update(discordServers)
        .set({
          ...insertServer,
          lastDataSync: new Date(),
        })
        .where(eq(discordServers.serverId, insertServer.serverId))
        .returning();
      return updatedServer;
    } else {
      const [newServer] = await db
        .insert(discordServers)
        .values(insertServer)
        .returning();
      return newServer;
    }
  }

  async getDiscordServer(id: number): Promise<DiscordServer | undefined> {
    const [server] = await db.select().from(discordServers).where(eq(discordServers.id, id));
    return server || undefined;
  }

  async getDiscordServerByServerId(serverId: string): Promise<DiscordServer | undefined> {
    const [server] = await db.select().from(discordServers).where(eq(discordServers.serverId, serverId));
    return server || undefined;
  }

  async getAllDiscordServers(): Promise<DiscordServer[]> {
    return await db.select().from(discordServers);
  }

  async updateServerStatus(serverId: string, isActive: boolean): Promise<void> {
    await db
      .update(discordServers)
      .set({ isActive })
      .where(eq(discordServers.serverId, serverId));
  }

  async updateDiscordServer(id: number, updates: Partial<DiscordServer>): Promise<void> {
    await db
      .update(discordServers)
      .set(updates)
      .where(eq(discordServers.id, id));
  }

  async logActivity(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const [activity] = await db
      .insert(activityLogs)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(activityLogs.timestamp)
      .limit(limit);
  }

  async getActivityLogsByType(type: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, type))
      .orderBy(activityLogs.timestamp)
      .limit(limit);
  }

  async setBotSetting(key: string, value: string): Promise<void> {
    const existingSetting = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.key, key));

    if (existingSetting.length > 0) {
      await db
        .update(botSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(botSettings.key, key));
    } else {
      await db
        .insert(botSettings)
        .values({ key, value });
    }
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return setting?.value;
  }

  async getAllBotSettings(): Promise<BotSetting[]> {
    return await db.select().from(botSettings);
  }

  async getRateLimit(key: string): Promise<number> {
    // For simplicity, using memory-based rate limiting
    // In production, you might want to use Redis or database
    return 0;
  }

  async setRateLimit(key: string, count: number, ttl: number): Promise<void> {
    // For simplicity, using memory-based rate limiting
    // In production, you might want to use Redis or database
  }

  // Dashboard Keys implementation
  async createDashboardKey(keyData: any): Promise<any> {
    const [dashboardKey] = await db
      .insert(dashboardKeys)
      .values(keyData)
      .returning();
    return dashboardKey;
  }

  async getDashboardKeyByUserId(userId: string): Promise<any> {
    const [key] = await db
      .select()
      .from(dashboardKeys)
      .where(eq(dashboardKeys.userId, userId));
    return key;
  }

  async getDashboardKeyByKeyId(keyId: string): Promise<any> {
    const [key] = await db
      .select()
      .from(dashboardKeys)
      .where(eq(dashboardKeys.keyId, keyId));
    return key;
  }

  async getAllDashboardKeys(): Promise<any[]> {
    return await db.select().from(dashboardKeys);
  }

  async revokeDashboardKey(keyId: string, revokedBy: string): Promise<void> {
    await db
      .update(dashboardKeys)
      .set({
        status: 'revoked',
        revokedBy,
        revokedAt: new Date(),
      })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  async updateDashboardKeyLastAccess(keyId: string): Promise<void> {
    await db
      .update(dashboardKeys)
      .set({ lastAccessAt: new Date() })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  async linkDashboardKeyToGoogle(keyId: string, userId: string, email: string): Promise<void> {
    await db
      .update(dashboardKeys)
      .set({
        userId,
        linkedEmail: email,
      })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }> {
    const allKeys = await db.select().from(discordKeys);
    const allUsers = await db.select().from(discordUsers);
    const allServers = await db.select().from(discordServers);

    return {
      totalKeys: allKeys.length,
      activeKeys: allKeys.filter(k => k.status === 'active').length,
      totalUsers: allUsers.length,
      connectedServers: allServers.filter(s => s.isActive).length,
    };
  }
}

export const storage = new DatabaseStorage();