import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { storage } from './storage';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;

export class RaptorBot {
  private client: Client;
  private isReady = false;
  private settings: Map<string, string> = new Map();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
      ],
    });

    this.setupEventHandlers();
    this.registerCommands();
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const allSettings = await storage.getAllBotSettings();
      for (const setting of allSettings) {
        this.settings.set(setting.key, setting.value);
      }
      
      // Set default settings if they don't exist
      const defaultSettings = [
        { key: 'required_role', value: 'Raptor Admin' },
        { key: 'key_system_role', value: 'Key System' },
        { key: 'rate_limit_enabled', value: 'true' },
        { key: 'backup_retention_days', value: '30' },
        { key: 'authorized_user_id', value: '1131426483404026019' }
      ];

      for (const defaultSetting of defaultSettings) {
        if (!this.settings.has(defaultSetting.key)) {
          await storage.setBotSetting(defaultSetting.key, defaultSetting.value);
          this.settings.set(defaultSetting.key, defaultSetting.value);
        }
      }
    } catch (error) {
      console.error('Error loading bot settings:', error);
    }
  }

  public async refreshSettings() {
    await this.loadSettings();
  }

  private getSetting(key: string, defaultValue: string = ''): string {
    return this.settings.get(key) || defaultValue;
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
        .setName('backup')
        .setDescription('Backup server data and members')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of backup to create')
            .setRequired(false)
            .addChoices(
              { name: 'Full Backup', value: 'full' },
              { name: 'Members Only', value: 'members' },
              { name: 'Channels Only', value: 'channels' },
              { name: 'Roles Only', value: 'roles' },
              { name: 'Messages Only', value: 'messages' }
            )
        ),

      new SlashCommandBuilder()
        .setName('restore')
        .setDescription('Restore server data from backup')
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('ID of the backup to restore')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('What to restore from backup')
            .setRequired(false)
            .addChoices(
              { name: 'Everything', value: 'full' },
              { name: 'Channels Only', value: 'channels' },
              { name: 'Roles Only', value: 'roles' }
            )
        ),

      new SlashCommandBuilder()
        .setName('backups')
        .setDescription('List available backups')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(false)
            .addChoices(
              { name: 'List Backups', value: 'list' },
              { name: 'Delete Backup', value: 'delete' }
            )
        )
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('Backup ID for delete action')
            .setRequired(false)
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
          flags: [4096],
        });
        return;
      }

      // Rate limiting check
      if (await this.isRateLimited(user.id)) {
        await interaction.reply({
          content: '⏰ You are being rate limited. Please wait before using commands again.',
          flags: [4096],
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
        case 'backup':
          await this.handleBackup(interaction);
          break;
        case 'restore':
          await this.handleRestore(interaction);
          break;
        case 'backups':
          await this.handleBackups(interaction);
          break;
        case 'help':
          await this.handleHelp(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown command.',
            flags: [4096],
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
          flags: [4096],
        });
      }
    }
  }

  private hasRequiredPermissions(interaction: ChatInputCommandInteraction): boolean {
    const userId = interaction.user.id;
    
    // Check if user is in authorized list (bypass role requirements)
    const authorizedUserId = this.getSetting('authorized_user_id', '1131426483404026019');
    if (userId === authorizedUserId) {
      return true;
    }

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

    await interaction.reply({ embeds: [embed], flags: [4096] });
  }

  private async handleDewhitelist(interaction: ChatInputCommandInteraction) {
    const keyId = interaction.options.getString('key', true);

    const key = await storage.getDiscordKeyByKeyId(keyId);
    if (!key) {
      await interaction.reply({
        content: '❌ Key not found.',
        flags: [4096],
      });
      return;
    }

    if (key.status === 'revoked') {
      await interaction.reply({
        content: '❌ Key is already revoked.',
        flags: [4096],
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

    await interaction.reply({ embeds: [embed], flags: [4096] });
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

    await interaction.reply({ embeds: [embed], flags: [4096] });
  }

  private async handleHwidInfo(interaction: ChatInputCommandInteraction) {
    const hwid = interaction.options.getString('hwid', true);
    
    const keys = await storage.getDiscordKeysByHwid(hwid);

    if (keys.length === 0) {
      await interaction.reply({
        content: '❌ No keys found for this HWID.',
        flags: [4096],
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

    await interaction.reply({ embeds: [embed], flags: [4096] });
  }

  private async handleLink(interaction: ChatInputCommandInteraction) {
    const keyId = interaction.options.getString('key', true);
    const targetUser = interaction.options.getUser('user', true);

    const key = await storage.getDiscordKeyByKeyId(keyId);
    if (!key) {
      await interaction.reply({
        content: '❌ Key not found.',
        flags: [4096],
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

    await interaction.reply({ embeds: [embed], flags: [4096] });
  }

  private async handleBackup(interaction: ChatInputCommandInteraction) {
    const backupType = interaction.options.getString('type') || 'full';
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [4096], // EPHEMERAL flag
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Initial progress message
    const progressEmbed = {
      title: '🔄 Creating Server Backup',
      description: `Starting ${backupType} backup of ${guild.name}...`,
      fields: [
        { name: 'Progress', value: '▓░░░░░░░░░ 10%', inline: false },
        { name: 'Status', value: 'Initializing backup...', inline: false }
      ],
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    };

    await interaction.editReply({ embeds: [progressEmbed] });

    try {
      let backupData: any = {
        serverId: guild.id,
        serverName: guild.name,
        backupType,
        timestamp: new Date().toISOString(),
        createdBy: interaction.user.id,
      };

      // Update progress - Server info collection
      progressEmbed.fields[0].value = '▓▓░░░░░░░░ 20%';
      progressEmbed.fields[1].value = 'Collecting server information...';
      await interaction.editReply({ embeds: [progressEmbed] });

      // Collect server information
      const serverInfo = {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt.toISOString(),
        iconURL: guild.iconURL(),
        bannerURL: guild.bannerURL(),
        features: guild.features,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        mfaLevel: guild.mfaLevel,
        nsfwLevel: guild.nsfwLevel,
      };

      if (backupType === 'full' || backupType === 'channels') {
        // Update progress - Channels
        progressEmbed.fields[0].value = '▓▓▓░░░░░░░ 30%';
        progressEmbed.fields[1].value = 'Backing up channels...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Backup channels
        const channels = await guild.channels.fetch();
        backupData.channels = Array.from(channels.values()).map(channel => ({
          id: channel?.id,
          name: channel?.name,
          type: channel?.type,
          position: channel?.position,
          parentId: channel?.parentId,
          topic: channel?.isTextBased() ? (channel as any).topic : null,
          nsfw: channel?.isTextBased() ? (channel as any).nsfw : false,
          rateLimitPerUser: channel?.isTextBased() ? (channel as any).rateLimitPerUser : null,
          bitrate: channel?.isVoiceBased() ? (channel as any).bitrate : null,
          userLimit: channel?.isVoiceBased() ? (channel as any).userLimit : null,
          createdAt: channel?.createdAt?.toISOString(),
        }));
      }

      if (backupType === 'full' || backupType === 'roles') {
        // Update progress - Roles
        progressEmbed.fields[0].value = '▓▓▓▓▓░░░░░ 50%';
        progressEmbed.fields[1].value = 'Backing up roles...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Backup roles
        const roles = await guild.roles.fetch();
        backupData.roles = Array.from(roles.values()).map(role => ({
          id: role.id,
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          managed: role.managed,
          mentionable: role.mentionable,
          createdAt: role.createdAt.toISOString(),
        }));
      }

      if (backupType === 'full' || backupType === 'members') {
        // Update progress - Members
        progressEmbed.fields[0].value = '▓▓▓▓▓▓▓░░░ 70%';
        progressEmbed.fields[1].value = 'Backing up members (this may take longer)...';
        await interaction.editReply({ embeds: [progressEmbed] });

        try {
          // Backup members with timeout handling and rate limiting
          const members = await guild.members.fetch({ 
            limit: 200, // Further reduced to avoid rate limits
            time: 20000 // 20 second timeout
          });
          
          backupData.members = [];
          const memberArray = Array.from(members.values());
          
          // Process members with rate limiting (10 per second)
          for (let i = 0; i < memberArray.length; i++) {
            const member = memberArray[i];
            
            if (i > 0 && i % 10 === 0) {
              // Wait 1 second every 10 members to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            backupData.members.push({
              userId: member.user.id,
              username: member.user.username,
              discriminator: member.user.discriminator,
              globalName: member.user.globalName,
              displayName: member.displayName,
              nickname: member.nickname,
              avatarUrl: member.user.displayAvatarURL({ size: 512 }),
              bannerUrl: member.user.bannerURL({ size: 1024 }),
              accentColor: member.user.accentColor,
              joinedAt: member.joinedAt?.toISOString(),
              premiumSince: member.premiumSince?.toISOString(),
              roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position
              })),
              permissions: member.permissions.toArray(),
              bot: member.user.bot,
              system: member.user.system,
              flags: member.user.flags?.toArray(),
              createdAt: member.user.createdAt.toISOString(),
              status: member.presence?.status,
              activities: member.presence?.activities?.map(activity => ({
                name: activity.name,
                type: activity.type,
                url: activity.url,
                state: activity.state,
                details: activity.details
              })),
              voice: {
                channelId: member.voice.channelId,
                muted: member.voice.mute,
                deafened: member.voice.deaf,
                streaming: member.voice.streaming
              }
            });
          }
        } catch (memberError) {
          console.warn('Member fetch timeout, using cached members:', memberError);
          // Fall back to cached members with enhanced data
          backupData.members = Array.from(guild.members.cache.values()).map(member => ({
            userId: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            globalName: member.user.globalName,
            displayName: member.displayName,
            nickname: member.nickname,
            avatarUrl: member.user.displayAvatarURL({ size: 512 }),
            bannerUrl: member.user.bannerURL({ size: 1024 }),
            accentColor: member.user.accentColor,
            joinedAt: member.joinedAt?.toISOString(),
            premiumSince: member.premiumSince?.toISOString(),
            roles: member.roles.cache.map(role => ({
              id: role.id,
              name: role.name,
              color: role.hexColor,
              position: role.position
            })),
            permissions: member.permissions.toArray(),
            bot: member.user.bot,
            system: member.user.system,
            flags: member.user.flags?.toArray(),
            createdAt: member.user.createdAt.toISOString(),
            status: member.presence?.status,
            activities: member.presence?.activities?.map(activity => ({
              name: activity.name,
              type: activity.type,
              url: activity.url,
              state: activity.state,
              details: activity.details
            })),
            voice: {
              channelId: member.voice.channelId,
              muted: member.voice.mute,
              deafened: member.voice.deaf,
              streaming: member.voice.streaming
            }
          }));
        }
      }

      if (backupType === 'full' || backupType === 'messages') {
        // Update progress - Messages
        progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓░░ 80%';
        progressEmbed.fields[1].value = 'Backing up messages...';
        await interaction.editReply({ embeds: [progressEmbed] });

        try {
          const channels = await guild.channels.fetch();
          const textChannels = Array.from(channels.values()).filter(channel => 
            channel?.isTextBased() && channel.type === 0 // Guild text channels
          );

          backupData.messages = [];
          
          // Process channels with rate limiting
          for (let i = 0; i < Math.min(textChannels.length, 5); i++) {
            const channel = textChannels[i];
            
            if (i > 0) {
              // Wait 2 seconds between channels to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            try {
              const messages = await (channel as any).messages.fetch({ limit: 30 });
              const channelMessages = Array.from(messages.values()).map((msg: any) => ({
                id: msg.id,
                channelId: msg.channelId,
                channelName: channel?.name,
                channelType: channel?.type,
                content: msg.content,
                cleanContent: msg.cleanContent,
                authorId: msg.author.id,
                authorUsername: msg.author.username,
                authorDisplayName: msg.author.displayName,
                authorAvatarUrl: msg.author.displayAvatarURL({ size: 256 }),
                authorBot: msg.author.bot,
                timestamp: msg.createdAt.toISOString(),
                editedTimestamp: msg.editedAt?.toISOString(),
                messageType: msg.type,
                system: msg.system,
                pinned: msg.pinned,
                tts: msg.tts,
                attachments: msg.attachments.map((att: any) => ({
                  id: att.id,
                  name: att.name,
                  url: att.url,
                  proxyUrl: att.proxyURL,
                  size: att.size,
                  width: att.width,
                  height: att.height,
                  contentType: att.contentType,
                  description: att.description
                })),
                embeds: msg.embeds.map((embed: any) => ({
                  title: embed.title,
                  description: embed.description,
                  url: embed.url,
                  color: embed.color,
                  timestamp: embed.timestamp,
                  footer: embed.footer,
                  image: embed.image,
                  thumbnail: embed.thumbnail,
                  author: embed.author,
                  fields: embed.fields
                })),
                reactions: Array.from(msg.reactions.cache.values()).map((reaction: any) => ({
                  emoji: {
                    id: reaction.emoji.id,
                    name: reaction.emoji.name,
                    animated: reaction.emoji.animated
                  },
                  count: reaction.count,
                  me: reaction.me
                })),
                mentions: {
                  users: msg.mentions.users.map((user: any) => ({
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.displayAvatarURL({ size: 256 })
                  })),
                  roles: msg.mentions.roles.map((role: any) => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor
                  })),
                  channels: msg.mentions.channels.map((ch: any) => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type
                  }))
                },
                stickers: msg.stickers.map((sticker: any) => ({
                  id: sticker.id,
                  name: sticker.name,
                  description: sticker.description,
                  url: sticker.url
                }))
              }));
              
              backupData.messages.push(...channelMessages);
            } catch (channelError) {
              console.warn(`Failed to backup messages from ${channel?.name}:`, channelError);
            }
          }
        } catch (messageError) {
          console.warn('Message backup failed, skipping:', messageError);
          backupData.messages = [];
        }
      }

      // Update progress - Processing data
      progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓▓░ 90%';
      progressEmbed.fields[1].value = 'Processing backup data...';
      await interaction.editReply({ embeds: [progressEmbed] });

      // Add server info to backup
      backupData.serverInfo = serverInfo;

      // Store backup in server data with metadata
      const serverData = await storage.getDiscordServerByServerId(guild.id);
      if (serverData) {
        const currentPermissions = typeof serverData.permissions === 'object' ? serverData.permissions : {};
        const updatedMetadata = {
          ...(currentPermissions as any),
          lastBackup: new Date().toISOString(),
          backupType,
          backupData,
          backupSize: JSON.stringify(backupData).length,
        };

        await storage.updateDiscordServer(serverData.id, {
          permissions: updatedMetadata,
          lastDataSync: new Date(),
        });
      }

      // Update progress - Finalizing
      progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓▓░ 90%';
      progressEmbed.fields[1].value = 'Finalizing backup...';
      await interaction.editReply({ embeds: [progressEmbed] });

      // Log the backup activity
      await storage.logActivity({
        type: 'server_backup',
        userId: interaction.user.id,
        targetId: guild.id,
        description: `Server backup created: ${backupType} backup of ${guild.name}`,
        metadata: {
          backupType,
          serverName: guild.name,
          dataSize: JSON.stringify(backupData).length,
          channelCount: backupData.channels?.length || 0,
          memberCount: backupData.members?.length || 0,
          roleCount: backupData.roles?.length || 0,
        },
      });

      // Final progress update - Complete
      progressEmbed.title = '✅ Server Backup Created';
      progressEmbed.description = `Successfully created ${backupType} backup of ${guild.name}`;
      progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓▓▓ 100%';
      progressEmbed.fields[1].value = 'Backup completed successfully!';
      progressEmbed.color = 0x00D4AA;

      // Add backup summary fields
      const summaryFields = [
        { name: 'Backup Type', value: backupType.charAt(0).toUpperCase() + backupType.slice(1), inline: true },
        { name: 'Data Size', value: `${Math.round(JSON.stringify(backupData).length / 1024)} KB`, inline: true },
        { name: 'Duration', value: `${Math.round((Date.now() - new Date(backupData.timestamp).getTime()) / 1000)}s`, inline: true },
      ];

      if (backupData.channels) {
        summaryFields.push({ name: 'Channels', value: backupData.channels.length.toString(), inline: true });
      }
      if (backupData.members) {
        summaryFields.push({ name: 'Members', value: backupData.members.length.toString(), inline: true });
      }
      if (backupData.roles) {
        summaryFields.push({ name: 'Roles', value: backupData.roles.length.toString(), inline: true });
      }
      if (backupData.messages) {
        summaryFields.push({ name: 'Messages', value: backupData.messages.length.toString(), inline: true });
      }

      progressEmbed.fields = [...progressEmbed.fields, ...summaryFields];

      await interaction.editReply({ embeds: [progressEmbed] });

    } catch (error) {
      console.error('Error creating backup:', error);
      await interaction.editReply({
        content: '❌ Failed to create backup. Please check bot permissions and try again.',
      });
    }
  }

  private async handleRestore(interaction: ChatInputCommandInteraction) {
    const backupId = interaction.options.getString('backup_id', true);
    const restoreType = interaction.options.getString('type') || 'full';
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [4096],
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const serverData = await storage.getDiscordServerByServerId(guild.id);
      if (!serverData?.permissions || typeof serverData.permissions !== 'object' || !(serverData.permissions as any).backupData) {
        await interaction.editReply({
          content: '❌ No backup found for this server.',
        });
        return;
      }

      const backupData = (serverData.permissions as any).backupData;

      const embed = {
        title: '⚠️ Restore Confirmation',
        description: `Are you sure you want to restore ${restoreType} from backup?\n\n**Warning:** This action cannot be undone and may overwrite existing server configuration.`,
        fields: [
          { name: 'Backup Type', value: backupData.backupType || 'Unknown', inline: true },
          { name: 'Backup Date', value: new Date(backupData.timestamp).toLocaleString(), inline: true },
          { name: 'Restore Type', value: restoreType.charAt(0).toUpperCase() + restoreType.slice(1), inline: true },
        ],
        color: 0xFF6B35,
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({
        content: '🚧 **Restore functionality is currently view-only for safety.**\n\nThis command would restore server data but is disabled to prevent accidental changes.',
        embeds: [embed],
      });

      await storage.logActivity({
        type: 'restore_attempt',
        userId: interaction.user.id,
        targetId: guild.id,
        description: `Restore attempt: ${restoreType} restore of ${guild.name}`,
        metadata: {
          backupId,
          restoreType,
          serverName: guild.name,
        },
      });

    } catch (error) {
      console.error('Error during restore:', error);
      await interaction.editReply({
        content: '❌ Failed to access backup data.',
      });
    }
  }

  private async handleBackups(interaction: ChatInputCommandInteraction) {
    const action = interaction.options.getString('action') || 'list';
    const backupId = interaction.options.getString('backup_id');
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [4096],
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const serverData = await storage.getDiscordServerByServerId(guild.id);

      if (action === 'list') {
        if (!serverData?.permissions || typeof serverData.permissions !== 'object' || !(serverData.permissions as any).backupData) {
          await interaction.editReply({
            content: '📂 No backups found for this server.\n\nUse `/backup` to create your first backup.',
          });
          return;
        }

        const backup = (serverData.permissions as any).backupData;
        const embed = {
          title: '📋 Server Backups',
          description: `Backup information for ${guild.name}`,
          fields: [
            { name: 'Backup Type', value: backup.backupType || 'Full', inline: true },
            { name: 'Created', value: new Date(backup.timestamp).toLocaleString(), inline: true },
            { name: 'Size', value: `${Math.round(JSON.stringify(backup).length / 1024)} KB`, inline: true },
            { name: 'Created By', value: `<@${backup.createdBy}>`, inline: true },
            { name: 'Backup ID', value: `\`${backup.serverId}\``, inline: true },
          ],
          color: 0x5865F2,
          timestamp: new Date().toISOString(),
        };

        if (backup.channels) {
          embed.fields.push({ name: 'Channels', value: backup.channels.length.toString(), inline: true });
        }
        if (backup.members) {
          embed.fields.push({ name: 'Members', value: backup.members.length.toString(), inline: true });
        }
        if (backup.roles) {
          embed.fields.push({ name: 'Roles', value: backup.roles.length.toString(), inline: true });
        }
        if (backup.messages) {
          embed.fields.push({ name: 'Messages', value: backup.messages.length.toString(), inline: true });
        }

        await interaction.editReply({ embeds: [embed] });

      } else if (action === 'delete') {
        if (!backupId) {
          await interaction.editReply({
            content: '❌ Please provide a backup ID to delete.',
          });
          return;
        }

        if (serverData && serverData.permissions && typeof serverData.permissions === 'object') {
          const updatedPermissions = { ...(serverData.permissions as any) };
          delete updatedPermissions.backupData;
          delete updatedPermissions.lastBackup;
          delete updatedPermissions.backupType;
          delete updatedPermissions.backupSize;

          await storage.updateDiscordServer(serverData.id, {
            permissions: updatedPermissions,
          });

          await storage.logActivity({
            type: 'backup_deleted',
            userId: interaction.user.id,
            targetId: guild.id,
            description: `Backup deleted for ${guild.name}`,
            metadata: {
              backupId,
              serverName: guild.name,
            },
          });

          await interaction.editReply({
            content: '✅ Backup deleted successfully.',
          });
        } else {
          await interaction.editReply({
            content: '❌ No backup found to delete.',
          });
        }
      }

    } catch (error) {
      console.error('Error managing backups:', error);
      await interaction.editReply({
        content: '❌ Failed to manage backups.',
      });
    }
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
          name: '💾 Backup Management',
          value: [
            '`/backup [type]` - Create server data backup',
            '`/backups [action]` - List or delete backups',
            '`/restore <backup_id>` - Restore from backup (view-only)',
          ].join('\n'),
          inline: false,
        },
        {
          name: '📋 Backup Types',
          value: [
            '`full` - Complete server backup (default)',
            '`members` - Member data only',
            '`channels` - Channel structure only',
            '`roles` - Role configuration only',
            '`messages` - Recent messages backup',
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

    await interaction.reply({ embeds: [embed], flags: [4096] });
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
