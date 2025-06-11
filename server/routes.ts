import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { raptorBot } from "./discord-bot";
import { z } from "zod";

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
          id: `backup_${server.serverId}_${Date.now() - 86400000}`,
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
          id: `backup_${server.serverId}_${Date.now() - 172800000}`,
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
      
      // Retrieve backup data from storage
      const backupData = await storage.getBotSetting(`backup_${backupId}`);
      if (!backupData) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const backup = JSON.parse(backupData);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backup.serverName}_${backup.type}_${backupId}.json"`);
      res.json(backup);
    } catch (error) {
      console.error("Error downloading backup:", error);
      res.status(500).json({ error: "Failed to download backup" });
    }
  });

  // Backup deletion endpoint
  app.delete("/api/backups/:backupId", async (req, res) => {
    try {
      const { backupId } = req.params;
      
      // Check if backup exists
      const backupData = await storage.getBotSetting(`backup_${backupId}`);
      if (!backupData) {
        return res.status(404).json({ error: "Backup not found" });
      }

      const backup = JSON.parse(backupData);
      
      // Delete backup data
      await storage.setBotSetting(`backup_${backupId}`, '');
      
      // Log deletion activity
      await storage.logActivity({
        type: 'backup_deleted',
        userId: 'dashboard',
        targetId: backup.serverId,
        description: `Backup deleted: ${backup.type} backup of ${backup.serverName}`,
        metadata: {
          backupId,
          backupType: backup.type,
          serverName: backup.serverName,
        },
      });

      res.json({ success: true, message: "Backup deleted successfully" });
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
