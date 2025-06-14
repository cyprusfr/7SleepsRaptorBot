import { 
  users, 
  emailVerificationCodes,
  verificationSessions,
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
  userSettings,
  dashboardKeys,
  backupIntegrity,
  whitelist,
  type User, 
  type UpsertUser,
  type DiscordUser,
  type DiscordKey,
  type VerificationSession,
  type EmailVerificationCode,
  type DiscordServer,
  type UserSettings,
  type InsertDiscordUser,
  type InsertDiscordKey,
  type InsertVerificationSession,
  type InsertEmailVerificationCode,
  type InsertDiscordServer,
  type InsertUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// Interface for storage operations
export interface IStorage {
  // User operations for authentication
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createEmailUser(email: string, password: string, name?: string): Promise<User>;
  validateEmailUser(email: string, password: string): Promise<User | null>;

  // Discord users
  createDiscordUser(insertUser: InsertDiscordUser): Promise<DiscordUser>;
  getDiscordUser(discordId: string): Promise<DiscordUser | undefined>;
  getDiscordUserByDiscordId(discordId: string): Promise<DiscordUser | undefined>;
  upsertDiscordUser(user: any): Promise<DiscordUser>;
  updateDiscordUser(discordId: string, updates: Partial<DiscordUser>): Promise<void>;

  // Discord keys
  createDiscordKey(insertKey: InsertDiscordKey): Promise<DiscordKey>;
  getDiscordKey(keyId: string): Promise<DiscordKey | undefined>;
  getDiscordKeysByUserId(userId: string): Promise<DiscordKey[]>;
  updateDiscordKey(keyId: string, updates: Partial<DiscordKey>): Promise<void>;
  revokeDiscordKey(keyId: string, revokedBy: string): Promise<void>;

  // Candy system
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

  // Verification sessions
  createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession>;
  getVerificationSession(sessionId: string): Promise<VerificationSession | undefined>;
  getVerificationSessionByDiscordUserId(discordUserId: string): Promise<VerificationSession | undefined>;
  updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<void>;

  // Discord servers
  createDiscordServer(server: InsertDiscordServer): Promise<DiscordServer>;
  updateDiscordServer(serverId: string, updates: Partial<DiscordServer>): Promise<void>;

  // Activity logs
  logActivity(type: string, description: string): Promise<void>;

  // Command logs
  logCommand(log: any): Promise<void>;

  // License keys
  createLicenseKey(key: any): Promise<any>;
  getLicenseKey(keyValue: string): Promise<any | undefined>;
  updateLicenseKey(keyValue: string, updates: any): Promise<void>;

  // Bug reports
  createBugReport(report: any): Promise<any>;
  getBugReport(reportId: string): Promise<any | undefined>;

  // User logs
  addUserLog(userId: string, message: string): Promise<void>;
  getUserLogs(userId: string): Promise<any[]>;

  // Whitelist operations
  addToWhitelist(userId: string): Promise<void>;
  removeFromWhitelist(userId: string): Promise<void>;
  isWhitelisted(userId: string): Promise<boolean>;

  // Bot settings
  getBotSetting(key: string): Promise<string | undefined>;
  setBotSetting(key: string, value: string): Promise<void>;
  getAllBotSettings(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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
        set: {
          ...userData,
        },
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

  // Discord users
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

  // Discord keys
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

  // Candy system
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
    await db
      .update(candyBalances)
      .set({ lastDaily: new Date() })
      .where(eq(candyBalances.userId, userId));
  }

  async updateLastBeg(userId: string): Promise<void> {
    // For now, track in Discord users table since that's where we have timestamps
    await this.updateDiscordUser(userId, { lastBeg: new Date() });
  }

  async updateLastScam(userId: string): Promise<void> {
    // For now, track in Discord users table since that's where we have timestamps
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

  // Verification sessions
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

  // Discord servers
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

  // Activity logs
  async logActivity(type: string, description: string): Promise<void> {
    await db.insert(activityLogs).values({
      type,
      description,
      timestamp: new Date()
    });
  }

  // Command logs
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

  // License keys
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

  // Bug reports
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

  // User logs
  async addUserLog(userId: string, message: string): Promise<void> {
    await db.insert(userLogs).values({
      userId,
      logCount: 1
    });
  }

  async getUserLogs(userId: string): Promise<any[]> {
    return db.select().from(userLogs).where(eq(userLogs.userId, userId));
  }

  // Whitelist operations
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

  // Bot settings
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
}

export const storage = new DatabaseStorage();