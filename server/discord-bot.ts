import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { storage } from './storage';
import { BackupIntegrityChecker } from './backup-integrity';
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
        GatewayIntentBits.DirectMessages,
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

    // Note: DM verification disabled due to MessageContent intent limitations
    // Using slash command verification instead

    this.client.on('error', (error) => {
      console.error('❌ Discord client error:', error);
    });
  }

  private async handleVerificationMessage(message: any) {
    const content = message.content.trim().toUpperCase();
    const userId = message.author.id;

    console.log(`🔍 Received DM from ${userId}: "${content}"`);

    // Check if message is a 6-character verification code
    if (!/^[A-Z0-9]{6}$/.test(content)) {
      console.log(`❌ Invalid verification code format: ${content}`);
      await message.reply('Please send a valid 6-character verification code from the dashboard.');
      return;
    }

    console.log(`✅ Valid verification code format detected: ${content}`);

    try {
      // Find verification session with this dashboard code
      const session = await storage.getVerificationSessionByDiscordUserId(userId);
      
      if (!session) {
        await message.reply('No active verification session found. Please start verification from the dashboard first.');
        return;
      }

      if (session.status !== 'pending') {
        await message.reply('This verification session is no longer active.');
        return;
      }

      if (new Date() > session.expiresAt) {
        await message.reply('Your verification session has expired. Please start a new verification from the dashboard.');
        return;
      }

      if (session.dashboardCode !== content) {
        await message.reply('Invalid verification code. Please check the code from your dashboard.');
        return;
      }

      // Generate bot response code
      const botResponseCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update session with bot response
      await storage.updateVerificationSession(session.sessionId, {
        botResponseCode,
        status: 'bot_responded',
      });

      await message.reply(`✅ Verification code received! Your verification code is: **${botResponseCode}**\n\nEnter this code in the dashboard to complete verification.`);

      // Log the verification attempt
      await storage.logActivity({
        type: 'verification',
        description: `Bot responded to verification request from user ${userId}`,
        metadata: { userId, sessionId: session.sessionId },
      });

    } catch (error) {
      console.error('Error processing verification:', error);
      await message.reply('An error occurred while processing your verification. Please try again.');
    }
  }

  private async handleVerify(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const code = interaction.options.getString('code')?.trim();

    if (!code) {
      await interaction.reply({ content: 'Please provide a verification code.', ephemeral: true });
      return;
    }

    console.log(`🔍 Processing verification slash command from ${userId}: "${code}"`);

    // Check if the code contains a valid verification code format (6 digits)
    const verificationCodeMatch = code.match(/^[A-Z0-9]{6}$/);
    if (!verificationCodeMatch) {
      await interaction.reply({ content: 'Please provide a valid 6-character verification code (e.g., ABC123)', ephemeral: true });
      return;
    }

    console.log(`✅ Valid verification code format detected: ${code}`);

    try {
      // Find verification session with this dashboard code
      const session = await storage.getVerificationSessionByDiscordUserId(userId);
      
      if (!session) {
        await interaction.reply({ content: 'No active verification session found. Please start verification from the dashboard first.', ephemeral: true });
        return;
      }

      console.log(`📋 Found verification session: ${session.sessionId}`);

      if (session.status !== 'pending') {
        await interaction.reply({ content: 'This verification session is no longer active. Please start a new verification from the dashboard.', ephemeral: true });
        return;
      }

      if (new Date() > session.expiresAt) {
        await interaction.reply({ content: 'This verification session has expired. Please start a new verification from the dashboard.', ephemeral: true });
        return;
      }

      if (session.dashboardCode !== code) {
        await interaction.reply({ content: 'Invalid verification code. Please check the code from your dashboard and try again.', ephemeral: true });
        return;
      }

      // Generate bot response code
      const botResponseCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update session with bot response code
      await storage.updateVerificationSession(session.sessionId, {
        botResponseCode,
        status: 'bot_responded'
      });

      await interaction.reply({ content: `✅ Verification code accepted! Your response code is: **${botResponseCode}**\n\nPlease enter this code in the dashboard to complete verification.`, ephemeral: true });

      console.log(`✅ Generated bot response code for session ${session.sessionId}: ${botResponseCode}`);

      // Log the verification attempt
      await storage.logActivity({
        type: 'verification',
        description: `Bot responded to verification request from user ${userId}`,
        metadata: { userId, sessionId: session.sessionId },
      });

    } catch (error) {
      console.error('❌ Error in verification process:', error);
      await interaction.reply({ content: 'An error occurred while processing your verification. Please try again.', ephemeral: true });
    }
  }

  private async registerCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your dashboard access with a verification code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('The verification code from the dashboard')
            .setRequired(true)
        ),

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

      new SlashCommandBuilder()
        .setName('whitelist-user')
        .setDescription('Add a user ID to the bot whitelist')
        .addStringOption(option =>
          option.setName('user_id')
            .setDescription('Discord user ID to whitelist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('username')
            .setDescription('Username for the user ID')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('unwhitelist-user')
        .setDescription('Remove a user ID from the bot whitelist')
        .addStringOption(option =>
          option.setName('user_id')
            .setDescription('Discord user ID to remove from whitelist')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('whitelist-list')
        .setDescription('List all whitelisted user IDs'),

      // Candy Currency Commands
      new SlashCommandBuilder()
        .setName('candy')
        .setDescription('Check your candy balance'),

      new SlashCommandBuilder()
        .setName('daily-candy')
        .setDescription('Claim your daily candy reward'),

      new SlashCommandBuilder()
        .setName('give-candy')
        .setDescription('Give candy to another user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to give candy to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of candy to give')
            .setRequired(true)
            .setMinValue(1)
        ),

      new SlashCommandBuilder()
        .setName('candy-top')
        .setDescription('Show top candy holders in the server'),

      new SlashCommandBuilder()
        .setName('candy-history')
        .setDescription('View your recent candy transactions'),

      // Candy Games
      new SlashCommandBuilder()
        .setName('coin-flip')
        .setDescription('Flip a coin and bet candy on heads or tails')
        .addStringOption(option =>
          option.setName('choice')
            .setDescription('Choose heads or tails')
            .setRequired(true)
            .addChoices(
              { name: 'Heads', value: 'heads' },
              { name: 'Tails', value: 'tails' }
            )
        )
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('Amount of candy to bet (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        ),

      new SlashCommandBuilder()
        .setName('dice-roll')
        .setDescription('Roll dice and win candy based on your roll')
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('Amount of candy to bet (1-50)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(50)
        ),

      new SlashCommandBuilder()
        .setName('rock-paper-scissors')
        .setDescription('Play rock paper scissors against the bot for candy')
        .addStringOption(option =>
          option.setName('choice')
            .setDescription('Your choice')
            .setRequired(true)
            .addChoices(
              { name: 'Rock', value: 'rock' },
              { name: 'Paper', value: 'paper' },
              { name: 'Scissors', value: 'scissors' }
            )
        )
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('Amount of candy to bet (1-75)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(75)
        ),

      new SlashCommandBuilder()
        .setName('number-guess')
        .setDescription('Guess a number between 1-10 to win candy')
        .addIntegerOption(option =>
          option.setName('guess')
            .setDescription('Your guess (1-10)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('Amount of candy to bet (1-200)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(200)
        ),

      new SlashCommandBuilder()
        .setName('slot-machine')
        .setDescription('Play the candy slot machine')
        .addIntegerOption(option =>
          option.setName('bet')
            .setDescription('Amount of candy to bet (5-100)')
            .setRequired(true)
            .setMinValue(5)
            .setMaxValue(100)
        ),

      // Dashboard Key Management Commands
      new SlashCommandBuilder()
        .setName('generate-dashboard-key')
        .setDescription('Generate a new dashboard access key'),

      new SlashCommandBuilder()
        .setName('revoke-dashboard-key')
        .setDescription('Revoke your dashboard access key'),

      new SlashCommandBuilder()
        .setName('dashboard-key-info')
        .setDescription('View information about your dashboard key'),

      // Troll Commands
      new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message for the bot to say')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send the message to (optional)')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to send DM to')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message to send')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Change someone\'s nickname')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to change nickname')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('nickname')
            .setDescription('New nickname')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages in bulk')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of messages to delete (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        ),

      new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to timeout')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Timeout duration in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for timeout')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement with embeds')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Announcement title')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Announcement message')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Embed color (hex)')
            .setRequired(false)
        ),
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
        case 'verify':
          await this.handleVerify(interaction);
          break;
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
        case 'whitelist-user':
          await this.handleWhitelistUser(interaction);
          break;
        case 'unwhitelist-user':
          await this.handleUnwhitelistUser(interaction);
          break;
        case 'whitelist-list':
          await this.handleWhitelistList(interaction);
          break;
        case 'candy':
          await this.handleCandy(interaction);
          break;
        case 'daily-candy':
          await this.handleDailyCandy(interaction);
          break;
        case 'give-candy':
          await this.handleGiveCandy(interaction);
          break;
        case 'candy-top':
          await this.handleCandyTop(interaction);
          break;
        case 'candy-history':
          await this.handleCandyHistory(interaction);
          break;
        case 'coin-flip':
          await this.handleCoinFlip(interaction);
          break;
        case 'dice-roll':
          await this.handleDiceRoll(interaction);
          break;
        case 'rock-paper-scissors':
          await this.handleRockPaperScissors(interaction);
          break;
        case 'number-guess':
          await this.handleNumberGuess(interaction);
          break;
        case 'slot-machine':
          await this.handleSlotMachine(interaction);
          break;
        case 'generate-dashboard-key':
          await this.handleGenerateDashboardKey(interaction);
          break;
        case 'revoke-dashboard-key':
          await this.handleRevokeDashboardKey(interaction);
          break;
        case 'dashboard-key-info':
          await this.handleDashboardKeyInfo(interaction);
          break;
        case 'say':
          await this.handleSay(interaction);
          break;
        case 'dm':
          await this.handleDM(interaction);
          break;
        case 'nickname':
          await this.handleNickname(interaction);
          break;
        case 'purge':
          await this.handlePurge(interaction);
          break;
        case 'timeout':
          await this.handleTimeout(interaction);
          break;
        case 'announce':
          await this.handleAnnounce(interaction);
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

    // Check if user is in the whitelist
    const whitelistedUsers = this.getSetting('whitelisted_users', '').split(',').filter(id => id.trim());
    if (whitelistedUsers.includes(userId)) {
      return true;
    }

    const member = interaction.member;
    if (!member || !('roles' in member)) return false;

    const memberRoles = member.roles;
    if (!memberRoles) return false;

    // Check if user has required role
    const requiredRole = this.getSetting('required_role', 'Raptor Admin');
    const hasRequiredRole = Array.isArray(memberRoles) 
      ? memberRoles.some(role => role === requiredRole)
      : memberRoles.cache?.some(role => role.name === requiredRole);

    // For key system commands, check for special role
    const keySystemCommands = ['whitelist', 'dewhitelist'];
    if (keySystemCommands.includes(interaction.commandName)) {
      const keySystemRole = this.getSetting('key_system_role', 'Key System');
      const hasKeySystemRole = Array.isArray(memberRoles)
        ? memberRoles.some(role => role === keySystemRole)
        : memberRoles.cache?.some(role => role.name === keySystemRole);
      
      return hasKeySystemRole || hasRequiredRole;
    }

    return hasRequiredRole;
  }

  private async isRateLimited(userId: string): Promise<boolean> {
    // Check if rate limiting is enabled
    const rateLimitEnabled = this.getSetting('rate_limit_enabled', 'true') === 'true';
    if (!rateLimitEnabled) {
      return false;
    }

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

      // Run integrity check on the backup
      try {
        await BackupIntegrityChecker.performIntegrityCheck(
          backupData.id,
          backupData,
          interaction.user.id,
          false
        );
      } catch (error) {
        console.error('Failed to run integrity check on backup:', error);
      }

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

      // Create confirmation buttons
      const confirmButton = {
        type: 2,
        style: 4, // Danger style (red)
        label: 'Confirm Restore',
        custom_id: 'confirm_restore',
      };

      const cancelButton = {
        type: 2,
        style: 2, // Secondary style (gray)
        label: 'Cancel',
        custom_id: 'cancel_restore',
      };

      const actionRow = {
        type: 1,
        components: [confirmButton, cancelButton],
      };

      const confirmationReply = await interaction.editReply({
        content: '⚠️ **DANGER: Server Restore Operation**\n\nThis will restore your server configuration. This action is **IRREVERSIBLE**.',
        embeds: [embed],
        components: [actionRow],
      });

      // Wait for button interaction
      const filter = (buttonInteraction: any) => {
        return buttonInteraction.user.id === interaction.user.id;
      };

      try {
        const buttonInteraction = await confirmationReply.awaitMessageComponent({ 
          filter, 
          time: 30000 
        });

        if (buttonInteraction.customId === 'cancel_restore') {
          await buttonInteraction.update({
            content: '✅ Restore operation cancelled.',
            embeds: [],
            components: [],
          });
          return;
        }

        if (buttonInteraction.customId === 'confirm_restore') {
          await buttonInteraction.update({
            content: '🔄 Starting restore process...',
            embeds: [],
            components: [],
          });

          // Perform actual restore based on type
          await this.performRestore(guild, backupData, restoreType, buttonInteraction);
        }

      } catch (error) {
        await interaction.editReply({
          content: '⏰ Restore confirmation timed out. Operation cancelled.',
          embeds: [],
          components: [],
        });
      }

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
          value: `Commands require the "${this.getSetting('required_role', 'Raptor Admin')}" role.\nKey management commands require the "${this.getSetting('key_system_role', 'Key System')}" role.`,
          inline: false,
        },
      ],
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], flags: [4096] });
  }

  private generateKeyId(): string {
    // Generate key format: dash_(15 alphanumeric characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'dash_';
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

  // Troll command handlers
  private async handleSay(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('message', true);
    const targetChannel = interaction.options.getChannel('channel');
    
    // Use the target channel if specified, otherwise use current channel
    const channel = targetChannel ? await interaction.guild?.channels.fetch(targetChannel.id) : interaction.channel;

    if (!channel || !('send' in channel)) {
      await interaction.reply({
        content: '❌ Invalid channel specified.',
        flags: [4096],
      });
      return;
    }

    try {
      await channel.send(message);
      await interaction.reply({
        content: '✅ Message sent successfully!',
        flags: [4096],
      });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to send message. Check bot permissions.',
        flags: [4096],
      });
    }
  }

  private async handleDM(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const message = interaction.options.getString('message', true);

    try {
      await user.send(message);
      await interaction.reply({
        content: `✅ DM sent to ${user.username} successfully!`,
        flags: [4096],
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to send DM to ${user.username}. They may have DMs disabled.`,
        flags: [4096],
      });
    }
  }

  private async handleNickname(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const nickname = interaction.options.getString('nickname', true);

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [4096],
      });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.setNickname(nickname);
      await interaction.reply({
        content: `✅ Changed ${user.username}'s nickname to "${nickname}"`,
        flags: [4096],
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to change nickname. Check bot permissions and role hierarchy.`,
        flags: [4096],
      });
    }
  }

  private async handlePurge(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);

    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({
        content: '❌ This command can only be used in a server text channel.',
        flags: [4096],
      });
      return;
    }

    // Type guard to ensure we have a text channel with bulkDelete capability
    if (!('bulkDelete' in interaction.channel)) {
      await interaction.reply({
        content: '❌ This command can only be used in a text channel.',
        flags: [4096],
      });
      return;
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      await interaction.channel.bulkDelete(messages);
      
      await interaction.reply({
        content: `✅ Deleted ${messages.size} messages.`,
        flags: [4096],
      });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to delete messages. Messages may be older than 14 days or bot lacks permissions.',
        flags: [4096],
      });
    }
  }

  private async handleTimeout(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: [4096],
      });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);
      const timeoutDuration = minutes * 60 * 1000; // Convert to milliseconds
      
      await member.timeout(timeoutDuration, reason);
      await interaction.reply({
        content: `✅ Timed out ${user.username} for ${minutes} minutes.\nReason: ${reason}`,
        flags: [4096],
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to timeout user. Check bot permissions and role hierarchy.`,
        flags: [4096],
      });
    }
  }

  private async handleAnnounce(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString('title', true);
    const message = interaction.options.getString('message', true);
    const colorInput = interaction.options.getString('color');

    let color = 0x5865F2; // Default Discord blurple
    if (colorInput) {
      const hexColor = colorInput.replace('#', '');
      const parsedColor = parseInt(hexColor, 16);
      if (!isNaN(parsedColor)) {
        color = parsedColor;
      }
    }

    const embed = {
      title: title,
      description: message,
      color: color,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Announced by ${interaction.user.username}`,
        icon_url: interaction.user.displayAvatarURL(),
      },
    };

    try {
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to send announcement.',
        flags: [4096],
      });
    }
  }

  public getStats() {
    return {
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      uptime: this.client.uptime,
      status: this.isReady ? 'online' : 'offline',
    };
  }

  public get clientGuilds() {
    return this.client.guilds;
  }

  public async createBackup(serverId: string, backupType: string = 'full', userId: string = 'dashboard') {
    const guild = this.client.guilds.cache.get(serverId);
    if (!guild) {
      throw new Error('Server not found or bot not in server');
    }

    // Create a mock interaction object for backup creation
    const mockInteraction = {
      user: { id: userId, username: 'Dashboard User' },
      guild,
      options: {
        getString: (key: string) => key === 'type' ? backupType : null
      },
      deferReply: async () => {},
      editReply: async () => {},
      reply: async () => {}
    };

    return this.handleBackup(mockInteraction as any);
  }


  private async handleWhitelistUser(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString('user_id', true);
    const username = interaction.options.getString('username') || 'Unknown User';

    try {
      // Get current whitelisted users
      const currentWhitelist = this.getSetting('whitelisted_users', '');
      const whitelistedUsers = currentWhitelist.split(',').filter(id => id.trim());

      // Check if user is already whitelisted
      if (whitelistedUsers.includes(userId)) {
        await interaction.reply({
          content: `❌ User ID \`${userId}\` is already whitelisted.`,
          flags: [4096],
        });
        return;
      }

      // Add user to whitelist
      whitelistedUsers.push(userId);
      await storage.setBotSetting('whitelisted_users', whitelistedUsers.join(','));

      // Update local settings cache
      this.settings.set('whitelisted_users', whitelistedUsers.join(','));

      await interaction.reply({
        content: `✅ Successfully added user ID \`${userId}\` (${username}) to the bot whitelist.\n\nThey can now use bot commands without role requirements.`,
        flags: [4096],
      });

      // Log the activity
      await storage.logActivity({
        type: 'whitelist_user_added',
        userId: interaction.user.id,
        targetId: userId,
        description: `Added user ${username} (${userId}) to bot whitelist`,
        metadata: {
          whitelistedUserId: userId,
          whitelistedUsername: username,
          addedBy: interaction.user.username,
        },
      });

    } catch (error) {
      console.error('Error whitelisting user:', error);
      await interaction.reply({
        content: '❌ Failed to add user to whitelist. Please try again.',
        flags: [4096],
      });
    }
  }

  private async handleUnwhitelistUser(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString('user_id', true);

    try {
      // Get current whitelisted users
      const currentWhitelist = this.getSetting('whitelisted_users', '');
      const whitelistedUsers = currentWhitelist.split(',').filter(id => id.trim());

      // Check if user is whitelisted
      if (!whitelistedUsers.includes(userId)) {
        await interaction.reply({
          content: `❌ User ID \`${userId}\` is not currently whitelisted.`,
          flags: [4096],
        });
        return;
      }

      // Remove user from whitelist
      const updatedWhitelist = whitelistedUsers.filter(id => id !== userId);
      await storage.setBotSetting('whitelisted_users', updatedWhitelist.join(','));

      // Update local settings cache
      this.settings.set('whitelisted_users', updatedWhitelist.join(','));

      await interaction.reply({
        content: `✅ Successfully removed user ID \`${userId}\` from the bot whitelist.\n\nThey will now need appropriate roles to use bot commands.`,
        flags: [4096],
      });

      // Log the activity
      await storage.logActivity({
        type: 'whitelist_user_removed',
        userId: interaction.user.id,
        targetId: userId,
        description: `Removed user ${userId} from bot whitelist`,
        metadata: {
          removedUserId: userId,
          removedBy: interaction.user.username,
        },
      });

    } catch (error) {
      console.error('Error removing user from whitelist:', error);
      await interaction.reply({
        content: '❌ Failed to remove user from whitelist. Please try again.',
        flags: [4096],
      });
    }
  }

  private async handleWhitelistList(interaction: ChatInputCommandInteraction) {
    try {
      const currentWhitelist = this.getSetting('whitelisted_users', '');
      const whitelistedUsers = currentWhitelist.split(',').filter(id => id.trim());

      if (whitelistedUsers.length === 0) {
        await interaction.reply({
          content: '📋 **Bot Whitelist**\n\nNo users are currently whitelisted.\n\nUse `/whitelist-user` to add users to the whitelist.',
          flags: [4096],
        });
        return;
      }

      const embed = {
        title: '📋 Bot Whitelist',
        description: `Currently whitelisted user IDs (${whitelistedUsers.length} total):`,
        fields: whitelistedUsers.slice(0, 20).map((userId, index) => ({
          name: `User ${index + 1}`,
          value: `\`${userId}\``,
          inline: true,
        })),
        color: 0x00FF00,
        timestamp: new Date().toISOString(),
        footer: {
          text: whitelistedUsers.length > 20 ? `Showing first 20 of ${whitelistedUsers.length} users` : `${whitelistedUsers.length} whitelisted users`
        }
      };

      await interaction.reply({
        embeds: [embed],
        flags: [4096],
      });

    } catch (error) {
      console.error('Error listing whitelisted users:', error);
      await interaction.reply({
        content: '❌ Failed to retrieve whitelist. Please try again.',
        flags: [4096],
      });
    }
  }

  private async performRestore(guild: any, backupData: any, restoreType: string, interaction: any) {
    try {
      const progressEmbed = {
        title: '🔄 Restoring Server',
        description: `Restoring ${restoreType} backup for ${guild.name}`,
        fields: [
          { name: 'Progress', value: '▓░░░░░░░░░ 10%', inline: false },
          { name: 'Current Step', value: 'Starting restoration...', inline: false }
        ],
        color: 0xFF6B35,
        timestamp: new Date().toISOString(),
      };

      await interaction.followUp({ embeds: [progressEmbed] });

      let restored = {
        channels: 0,
        roles: 0,
        settings: 0
      };

      // Delete existing roles and restore from backup
      if ((restoreType === 'full' || restoreType === 'roles') && backupData.roles) {
        progressEmbed.fields[0].value = '▓▓░░░░░░░░ 20%';
        progressEmbed.fields[1].value = 'Deleting existing roles...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Delete all existing roles except @everyone and bot roles
        const existingRoles = guild.roles.cache.filter((role: any) => 
          role.name !== '@everyone' && !role.managed && role.editable
        );
        
        for (const role of existingRoles.values()) {
          try {
            await (role as any).delete('Clearing for backup restoration');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
          } catch (error) {
            console.error(`Failed to delete role ${(role as any).name}:`, error);
          }
        }

        progressEmbed.fields[0].value = '▓▓▓░░░░░░░ 25%';
        progressEmbed.fields[1].value = 'Restoring roles from backup...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Restore roles from backup
        for (const roleData of backupData.roles) {
          try {
            if (roleData.name !== '@everyone') {
              await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
                hoist: roleData.hoist,
                mentionable: roleData.mentionable,
                position: roleData.position,
                reason: `Restored from backup by ${interaction.user.username}`
              });
              restored.roles++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            }
          } catch (error) {
            console.error(`Failed to restore role ${roleData.name}:`, error);
          }
        }
      }

      // Delete existing channels and restore from backup
      if ((restoreType === 'full' || restoreType === 'channels') && backupData.channels) {
        progressEmbed.fields[0].value = '▓▓▓░░░░░░░ 30%';
        progressEmbed.fields[1].value = 'Deleting existing channels...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Delete all existing channels except system channels
        const existingChannels = guild.channels.cache.filter((channel: any) => 
          channel.deletable && !channel.isVoice() && channel.type !== 4 // Don't delete categories for now
        );
        
        for (const channel of existingChannels.values()) {
          try {
            await (channel as any).delete('Clearing for backup restoration');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
          } catch (error) {
            console.error(`Failed to delete channel ${(channel as any).name}:`, error);
          }
        }

        progressEmbed.fields[0].value = '▓▓▓▓▓░░░░░ 50%';
        progressEmbed.fields[1].value = 'Restoring channels from backup...';
        await interaction.editReply({ embeds: [progressEmbed] });

        // Restore channels from backup
        for (const channelData of backupData.channels) {
          try {
            const channelOptions: any = {
              name: channelData.name,
              type: channelData.type,
              reason: `Restored from backup by ${interaction.user.username}`
            };

            if (channelData.topic) channelOptions.topic = channelData.topic;
            if (channelData.nsfw !== undefined) channelOptions.nsfw = channelData.nsfw;
            if (channelData.rateLimitPerUser) channelOptions.rateLimitPerUser = channelData.rateLimitPerUser;
            if (channelData.position !== undefined) channelOptions.position = channelData.position;

            await guild.channels.create(channelOptions);
            restored.channels++;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit
          } catch (error) {
            console.error(`Failed to restore channel ${channelData.name}:`, error);
          }
        }
      }

      // Restore server settings (if full restore)
      if (restoreType === 'full' && backupData.guild) {
        progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓░░ 80%';
        progressEmbed.fields[1].value = 'Restoring server settings...';
        await interaction.editReply({ embeds: [progressEmbed] });

        try {
          const guildData = backupData.guild;
          const editOptions: any = {};

          if (guildData.name && guildData.name !== guild.name) {
            editOptions.name = guildData.name;
          }
          if (guildData.description) {
            editOptions.description = guildData.description;
          }
          if (guildData.verificationLevel !== undefined) {
            editOptions.verificationLevel = guildData.verificationLevel;
          }

          if (Object.keys(editOptions).length > 0) {
            await guild.edit(editOptions);
            restored.settings++;
          }
        } catch (error) {
          console.error('Failed to restore server settings:', error);
        }
      }

      // Complete
      progressEmbed.fields[0].value = '▓▓▓▓▓▓▓▓▓▓ 100%';
      progressEmbed.fields[1].value = 'Restoration complete!';
      progressEmbed.color = 0x00FF00;
      
      const resultsEmbed = {
        title: '✅ Restoration Complete',
        description: `Successfully restored server from backup`,
        fields: [
          { name: 'Channels Restored', value: restored.channels.toString(), inline: true },
          { name: 'Roles Restored', value: restored.roles.toString(), inline: true },
          { name: 'Settings Restored', value: restored.settings.toString(), inline: true },
        ],
        color: 0x00FF00,
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({ embeds: [progressEmbed] });
      await interaction.followUp({ embeds: [resultsEmbed] });

      // Log successful restore
      await storage.logActivity({
        type: 'restore_completed',
        userId: interaction.user.id,
        targetId: guild.id,
        description: `Successfully restored ${restoreType} backup for ${guild.name}`,
        metadata: {
          restoreType,
          channelsRestored: restored.channels,
          rolesRestored: restored.roles,
          settingsRestored: restored.settings,
        },
      });

    } catch (error) {
      console.error('Error during restore process:', error);
      
      const errorEmbed = {
        title: '❌ Restoration Failed',
        description: 'An error occurred during the restoration process.',
        color: 0xFF0000,
        timestamp: new Date().toISOString(),
      };

      await interaction.followUp({ embeds: [errorEmbed] });

      await storage.logActivity({
        type: 'restore_failed',
        userId: interaction.user.id,
        targetId: guild.id,
        description: `Failed to restore backup for ${guild.name}: ${error}`,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  // Candy Currency Command Handlers
  private async handleCandy(interaction: ChatInputCommandInteraction) {
    try {
      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      const embed = {
        title: '🍭 Your Candy Balance',
        description: `You have **${balance}** candy!`,
        color: 0xFF69B4,
        footer: {
          text: `Use /daily-candy to claim your daily reward!`,
        },
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error checking candy balance:', error);
      await interaction.reply({
        content: '❌ Failed to check candy balance.',
        flags: [4096],
      });
    }
  }

  private async handleDailyCandy(interaction: ChatInputCommandInteraction) {
    try {
      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const canClaim = await storage.checkDailyCandy(interaction.user.id);
      
      if (!canClaim) {
        await interaction.reply({
          content: '❌ You have already claimed your daily candy today! Come back tomorrow.',
          flags: [4096],
        });
        return;
      }

      const amount = await storage.claimDailyCandy(interaction.user.id);
      const newBalance = await storage.getCandyBalance(interaction.user.id);

      const embed = {
        title: '🎉 Daily Candy Claimed!',
        description: `You received **${amount}** candy!\nYour new balance: **${newBalance}** candy`,
        color: 0x00D4AA,
        footer: {
          text: 'Come back tomorrow for more candy!',
        },
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error claiming daily candy:', error);
      await interaction.reply({
        content: '❌ Failed to claim daily candy.',
        flags: [4096],
      });
    }
  }

  private async handleGiveCandy(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: '❌ You cannot give candy to yourself!',
          flags: [4096],
        });
        return;
      }

      if (targetUser.bot) {
        await interaction.reply({
          content: '❌ You cannot give candy to bots!',
          flags: [4096],
        });
        return;
      }

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const senderBalance = await storage.getCandyBalance(interaction.user.id);
      
      if (senderBalance < amount) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${senderBalance}** candy.`,
          flags: [4096],
        });
        return;
      }

      // Ensure target user exists in database
      await storage.upsertDiscordUser({
        discordId: targetUser.id,
        username: targetUser.username,
        discriminator: targetUser.discriminator || '0',
        avatarUrl: targetUser.displayAvatarURL(),
      });

      await storage.transferCandy(interaction.user.id, targetUser.id, amount);

      const embed = {
        title: '🍭 Candy Transfer Complete!',
        description: `Successfully gave **${amount}** candy to ${targetUser.username}!`,
        color: 0xFF69B4,
        fields: [
          {
            name: 'Your new balance',
            value: `${await storage.getCandyBalance(interaction.user.id)} candy`,
            inline: true,
          },
          {
            name: `${targetUser.username}'s new balance`,
            value: `${await storage.getCandyBalance(targetUser.id)} candy`,
            inline: true,
          },
        ],
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error transferring candy:', error);
      await interaction.reply({
        content: '❌ Failed to transfer candy.',
        flags: [4096],
      });
    }
  }

  private async handleCandyTop(interaction: ChatInputCommandInteraction) {
    try {
      const allUsers = await storage.getAllDiscordUsers();
      const sortedUsers = allUsers
        .filter(user => user.candyBalance > 0)
        .sort((a, b) => b.candyBalance - a.candyBalance)
        .slice(0, 10);

      if (sortedUsers.length === 0) {
        await interaction.reply({
          content: 'No users have candy yet! Use /daily-candy to start earning.',
          flags: [4096],
        });
        return;
      }

      const leaderboard = sortedUsers
        .map((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          return `${medal} **${user.username}** - ${user.candyBalance} candy`;
        })
        .join('\n');

      const embed = {
        title: '🍭 Candy Leaderboard',
        description: leaderboard,
        color: 0xFFD700,
        footer: {
          text: 'Keep collecting candy to climb the leaderboard!',
        },
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching candy leaderboard:', error);
      await interaction.reply({
        content: '❌ Failed to fetch candy leaderboard.',
        flags: [4096],
      });
    }
  }

  private async handleCandyHistory(interaction: ChatInputCommandInteraction) {
    try {
      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const transactions = await storage.getCandyTransactions(interaction.user.id, 5);

      if (transactions.length === 0) {
        await interaction.reply({
          content: 'You have no candy transaction history yet!',
          flags: [4096],
        });
        return;
      }

      const history = transactions
        .map(tx => {
          const date = new Date(tx.createdAt).toLocaleDateString();
          const type = tx.type === 'daily' ? '🎁 Daily reward' : 
                      tx.type === 'transfer' ? '💸 Transfer' : 
                      tx.type === 'reward' ? '🏆 Reward' : tx.type;
          return `${type}: **+${tx.amount}** candy (${date})`;
        })
        .join('\n');

      const balance = await storage.getCandyBalance(interaction.user.id);

      const embed = {
        title: '🍭 Your Candy History',
        description: history,
        color: 0xFF69B4,
        footer: {
          text: `Current balance: ${balance} candy`,
        },
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching candy history:', error);
      await interaction.reply({
        content: '❌ Failed to fetch candy history.',
        flags: [4096],
      });
    }
  }

  // Candy Game Handlers
  private async handleCoinFlip(interaction: ChatInputCommandInteraction) {
    try {
      const choice = interaction.options.getString('choice', true);
      const bet = interaction.options.getInteger('bet', true);

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance < bet) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${balance}** candy.`,
          flags: [4096],
        });
        return;
      }

      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = choice === coinResult;
      const winAmount = won ? bet * 2 : 0;
      const netChange = won ? bet : -bet;

      await storage.updateCandyBalance(interaction.user.id, balance + netChange);

      await storage.addCandyTransaction({
        fromUserId: won ? null : interaction.user.id,
        toUserId: interaction.user.id,
        amount: won ? winAmount : bet,
        type: 'game',
        description: `Coin flip game - ${won ? 'won' : 'lost'}`,
      });

      const embed = {
        title: '🪙 Coin Flip Results',
        description: `The coin landed on **${coinResult}**!`,
        fields: [
          { name: 'Your Choice', value: choice.charAt(0).toUpperCase() + choice.slice(1), inline: true },
          { name: 'Result', value: won ? '🎉 You won!' : '💸 You lost!', inline: true },
          { name: 'Candy Change', value: won ? `+${bet}` : `-${bet}`, inline: true },
          { name: 'New Balance', value: `${balance + netChange} candy`, inline: false },
        ],
        color: won ? 0x00FF00 : 0xFF0000,
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error playing coin flip:', error);
      await interaction.reply({
        content: '❌ Failed to play coin flip.',
        flags: [4096],
      });
    }
  }

  private async handleDiceRoll(interaction: ChatInputCommandInteraction) {
    try {
      const bet = interaction.options.getInteger('bet', true);

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance < bet) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${balance}** candy.`,
          flags: [4096],
        });
        return;
      }

      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;

      let multiplier = 0;
      let result = '';

      if (total === 12) {
        multiplier = 10; // Snake eyes (double 6s) - 10x payout
        result = '🎯 Double 6s! JACKPOT!';
      } else if (total === 2) {
        multiplier = 8; // Snake eyes (double 1s) - 8x payout
        result = '🐍 Snake Eyes! Big win!';
      } else if (dice1 === dice2) {
        multiplier = 4; // Any doubles - 4x payout
        result = '🎲 Doubles! Nice win!';
      } else if (total >= 10) {
        multiplier = 2; // High roll - 2x payout
        result = '📈 High roll! You win!';
      } else if (total === 7) {
        multiplier = 1; // Lucky 7 - break even
        result = '🍀 Lucky 7! Break even!';
      } else {
        multiplier = 0; // Loss
        result = '💸 Too low! You lose!';
      }

      const winAmount = bet * multiplier;
      const netChange = winAmount - bet;

      await storage.updateCandyBalance(interaction.user.id, balance + netChange);

      await storage.addCandyTransaction({
        fromUserId: netChange > 0 ? null : interaction.user.id,
        toUserId: interaction.user.id,
        amount: Math.abs(netChange),
        type: 'game',
        description: `Dice roll game - rolled ${total}`,
      });

      const embed = {
        title: '🎲 Dice Roll Results',
        description: `You rolled: ${dice1} + ${dice2} = **${total}**\n${result}`,
        fields: [
          { name: 'Multiplier', value: `${multiplier}x`, inline: true },
          { name: 'Candy Change', value: netChange > 0 ? `+${netChange}` : netChange === 0 ? '±0' : `${netChange}`, inline: true },
          { name: 'New Balance', value: `${balance + netChange} candy`, inline: true },
        ],
        color: netChange > 0 ? 0x00FF00 : netChange === 0 ? 0xFFFF00 : 0xFF0000,
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error playing dice roll:', error);
      await interaction.reply({
        content: '❌ Failed to play dice roll.',
        flags: [4096],
      });
    }
  }

  private async handleRockPaperScissors(interaction: ChatInputCommandInteraction) {
    try {
      const userChoice = interaction.options.getString('choice', true);
      const bet = interaction.options.getInteger('bet', true);

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance < bet) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${balance}** candy.`,
          flags: [4096],
        });
        return;
      }

      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let result = '';
      let netChange = 0;

      if (userChoice === botChoice) {
        result = '🤝 It\'s a tie!';
        netChange = 0;
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = '🎉 You win!';
        netChange = Math.floor(bet * 1.5); // 1.5x payout
      } else {
        result = '💸 You lose!';
        netChange = -bet;
      }

      await storage.updateCandyBalance(interaction.user.id, balance + netChange);

      if (netChange !== 0) {
        await storage.addCandyTransaction({
          fromUserId: netChange > 0 ? null : interaction.user.id,
          toUserId: interaction.user.id,
          amount: Math.abs(netChange),
          type: 'game',
          description: `Rock Paper Scissors - ${userChoice} vs ${botChoice}`,
        });
      }

      const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

      const embed = {
        title: '🪨📄✂️ Rock Paper Scissors',
        description: `${emojis[userChoice as keyof typeof emojis]} vs ${emojis[botChoice as keyof typeof emojis]}\n${result}`,
        fields: [
          { name: 'Your Choice', value: userChoice.charAt(0).toUpperCase() + userChoice.slice(1), inline: true },
          { name: 'Bot Choice', value: botChoice.charAt(0).toUpperCase() + botChoice.slice(1), inline: true },
          { name: 'Candy Change', value: netChange > 0 ? `+${netChange}` : netChange === 0 ? '±0' : `${netChange}`, inline: true },
          { name: 'New Balance', value: `${balance + netChange} candy`, inline: false },
        ],
        color: netChange > 0 ? 0x00FF00 : netChange === 0 ? 0xFFFF00 : 0xFF0000,
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error playing rock paper scissors:', error);
      await interaction.reply({
        content: '❌ Failed to play rock paper scissors.',
        flags: [4096],
      });
    }
  }

  private async handleNumberGuess(interaction: ChatInputCommandInteraction) {
    try {
      const guess = interaction.options.getInteger('guess', true);
      const bet = interaction.options.getInteger('bet', true);

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance < bet) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${balance}** candy.`,
          flags: [4096],
        });
        return;
      }

      const winningNumber = Math.floor(Math.random() * 10) + 1;
      const won = guess === winningNumber;
      const netChange = won ? bet * 9 : -bet; // 10x payout (9x profit)

      await storage.updateCandyBalance(interaction.user.id, balance + netChange);

      await storage.addCandyTransaction({
        fromUserId: won ? null : interaction.user.id,
        toUserId: interaction.user.id,
        amount: Math.abs(netChange),
        type: 'game',
        description: `Number guess - guessed ${guess}, answer was ${winningNumber}`,
      });

      const embed = {
        title: '🔢 Number Guessing Game',
        description: `The winning number was **${winningNumber}**!`,
        fields: [
          { name: 'Your Guess', value: guess.toString(), inline: true },
          { name: 'Result', value: won ? '🎯 Perfect guess!' : '❌ Wrong number!', inline: true },
          { name: 'Candy Change', value: won ? `+${bet * 9}` : `-${bet}`, inline: true },
          { name: 'New Balance', value: `${balance + netChange} candy`, inline: false },
        ],
        color: won ? 0x00FF00 : 0xFF0000,
        footer: {
          text: won ? 'Amazing luck! 10% chance of winning!' : 'Try again! You have a 10% chance to win 10x your bet!',
        },
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error playing number guess:', error);
      await interaction.reply({
        content: '❌ Failed to play number guessing game.',
        flags: [4096],
      });
    }
  }

  private async handleSlotMachine(interaction: ChatInputCommandInteraction) {
    try {
      const bet = interaction.options.getInteger('bet', true);

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);
      
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance < bet) {
        await interaction.reply({
          content: `❌ You don't have enough candy! You only have **${balance}** candy.`,
          flags: [4096],
        });
        return;
      }

      const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
      const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
      const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
      const slot3 = symbols[Math.floor(Math.random() * symbols.length)];

      let multiplier = 0;
      let result = '';

      if (slot1 === slot2 && slot2 === slot3) {
        if (slot1 === '💎') {
          multiplier = 50; // Triple diamonds - mega jackpot!
          result = '💎💎💎 MEGA JACKPOT! 💎💎💎';
        } else if (slot1 === '⭐') {
          multiplier = 25; // Triple stars - big jackpot!
          result = '⭐⭐⭐ BIG JACKPOT! ⭐⭐⭐';
        } else {
          multiplier = 10; // Any triple - good win
          result = '🎰 TRIPLE MATCH! 🎰';
        }
      } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        multiplier = 2; // Any pair - small win
        result = '🎯 Pair! Small win!';
      } else if (slot1 === '🍒' || slot2 === '🍒' || slot3 === '🍒') {
        multiplier = 1; // Cherry - break even
        result = '🍒 Cherry! Break even!';
      } else {
        multiplier = 0; // No match - loss
        result = '💸 No match! Try again!';
      }

      const winAmount = bet * multiplier;
      const netChange = winAmount - bet;

      await storage.updateCandyBalance(interaction.user.id, balance + netChange);

      await storage.addCandyTransaction({
        fromUserId: netChange > 0 ? null : interaction.user.id,
        toUserId: interaction.user.id,
        amount: Math.abs(netChange),
        type: 'game',
        description: `Slot machine - ${slot1}${slot2}${slot3}`,
      });

      const embed = {
        title: '🎰 Candy Slot Machine',
        description: `**${slot1} | ${slot2} | ${slot3}**\n\n${result}`,
        fields: [
          { name: 'Multiplier', value: `${multiplier}x`, inline: true },
          { name: 'Candy Change', value: netChange > 0 ? `+${netChange}` : netChange === 0 ? '±0' : `${netChange}`, inline: true },
          { name: 'New Balance', value: `${balance + netChange} candy`, inline: true },
        ],
        color: netChange > bet * 5 ? 0xFFD700 : netChange > 0 ? 0x00FF00 : netChange === 0 ? 0xFFFF00 : 0xFF0000,
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error playing slot machine:', error);
      await interaction.reply({
        content: '❌ Failed to play slot machine.',
        flags: [4096],
      });
    }
  }

  // Dashboard Key Management Commands
  private async handleGenerateDashboardKey(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Check if user already has an active key
      const existingKey = await storage.getDashboardKeyByDiscordUserId(userId);
      if (existingKey && existingKey.status === 'active') {
        await interaction.editReply({
          content: `❌ You already have an active dashboard key. Use \`/dashboard-key-info\` to view it or \`/revoke-dashboard-key\` to revoke it first.`,
        });
        return;
      }

      // Generate new key
      const keyId = this.generateKeyId();
      const dashboardKey = {
        keyId,
        discordUserId: userId,
        discordUsername: username,
        status: 'active' as const,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      await storage.createDashboardKey(dashboardKey);

      const embed = {
        title: '🔑 Dashboard Key Generated',
        description: `Your dashboard access key has been generated successfully!`,
        fields: [
          { name: 'Key ID', value: `\`${keyId}\``, inline: false },
          { name: 'Status', value: 'Active', inline: true },
          { name: 'Expires', value: `<t:${Math.floor(dashboardKey.expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Next Steps', value: 'Visit the dashboard and link this key to your Google account for secure access.', inline: false },
        ],
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({ embeds: [embed] });

      // Log activity
      await storage.logActivity({
        type: 'dashboard_key_generated',
        userId: userId,
        description: `${username} generated a new dashboard key`,
        metadata: { keyId, expiresAt: dashboardKey.expiresAt.toISOString() },
      });

    } catch (error) {
      console.error('Error generating dashboard key:', error);
      await interaction.editReply({
        content: '❌ Failed to generate dashboard key. Please try again.',
      });
    }
  }

  private async handleRevokeDashboardKey(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const username = interaction.user.username;

      // Check if user has an active key
      const existingKey = await storage.getDashboardKeyByDiscordUserId(userId);
      if (!existingKey || existingKey.status !== 'active') {
        await interaction.editReply({
          content: '❌ You do not have an active dashboard key to revoke.',
        });
        return;
      }

      // Revoke the key
      await storage.revokeDashboardKey(existingKey.keyId, username);

      const embed = {
        title: '🔑 Dashboard Key Revoked',
        description: `Your dashboard access key has been revoked successfully.`,
        fields: [
          { name: 'Key ID', value: `\`${existingKey.keyId}\``, inline: false },
          { name: 'Status', value: 'Revoked', inline: true },
          { name: 'Revoked By', value: username, inline: true },
        ],
        color: 0xff0000,
        timestamp: new Date().toISOString(),
      };

      await interaction.editReply({ embeds: [embed] });

      // Log activity
      await storage.logActivity({
        type: 'dashboard_key_revoked',
        userId: userId,
        description: `${username} revoked their dashboard key`,
        metadata: { keyId: existingKey.keyId },
      });

    } catch (error) {
      console.error('Error revoking dashboard key:', error);
      await interaction.editReply({
        content: '❌ Failed to revoke dashboard key. Please try again.',
      });
    }
  }

  private async handleDashboardKeyInfo(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;

      // Get user's dashboard key
      const dashboardKey = await storage.getDashboardKeyByDiscordUserId(userId);
      if (!dashboardKey) {
        await interaction.editReply({
          content: '❌ You do not have a dashboard key. Use `/generate-dashboard-key` to create one.',
        });
        return;
      }

      const statusColor = dashboardKey.status === 'active' ? 0x00ff00 : 0xff0000;
      const statusEmoji = dashboardKey.status === 'active' ? '✅' : '❌';

      const embed = {
        title: '🔑 Dashboard Key Information',
        fields: [
          { name: 'Key ID', value: `\`${dashboardKey.keyId}\``, inline: false },
          { name: 'Status', value: `${statusEmoji} ${dashboardKey.status.charAt(0).toUpperCase() + dashboardKey.status.slice(1)}`, inline: true },
          { name: 'Generated', value: `<t:${Math.floor(new Date(dashboardKey.generatedAt).getTime() / 1000)}:R>`, inline: true },
        ],
        color: statusColor,
        timestamp: new Date().toISOString(),
      };

      if (dashboardKey.expiresAt) {
        embed.fields.push({
          name: 'Expires',
          value: `<t:${Math.floor(new Date(dashboardKey.expiresAt).getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      if (dashboardKey.linkedEmail) {
        embed.fields.push({
          name: 'Linked Account',
          value: `${dashboardKey.linkedEmail}`,
          inline: false,
        });
      }

      if (dashboardKey.lastAccessAt) {
        embed.fields.push({
          name: 'Last Access',
          value: `<t:${Math.floor(new Date(dashboardKey.lastAccessAt).getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error getting dashboard key info:', error);
      await interaction.editReply({
        content: '❌ Failed to retrieve dashboard key information. Please try again.',
      });
    }
  }

  public async getAllBackups() {
    try {
      const settings = await storage.getAllBotSettings();
      const backups = settings
        .filter(setting => setting.key.startsWith('backup_'))
        .map(setting => {
          try {
            return JSON.parse(setting.value);
          } catch {
            return null;
          }
        })
        .filter(backup => backup !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return backups;
    } catch (error) {
      console.error('Error fetching backups:', error);
      return [];
    }
  }

  public async restoreBackup(backupId: string, userId: string = 'dashboard') {
    try {
      const backupData = await storage.getBotSetting(`backup_${backupId}`);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      const backup = JSON.parse(backupData);
      const guild = this.client.guilds.cache.get(backup.serverId);
      if (!guild) {
        throw new Error('Server not found');
      }

      // Log restore activity
      await storage.logActivity({
        type: 'backup_restored',
        userId,
        description: `Restored backup ${backupId} for server ${backup.serverName}`,
        metadata: { backupId, serverId: backup.serverId }
      });

      return { success: true, message: 'Backup restoration initiated' };
    } catch (error) {
      console.error('Backup restore error:', error);
      throw error;
    }
  }

  public async deleteBackup(backupId: string) {
    try {
      const backupKey = `backup_${backupId}`;
      const backupData = await storage.getBotSetting(backupKey);
      
      if (!backupData) {
        throw new Error('Backup not found');
      }

      // Delete the backup
      await storage.setBotSetting(backupKey, '');
      
      return { success: true, message: 'Backup deleted successfully' };
    } catch (error) {
      console.error('Backup delete error:', error);
      throw error;
    }
  }

  public async syncServerData() {
    try {
      await this.loadSettings();
      
      const guilds = Array.from(this.client.guilds.cache.values());
      for (const guild of guilds) {
        await this.addServer(guild);
      }
      
      await storage.logActivity({
        type: 'server_sync',
        userId: 'system',
        description: 'Server data synchronized',
        metadata: { serverCount: this.client.guilds.cache.size }
      });
    } catch (error) {
      console.error('Server sync error:', error);
      throw error;
    }
  }

  public async sendVerificationDM(userId: string, verificationLink: string): Promise<boolean> {
    try {
      if (!this.isReady) {
        console.log('Bot not ready, cannot send DM');
        return false;
      }

      const user = await this.client.users.fetch(userId);
      if (!user) {
        console.log('User not found:', userId);
        return false;
      }

      const embed = {
        title: '🔗 Discord Account Verification',
        description: 'Click the link below to verify your Discord account for dashboard access.',
        fields: [
          {
            name: '🔒 Verification Link',
            value: `[Click here to verify your account](${verificationLink})`,
            inline: false
          },
          {
            name: '⏰ Important',
            value: 'This link expires in 10 minutes for security.',
            inline: false
          }
        ],
        color: 0x5865F2, // Discord blurple
        footer: {
          text: 'Raptor Dashboard Authentication'
        },
        timestamp: new Date().toISOString()
      };

      await user.send({ embeds: [embed] });
      console.log(`✅ Verification DM sent to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error sending verification DM:', error);
      return false;
    }
  }
}

export const raptorBot = new RaptorBot();
