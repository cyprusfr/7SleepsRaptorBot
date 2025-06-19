import { 
  users, 
  discordUsers,
  discordKeys,
  candyBalances,
  candyTransactions,
  activityLogs,
  commandLogs,
  licenseKeys,
  bugReports,
  userLogs,
  discordServers,
  botSettings,
  whitelist,
  suggestions,
  verificationSessions,
  serverBackups,
  botActivityLogs,
  backupIntegrity,
  type User, 
  type UpsertUser,
  type DiscordUser,
  type DiscordKey,
  type VerificationSession,
  type DiscordServer,
  type InsertDiscordUser,
  type InsertDiscordKey,
  type InsertVerificationSession,
  type InsertDiscordServer
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, gte, lte, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createEmailUser(email: string, password: string, name?: string): Promise<User>;
  validateEmailUser(email: string, password: string): Promise<User | null>;
  
  
  getBannedUsers(): Promise<string[]>;
  isWhitelisted(userId: string): Promise<boolean>;

  createDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser>;
  getDiscordUser(discordId: string): Promise<DiscordUser | undefined>;
  getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined>;
  upsertDiscordUser(user: any): Promise<DiscordUser>;
  updateDiscordUser(discordId: string, updates: Partial<DiscordUser>): Promise<void>;

  createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey>;
  getDiscordKey(keyId: string): Promise<DiscordKey | undefined>;
  getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]>;
  updateDiscordKey(keyId: string, updates: Partial<DiscordKey>): Promise<void>;
  revokeDiscordKey(keyId: string, revokedBy: string): Promise<void>;
  reactivateDiscordKey(keyId: string, reactivatedBy: string): Promise<void>;
  getUserKeys(userId: string): Promise<DiscordKey[]>;
  getKeyInfo(keyId: string): Promise<DiscordKey | undefined>;
  getKeyUsageStats(keyId: string): Promise<{ lastUsed?: Date; usageCount?: number } | undefined>;
  getKeysList(status: string, userId?: string, limit?: number, offset?: number): Promise<DiscordKey[]>;
  getKeysCount(status: string, userId?: string): Promise<number>;
  getUsersList(whitelistedOnly: boolean, limit?: number, offset?: number): Promise<DiscordUser[]>;
  getUsersCount(whitelistedOnly: boolean): Promise<number>;
  getWhitelistEntries(limit?: number, offset?: number): Promise<any[]>;
  getWhitelistCount(): Promise<number>;
  getActivityLogs(limit?: number, offset?: number): Promise<any[]>;
  getActivityLogsCount(): Promise<number>;
  getStats(): Promise<any>;

  getCandyBalance(userId: string): Promise<any | undefined>;
  addCandyBalance(userId: string, amount: number): Promise<void>;
  addBankBalance(userId: string, amount: number): Promise<void>;
  transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<boolean>;
  getCandyLeaderboard(limit: number): Promise<any[]>;
  updateLastDaily(userId: string): Promise<void>;
  updateLastBeg(userId: string): Promise<void>;
  updateLastScam(userId: string): Promise<void>;
  addCandy(userId: string, amount: number): Promise<void>;
  setLastDaily(userId: string): Promise<void>;
  subtractCandy(userId: string, amount: number): Promise<void>;
  addCandyTransaction(transaction: any): Promise<void>;
  depositCandy(userId: string, amount: number): Promise<void>;
  withdrawCandy(userId: string, amount: number): Promise<void>;

  createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession>;
  getVerificationSession(sessionId: string): Promise<VerificationSession | undefined>;
  getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined>;
  updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<void>;

  createDiscordServer(server: InsertDiscordServer): Promise<DiscordServer>;
  updateDiscordServer(serverId: string, updates: Partial<DiscordServer>): Promise<void>;
  updateServerStatus(serverId: string, isActive: boolean): Promise<void>;

  logActivity(type: string, description: string): Promise<void>;
  logCommand(log: any): Promise<void>;

  createLicenseKey(key: any): Promise<any>;
  getLicenseKey(keyValue: string): Promise<any | undefined>;
  updateLicenseKey(keyValue: string, updates: any): Promise<void>;

  createBugReport(report: any): Promise<any>;
  getBugReport(reportId: string): Promise<any | undefined>;

  addUserLog(userId: string, message: string): Promise<void>;
  addUserLogs(userId: string, count: number, reason: string): Promise<void>;
  removeUserLogs(userId: string, count: number, reason: string): Promise<void>;
  getUserLogs(userId: string): Promise<any[]>;
  getAllUserLogs(limit: number): Promise<any[]>;
  getUserLogLeaderboard(limit: number): Promise<any[]>;
  clearUserLogs(userId: string): Promise<void>;

  getActivityLogs(limit: number): Promise<any[]>;
  getCommandLogs(limit: number): Promise<any[]>;
  getErrorLogs(limit: number): Promise<any[]>;
  clearActivityLogs(): Promise<number>;
  clearCommandLogs(): Promise<number>;
  clearErrorLogs(): Promise<number>;

  addToWhitelist(userId: string): Promise<void>;
  removeFromWhitelist(userId: string): Promise<void>;
  isWhitelisted(userId: string): Promise<boolean>;

  getBotSetting(key: string): Promise<string | undefined>;
  setBotSetting(key: string, value: string): Promise<void>;
  getAllBotSettings(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createEmailUser(email: string, password: string, name?: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name: name || email.split('@')[0],
        passwordHash,
        authMethod: 'email',
        isApproved: false,
        role: 'pending'
      })
      .returning();
    return user;
  }

  async validateEmailUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async createDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser> {
    const [user] = await db
      .insert(discordUsers)
      .values(insertUser)
      .returning();
    return user;
  }

  async getDiscordUser(discordId: string): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.discordId, discordId));
    return user;
  }

  async getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined> {
    const [user] = await db.select().from(discordUsers).where(eq(discordUsers.discordId, discordId));
    return user;
  }

  async upsertDiscordUser(user: any): Promise<DiscordUser> {
    const [newUser] = await db
      .insert(discordUsers)
      .values({
        discordId: user.discordId,
        username: user.username
      })
      .onConflictDoUpdate({
        target: discordUsers.discordId,
        set: {
          username: user.username
        }
      })
      .returning();
    return newUser;
  }

  async updateDiscordUser(discordId: string, updates: Partial<DiscordUser>): Promise<void> {
    await db
      .update(discordUsers)
      .set(updates)
      .where(eq(discordUsers.discordId, discordId));
  }

  async createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey> {
    const [key] = await db
      .insert(discordKeys)
      .values(insertKey)
      .returning();
    return key;
  }

  async getDiscordKey(keyId: string): Promise<DiscordKey | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.keyId, keyId));
    return key;
  }

  async getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]> {
    return db.select().from(discordKeys).where(eq(discordKeys.userId, userId));
  }

  async updateDiscordKey(keyId: string, updates: Partial<DiscordKey>): Promise<void> {
    await db
      .update(discordKeys)
      .set(updates)
      .where(eq(discordKeys.keyId, keyId));
  }

  async revokeDiscordKey(keyId: string, revokedBy: string): Promise<void> {
    await db
      .update(discordKeys)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy
      })
      .where(eq(discordKeys.keyId, keyId));
  }

  async reactivateDiscordKey(keyId: string, reactivatedBy: string): Promise<void> {
    await db
      .update(discordKeys)
      .set({
        status: "active",
        revokedAt: null,
        revokedBy: null,
        updatedAt: new Date()
      })
      .where(eq(discordKeys.keyId, keyId));
    
    
    await this.logActivity('key_reactivated', `Key ${keyId} reactivated by ${reactivatedBy}`);
  }

  async getCandyBalance(userId: string): Promise<any | undefined> {
    const [balance] = await db.select().from(candyBalances).where(eq(candyBalances.userId, userId));
    return balance;
  }

  async addCandyBalance(userId: string, amount: number): Promise<void> {
    const existingBalance = await this.getCandyBalance(userId);
    
    if (existingBalance) {
      await db
        .update(candyBalances)
        .set({
          balance: sql`${candyBalances.balance} + ${amount}`,
          totalEarned: amount > 0 ? sql`${candyBalances.totalEarned} + ${amount}` : candyBalances.totalEarned,
          totalSpent: amount < 0 ? sql`${candyBalances.totalSpent} + ${Math.abs(amount)}` : candyBalances.totalSpent
        })
        .where(eq(candyBalances.userId, userId));
    } else {
      await db
        .insert(candyBalances)
        .values({
          userId,
          balance: amount,
          bankBalance: 0,
          totalEarned: amount > 0 ? amount : 0,
          totalSpent: amount < 0 ? Math.abs(amount) : 0
        });
    }
  }

  async addBankBalance(userId: string, amount: number): Promise<void> {
    const existingBalance = await this.getCandyBalance(userId);
    
    if (existingBalance) {
      await db
        .update(candyBalances)
        .set({
          bankBalance: sql`${candyBalances.bankBalance} + ${amount}`
        })
        .where(eq(candyBalances.userId, userId));
    } else {
      await db
        .insert(candyBalances)
        .values({
          userId,
          balance: 0,
          bankBalance: amount,
          totalEarned: 0,
          totalSpent: 0
        });
    }
  }

  async depositCandy(userId: string, amount: number): Promise<void> {
    const existing = await this.getCandyBalance(userId);
    if (existing) {
      await db
        .update(candyBalances)
        .set({
          balance: existing.balance - amount,
          bankBalance: existing.bankBalance + amount,
          updatedAt: new Date()
        })
        .where(eq(candyBalances.userId, userId));
    }
  }

  async withdrawCandy(userId: string, amount: number): Promise<void> {
    const existing = await this.getCandyBalance(userId);
    if (existing) {
      await db
        .update(candyBalances)
        .set({
          balance: existing.balance + amount,
          bankBalance: existing.bankBalance - amount,
          updatedAt: new Date()
        })
        .where(eq(candyBalances.userId, userId));
    }
  }

  async transferCandy(fromUserId: string, toUserId: string, amount: number): Promise<boolean> {
    const fromBalance = await this.getCandyBalance(fromUserId);
    if (!fromBalance || fromBalance.balance < amount) {
      return false;
    }

    await this.addCandyBalance(fromUserId, -amount);
    await this.addCandyBalance(toUserId, amount);
    
    await this.addCandyTransaction({
      fromUserId,
      toUserId,
      amount,
      type: 'transfer',
      description: `Transfer from ${fromUserId} to ${toUserId}`
    });

    return true;
  }

  async getCandyLeaderboard(limit: number): Promise<any[]> {
    return db
      .select()
      .from(candyBalances)
      .orderBy(desc(candyBalances.balance))
      .limit(limit);
  }

  async updateLastDaily(userId: string): Promise<void> {
    
    const now = new Date();
    
    
    await db
      .update(discordUsers)
      .set({ lastDaily: now })
      .where(eq(discordUsers.discordId, userId));
    
    
    try {
      await db
        .update(candyBalances)
        .set({ lastDaily: now })
        .where(eq(candyBalances.userId, userId));
    } catch (error) {
      
      await db
        .insert(candyBalances)
        .values({
          userId: userId,
          balance: 0,
          bankBalance: 0,
          lastDaily: now,
          totalEarned: 0,
          totalSpent: 0
        })
        .onConflictDoNothing();
    }
  }

  async updateLastBeg(userId: string): Promise<void> {
    await this.updateDiscordUser(userId, { lastBeg: new Date() });
  }

  async updateLastScam(userId: string): Promise<void> {
    await this.updateDiscordUser(userId, { lastScam: new Date() });
  }

  async addCandy(userId: string, amount: number): Promise<void> {
    await this.addCandyBalance(userId, amount);
  }

  async setLastDaily(userId: string): Promise<void> {
    await this.updateLastDaily(userId);
  }

  async subtractCandy(userId: string, amount: number): Promise<void> {
    await this.addCandyBalance(userId, -amount);
  }

  async addCandyTransaction(transaction: any): Promise<void> {
    await db.insert(candyTransactions).values({
      fromUserId: transaction.fromUserId,
      toUserId: transaction.toUserId,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description
    });
  }

  async depositCandy(userId: string, amount: number): Promise<void> {
    const balance = await this.getCandyBalance(userId);
    if (balance && balance.balance >= amount) {
      await this.addCandyBalance(userId, -amount);
      await this.addBankBalance(userId, amount);
    }
  }

  async createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession> {
    const [newSession] = await db
      .insert(verificationSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getVerificationSession(sessionId: string): Promise<VerificationSession | undefined> {
    const [session] = await db
      .select()
      .from(verificationSessions)
      .where(eq(verificationSessions.sessionId, sessionId));
    return session;
  }

  async getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined> {
    const [session] = await db
      .select()
      .from(verificationSessions)
      .where(eq(verificationSessions.discordUserId, discordUserId))
      .orderBy(desc(verificationSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<void> {
    await db
      .update(verificationSessions)
      .set(updates)
      .where(eq(verificationSessions.sessionId, sessionId));
  }

  async createDiscordServer(server: InsertDiscordServer): Promise<DiscordServer> {
    const [newServer] = await db
      .insert(discordServers)
      .values(server)
      .returning();
    return newServer;
  }

  async updateDiscordServer(serverId: string, updates: Partial<DiscordServer>): Promise<void> {
    await db
      .update(discordServers)
      .set(updates)
      .where(eq(discordServers.serverId, serverId));
  }

  async logActivity(typeOrData: any, description?: string): Promise<void> {
    try {
      
      if (typeof typeOrData === 'string') {
        
        await db.insert(activityLogs).values({
          type: typeOrData,
          description: description || `Activity: ${typeOrData}`
        });
      } else {
        
        await db.insert(activityLogs).values({
          type: typeOrData.type,
          description: typeOrData.description || `Activity: ${typeOrData.type}`
        });
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async logCommand(log: any): Promise<void> {
    await db.insert(commandLogs).values({
      commandName: log.commandName,
      userId: log.userId,
      username: log.username,
      serverId: log.serverId,
      serverName: log.serverName,
      channelId: log.channelId,
      channelName: log.channelName,
      arguments: log.arguments,
      executionTime: log.executionTime,
      success: log.success,
      errorMessage: log.errorMessage,
      metadata: log.metadata
    });
  }

  async createLicenseKey(key: any): Promise<any> {
    const [newKey] = await db
      .insert(licenseKeys)
      .values({
        keyValue: key.keyValue,
        userId: key.userId,
        hwid: key.hwid,
        isActive: key.isActive !== undefined ? key.isActive : true,
        expiresAt: key.expiresAt,
        createdBy: key.createdBy,
        notes: key.notes
      })
      .returning();
    return newKey;
  }

  async getLicenseKey(keyValue: string): Promise<any | undefined> {
    const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.keyValue, keyValue));
    return key;
  }

  async updateLicenseKey(keyValue: string, updates: any): Promise<void> {
    await db
      .update(licenseKeys)
      .set(updates)
      .where(eq(licenseKeys.keyValue, keyValue));
  }

  async createBugReport(report: any): Promise<any> {
    const [newReport] = await db
      .insert(bugReports)
      .values({
        reportId: report.reportId,
        userId: report.userId,
        description: report.description,
        steps: report.steps,
        status: report.status || 'open'
      })
      .returning();
    return newReport;
  }

  async getBugReport(reportId: string): Promise<any | undefined> {
    const [report] = await db.select().from(bugReports).where(eq(bugReports.reportId, reportId));
    return report;
  }

  async addUserLog(userId: string, message: string): Promise<void> {
    await db.insert(userLogs).values({
      userId,
      logCount: 1
    });
  }

  async addUserLogs(userId: string, count: number, reason: string): Promise<void> {
    
    for (let i = 0; i < count; i++) {
      await db.insert(userLogs).values({
        userId,
        logCount: 1
      });
    }
    
    
    await this.logActivity('user_logs_added', `${count} logs added to user ${userId}: ${reason}`);
  }

  async removeUserLogs(userId: string, count: number, reason: string): Promise<void> {
    
    const existingLogs = await db.select().from(userLogs).where(eq(userLogs.userId, userId)).limit(count);
    
    
    for (const log of existingLogs) {
      await db.delete(userLogs).where(eq(userLogs.id, log.id));
    }
    
    
    await this.logActivity('user_logs_removed', `${count} logs removed from user ${userId}: ${reason}`);
  }

  async getUserLogLeaderboard(limit: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          userId: userLogs.userId,
          totalLogs: userLogs.logCount
        })
        .from(userLogs)
        .orderBy(desc(userLogs.logCount))
        .limit(limit);
      
      console.log(`Retrieved ${result.length} leaderboard entries from database`);
      return result;
    } catch (error) {
      console.error('Error in getUserLogLeaderboard:', error);
      return [];
    }
  }

  async clearUserLogs(userId: string): Promise<void> {
    await db.delete(userLogs).where(eq(userLogs.userId, userId));
    
    
    await this.logActivity('user_logs_cleared', `All logs cleared for user ${userId}`);
  }

  
  async getDiscordUserCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(discordUsers);
    return parseInt(result[0]?.count as string || '0');
  }

  async getDiscordKeyCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(discordKeys);
    return parseInt(result[0]?.count as string || '0');
  }

  async getActiveDiscordKeyCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(discordKeys)
      .where(eq(discordKeys.status, 'active'));
    return parseInt(result[0]?.count as string || '0');
  }

  async getTotalUserLogCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(userLogs);
    return parseInt(result[0]?.count as string || '0');
  }

  async getSuggestionCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(suggestions);
    return parseInt(result[0]?.count as string || '0');
  }

  async getBugReportCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(bugReports);
    return parseInt(result[0]?.count as string || '0');
  }

  
  async getAllDiscordKeys(limit: number = 50): Promise<any[]> {
    return await db.select()
      .from(discordKeys)
      .orderBy(desc(discordKeys.createdAt))
      .limit(limit);
  }

  
  async getAllDiscordUsers(limit: number = 50): Promise<any[]> {
    return await db.select()
      .from(discordUsers)
      .orderBy(desc(discordUsers.createdAt))
      .limit(limit);
  }

  
  async getAllBotSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(botSettings);
    const settingsObject: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });
    return settingsObject;
  }

  
  async resetCandyBalance(userId: string): Promise<void> {
    await db.update(candyBalances)
      .set({ balance: 0, bankBalance: 0, updatedAt: new Date() })
      .where(eq(candyBalances.userId, userId));
  }

  
  async resetUserHwid(userId: string): Promise<void> {
    await db.update(discordKeys)
      .set({ hwid: null, updatedAt: new Date() })
      .where(eq(discordKeys.userId, userId));
  }

  
  async getDiscordKey(keyValue: string): Promise<any | undefined> {
    const [key] = await db.select().from(discordKeys).where(eq(discordKeys.keyId, keyValue));
    return key;
  }

  async getUserLogs(userId: string): Promise<any[]> {
    return db.select().from(userLogs).where(eq(userLogs.userId, userId));
  }

  async getAllUserLogs(limit: number): Promise<any[]> {
    try {
      const logs = await db
        .select({
          userId: userLogs.userId,
          logCount: userLogs.logCount,
          lastUpdated: userLogs.lastUpdated
        })
        .from(userLogs)
        .orderBy(desc(userLogs.lastUpdated))
        .limit(limit);
      
      console.log(`Retrieved ${logs.length} user logs from database`);
      return logs;
    } catch (error) {
      console.error('Error in getAllUserLogs:', error);
      return [];
    }
  }

  async getActivityLogs(limit: number): Promise<any[]> {
    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
    return logs;
  }

  async getCommandLogs(limit: number): Promise<any[]> {
    const logs = await db
      .select()
      .from(commandLogs)
      .orderBy(desc(commandLogs.timestamp))
      .limit(limit);
    return logs;
  }

  async getErrorLogs(limit: number): Promise<any[]> {
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, 'error'))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
    return logs;
  }

  async clearActivityLogs(): Promise<number> {
    const result = await db.delete(activityLogs);
    return result.rowCount || 0;
  }

  async clearCommandLogs(): Promise<number> {
    const result = await db.delete(commandLogs);
    return result.rowCount || 0;
  }

  async clearErrorLogs(): Promise<number> {
    const result = await db.delete(activityLogs).where(eq(activityLogs.type, 'error'));
    return result.rowCount || 0;
  }

  async addToWhitelist(userId: string): Promise<void> {
    await db.insert(whitelist).values({
      userId,
      addedBy: 'system',
      isAdmin: false
    });
  }

  async removeFromWhitelist(userId: string): Promise<void> {
    await db.delete(whitelist).where(eq(whitelist.userId, userId));
  }

  async isWhitelisted(userId: string): Promise<boolean> {
    const [entry] = await db.select().from(whitelist).where(eq(whitelist.userId, userId));
    return !!entry;
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return setting?.value;
  }

  async setBotSetting(key: string, value: string): Promise<void> {
    await db
      .insert(botSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value }
      });
  }

  async getAllBotSettings(): Promise<any[]> {
    return db.select().from(botSettings);
  }

  async updateServerStatus(serverId: string, isActive: boolean): Promise<void> {
    await db
      .update(discordServers)
      .set({ isActive })
      .where(eq(discordServers.serverId, serverId));
  }

  async getUserKeys(userId: string): Promise<DiscordKey[]> {
    return await db
      .select()
      .from(discordKeys)
      .where(eq(discordKeys.userId, userId))
      .orderBy(desc(discordKeys.createdAt));
  }

  async getKeyInfo(keyId: string): Promise<DiscordKey | undefined> {
    const [key] = await db
      .select()
      .from(discordKeys)
      .where(eq(discordKeys.keyId, keyId));
    return key;
  }

  async getKeyUsageStats(keyId: string): Promise<{ lastUsed?: Date; usageCount?: number } | undefined> {
    
    return { lastUsed: new Date(), usageCount: 0 };
  }

  async getKeysList(status: string, userId?: string, limit = 10, offset = 0): Promise<DiscordKey[]> {
    let query = db.select().from(discordKeys);
    
    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(discordKeys.status, status));
    }
    if (userId) {
      conditions.push(eq(discordKeys.userId, userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query
      .orderBy(desc(discordKeys.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getKeysCount(status: string, userId?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(discordKeys);
    
    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(discordKeys.status, status));
    }
    if (userId) {
      conditions.push(eq(discordKeys.userId, userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const [result] = await query;
    return result.count;
  }

  async getUsersList(whitelistedOnly: boolean, limit = 10, offset = 0): Promise<DiscordUser[]> {
    let query = db.select().from(discordUsers);
    
    if (whitelistedOnly) {
      query = query.where(eq(discordUsers.isWhitelisted, true));
    }
    
    return await query
      .orderBy(desc(discordUsers.lastSeen))
      .limit(limit)
      .offset(offset);
  }

  async getUsersCount(whitelistedOnly: boolean): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(discordUsers);
    
    if (whitelistedOnly) {
      query = query.where(eq(discordUsers.isWhitelisted, true));
    }
    
    const [result] = await query;
    return result.count;
  }

  async getWhitelistEntries(limit = 10, offset = 0): Promise<any[]> {
    return await db
      .select()
      .from(whitelist)
      .orderBy(desc(whitelist.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getWhitelistCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(whitelist);
    return result.count;
  }

  async getActivityLogs(limit = 10, offset = 0): Promise<any[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getActivityLogsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs);
    return result.count;
  }

  async getStats(): Promise<any> {
    const [usersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordUsers);
    
    const [keysCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordKeys);
    
    const [activeKeysCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordKeys)
      .where(eq(discordKeys.status, 'active'));
    
    const [whitelistCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(whitelist);
    
    return {
      totalUsers: usersCount.count,
      totalKeys: keysCount.count,
      activeKeys: activeKeysCount.count,
      whitelistEntries: whitelistCount.count,
      uptime: process.uptime()
    };
  }

  async createSuggestion(suggestion: any): Promise<void> {
    await db.insert(suggestions).values({
      suggestionId: suggestion.suggestionId,
      userId: suggestion.userId,
      title: suggestion.title,
      description: suggestion.description,
      status: suggestion.status
    });
  }

  async updateSuggestionStatus(suggestionId: string, status: string): Promise<void> {
    await db.update(suggestions)
      .set({ status, updatedAt: new Date() })
      .where(eq(suggestions.suggestionId, suggestionId));
  }

  async resetCandyBalance(userId: string): Promise<void> {
    await db.update(candyBalances)
      .set({ balance: 0, bankBalance: 0, updatedAt: new Date() })
      .where(eq(candyBalances.userId, userId));
  }

  
  async createServerBackup(guild: any, createdBy: string): Promise<string> {
    const backupId = nanoid();
    const startTime = Date.now();

    try {
      
      const [
        channels,
        roles,
        members,
        emojis,
        stickers,
        invites,
        webhooks,
        bans,
        auditLogs
      ] = await Promise.all([
        guild.channels.fetch(),
        guild.roles.fetch(),
        guild.members.fetch(),
        guild.emojis.fetch(),
        guild.stickers.fetch(),
        guild.invites.fetch(),
        guild.fetchWebhooks(),
        guild.bans.fetch(),
        guild.fetchAuditLogs({ limit: 100 })
      ]);

      
      const allMessages: any[] = [];
      let totalMessageCount = 0;

      for (const [, channel] of channels) {
        if (channel.isTextBased && channel.isTextBased() && channel.viewable) {
          try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const channelMessages = messages.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              author: {
                id: msg.author.id,
                username: msg.author.username,
                discriminator: msg.author.discriminator,
                bot: msg.author.bot
              },
              channelId: channel.id,
              channelName: channel.name,
              timestamp: msg.createdAt,
              attachments: msg.attachments.map((att: any) => ({
                id: att.id,
                name: att.name,
                url: att.url,
                size: att.size
              })),
              embeds: msg.embeds.map((embed: any) => ({
                title: embed.title,
                description: embed.description,
                url: embed.url,
                color: embed.color,
                fields: embed.fields
              })),
              reactions: msg.reactions.cache.map((reaction: any) => ({
                emoji: reaction.emoji.name,
                count: reaction.count
              }))
            }));
            allMessages.push(...channelMessages);
            totalMessageCount += channelMessages.length;
          } catch (error) {
            console.log(`Couldn't fetch messages from ${channel.name}:`, error);
          }
        }
      }

      
      const backupData = {
        backupId,
        serverId: guild.id,
        serverName: guild.name,
        serverIcon: guild.iconURL(),
        serverBanner: guild.bannerURL(),
        serverSplash: guild.splashURL(),
        serverDescription: guild.description,
        ownerInfo: {
          id: guild.ownerId,
          username: guild.members.cache.get(guild.ownerId)?.user.username
        },
        serverData: {
          id: guild.id,
          name: guild.name,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
          partnered: guild.partnered,
          verified: guild.verified,
          boostTier: guild.premiumTier,
          boostCount: guild.premiumSubscriptionCount,
          features: guild.features,
          systemChannelId: guild.systemChannelId,
          rulesChannelId: guild.rulesChannelId,
          publicUpdatesChannelId: guild.publicUpdatesChannelId,
          afkChannelId: guild.afkChannelId,
          afkTimeout: guild.afkTimeout,
          defaultMessageNotifications: guild.defaultMessageNotifications,
          explicitContentFilter: guild.explicitContentFilter,
          mfaLevel: guild.mfaLevel,
          nsfwLevel: guild.nsfwLevel,
          verificationLevel: guild.verificationLevel
        },
        channels: channels.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position,
          parentId: channel.parentId,
          topic: channel.topic,
          nsfw: channel.nsfw,
          rateLimitPerUser: channel.rateLimitPerUser,
          permissionOverwrites: channel.permissionOverwrites?.cache.map((overwrite: any) => ({
            id: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray()
          }))
        })),
        roles: roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          position: role.position,
          permissions: role.permissions.toArray(),
          managed: role.managed,
          mentionable: role.mentionable,
          members: role.members.map((member: any) => member.id)
        })),
        members: members.map((member: any) => ({
          id: member.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          nickname: member.nickname,
          roles: member.roles.cache.map((role: any) => role.id),
          joinedAt: member.joinedAt,
          premiumSince: member.premiumSince,
          bot: member.user.bot,
          avatar: member.user.avatarURL()
        })),
        messages: allMessages,
        emojis: emojis.map((emoji: any) => ({
          id: emoji.id,
          name: emoji.name,
          animated: emoji.animated,
          url: emoji.url,
          author: emoji.author?.id
        })),
        stickers: stickers.map((sticker: any) => ({
          id: sticker.id,
          name: sticker.name,
          description: sticker.description,
          type: sticker.type,
          format: sticker.format,
          url: sticker.url
        })),
        invites: invites.map((invite: any) => ({
          code: invite.code,
          url: invite.url,
          channelId: invite.channelId,
          inviterId: invite.inviterId,
          uses: invite.uses,
          maxUses: invite.maxUses,
          maxAge: invite.maxAge,
          temporary: invite.temporary,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt
        })),
        webhooks: webhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          channelId: webhook.channelId,
          guildId: webhook.guildId,
          url: webhook.url,
          avatar: webhook.avatarURL()
        })),
        integrations: [], 
        auditLogs: auditLogs.entries.map((entry: any) => ({
          id: entry.id,
          action: entry.action,
          executor: entry.executor?.id,
          target: entry.target?.id,
          reason: entry.reason,
          changes: entry.changes,
          createdAt: entry.createdAt
        })),
        bans: bans.map((ban: any) => ({
          userId: ban.user.id,
          username: ban.user.username,
          reason: ban.reason
        })),
        voiceStates: guild.voiceStates.cache.map((state: any) => ({
          userId: state.id,
          channelId: state.channelId,
          mute: state.mute,
          deaf: state.deaf,
          selfMute: state.selfMute,
          selfDeaf: state.selfDeaf
        })),
        threads: [], 
        scheduledEvents: guild.scheduledEvents?.cache.map((event: any) => ({
          id: event.id,
          name: event.name,
          description: event.description,
          scheduledStartAt: event.scheduledStartAt,
          scheduledEndAt: event.scheduledEndAt,
          status: event.status,
          entityType: event.entityType
        })) || [],
        backupSize: JSON.stringify(allMessages).length + JSON.stringify(members).length,
        messageCount: totalMessageCount,
        memberCount: members.size,
        channelCount: channels.size,
        roleCount: roles.size,
        emojiCount: emojis.size,
        threadCount: 0,
        createdBy,
        backupDuration: Date.now() - startTime,
        compressionRatio: 0,
        integrityHash: `backup_${backupId}_${Date.now()}`
      };

      await db.insert(serverBackups).values(backupData);
      return backupId;

    } catch (error) {
      console.error('Error creating server backup:', error);
      throw error;
    }
  }

  
  async logBotActivity(activityData: {
    eventType: string;
    eventCategory: string;
    eventData: any;
    userId?: string;
    username?: string;
    userDiscriminator?: string;
    channelId?: string;
    channelName?: string;
    channelType?: string;
    guildId?: string;
    guildName?: string;
    commandName?: string;
    subcommandName?: string;
    commandOptions?: any;
    messageId?: string;
    messageContent?: string;
    messageAttachments?: any;
    messageEmbeds?: any;
    reactionEmoji?: string;
    reactionCount?: number;
    memberJoinData?: any;
    memberLeaveData?: any;
    roleChanges?: any;
    voiceStateChange?: any;
    executionTime?: number;
    success?: boolean;
    errorMessage?: string;
    errorStack?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await db.insert(botActivityLogs).values(activityData);
    } catch (error) {
      console.error('Error logging bot activity:', error);
    }
  }

  
  async getServerBackups(limit = 10): Promise<any[]> {
    return await db.select().from(serverBackups)
      .orderBy(sql`${serverBackups.createdAt} DESC`)
      .limit(limit);
  }

  
  async getServerBackup(backupId: string): Promise<any> {
    const [backup] = await db.select().from(serverBackups)
      .where(eq(serverBackups.backupId, backupId));
    return backup;
  }

  
  async getBotActivityLogs(limit = 100): Promise<any[]> {
    return await db.select().from(botActivityLogs)
      .orderBy(sql`${botActivityLogs.timestamp} DESC`)
      .limit(limit);
  }

  
  async getBannedUsers(): Promise<string[]> {
    try {
      
      
      return [];
    } catch (error) {
      console.error('Error fetching banned users:', error);
      return [];
    }
  }

  async isWhitelisted(userId: string): Promise<boolean> {
    try {
      const [result] = await db.select({ count: count() })
        .from(whitelist)
        .where(eq(whitelist.userId, userId));
      
      return result.count > 0;
    } catch (error) {
      console.error('Error checking whitelist status:', error);
      return false; 
    }
  }
}

export const storage = new DatabaseStorage();