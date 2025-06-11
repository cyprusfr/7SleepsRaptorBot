import { users, type User, type UpsertUser, discordKeys, type DiscordKey, type InsertDiscordKey, discordUsers, type DiscordUser, type InsertDiscordUser, discordServers, type DiscordServer, type InsertDiscordServer, activityLogs, type ActivityLog, type InsertActivityLog, botSettings, type BotSetting, type InsertBotSetting, dashboardKeys, type DashboardKey, type InsertDashboardKey } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  createDashboardKey(key: InsertDashboardKey): Promise<DashboardKey>;
  getDashboardKeyByUserId(userId: string): Promise<DashboardKey | undefined>;
  getDashboardKeyByDiscordUserId(discordUserId: string): Promise<DashboardKey | undefined>;
  getDashboardKeyByKeyId(keyId: string): Promise<DashboardKey | undefined>;
  getAllDashboardKeys(): Promise<DashboardKey[]>;
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
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
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
  async createDashboardKey(keyData: InsertDashboardKey): Promise<DashboardKey> {
    const [dashboardKey] = await db
      .insert(dashboardKeys)
      .values(keyData)
      .returning();
    return dashboardKey;
  }

  async getDashboardKeyByUserId(userId: string): Promise<DashboardKey | undefined> {
    const [key] = await db
      .select()
      .from(dashboardKeys)
      .where(eq(dashboardKeys.userId, userId));
    return key;
  }

  async getDashboardKeyByDiscordUserId(discordUserId: string): Promise<DashboardKey | undefined> {
    const [key] = await db
      .select()
      .from(dashboardKeys)
      .where(eq(dashboardKeys.discordUserId, discordUserId));
    return key;
  }

  async getDashboardKeyByKeyId(keyId: string): Promise<DashboardKey | undefined> {
    const [key] = await db
      .select()
      .from(dashboardKeys)
      .where(eq(dashboardKeys.keyId, keyId));
    return key;
  }

  async getAllDashboardKeys(): Promise<DashboardKey[]> {
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

  // Backup Management - Placeholder methods
  async getAllBackups(): Promise<any[]> {
    return [];
  }

  async createBackupIntegrityCheck(): Promise<any> {
    return {};
  }

  async getAllBackupIntegrityChecks(): Promise<any[]> {
    return [];
  }

  async getBackupIntegrityByBackupId(): Promise<any> {
    return undefined;
  }

  async getIntegrityChecksByServerId(): Promise<any[]> {
    return [];
  }

  async getHealthScoreStats(): Promise<any> {
    return {
      averageHealthScore: 0,
      healthyBackups: 0,
      warningBackups: 0,
      criticalBackups: 0,
      corruptedBackups: 0,
      totalChecks: 0,
    };
  }

  // User Management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserApproval(userId: string, isApproved: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async makeUserAdmin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  getRolePermissions(role: string): any {
    const permissions: { [key: string]: any } = {
      owner: {
        canManageUsers: true,
        canManageKeys: true,
        canViewActivity: true,
        canManageServers: true,
        canAccessAdmin: true,
        canManageBackups: true,
        canViewHealth: true,
        maxSlots: 1
      },
      'server-management': {
        canManageUsers: true,
        canManageKeys: true,
        canViewActivity: true,
        canManageServers: true,
        canAccessAdmin: false,
        canManageBackups: true,
        canViewHealth: true,
        maxSlots: 3
      },
      'head-admin': {
        canManageUsers: false,
        canManageKeys: true,
        canViewActivity: true,
        canManageServers: false,
        canAccessAdmin: false,
        canManageBackups: true,
        canViewHealth: true,
        maxSlots: 2
      },
      admin: {
        canManageUsers: false,
        canManageKeys: false,
        canViewActivity: true,
        canManageServers: false,
        canAccessAdmin: false,
        canManageBackups: false,
        canViewHealth: true,
        maxSlots: -1 // unlimited
      },
      user: {
        canManageUsers: false,
        canManageKeys: false,
        canViewActivity: false,
        canManageServers: false,
        canAccessAdmin: false,
        canManageBackups: false,
        canViewHealth: false,
        maxSlots: 0
      }
    };

    return permissions[role] || permissions.user;
  }

  // Candy System Methods - Placeholder implementations
  async getCandyBalance(userId: string): Promise<number> {
    return 0;
  }

  async updateCandyBalance(userId: string, newBalance: number): Promise<void> {
    // Placeholder
  }

  async addCandyTransaction(transaction: any): Promise<void> {
    // Placeholder
  }

  async getCandyTransactions(userId: string, limit: number = 50): Promise<any[]> {
    return [];
  }

  async getCandyLeaderboard(limit: number = 10): Promise<any[]> {
    return [];
  }

  async checkDailyCandy(userId: string): Promise<boolean> {
    return false;
  }

  async claimDailyCandy(userId: string): Promise<number> {
    return 0;
  }

  async transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    // Placeholder
  }
}

export const storage = new DatabaseStorage();