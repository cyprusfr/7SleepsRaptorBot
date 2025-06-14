import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  discordKeys, 
  discordUsers, 
  discordServers, 
  activityLogs, 
  botSettings,
  dashboardKeys,
  commandLogs,
  verificationSessions,
  candyTransactions,
  type User, 
  type UpsertUser,
  type DiscordKey, 
  type InsertDiscordKey,
  type DiscordUser, 
  type InsertDiscordUser,
  type DiscordServer, 
  type InsertDiscordServer,
  type ActivityLog, 
  type InsertActivityLog,
  type BotSetting,
  type DashboardKey, 
  type InsertDashboardKey,
  type CommandLog, 
  type InsertCommandLog,
  type VerificationSession, 
  type InsertVerificationSession
} from "@shared/schema";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

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
  addServer(server: { serverId: string; serverName: string; memberCount?: number; isActive?: boolean }): Promise<DiscordServer>;
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

  // Backup Integrity
  getAllBackupIntegrityChecks(): Promise<any[]>;
  getBackupIntegrityByBackupId(backupId: string): Promise<any>;
  getIntegrityChecksByServerId(serverId: string): Promise<any[]>;
  getHealthScoreStats(): Promise<any>;
  getAllBackups(): Promise<any[]>;

  // Admin functions
  getAllUsers(): Promise<User[]>;
  updateUserApproval(userId: string, isApproved: boolean): Promise<void>;
  makeUserAdmin(userId: string): Promise<void>;
  getRolePermissions(role: string): any;

  // Candy system
  getCandyBalance(userId: string): Promise<{ wallet: number; bank: number; total: number }>;
  updateCandyBalance(userId: string, amount: number): Promise<void>;
  depositCandy(userId: string, amount: number): Promise<void>;
  withdrawCandy(userId: string, amount: number): Promise<void>;
  addCandy(userId: string, amount: number): Promise<void>;
  subtractCandy(userId: string, amount: number): Promise<void>;
  transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<void>;
  getLastDaily(userId: string): Promise<Date | null>;
  updateLastDaily(userId: string): Promise<void>;
  getLastBeg(userId: string): Promise<Date | null>;
  updateLastBeg(userId: string): Promise<void>;
  getLastScam(userId: string): Promise<Date | null>;
  updateLastScam(userId: string): Promise<void>;
  getTopCandyUsers(limit: number): Promise<{ discordId: string; candyBalance: number }[]>;
  addCandyTransaction(transaction: any): Promise<void>;
  getCandyTransactions(userId: string, limit: number): Promise<any[]>;
  getCandyLeaderboard(limit: number): Promise<any[]>;
  checkDailyCandy(userId: string): Promise<boolean>;
  claimDailyCandy(userId: string): Promise<number>;

  // Whitelist system
  addUserToWhitelist(userId: string): Promise<void>;
  removeUserFromWhitelist(userId: string): Promise<void>;
  isUserWhitelisted(userId: string): Promise<boolean>;

  // Key management
  updateDiscordKeyUser(keyId: string, newUserId: string): Promise<void>;

  // Command logging
  logCommandUsage(data: {
    username: string;
    userId: string;
    commandName: string;
    subcommand?: string | null;
    executionTime: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void>;

  // Verification sessions
  createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession>;
  getVerificationSession(sessionId: string): Promise<VerificationSession | undefined>;
  getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined>;
  updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<void>;
  completeVerificationSession(sessionId: string, botResponseCode: string): Promise<void>;

  // Command logging
  logCommand(command: InsertCommandLog): Promise<CommandLog>;
  getCommandLogs(limit?: number): Promise<CommandLog[]>;
  getCommandLogsByUser(userId: string, limit?: number): Promise<CommandLog[]>;
  getCommandLogsByCommand(commandName: string, limit?: number): Promise<CommandLog[]>;
  getCommandStats(): Promise<{
    totalCommands: number;
    uniqueUsers: number;
    topCommands: { commandName: string; count: number }[];
    recentCommands: CommandLog[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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

  // Discord Key operations
  async createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey> {
    const [key] = await db
      .insert(discordKeys)
      .values(insertKey)
      .returning();
    return key;
  }

  async getDiscordKey(id: number): Promise<DiscordKey | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.id, id));
    return key;
  }

  async getDiscordKeyByKeyId(keyId: string): Promise<DiscordKey | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.keyId, keyId));
    return key;
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
    await db.update(discordKeys)
      .set({ 
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: revokedBy
      })
      .where(eq(discordKeys.keyId, keyId));
  }

  async linkKeyToUser(keyId: string, userId: string, username: string): Promise<void> {
    await db.update(discordKeys)
      .set({ 
        userId: userId,
        discordUsername: username
      })
      .where(eq(discordKeys.keyId, keyId));
  }

  async updateDiscordKey(id: number, updates: Partial<DiscordKey>): Promise<void> {
    await db.update(discordKeys)
      .set(updates)
      .where(eq(discordKeys.id, id));
  }

  // Discord User operations
  async upsertDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser> {
    const [user] = await db
      .insert(discordUsers)
      .values(insertUser)
      .onConflictDoUpdate({
        target: discordUsers.discordId,
        set: insertUser,
      })
      .returning();
    return user;
  }

  async getDiscordUser(id: number): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.id, id));
    return user;
  }

  async getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.discordId, discordId));
    return user;
  }

  async getAllDiscordUsers(): Promise<DiscordUser[]> {
    return await db.select().from(discordUsers);
  }

  async updateDiscordUserLastSeen(discordId: string): Promise<void> {
    await db.update(discordUsers)
      .set({ lastSeen: new Date() })
      .where(eq(discordUsers.discordId, discordId));
  }

  // Discord Server operations
  async addServer(server: { serverId: string; serverName: string; memberCount?: number; isActive?: boolean }): Promise<DiscordServer> {
    const insertServer: InsertDiscordServer = {
      serverId: server.serverId,
      serverName: server.serverName,
      memberCount: server.memberCount || 0,
      isActive: server.isActive !== false
    };
    return this.upsertDiscordServer(insertServer);
  }

  async upsertDiscordServer(insertServer: InsertDiscordServer): Promise<DiscordServer> {
    const [server] = await db
      .insert(discordServers)
      .values(insertServer)
      .onConflictDoUpdate({
        target: discordServers.serverId,
        set: insertServer,
      })
      .returning();
    return server;
  }

  async getDiscordServer(id: number): Promise<DiscordServer | undefined> {
    const [server] = await db.select().from(discordServers).where(eq(discordServers.id, id));
    return server;
  }

  async getDiscordServerByServerId(serverId: string): Promise<DiscordServer | undefined> {
    const [server] = await db.select().from(discordServers).where(eq(discordServers.serverId, serverId));
    return server;
  }

  async getAllDiscordServers(): Promise<DiscordServer[]> {
    return await db.select().from(discordServers);
  }

  async updateServerStatus(serverId: string, isActive: boolean): Promise<void> {
    await db.update(discordServers)
      .set({ isActive })
      .where(eq(discordServers.serverId, serverId));
  }

  async updateDiscordServer(id: number, updates: Partial<DiscordServer>): Promise<void> {
    await db.update(discordServers)
      .set(updates)
      .where(eq(discordServers.id, id));
  }

  // Activity Log operations
  async logActivity(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const [activity] = await db
      .insert(activityLogs)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).limit(limit);
  }

  async getActivityLogsByType(type: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).where(eq(activityLogs.type, type)).limit(limit);
  }

  // Bot Settings operations
  async setBotSetting(key: string, value: string): Promise<void> {
    await db
      .insert(botSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return setting?.value;
  }

  async getAllBotSettings(): Promise<BotSetting[]> {
    return await db.select().from(botSettings);
  }

  // Rate limiting (in-memory for simplicity)
  private rateLimits = new Map<string, { count: number; expires: number }>();

  async getRateLimit(key: string): Promise<number> {
    const limit = this.rateLimits.get(key);
    if (!limit || limit.expires < Date.now()) {
      this.rateLimits.delete(key);
      return 0;
    }
    return limit.count;
  }

  async setRateLimit(key: string, count: number, ttl: number): Promise<void> {
    this.rateLimits.set(key, {
      count,
      expires: Date.now() + ttl,
    });
  }

  // Dashboard Key operations
  async createDashboardKey(keyData: InsertDashboardKey): Promise<DashboardKey> {
    const [key] = await db
      .insert(dashboardKeys)
      .values(keyData)
      .returning();
    return key;
  }

  async getDashboardKeyByUserId(userId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.userId, userId));
    return key;
  }

  async getDashboardKeyByDiscordUserId(discordUserId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.discordUserId, discordUserId));
    return key;
  }

  async getDashboardKeyByKeyId(keyId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.keyId, keyId));
    return key;
  }

  async getAllDashboardKeys(): Promise<DashboardKey[]> {
    return await db.select().from(dashboardKeys);
  }

  async revokeDashboardKey(keyId: string, revokedBy: string): Promise<void> {
    await db.update(dashboardKeys)
      .set({ 
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: revokedBy
      })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  async updateDashboardKeyLastAccess(keyId: string): Promise<void> {
    await db.update(dashboardKeys)
      .set({ lastAccessAt: new Date() })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  async linkDashboardKeyToGoogle(keyId: string, userId: string, email: string): Promise<void> {
    await db.update(dashboardKeys)
      .set({ 
        userId: userId,
        linkedEmail: email
      })
      .where(eq(dashboardKeys.keyId, keyId));
  }

  // Stats
  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }> {
    // Simplified stats implementation
    const totalKeys = (await this.getAllDiscordKeys()).length;
    const activeKeys = (await this.getAllDiscordKeys()).filter(k => k.status === 'active').length;
    const totalUsers = (await this.getAllDiscordUsers()).length;
    const connectedServers = (await this.getAllDiscordServers()).length;

    return {
      totalKeys,
      activeKeys,
      totalUsers,
      connectedServers,
    };
  }

  // Admin functions
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserApproval(userId: string, isApproved: boolean): Promise<void> {
    // Simplified implementation
    console.log(`Update user ${userId} approval: ${isApproved}`);
  }

  async makeUserAdmin(userId: string): Promise<void> {
    // Simplified implementation
    console.log(`Make user ${userId} admin`);
  }

  getRolePermissions(role: string): any {
    // Simplified role permissions
    return {
      admin: { all: true },
      moderator: { kick: true, ban: true },
      user: { basic: true }
    }[role] || { basic: true };
  }

  // Candy system
  async getCandyBalance(userId: string): Promise<{ wallet: number; bank: number; total: number }> {
    const user = await this.getDiscordUserByDiscordId(userId);
    const wallet = user?.candyBalance || 0;
    const bank = user?.candyBank || 0;
    return { wallet, bank, total: wallet + bank };
  }

  async updateCandyBalance(userId: string, amount: number): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', candyBalance: amount });
  }

  async depositCandy(userId: string, amount: number): Promise<void> {
    const user = await this.getDiscordUserByDiscordId(userId);
    if (user && (user.candyBalance || 0) >= amount) {
      await db.update(discordUsers)
        .set({ 
          candyBalance: (user.candyBalance || 0) - amount,
          candyBank: (user.candyBank || 0) + amount
        })
        .where(eq(discordUsers.discordId, userId));
    }
  }

  async withdrawCandy(userId: string, amount: number): Promise<void> {
    const user = await this.getDiscordUserByDiscordId(userId);
    if (user && (user.candyBank || 0) >= amount) {
      await db.update(discordUsers)
        .set({ 
          candyBalance: (user.candyBalance || 0) + amount,
          candyBank: (user.candyBank || 0) - amount
        })
        .where(eq(discordUsers.discordId, userId));
    }
  }

  async addCandy(userId: string, amount: number): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown' });
    const user = await this.getDiscordUserByDiscordId(userId);
    if (user) {
      await db.update(discordUsers)
        .set({ candyBalance: (user.candyBalance || 0) + amount })
        .where(eq(discordUsers.discordId, userId));
    }
  }

  async subtractCandy(userId: string, amount: number): Promise<void> {
    const user = await this.getDiscordUserByDiscordId(userId);
    if (user && (user.candyBalance || 0) >= amount) {
      await db.update(discordUsers)
        .set({ candyBalance: (user.candyBalance || 0) - amount })
        .where(eq(discordUsers.discordId, userId));
    }
  }

  async transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    const fromUser = await this.getDiscordUserByDiscordId(fromUserId);
    if (fromUser && (fromUser.candyBalance || 0) >= amount) {
      await this.subtractCandy(fromUserId, amount);
      await this.addCandy(toUserId, amount);

      // Log transaction
      await db.insert(candyTransactions).values({
        fromUserId,
        toUserId,
        amount,
        type: 'transfer',
        description: `Transfer from ${fromUserId} to ${toUserId}`
      });
    }
  }

  async getLastDaily(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastDaily || null;
  }

  async updateLastDaily(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', lastDaily: new Date() });
  }

  async getLastBeg(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastBeg || null;
  }

  async updateLastBeg(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', lastBeg: new Date() });
  }

  async getLastScam(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastScam || null;
  }

  async updateLastScam(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', lastScam: new Date() });
  }

  async getTopCandyUsers(limit: number): Promise<{ discordId: string; candyBalance: number }[]> {
    const users = await this.getAllDiscordUsers();
    return users
      .map(u => ({ discordId: u.discordId, candyBalance: u.candyBalance || 0 }))
      .sort((a, b) => b.candyBalance - a.candyBalance)
      .slice(0, limit);
  }

  async addCandyTransaction(transaction: any): Promise<void> {
    await db.insert(candyTransactions).values(transaction);
  }

  async getCandyTransactions(userId: string, limit: number = 50): Promise<any[]> {
    return await db.select().from(candyTransactions)
      .where(eq(candyTransactions.toUserId, userId))
      .limit(limit);
  }

  async getCandyLeaderboard(limit: number = 10): Promise<any[]> {
    return await this.getTopCandyUsers(limit);
  }

  async checkDailyCandy(userId: string): Promise<boolean> {
    const lastDaily = await this.getLastDaily(userId);
    if (!lastDaily) return true;
    
    const now = new Date();
    const timeDiff = now.getTime() - lastDaily.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    return hoursDiff >= 24;
  }

  async claimDailyCandy(userId: string): Promise<number> {
    const amount = Math.floor(Math.random() * 100) + 50; // 50-150 candy
    await this.addCandy(userId, amount);
    await this.updateLastDaily(userId);
    return amount;
  }

  // Whitelist system
  async addUserToWhitelist(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', isWhitelisted: true });
  }

  async removeUserFromWhitelist(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', isWhitelisted: false });
  }

  async isUserWhitelisted(userId: string): Promise<boolean> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.isWhitelisted || false;
  }

  async updateDiscordKeyUser(keyId: string, newUserId: string): Promise<void> {
    await db.update(discordKeys)
      .set({ userId: newUserId })
      .where(eq(discordKeys.keyId, keyId));
  }

  // Command logging
  async logCommandUsage(data: {
    username: string;
    userId: string;
    commandName: string;
    subcommand?: string | null;
    executionTime: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await db.insert(commandLogs).values({
      commandName: data.commandName,
      userId: data.userId,
      username: data.username,
      executionTime: data.executionTime,
      success: data.success,
      errorMessage: data.errorMessage
    });
  }

  // Verification sessions
  async createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession> {
    const [created] = await db
      .insert(verificationSessions)
      .values(session)
      .returning();
    return created;
  }

  async getVerificationSession(sessionId: string): Promise<VerificationSession | undefined> {
    const [session] = await db.select().from(verificationSessions).where(eq(verificationSessions.sessionId, sessionId));
    return session;
  }

  async getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined> {
    const [session] = await db.select().from(verificationSessions).where(eq(verificationSessions.discordUserId, discordUserId));
    return session;
  }

  async updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<void> {
    await db.update(verificationSessions)
      .set(updates)
      .where(eq(verificationSessions.sessionId, sessionId));
  }

  async completeVerificationSession(sessionId: string, botResponseCode: string): Promise<void> {
    await db.update(verificationSessions)
      .set({ 
        completedAt: new Date()
      })
      .where(eq(verificationSessions.sessionId, sessionId));
  }

  // Command logging
  async logCommand(command: InsertCommandLog): Promise<CommandLog> {
    const [logged] = await db
      .insert(commandLogs)
      .values(command)
      .returning();
    return logged;
  }

  async getCommandLogs(limit: number = 100): Promise<CommandLog[]> {
    return await db.select().from(commandLogs).limit(limit);
  }

  async getCommandLogsByUser(userId: string, limit: number = 50): Promise<CommandLog[]> {
    return await db.select().from(commandLogs).where(eq(commandLogs.userId, userId)).limit(limit);
  }

  async getCommandLogsByCommand(commandName: string, limit: number = 50): Promise<CommandLog[]> {
    return await db.select().from(commandLogs).where(eq(commandLogs.commandName, commandName)).limit(limit);
  }

  async getCommandStats(): Promise<{
    totalCommands: number;
    uniqueUsers: number;
    topCommands: { commandName: string; count: number }[];
    recentCommands: CommandLog[];
  }> {
    const allLogs = await this.getCommandLogs(1000);
    const uniqueUsers = new Set(allLogs.map(log => log.userId)).size;
    const commandCounts = new Map<string, number>();
    
    allLogs.forEach(log => {
      commandCounts.set(log.commandName, (commandCounts.get(log.commandName) || 0) + 1);
    });

    const topCommands = Array.from(commandCounts.entries())
      .map(([commandName, count]) => ({ commandName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCommands: allLogs.length,
      uniqueUsers,
      topCommands,
      recentCommands: allLogs.slice(0, 10)
    };
  }

  // Backup integrity methods (simplified)
  async getAllBackupIntegrityChecks(): Promise<any[]> {
    return [];
  }

  async getBackupIntegrityByBackupId(backupId: string): Promise<any> {
    return null;
  }

  async getIntegrityChecksByServerId(serverId: string): Promise<any[]> {
    return [];
  }

  async getHealthScoreStats(): Promise<any> {
    return { averageScore: 100, totalChecks: 0 };
  }

  async getAllBackups(): Promise<any[]> {
    return [];
  }
}

export const storage = new DatabaseStorage();