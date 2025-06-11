import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
