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
  candyBank: integer("candy_bank").default(0).notNull(),
  lastDaily: timestamp("last_daily"),
  lastBeg: timestamp("last_beg"),
  lastScam: timestamp("last_scam"),
  isWhitelisted: boolean("is_whitelisted").default(false),
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

// Command logs table for tracking Discord bot command usage
export const commandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  commandName: varchar("command_name", { length: 100 }).notNull(),
  userId: varchar("user_id").notNull(), // Discord user ID
  username: varchar("username").notNull(), // Discord username
  serverId: varchar("server_id"), // Discord server ID
  serverName: varchar("server_name"), // Discord server name
  channelId: varchar("channel_id"), // Discord channel ID
  channelName: varchar("channel_name"), // Discord channel name
  arguments: jsonb("arguments"), // Command arguments/options
  executionTime: integer("execution_time"), // Time taken to execute in ms
  success: boolean("success").default(true), // Whether command executed successfully
  errorMessage: text("error_message"), // Error message if failed
  metadata: jsonb("metadata"), // Additional command-specific data
  timestamp: timestamp("timestamp").defaultNow(),
});

// License keys table for MacSploit keys
export const licenseKeys = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  keyValue: varchar("key_value", { length: 100 }).notNull().unique(),
  userId: varchar("user_id"), // Discord user ID
  hwid: varchar("hwid"), // Hardware ID
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candy balances table
export const candyBalances = pgTable("candy_balances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(), // Discord user ID
  balance: integer("balance").default(0),
  bankBalance: integer("bank_balance").default(0),
  lastDaily: timestamp("last_daily"),
  totalEarned: integer("total_earned").default(0),
  totalSpent: integer("total_spent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bug reports table
export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  reportId: varchar("report_id", { length: 16 }).notNull().unique(),
  userId: varchar("user_id").notNull(), // Discord user ID
  description: text("description").notNull(),
  steps: text("steps"),
  status: varchar("status", { length: 20 }).default("open"), // open, investigating, resolved, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User logs table for tracking user activity
export const userLogs = pgTable("user_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Discord user ID
  logCount: integer("log_count").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Whitelist table
export const whitelist = pgTable("whitelist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(), // Discord user ID
  addedBy: varchar("added_by"), // Who added them
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Suggestions table
export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  suggestionId: varchar("suggestion_id", { length: 16 }).notNull().unique(),
  userId: varchar("user_id").notNull(), // Discord user ID
  username: varchar("username").notNull(), // Discord username
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, denied
  reviewedBy: varchar("reviewed_by"), // Who reviewed it
  reviewNote: text("review_note"), // Review comments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Complete Discord server backups table
export const serverBackups = pgTable("server_backups", {
  id: serial("id").primaryKey(),
  backupId: varchar("backup_id", { length: 36 }).notNull().unique(),
  serverId: varchar("server_id").notNull(),
  serverName: varchar("server_name").notNull(),
  serverIcon: text("server_icon"),
  serverBanner: text("server_banner"),
  serverSplash: text("server_splash"),
  serverDescription: text("server_description"),
  ownerInfo: jsonb("owner_info").notNull(), // Server owner details
  serverData: jsonb("server_data").notNull(), // Complete server metadata
  channels: jsonb("channels").notNull(), // All channels with metadata and permissions
  roles: jsonb("roles").notNull(), // All roles with permissions and members
  members: jsonb("members").notNull(), // All members with roles and join dates
  messages: jsonb("messages").notNull(), // All messages from all channels
  emojis: jsonb("emojis").notNull(), // Custom emojis with metadata
  stickers: jsonb("stickers").notNull(), // Custom stickers
  invites: jsonb("invites").notNull(), // Active invites with usage stats
  webhooks: jsonb("webhooks").notNull(), // All webhooks
  integrations: jsonb("integrations").notNull(), // Bot integrations and connections
  auditLogs: jsonb("audit_logs").notNull(), // Recent audit log entries
  bans: jsonb("bans").notNull(), // Banned users with reasons
  voiceStates: jsonb("voice_states"), // Voice channel states at backup time
  threads: jsonb("threads"), // All threads with messages
  scheduledEvents: jsonb("scheduled_events"), // Server events
  backupSize: integer("backup_size").notNull(), // Size in bytes
  messageCount: integer("message_count").notNull(),
  memberCount: integer("member_count").notNull(),
  channelCount: integer("channel_count").notNull(),
  roleCount: integer("role_count").notNull(),
  emojiCount: integer("emoji_count").notNull(),
  threadCount: integer("thread_count").notNull(),
  createdBy: varchar("created_by").notNull(),
  backupDuration: integer("backup_duration"), // Time taken to create backup in ms
  compressionRatio: integer("compression_ratio"), // Compression percentage
  integrityHash: varchar("integrity_hash"), // Checksum for verification
  createdAt: timestamp("created_at").defaultNow(),
});

// Complete bot activity logging for every operation
export const botActivityLogs = pgTable("bot_activity_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // command, message, reaction, join, leave, etc.
  eventCategory: varchar("event_category", { length: 30 }).notNull(), // interaction, guild, message, voice, etc.
  eventData: jsonb("event_data").notNull(), // Complete event details
  userId: varchar("user_id"),
  username: varchar("username"),
  userDiscriminator: varchar("user_discriminator"),
  channelId: varchar("channel_id"),
  channelName: varchar("channel_name"),
  channelType: varchar("channel_type"),
  guildId: varchar("guild_id"),
  guildName: varchar("guild_name"),
  commandName: varchar("command_name"),
  subcommandName: varchar("subcommand_name"),
  commandOptions: jsonb("command_options"),
  messageId: varchar("message_id"),
  messageContent: text("message_content"),
  messageAttachments: jsonb("message_attachments"),
  messageEmbeds: jsonb("message_embeds"),
  reactionEmoji: varchar("reaction_emoji"),
  reactionCount: integer("reaction_count"),
  memberJoinData: jsonb("member_join_data"), // Join info, roles, etc.
  memberLeaveData: jsonb("member_leave_data"), // Leave reason, roles lost, etc.
  roleChanges: jsonb("role_changes"), // Role additions/removals
  voiceStateChange: jsonb("voice_state_change"), // Voice channel joins/leaves
  executionTime: integer("execution_time"), // Milliseconds
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  ipAddress: varchar("ip_address"), // For webhook/API calls
  userAgent: text("user_agent"), // For webhook/API calls
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow(),
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

export const insertServerBackupSchema = createInsertSchema(serverBackups).omit({
  id: true,
  createdAt: true,
});

export const insertBotActivityLogSchema = createInsertSchema(botActivityLogs).omit({
  id: true,
  timestamp: true,
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

export const insertCommandLogSchema = createInsertSchema(commandLogs).omit({
  id: true,
  timestamp: true,
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type CommandLog = typeof commandLogs.$inferSelect;
export type InsertCommandLog = z.infer<typeof insertCommandLogSchema>;

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
