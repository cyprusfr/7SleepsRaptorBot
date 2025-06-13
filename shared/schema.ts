import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Updated users table for Google OAuth and email/password authentication with role-based permissions
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Google user ID or generated UUID for email users
  email: varchar("email").unique(),
  name: varchar("name"),
  picture: varchar("picture"),
  passwordHash: varchar("password_hash"), // For email authentication
  authMethod: varchar("auth_method", { length: 20 }).default("google"), // "google" or "email"
  isApproved: boolean("is_approved").default(false),
  role: varchar("role", { length: 50 }).default("pending"), // owner, server_management, head_admin, admin, pending
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification codes table
export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(), // 6-digit verification code
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Two-way verification sessions table
export const verificationSessions = pgTable("verification_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull().unique(), // UUID
  discordUserId: varchar("discord_user_id").notNull(),
  dashboardCode: varchar("dashboard_code", { length: 8 }).notNull(), // Code user sends to bot
  botResponseCode: varchar("bot_response_code", { length: 8 }), // Code bot sends back
  status: varchar("status", { length: 20 }).default("pending"), // pending, bot_verified, completed, expired
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  dataConnection: jsonb("data_connection").default({
    useRealData: true,
    syncDiscordServers: true,
    trackActivity: true,
    showBotStats: true,
    autoRefresh: true,
    refreshInterval: 300000
  }),
  dashboard: jsonb("dashboard").default({
    showSystemHealth: true,
    showCandyStats: true,
    showKeyManagement: true,
    showUserActivity: true
  }),
  notifications: jsonb("notifications").default({
    keyValidations: true,
    serverEvents: true,
    botStatus: true,
    backupAlerts: true
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discordKeys = pgTable("discord_keys", {
  id: serial("id").primaryKey(),
  keyId: text("key_id").notNull().unique(),
  userId: text("user_id"),
  discordUsername: text("discord_username"),
  hwid: text("hwid"),
  status: text("status").notNull().default("active"), // active, revoked, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: text("revoked_by"),
});

export const discordUsers = pgTable("discord_users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatarUrl: text("avatar_url"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  roles: jsonb("roles").default([]),
  metadata: jsonb("metadata").default({}),
  candyBalance: integer("candy_balance").default(0).notNull(),
});

export const discordServers = pgTable("discord_servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  serverName: text("server_name").notNull(),
  memberCount: integer("member_count").default(0),
  botJoinedAt: timestamp("bot_joined_at").defaultNow().notNull(),
  lastDataSync: timestamp("last_data_sync").defaultNow().notNull(),
  permissions: jsonb("permissions").default({}),
  isActive: boolean("is_active").default(true),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // key_generated, key_revoked, user_linked, user_info, hwid_info, server_backup
  userId: text("user_id"),
  targetId: text("target_id"),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const candyTransactions = pgTable("candy_transactions", {
  id: serial("id").primaryKey(),
  fromUserId: text("from_user_id"), // null for system rewards
  toUserId: text("to_user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'daily', 'transfer', 'reward', 'purchase'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dashboard access keys
export const dashboardKeys = pgTable("dashboard_keys", {
  id: serial("id").primaryKey(),
  keyId: varchar("key_id", { length: 64 }).unique().notNull(),
  userId: varchar("user_id", { length: 128 }), // Google user ID when linked
  linkedEmail: varchar("linked_email", { length: 256 }), // Google email when linked
  discordUserId: varchar("discord_user_id", { length: 32 }).notNull(), // Discord user who generated the key
  discordUsername: varchar("discord_username", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'revoked', 'expired'
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  lastAccessAt: timestamp("last_access_at"),
  expiresAt: timestamp("expires_at"), // Optional expiry
  revokedBy: varchar("revoked_by", { length: 100 }),
  revokedAt: timestamp("revoked_at"),
  metadata: jsonb("metadata"),
});

// Backup integrity tracking table
export const backupIntegrity = pgTable("backup_integrity", {
  id: serial("id").primaryKey(),
  backupId: varchar("backup_id", { length: 64 }).notNull(),
  serverId: varchar("server_id", { length: 32 }).notNull(),
  serverName: varchar("server_name", { length: 100 }).notNull(),
  backupType: varchar("backup_type", { length: 20 }).notNull(),
  healthScore: integer("health_score").notNull(), // 0-100
  integrityStatus: varchar("integrity_status", { length: 20 }).notNull(), // "healthy", "warning", "critical", "corrupted"
  dataCompleteness: integer("data_completeness").notNull(), // 0-100 percentage
  checksumValid: boolean("checksum_valid").default(true),
  totalElements: integer("total_elements").notNull(),
  validElements: integer("valid_elements").notNull(),
  corruptedElements: jsonb("corrupted_elements"), // List of corrupted data elements
  missingElements: jsonb("missing_elements"), // List of missing required elements
  validationErrors: jsonb("validation_errors"), // Detailed validation error list
  performanceMetrics: jsonb("performance_metrics"), // Backup size, creation time, etc.
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  checkedBy: varchar("checked_by", { length: 100 }), // User or system that ran the check
  autoCheck: boolean("auto_check").default(false), // Whether this was an automated check
  metadata: jsonb("metadata"), // Additional check metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertDiscordKeySchema = createInsertSchema(discordKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscordUserSchema = createInsertSchema(discordUsers).omit({
  id: true,
  joinedAt: true,
  lastSeen: true,
});

export const insertDiscordServerSchema = createInsertSchema(discordServers).omit({
  id: true,
  botJoinedAt: true,
  lastDataSync: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertBotSettingSchema = createInsertSchema(botSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCandyTransactionSchema = createInsertSchema(candyTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertDashboardKeySchema = createInsertSchema(dashboardKeys).omit({
  id: true,
  generatedAt: true,
  lastAccessAt: true,
  revokedAt: true,
});

export const insertBackupIntegritySchema = createInsertSchema(backupIntegrity).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastChecked: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Verification session types
export type InsertVerificationSession = typeof verificationSessions.$inferInsert;
export type VerificationSession = typeof verificationSessions.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

export type InsertDiscordKey = z.infer<typeof insertDiscordKeySchema>;
export type DiscordKey = typeof discordKeys.$inferSelect;

export type InsertDiscordUser = z.infer<typeof insertDiscordUserSchema>;
export type DiscordUser = typeof discordUsers.$inferSelect;

export type InsertDiscordServer = z.infer<typeof insertDiscordServerSchema>;
export type DiscordServer = typeof discordServers.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertBotSetting = z.infer<typeof insertBotSettingSchema>;
export type BotSetting = typeof botSettings.$inferSelect;

export type InsertCandyTransaction = z.infer<typeof insertCandyTransactionSchema>;
export type CandyTransaction = typeof candyTransactions.$inferSelect;

export type InsertDashboardKey = z.infer<typeof insertDashboardKeySchema>;
export type DashboardKey = typeof dashboardKeys.$inferSelect;

export type InsertBackupIntegrity = z.infer<typeof insertBackupIntegritySchema>;
export type BackupIntegrity = typeof backupIntegrity.$inferSelect;

// Email verification types
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
export type InsertEmailVerificationCode = typeof emailVerificationCodes.$inferInsert;
