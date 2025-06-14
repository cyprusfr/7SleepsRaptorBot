import {
  users,
  discordKeys,
  discordUsers,
  discordServers,
  activityLogs,
  botSettings,
  dashboardKeys,
  backupIntegrity,
  candyTransactions,
  verificationSessions,
  emailVerificationCodes,
  commandLogs,
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
  type VerificationSession,
  type InsertVerificationSession,
  type EmailVerificationCode,
  type InsertEmailVerificationCode,
  type CommandLog,
  type InsertCommandLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
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
  getDiscordKey(keyId: string): Promise<DiscordKey | undefined>;
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
        set: userData,
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

  // Email authentication methods
  async createEmailUser(email: string, passwordHash: string, name?: string): Promise<User> {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(passwordHash, 10);
    
    // Generate UUID for email users
    const { randomUUID } = await import('crypto');
    const userId = randomUUID();
    
    const userData = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      passwordHash: hashedPassword,
      authMethod: 'email' as const,
      isApproved: false,
      role: 'pending',
      permissions: {},
    };

    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async authenticateEmailUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash || user.authMethod !== 'email') {
      return null;
    }

    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey> {
    const [key] = await db
      .insert(discordKeys)
      .values({
        keyId: insertKey.keyId,
        userId: insertKey.userId,
        discordUsername: insertKey.discordUsername,
        hwid: insertKey.hwid,
        status: insertKey.status || 'active'
      })
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
    const [user] = await db
      .insert(discordUsers)
      .values({
        discordId: insertUser.discordId,
        username: insertUser.username,
        discriminator: insertUser.discriminator,
        avatarUrl: insertUser.avatarUrl,
        roles: insertUser.roles,
        metadata: insertUser.metadata,
        candyBalance: insertUser.candyBalance,
        candyBank: insertUser.candyBank,
        lastDaily: insertUser.lastDaily,
        lastBeg: insertUser.lastBeg,
        lastScam: insertUser.lastScam,
        isWhitelisted: insertUser.isWhitelisted
      })
      .onConflictDoUpdate({
        target: discordUsers.discordId,
        set: {
          username: insertUser.username || discordUsers.username,
          discriminator: insertUser.discriminator,
          avatarUrl: insertUser.avatarUrl,
          roles: insertUser.roles,
          metadata: insertUser.metadata,
          candyBalance: insertUser.candyBalance,
          candyBank: insertUser.candyBank,
          lastDaily: insertUser.lastDaily,
          lastBeg: insertUser.lastBeg,
          lastScam: insertUser.lastScam,
          isWhitelisted: insertUser.isWhitelisted
        },
      })
      .returning();
    return user;
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
    const [server] = await db
      .insert(discordServers)
      .values(insertServer)
      .onConflictDoUpdate({
        target: discordServers.serverId,
        set: {
          ...insertServer,
          lastDataSync: new Date(),
        },
      })
      .returning();
    return server;
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
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async getActivityLogsByType(type: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, type))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async setBotSetting(key: string, value: string): Promise<void> {
    await db
      .insert(botSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value },
      });
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return setting?.value;
  }

  async getAllBotSettings(): Promise<BotSetting[]> {
    return await db.select().from(botSettings);
  }

  // Simple in-memory rate limiting for now
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
      expires: Date.now() + ttl * 1000,
    });
  }

  async createDashboardKey(keyData: InsertDashboardKey): Promise<DashboardKey> {
    const [key] = await db
      .insert(dashboardKeys)
      .values(keyData)
      .returning();
    return key;
  }

  async getDashboardKeyByUserId(userId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.userId, userId));
    return key || undefined;
  }

  async getDashboardKeyByDiscordUserId(discordUserId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.discordUserId, discordUserId));
    return key || undefined;
  }

  async getDashboardKeyByKeyId(keyId: string): Promise<DashboardKey | undefined> {
    const [key] = await db.select().from(dashboardKeys).where(eq(dashboardKeys.keyId, keyId));
    return key || undefined;
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
    botStatus: "online" | "offline";
    lastSync: string;
    totalCandy?: number;
    activeGames?: number;
    systemHealth?: "healthy" | "warning" | "critical";
    uptime?: number;
  }> {
    const [
      allKeys,
      allUsers,
      allServers,
      allCandyTransactions,
    ] = await Promise.all([
      db.select().from(discordKeys),
      db.select().from(discordUsers),
      db.select().from(discordServers),
      db.select().from(candyTransactions),
    ]);

    // Calculate total candy in circulation
    const totalCandy = allCandyTransactions
      .filter(t => t.type === 'daily' || t.type === 'game_win')
      .reduce((sum, t) => sum + t.amount, 0);

    // Count recent game activities (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeGames = allCandyTransactions
      .filter(t => t.type === 'game_win' && t.createdAt > oneDayAgo)
      .length;

    // Get bot statistics from Discord client
    const { raptorBot } = await import('./discord-bot');
    const botStats = raptorBot.getStats();
    
    return {
      totalKeys: allKeys.length,
      activeKeys: allKeys.filter(k => k.status === 'active').length,
      totalUsers: allUsers.length,
      connectedServers: allServers.filter(s => s.isActive).length,
      botStatus: raptorBot.isOnline() ? "online" : "offline",
      lastSync: new Date().toISOString(),
      totalCandy,
      activeGames,
      uptime: botStats.uptime ? Math.floor(botStats.uptime / 1000) : 0,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserApproval(userId: string, isApproved: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isApproved })
      .where(eq(users.id, userId));
  }

  async makeUserAdmin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId));
  }

  getRolePermissions(role: string): any {
    const permissions = {
      owner: { all: true },
      server_management: { servers: true, backups: true },
      head_admin: { users: true, keys: true },
      admin: { keys: true },
      pending: {},
    };
    return permissions[role as keyof typeof permissions] || {};
  }

  async updateCandyBalance(userId: string, amount: number): Promise<void> {
    const currentBalance = await this.getCandyBalance(userId);
    const newBalance = Math.max(0, currentBalance.wallet + amount);
    
    await db
      .update(discordUsers)
      .set({ candyBalance: newBalance })
      .where(eq(discordUsers.discordId, userId));
  }

  async withdrawCandy(userId: string, amount: number): Promise<void> {
    // Placeholder for bank to wallet transfer
    await this.updateCandyBalance(userId, 0); // No change for now
  }

  async addCandyTransaction(transaction: any): Promise<void> {
    await db.insert(candyTransactions).values(transaction);
  }

  async getCandyTransactions(userId: string, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(candyTransactions)
      .where(eq(candyTransactions.toUserId, userId))
      .orderBy(desc(candyTransactions.createdAt))
      .limit(limit);
  }

  async getCandyLeaderboard(limit: number = 10): Promise<any[]> {
    return await db
      .select()
      .from(discordUsers)
      .orderBy(desc(discordUsers.candyBalance))
      .limit(limit);
  }

  async checkDailyCandy(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const [transaction] = await db
      .select()
      .from(candyTransactions)
      .where(
        and(
          eq(candyTransactions.toUserId, userId),
          eq(candyTransactions.type, 'daily')
        )
      )
      .orderBy(desc(candyTransactions.createdAt))
      .limit(1);

    if (!transaction) return true; // No transactions = can claim
    
    const transactionDate = transaction.createdAt.toISOString().split('T')[0];
    return transactionDate !== today; // Can claim if last claim wasn't today
  }

  async claimDailyCandy(userId: string): Promise<number> {
    const amount = 2000; // Fixed 2000 candy daily reward as shown in screenshots
    
    await this.updateCandyBalance(userId, amount);
    await this.addCandyTransaction({
      toUserId: userId,
      amount,
      type: 'daily',
      description: 'Daily candy reward',
    });

    return amount;
  }

  async transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    const fromBalance = await this.getCandyBalance(fromUserId);

    if (fromBalance.wallet < amount) {
      throw new Error('Insufficient candy balance');
    }

    await this.updateCandyBalance(fromUserId, -amount);
    await this.updateCandyBalance(toUserId, amount);

    await this.addCandyTransaction({
      fromUserId,
      toUserId,
      amount,
      type: 'transfer',
      description: `Transfer from ${fromUserId} to ${toUserId}`,
    });
  }

  // Verification sessions
  async createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession> {
    const [result] = await db.insert(verificationSessions).values(session).returning();
    return result;
  }

  async getVerificationSession(sessionId: string): Promise<VerificationSession | undefined> {
    const [session] = await db.select().from(verificationSessions).where(eq(verificationSessions.sessionId, sessionId));
    return session;
  }

  async getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined> {
    const [session] = await db.select().from(verificationSessions)
      .where(eq(verificationSessions.discordUserId, discordUserId))
      .orderBy(desc(verificationSessions.createdAt));
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
        botResponseCode,
        status: 'completed',
      })
      .where(eq(verificationSessions.sessionId, sessionId));
  }

  // Command logging methods
  async logCommand(command: InsertCommandLog): Promise<CommandLog> {
    const [result] = await db.insert(commandLogs).values(command).returning();
    return result;
  }

  async getCommandLogs(limit: number = 100): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .orderBy(desc(commandLogs.timestamp))
      .limit(limit);
  }

  async getCommandLogsByUser(userId: string, limit: number = 50): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(eq(commandLogs.userId, userId))
      .orderBy(desc(commandLogs.timestamp))
      .limit(limit);
  }

  async getCommandLogsByCommand(commandName: string, limit: number = 50): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(eq(commandLogs.commandName, commandName))
      .orderBy(desc(commandLogs.timestamp))
      .limit(limit);
  }

  async getCommandStats(): Promise<{
    totalCommands: number;
    uniqueUsers: number;
    topCommands: { commandName: string; count: number }[];
    recentCommands: CommandLog[];
  }> {
    const allCommands = await db.select().from(commandLogs);
    const totalCommands = allCommands.length;
    const uniqueUsers = new Set(allCommands.map(c => c.userId)).size;
    
    // Count commands by name
    const commandCounts = new Map<string, number>();
    allCommands.forEach(cmd => {
      commandCounts.set(cmd.commandName, (commandCounts.get(cmd.commandName) || 0) + 1);
    });
    
    const topCommands = Array.from(commandCounts.entries())
      .map(([commandName, count]) => ({ commandName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentCommands = await this.getCommandLogs(20);

    return {
      totalCommands,
      uniqueUsers,
      topCommands,
      recentCommands,
    };
  }



  // Backup integrity methods
  async getAllBackupIntegrityChecks(): Promise<any[]> {
    return await db.select().from(backupIntegrity);
  }

  async getBackupIntegrityByBackupId(backupId: string): Promise<any> {
    const [result] = await db.select().from(backupIntegrity).where(eq(backupIntegrity.backupId, backupId));
    return result;
  }

  async getIntegrityChecksByServerId(serverId: string): Promise<any[]> {
    return await db.select().from(backupIntegrity).where(eq(backupIntegrity.serverId, serverId));
  }

  async getHealthScoreStats(): Promise<any> {
    const checks = await db.select().from(backupIntegrity);
    const total = checks.length;
    const healthy = checks.filter(c => c.healthScore >= 80).length;
    const warning = checks.filter(c => c.healthScore >= 60 && c.healthScore < 80).length;
    const critical = checks.filter(c => c.healthScore < 60).length;
    
    return {
      total,
      healthy,
      warning,
      critical,
      averageScore: total > 0 ? checks.reduce((sum, c) => sum + c.healthScore, 0) / total : 0
    };
  }

  async getAllBackups(): Promise<any[]> {
    // Return empty array for now as backup data structure is not defined
    return [];
  }

  // Additional candy system methods needed by Discord bot
  async getCandyBalance(userId: string): Promise<{ wallet: number; bank: number; total: number }> {
    const user = await this.getDiscordUserByDiscordId(userId);
    if (!user) {
      await this.upsertDiscordUser({ discordId: userId, username: 'unknown' });
      return { wallet: 0, bank: 0, total: 0 };
    }
    const wallet = user.candyBalance || 0;
    const bank = user.candyBank || 0;
    return { wallet, bank, total: wallet + bank };
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
    if (user) {
      const newBalance = Math.max(0, (user.candyBalance || 0) - amount);
      await db.update(discordUsers)
        .set({ candyBalance: newBalance })
        .where(eq(discordUsers.discordId, userId));
    }
  }

  async getLastDaily(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastDaily || null;
  }

  async updateLastDaily(userId: string): Promise<void> {
    await db.update(discordUsers)
      .set({ lastDaily: new Date() })
      .where(eq(discordUsers.discordId, userId));
  }

  async getLastBeg(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastBeg || null;
  }

  async updateLastBeg(userId: string): Promise<void> {
    await db.update(discordUsers)
      .set({ lastBeg: new Date() })
      .where(eq(discordUsers.discordId, userId));
  }

  async getLastScam(userId: string): Promise<Date | null> {
    const user = await this.getDiscordUserByDiscordId(userId);
    return user?.lastScam || null;
  }

  async updateLastScam(userId: string): Promise<void> {
    await db.update(discordUsers)
      .set({ lastScam: new Date() })
      .where(eq(discordUsers.discordId, userId));
  }

  async getTopCandyUsers(limit: number): Promise<{ discordId: string; candyBalance: number }[]> {
    const users = await db.select()
      .from(discordUsers)
      .where(eq(discordUsers.candyBalance, discordUsers.candyBalance))
      .orderBy(desc(discordUsers.candyBalance))
      .limit(limit);
    
    return users.map(user => ({
      discordId: user.discordId,
      candyBalance: user.candyBalance || 0
    }));
  }

  async addUserToWhitelist(userId: string): Promise<void> {
    await this.upsertDiscordUser({ discordId: userId, username: 'unknown', isWhitelisted: true });
  }

  async removeUserFromWhitelist(userId: string): Promise<void> {
    await db.update(discordUsers)
      .set({ isWhitelisted: false })
      .where(eq(discordUsers.discordId, userId));
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
      userId: data.userId,
      commandName: data.commandName,
      executionTime: data.executionTime,
      success: data.success,
      errorMessage: data.errorMessage,
      timestamp: new Date()
    });
  }
}

export const storage = new DatabaseStorage();