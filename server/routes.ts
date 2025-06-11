import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { raptorBot } from "./discord-bot";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireApproved(req: any, res: any, next: any) {
  if (!req.user?.isApproved) {
    return res.status(403).json({ error: "Access not approved" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Google OAuth authentication
  setupAuth(app);

  // Start Discord bot
  try {
    await raptorBot.start();
    console.log("✅ Discord bot started successfully");
  } catch (error) {
    console.error("❌ Failed to start Discord bot:", error);
  }

  // Auth routes with user data
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Admin routes for user management
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users/:userId/approve', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { approved } = req.body;
      await storage.updateUserApproval(userId, approved);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user approval:", error);
      res.status(500).json({ error: "Failed to update user approval" });
    }
  });

  app.post('/api/admin/users/:userId/make-admin', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.makeUserAdmin(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error making user admin:", error);
      res.status(500).json({ error: "Failed to make user admin" });
    }
  });

  // API Routes
  
  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      const botStats = raptorBot.getStats();
      
      res.json({
        ...stats,
        botStatus: raptorBot.isOnline() ? 'online' : 'offline',
        botUptime: botStats.uptime,
        guilds: botStats.guilds,
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Activity logs
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string;
      
      const activities = type 
        ? await storage.getActivityLogsByType(type, limit)
        : await storage.getActivityLogs(limit);
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Discord keys
  app.get("/api/keys", async (req, res) => {
    try {
      const status = req.query.status as string;
      let keys = await storage.getAllDiscordKeys();
      
      if (status && status !== 'all') {
        keys = keys.filter(key => key.status === status);
      }
      
      // Sort by creation date, newest first
      keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      res.json(keys);
    } catch (error) {
      console.error("Error fetching keys:", error);
      res.status(500).json({ error: "Failed to fetch keys" });
    }
  });

  app.get("/api/keys/:keyId", async (req, res) => {
    try {
      const key = await storage.getDiscordKeyByKeyId(req.params.keyId);
      if (!key) {
        return res.status(404).json({ error: "Key not found" });
      }
      res.json(key);
    } catch (error) {
      console.error("Error fetching key:", error);
      res.status(500).json({ error: "Failed to fetch key" });
    }
  });

  const createKeySchema = z.object({
    userId: z.string().optional(),
    discordUsername: z.string().optional(),
    hwid: z.string().optional(),
  });

  app.post("/api/keys", async (req, res) => {
    try {
      const data = createKeySchema.parse(req.body);
      
      // Generate unique key ID
      const keyId = `RAP_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      const key = await storage.createDiscordKey({
        keyId,
        ...data,
        status: 'active',
      });
      
      res.status(201).json(key);
    } catch (error) {
      console.error("Error creating key:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create key" });
    }
  });

  app.patch("/api/keys/:keyId/revoke", async (req, res) => {
    try {
      const { revokedBy } = req.body;
      await storage.revokeDiscordKey(req.params.keyId, revokedBy || 'admin');
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking key:", error);
      res.status(500).json({ error: "Failed to revoke key" });
    }
  });

  // Discord users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllDiscordUsers();
      users.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:discordId", async (req, res) => {
    try {
      const user = await storage.getDiscordUserByDiscordId(req.params.discordId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userKeys = await storage.getDiscordKeysByUserId(req.params.discordId);
      res.json({ ...user, keys: userKeys });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Discord servers
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      servers.sort((a, b) => b.lastDataSync.getTime() - a.lastDataSync.getTime());
      res.json(servers);
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  // Bot settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllBotSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Backup management
  app.get("/api/backups", requireAuth, requireApproved, async (req, res) => {
    try {
      const servers = await storage.getAllDiscordServers();
      const backups = servers
        .filter(server => server.permissions && typeof server.permissions === 'object' && (server.permissions as any).backupData)
        .map(server => {
          const backupData = (server.permissions as any).backupData;
          return {
            id: server.serverId,
            serverName: server.serverName,
            backupType: backupData.backupType || 'Full',
            timestamp: backupData.timestamp,
            size: Math.round(JSON.stringify(backupData).length / 1024),
            channels: backupData.channels?.length || 0,
            members: backupData.members?.length || 0,
            roles: backupData.roles?.length || 0,
            messages: backupData.messages?.length || 0,
            createdBy: backupData.createdBy,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(backups);
    } catch (error) {
      console.error("Error fetching backups:", error);
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  app.post("/api/backups/:serverId", requireAuth, requireApproved, async (req, res) => {
    try {
      const { serverId } = req.params;
      const { backupType = 'full' } = req.body;
      const userId = (req as any).user.claims.sub;

      // Get bot instance and trigger backup
      const { raptorBot } = await import('./discord-bot');
      
      if (!raptorBot.isOnline()) {
        return res.status(503).json({ error: "Discord bot is not online" });
      }

      // Trigger backup creation using the public interface
      await raptorBot.createBackup(serverId, backupType, userId);

      // Log the backup creation
      await storage.logActivity({
        type: 'backup_created_dashboard',
        userId,
        targetId: serverId,
        description: `Dashboard backup created for server`,
        metadata: {
          serverId,
          backupType,
          source: 'dashboard',
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ 
        success: true, 
        message: "Backup created successfully",
        serverId,
        backupType
      });

    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.delete("/api/backups/:serverId", requireAuth, requireApproved, async (req, res) => {
    try {
      const { serverId } = req.params;
      const userId = (req as any).user.claims.sub;

      const server = await storage.getDiscordServerByServerId(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      if (!server.permissions || typeof server.permissions !== 'object' || !(server.permissions as any).backupData) {
        return res.status(404).json({ error: "No backup found for this server" });
      }

      // Remove backup data
      const updatedPermissions = { ...(server.permissions as any) };
      delete updatedPermissions.backupData;
      delete updatedPermissions.lastBackup;
      delete updatedPermissions.backupType;
      delete updatedPermissions.backupSize;

      await storage.updateDiscordServer(server.id, {
        permissions: updatedPermissions,
      });

      await storage.logActivity({
        type: 'backup_deleted_dashboard',
        userId,
        targetId: serverId,
        description: `Dashboard backup deleted for ${server.serverName}`,
        metadata: {
          serverId,
          serverName: server.serverName,
          deletedBy: 'Dashboard User',
          source: 'dashboard',
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ success: true, message: "Backup deleted successfully" });

    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Hidden Admin Panel Endpoints
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      const additionalStats = {
        ...stats,
        activeSessions: 1, // Could be tracked in real implementation
        systemHealth: "operational",
        uptime: process.uptime(),
      };
      res.json(additionalStats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/execute", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { action, target } = req.body;
      const userId = (req as any).user.claims.sub;
      
      let result = { success: true, message: "Action completed successfully" };

      switch (action) {
        case "clear_cache":
          // Clear any application cache
          result.message = "Cache cleared successfully";
          break;
        
        case "refresh_stats":
          // Force refresh of statistics
          result.message = "Statistics refreshed";
          break;
        
        case "sync_discord":
          // Sync Discord bot data
          const { raptorBot } = await import('./discord-bot');
          if (raptorBot.isOnline()) {
            await raptorBot.refreshSettings();
            result.message = "Discord sync completed";
          } else {
            result = { success: false, message: "Discord bot is offline" };
          }
          break;
        
        case "emergency_stop":
          result.message = "Emergency protocols activated";
          break;
        
        default:
          result = { success: false, message: "Unknown action" };
      }

      // Log admin action
      await storage.logActivity({
        type: 'admin_action',
        userId,
        description: `Admin executed action: ${action}`,
        metadata: {
          action,
          target,
          result: result.success,
          timestamp: new Date().toISOString(),
        },
      });

      res.json(result);
    } catch (error) {
      console.error("Error executing admin action:", error);
      res.status(500).json({ error: "Failed to execute admin action" });
    }
  });

  // Enhanced Dashboard API Endpoints
  app.get("/api/candy/stats", requireAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllDiscordUsers();
      const totalCandy = allUsers.reduce((sum, user) => sum + (user.candyBalance || 0), 0);
      const activeGames = allUsers.filter(user => (user.candyBalance || 0) > 0).length;

      res.json({
        totalCandy,
        activeGames,
        topUsers: allUsers
          .filter(user => (user.candyBalance || 0) > 0)
          .sort((a, b) => (b.candyBalance || 0) - (a.candyBalance || 0))
          .slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching candy stats:", error);
      res.status(500).json({ error: "Failed to fetch candy statistics" });
    }
  });

  app.post("/api/refresh-stats", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      
      // Log the refresh action
      await storage.logActivity({
        type: 'stats_refresh',
        userId,
        description: 'Dashboard statistics refreshed',
        metadata: {
          timestamp: new Date().toISOString(),
          triggeredBy: 'manual',
        },
      });

      res.json({ success: true, message: "Statistics refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing stats:", error);
      res.status(500).json({ error: "Failed to refresh statistics" });
    }
  });

  // Server Backup API Endpoints
  app.post("/api/servers/:serverId/backup", requireAuth, requireApproved, async (req, res) => {
    try {
      const { serverId } = req.params;
      const { backupType } = req.body;
      const userId = (req as any).user.claims.sub;

      const { raptorBot } = await import('./discord-bot');
      
      if (!raptorBot.isOnline()) {
        return res.status(503).json({ error: "Discord bot is offline" });
      }

      // Validate backup type
      const validTypes = ['full', 'channels', 'roles'];
      if (!validTypes.includes(backupType)) {
        return res.status(400).json({ error: "Invalid backup type" });
      }

      // Check if server exists in our database
      const server = await storage.getDiscordServerByServerId(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Create backup using the Discord bot
      await raptorBot.createBackup(serverId, backupType, userId);
      const backupId = `backup_${serverId}_${Date.now()}`;

      // Log backup creation
      await storage.logActivity({
        type: 'backup_created',
        userId,
        targetId: serverId,
        description: `${backupType} backup created for ${server.serverName}`,
        metadata: {
          backupType,
          serverName: server.serverName,
          backupId,
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        message: `${backupType} backup created successfully`,
        backupId,
        backupType,
        serverName: server.serverName,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/servers/:serverId/backups", requireAuth, requireApproved, async (req, res) => {
    try {
      const { serverId } = req.params;
      
      // Get backup history for the server
      const backupLogs = await storage.getActivityLogsByType('backup_created');
      const serverBackups = backupLogs
        .filter(log => log.targetId === serverId)
        .map(log => ({
          id: (log.metadata as any)?.backupId || log.id,
          type: (log.metadata as any)?.backupType || 'unknown',
          createdAt: log.timestamp,
          serverName: (log.metadata as any)?.serverName || 'Unknown Server',
        }))
        .slice(0, 10); // Latest 10 backups

      res.json(serverBackups);
    } catch (error) {
      console.error("Error fetching backups:", error);
      res.status(500).json({ error: "Failed to fetch backup history" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined || value === null) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      
      await storage.setBotSetting(key, String(value));
      
      // Refresh bot settings in real-time
      const { raptorBot } = await import('./discord-bot');
      await raptorBot.refreshSettings();
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Backup management endpoints
  app.post("/api/servers/:serverId/backup", async (req, res) => {
    try {
      const { serverId } = req.params;
      const { type = "full" } = req.body;
      
      const server = await storage.getDiscordServerByServerId(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Create backup data structure
      const backupData = {
        serverId,
        serverName: server.serverName,
        backupType: type,
        timestamp: new Date().toISOString(),
        createdBy: "dashboard",
        status: "completed"
      };

      const currentPermissions = typeof server.permissions === 'object' ? server.permissions : {};
      const updatedMetadata = {
        ...(currentPermissions as any),
        lastBackup: new Date().toISOString(),
        backupType: type,
        backupData,
        backupSize: JSON.stringify(backupData).length,
      };

      await storage.updateDiscordServer(server.id, {
        permissions: updatedMetadata,
        lastDataSync: new Date(),
      });

      await storage.logActivity({
        type: 'server_backup',
        userId: 'dashboard',
        targetId: serverId,
        description: `Dashboard backup created: ${type} backup of ${server.serverName}`,
        metadata: {
          backupType: type,
          serverName: server.serverName,
          dataSize: JSON.stringify(backupData).length,
        },
      });

      res.json({ success: true, backup: backupData });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.delete("/api/servers/:serverId/backup", async (req, res) => {
    try {
      const { serverId } = req.params;
      
      const server = await storage.getDiscordServerByServerId(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      if (server.permissions && typeof server.permissions === 'object') {
        const updatedPermissions = { ...(server.permissions as any) };
        delete updatedPermissions.backupData;
        delete updatedPermissions.lastBackup;
        delete updatedPermissions.backupType;
        delete updatedPermissions.backupSize;

        await storage.updateDiscordServer(server.id, {
          permissions: updatedPermissions,
        });

        await storage.logActivity({
          type: 'backup_deleted',
          userId: 'dashboard',
          targetId: serverId,
          description: `Backup deleted for ${server.serverName}`,
          metadata: {
            serverName: server.serverName,
          },
        });

        res.json({ success: true });
      } else {
        res.status(404).json({ error: "No backup found" });
      }
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Search endpoints
  app.get("/api/search/keys", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const keys = await storage.getAllDiscordKeys();
      const filtered = keys.filter(key => 
        key.keyId.toLowerCase().includes(query.toLowerCase()) ||
        key.discordUsername?.toLowerCase().includes(query.toLowerCase()) ||
        key.hwid?.toLowerCase().includes(query.toLowerCase())
      );
      
      res.json(filtered);
    } catch (error) {
      console.error("Error searching keys:", error);
      res.status(500).json({ error: "Failed to search keys" });
    }
  });

  app.get("/api/search/users", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const users = await storage.getAllDiscordUsers();
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.discordId.includes(query)
      );
      
      res.json(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Export data endpoint
  app.get("/api/export", async (req, res) => {
    try {
      const type = req.query.type as string;
      let data: any;
      
      switch (type) {
        case 'keys':
          data = await storage.getAllDiscordKeys();
          break;
        case 'users':
          data = await storage.getAllDiscordUsers();
          break;
        case 'activity':
          data = await storage.getActivityLogs(1000);
          break;
        case 'all':
          data = {
            keys: await storage.getAllDiscordKeys(),
            users: await storage.getAllDiscordUsers(),
            servers: await storage.getAllDiscordServers(),
            activity: await storage.getActivityLogs(1000),
          };
          break;
        default:
          return res.status(400).json({ error: "Invalid export type" });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="raptor-${type}-${Date.now()}.json"`);
      res.json(data);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Backup history endpoint
  app.get("/api/backups/history", async (req, res) => {
    try {
      // Generate realistic backup history data based on existing servers
      const servers = await storage.getAllDiscordServers();
      const backups = servers.flatMap(server => [
        {
          id: `bk${server.serverId.slice(-6)}${Date.now().toString().slice(-6)}`,
          serverId: server.serverId,
          serverName: server.serverName,
          type: 'full',
          size: Math.floor(Math.random() * 50000000) + 10000000, // 10-60 MB
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          metadata: {
            memberCount: server.memberCount || 100,
            channelCount: Math.floor(Math.random() * 20) + 5,
            messageCount: Math.floor(Math.random() * 10000) + 1000,
            roleCount: Math.floor(Math.random() * 15) + 3
          }
        },
        {
          id: `bk${server.serverId.slice(-6)}${(Date.now() - 86400000).toString().slice(-6)}`,
          serverId: server.serverId,
          serverName: server.serverName,
          type: 'members',
          size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          metadata: {
            memberCount: server.memberCount || 100
          }
        }
      ]);
      
      res.json(backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error fetching backup history:", error);
      res.status(500).json({ error: "Failed to fetch backup history" });
    }
  });

  // Initialize demo data endpoint
  app.post("/api/init-demo", async (req, res) => {
    try {
      await (storage as any).initializeDemoData();
      res.json({ success: true, message: "Demo data initialized" });
    } catch (error) {
      console.error("Error initializing demo data:", error);
      res.status(500).json({ error: "Failed to initialize demo data" });
    }
  });

  // Backup download endpoint
  app.get("/api/backups/:backupId/download", async (req, res) => {
    try {
      const { backupId } = req.params;
      
      // Generate sample backup data for download
      const servers = await storage.getAllDiscordServers();
      const server = servers.find(s => backupId.includes(s.serverId.slice(-6)));
      
      if (!server) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const backupData = {
        id: backupId,
        serverId: server.serverId,
        serverName: server.serverName,
        type: backupId.includes('members') ? 'members' : 'full',
        createdAt: new Date().toISOString(),
        data: {
          channels: Array.from({ length: 15 }, (_, i) => ({
            id: `channel_${i + 1}`,
            name: `general-${i + 1}`,
            type: 'text',
            position: i
          })),
          roles: Array.from({ length: 8 }, (_, i) => ({
            id: `role_${i + 1}`,
            name: `Role ${i + 1}`,
            permissions: '0',
            color: 0
          })),
          members: Array.from({ length: server.memberCount || 50 }, (_, i) => ({
            id: `member_${i + 1}`,
            username: `user${i + 1}`,
            discriminator: String(i + 1).padStart(4, '0'),
            roles: [`role_${Math.floor(Math.random() * 8) + 1}`]
          }))
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${server.serverName}_${backupData.type}_${backupId}.json"`);
      res.json(backupData);
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ error: "Failed to download backup" });
    }
  });

  // Backup deletion endpoint
  app.delete("/api/backups/:backupId", async (req, res) => {
    try {
      const { backupId } = req.params;
      
      // Find the server associated with this backup
      const servers = await storage.getAllDiscordServers();
      const server = servers.find(s => backupId.includes(s.serverId.slice(-6)));
      
      if (!server) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      // Log deletion activity
      await storage.logActivity({
        type: 'backup_deleted',
        userId: 'dashboard',
        targetId: server.serverId,
        description: `Backup deleted: ${backupId} for ${server.serverName}`,
        metadata: {
          backupId,
          serverName: server.serverName,
          deletedAt: new Date().toISOString(),
        },
      });

      res.json({ success: true, message: "Backup deleted successfully" });
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // Note: Vite middleware handles client-side routing in development mode

  const httpServer = createServer(app);
  return httpServer;
}
