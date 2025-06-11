import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { storage } from './storage';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;
const REQUIRED_ROLE = process.env.REQUIRED_ROLE || 'Raptor Admin';
const KEY_SYSTEM_ROLE = process.env.KEY_SYSTEM_ROLE || 'Key System';

export class RaptorBot {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
      ],
    });

    this.setupEventHandlers();
    this.registerCommands();
  }

  private setupEventHandlers() {
    this.client.once('ready', async () => {
      console.log(`✅ Raptor bot is ready! Logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      
      // Sync server data
      await this.syncServerData();
      
      // Set bot status
      this.client.user?.setActivity('Managing Keys | /help', { type: 0 });
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleCommand(interaction);
    });

    this.client.on('guildCreate', async (guild) => {
      console.log(`📥 Joined new server: ${guild.name}`);
      await this.addServer(guild);
    });

    this.client.on('guildDelete', async (guild) => {
      console.log(`📤 Left server: ${guild.name}`);
      await storage.updateServerStatus(guild.id, false);
    });

    this.client.on('error', (error) => {
      console.error('❌ Discord client error:', error);
    });
  }

  private async registerCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Generate and whitelist a new key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to assign the key to')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('hwid')
            .setDescription('Hardware ID to bind the key to')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('dewhitelist')
        .setDescription('Dewhitelist and revoke a key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Key ID to revoke')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get user information')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to get information about')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('hwidinfo')
        .setDescription('Get HWID information')
        .addStringOption(option =>
          option.setName('hwid')
            .setDescription('Hardware ID to get information about')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link a key to a user')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Key ID to link')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to link the key to')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands and usage'),
    ];

    const rest = new REST().setToken(DISCORD_TOKEN!);

    try {
      console.log('🔄 Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(CLIENT_ID!),
        { body: commands },
      );

      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const { commandName, user, member, guild } = interaction;

    try {
      // Check permissions
      if (!this.hasRequiredPermissions(interaction)) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
        return;
      }

      // Rate limiting check
      if (await this.isRateLimited(user.id)) {
        await interaction.reply({
          content: '⏰ You are being rate limited. Please wait before using commands again.',
          ephemeral: true,
        });
        return;
      }

      // Store user data
      await this.storeUserData(user, member, guild);

      switch (commandName) {
        case 'whitelist':
          await this.handleWhitelist(interaction);
          break;
        case 'dewhitelist':
          await this.handleDewhitelist(interaction);
          break;
        case 'userinfo':
          await this.handleUserInfo(interaction);
          break;
        case 'hwidinfo':
          await this.handleHwidInfo(interaction);
          break;
        case 'link':
          await this.handleLink(interaction);
          break;
        case 'help':
          await this.handleHelp(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown command.',
            ephemeral: true,
          });
      }

      // Log activity
      await storage.logActivity({
        type: commandName as any,
        userId: user.id,
        description: `${user.username} used command: /${commandName}`,
        metadata: { 
          command: commandName,
          guild: guild?.name,
          timestamp: new Date().toISOString()
        },
      });

    } catch (error) {
      console.error(`❌ Error handling command ${commandName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      if (!interaction.replied) {
        await interaction.reply({
          content: `❌ An error occurred: ${errorMessage}`,
          ephemeral: true,
        });
      }
    }
  }

  private hasRequiredPermissions(interaction: ChatInputCommandInteraction): boolean {
    const member = interaction.member;
    if (!member || !('roles' in member)) return false;

    const memberRoles = member.roles;
    if (!memberRoles) return false;

    // Check if user has required role
    const hasRequiredRole = Array.isArray(memberRoles) 
      ? memberRoles.some(role => role === REQUIRED_ROLE)
      : memberRoles.cache?.some(role => role.name === REQUIRED_ROLE);

    // For key system commands, check for special role
    const keySystemCommands = ['whitelist', 'dewhitelist'];
    if (keySystemCommands.includes(interaction.commandName)) {
      const hasKeySystemRole = Array.isArray(memberRoles)
        ? memberRoles.some(role => role === KEY_SYSTEM_ROLE)
        : memberRoles.cache?.some(role => role.name === KEY_SYSTEM_ROLE);
      
      return hasKeySystemRole || hasRequiredRole;
    }

    return hasRequiredRole;
  }

  private async isRateLimited(userId: string): Promise<boolean> {
    // Simple rate limiting - 5 commands per minute
    const key = `ratelimit:${userId}`;
    const count = await storage.getRateLimit(key);
    
    if (count >= 5) {
      return true;
    }
    
    await storage.setRateLimit(key, count + 1, 60); // 60 seconds TTL
    return false;
  }

  private async storeUserData(user: any, member: any, guild: any) {
    const userData = {
      discordId: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatarUrl: user.displayAvatarURL(),
      roles: member?.roles?.cache?.map((role: any) => role.name) || [],
      metadata: {
        guild: guild?.name,
        guildId: guild?.id,
      },
    };

    await storage.upsertDiscordUser(userData);
  }

  private async handleWhitelist(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user');
    const hwid = interaction.options.getString('hwid');

    // Generate unique key
    const keyId = this.generateKeyId();

    const keyData = {
      keyId,
      userId: targetUser?.id || interaction.user.id,
      discordUsername: targetUser?.username || interaction.user.username,
      hwid: hwid || null,
      status: 'active' as const,
    };

    await storage.createDiscordKey(keyData);

    const embed = {
      title: '✅ Key Generated Successfully',
      description: `A new key has been generated and whitelisted.`,
      fields: [
        { name: 'Key ID', value: `\`${keyId}\``, inline: true },
        { name: 'User', value: targetUser?.toString() || interaction.user.toString(), inline: true },
        { name: 'HWID', value: hwid || 'Not specified', inline: true },
      ],
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleDewhitelist(interaction: ChatInputCommandInteraction) {
    const keyId = interaction.options.getString('key', true);

    const key = await storage.getDiscordKeyByKeyId(keyId);
    if (!key) {
      await interaction.reply({
        content: '❌ Key not found.',
        ephemeral: true,
      });
      return;
    }

    if (key.status === 'revoked') {
      await interaction.reply({
        content: '❌ Key is already revoked.',
        ephemeral: true,
      });
      return;
    }

    await storage.revokeDiscordKey(keyId, interaction.user.id);

    const embed = {
      title: '✅ Key Revoked Successfully',
      description: `Key has been dewhitelisted and revoked.`,
      fields: [
        { name: 'Key ID', value: `\`${keyId}\``, inline: true },
        { name: 'Revoked by', value: interaction.user.toString(), inline: true },
      ],
      color: 0xED4245,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleUserInfo(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    
    const userData = await storage.getDiscordUserByDiscordId(targetUser.id);
    const userKeys = await storage.getDiscordKeysByUserId(targetUser.id);

    const embed = {
      title: '👤 User Information',
      description: `Information for ${targetUser.username}`,
      fields: [
        { name: 'Discord ID', value: targetUser.id, inline: true },
        { name: 'Username', value: targetUser.username, inline: true },
        { name: 'Account Created', value: targetUser.createdAt?.toDateString() || 'Unknown', inline: true },
        { name: 'Keys Generated', value: userKeys.length.toString(), inline: true },
        { name: 'Active Keys', value: userKeys.filter(k => k.status === 'active').length.toString(), inline: true },
        { name: 'Last Seen', value: userData?.lastSeen?.toDateString() || 'Never', inline: true },
      ],
      thumbnail: { url: targetUser.displayAvatarURL() },
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleHwidInfo(interaction: ChatInputCommandInteraction) {
    const hwid = interaction.options.getString('hwid', true);
    
    const keys = await storage.getDiscordKeysByHwid(hwid);

    if (keys.length === 0) {
      await interaction.reply({
        content: '❌ No keys found for this HWID.',
        ephemeral: true,
      });
      return;
    }

    const embed = {
      title: '🖥️ HWID Information',
      description: `Information for HWID: \`${hwid}\``,
      fields: [
        { name: 'Total Keys', value: keys.length.toString(), inline: true },
        { name: 'Active Keys', value: keys.filter(k => k.status === 'active').length.toString(), inline: true },
        { name: 'Revoked Keys', value: keys.filter(k => k.status === 'revoked').length.toString(), inline: true },
      ],
      color: 0x7289DA,
      timestamp: new Date().toISOString(),
    };

    // Add key details
    keys.slice(0, 5).forEach((key, index) => {
      embed.fields.push({
        name: `Key ${index + 1}`,
        value: `ID: \`${key.keyId}\`\nStatus: ${key.status}\nUser: ${key.discordUsername || 'Unknown'}`,
        inline: true,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleLink(interaction: ChatInputCommandInteraction) {
    const keyId = interaction.options.getString('key', true);
    const targetUser = interaction.options.getUser('user', true);

    const key = await storage.getDiscordKeyByKeyId(keyId);
    if (!key) {
      await interaction.reply({
        content: '❌ Key not found.',
        ephemeral: true,
      });
      return;
    }

    await storage.linkKeyToUser(keyId, targetUser.id, targetUser.username);

    const embed = {
      title: '🔗 Key Linked Successfully',
      description: `Key has been linked to user.`,
      fields: [
        { name: 'Key ID', value: `\`${keyId}\``, inline: true },
        { name: 'Linked to', value: targetUser.toString(), inline: true },
        { name: 'Linked by', value: interaction.user.toString(), inline: true },
      ],
      color: 0x00D4AA,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleHelp(interaction: ChatInputCommandInteraction) {
    const embed = {
      title: '🤖 Raptor Bot - Help',
      description: 'An AI that helps generate keys making everything clean and easier for all.',
      fields: [
        {
          name: '🔑 Key Management',
          value: [
            '`/whitelist [user] [hwid]` - Generate and whitelist a new key',
            '`/dewhitelist <key>` - Revoke a whitelisted key',
            '`/link <key> <user>` - Link a key to a user',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📊 Information',
          value: [
            '`/userinfo <user>` - Get detailed user information',
            '`/hwidinfo <hwid>` - Get hardware ID information',
            '`/help` - Show this help message',
          ].join('\n'),
          inline: false,
        },
        {
          name: '⚠️ Permissions',
          value: `Commands require the "${REQUIRED_ROLE}" role.\nKey management commands require the "${KEY_SYSTEM_ROLE}" role.`,
          inline: false,
        },
      ],
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private generateKeyId(): string {
    const prefix = 'RAP_';
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
  }

  private async syncServerData() {
    const guilds = Array.from(this.client.guilds.cache.values());
    for (const guild of guilds) {
      await this.addServer(guild);
    }
  }

  private async addServer(guild: any) {
    const serverData = {
      serverId: guild.id,
      serverName: guild.name,
      memberCount: guild.memberCount || 0,
      permissions: {},
      isActive: true,
    };

    await storage.upsertDiscordServer(serverData);
  }

  public async start() {
    if (!DISCORD_TOKEN) {
      throw new Error('Discord token is required. Set DISCORD_TOKEN environment variable.');
    }

    if (!CLIENT_ID) {
      throw new Error('Discord client ID is required. Set DISCORD_CLIENT_ID environment variable.');
    }

    await this.client.login(DISCORD_TOKEN);
  }

  public isOnline(): boolean {
    return this.isReady;
  }

  public getStats() {
    return {
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      uptime: this.client.uptime,
      status: this.isReady ? 'online' : 'offline',
    };
  }
}

// Export singleton instance
export const raptorBot = new RaptorBot();
