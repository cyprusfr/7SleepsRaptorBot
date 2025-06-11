import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { raptorBot } from "./discord-bot";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      if (!key || !value) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      
      await storage.setBotSetting(key, value);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
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

  const httpServer = createServer(app);
  return httpServer;
}
