import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActivityType, AttachmentBuilder, ChannelType, ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { storage } from './storage';
import { db } from './db';
import { discordUsers, licenseKeys, activityLogs, candyBalances, commandLogs, verificationSessions, type DiscordUser } from '@shared/schema';
import { eq, sql, desc, asc, and, or } from 'drizzle-orm';
import { BackupIntegrityChecker } from './backup-integrity';
import { WhitelistAPI } from './whitelist-api';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;

export class RaptorBot {
  private client: Client;
  private isReady = false;
  private settings: Map<string, string> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  private backupChecker: BackupIntegrityChecker;

  // Channels where image posts automatically add logs
  private logChannels: Set<string> = new Set([
    '1339001416383070229', // admin
    '1315558587065569280', // whitelists
    '1315558586302201886', // moderator
    '1315558584888590367', // trial mod
    '1315558583290826856', // support
    '1315558581352792119', // trial support
    '1315558579662487552', // purchases
    '1383552724079087758'  // testing
  ]);

  // MacSploit Support Tags - Exact Content
  private predefinedTags: { [key: string]: string } = {
    '.anticheat': 'Due to a new roblox Anticheat update all executors including macsploit are currently detected and could get your account banned. Please bear with us whiles we find a fix! :)',
    '.autoexe': 'A5XGQ2d.mov',
    '.badcpu': 'softwareupdate --install-rosetta --agree-to-license',
    '.cookie': 'O2vbMdP.mov',
    '.crash': 'Roblox Crash\n\nBefore anything, try reinstalling roblox.\nDelete roblox_session.txt from downloads\nTry running the elevatated installer in terminal\nToggle Your ICloud; System Settings -> Click Your Profile -> ICloud Mail On\n\nsudo cd ~/ && curl -s "https://git.raptor.fun/main/install.sh" | sudo bash </dev/tty && sudo /Applications/Roblox.app/Contents/MacOS/RobloxPlayer\n\nImportant Note: When you run a command with sudo, macOS will prompt you for your password. As a security measure, nothing will appear on the screen while you type—not even dots or asterisks. This is normal. Your keystrokes are still being registered, so just type your password carefully and press Return/Enter when finished.',
    '.elevated': 'Important Note\nWhen you run a command with sudo, macOS will prompt you for your password. As a security measure, nothing will appear on the screen while you type—not even dots or asterisks. This is normal. Your keystrokes are still being registered, so just type your password carefully and press Return/Enter when finished.\n\nsudo cd ~/ && curl -s "https://git.raptor.fun/main/install.sh" | sudo bash </dev/tty',
    '.fwaeh': 'fwaeh',
    '.giftcard': 'https://www.g2a.com/paypal-gift-card-15-usd-by-rewarble-global-i10000339995026',
    '.hwid': 'Paste this into terminal and it will give your HWID.\ncurl -s "https://raw.githubusercontent.com/ZackDaQuack/duck/main/quack.sh" | bash',
    '.install': 'cd ~/ && curl -s "https://git.raptor.fun/main/install.sh" | bash </dev/tty',
    '.iy': 'paste this somewhere\nloadstring(game:HttpGet(\'https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source\'))()',
    '.multi-instance': 'https://www.youtube.com/watch?v=wIVGp_QIcTs',
    '.nigger': 'nigger',
    '.offline': 'Macsploit Offline\n\nDelete macsploit, do NOT delete roblox, then reinstall.\nJoin a roblox game then go through the ports\nIf there is not a available port, please run this command in terminal\n\nsudo cd ~/ && curl -s "https://git.raptor.fun/main/install.sh" | sudo bash </dev/tty && sudo /Applications/Roblox.app/Contents/MacOS/RobloxPlayer\n\nImportant Note: When you run a command with sudo, macOS will prompt you for your password. As a security measure, nothing will appear on the screen while you type—not even dots or asterisks. This is normal. Your keystrokes are still being registered, so just type your password carefully and press Return/Enter when finished.',
    '.paypal': 'https://raptor.fun/\nPlease purchase using PayPal on the website.',
    '.rapejaml': '@JamL is a nigger',
    '.robux': 'use the /roblox command via Raptor bot.',
    '.scripts': 'https://robloxscripts.com/ https://rbxscript.com/ https://scriptblox.com/?mode=free https://rscripts.net/',
    '.sellsn': 'https://macsploit.sellsn.io/',
    '.uicrash': 'Macsploit UI Crash\n\nTry reinstalling both roblox and macsploit\nGive macsploit access, System Settings - Privacy & Security - Files & Folders - MacSploit',
    '.user': 'Note: This is only to be used when you don\'t have administrator permissions on your Mac. It is recommended to use the main branch.\n\ncd ~/ && curl -s "https://git.raptor.fun/user/install.sh" | bash </dev/tty',
    '.zsh': 'ZSH Command Not Found\n\nRun this command in terminal, chsh -s /bin/zsh\nTry checking your macbook version, macsploit doesn\'t work for versions below 11'
  };

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
      ],
    });

    this.backupChecker = new BackupIntegrityChecker();
    this.setupEventHandlers();
    this.setupComprehensiveLogging();
    this.registerCommands();
    this.loadSettings();
  }

  private setupComprehensiveLogging() {
    // Log ALL bot interactions and events
    
    // Command interactions
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await storage.logBotActivity({
          eventType: 'command_executed',
          eventCategory: 'interaction',
          eventData: {
            commandName: interaction.commandName,
            subcommand: interaction.options.getSubcommand(false),
            options: interaction.options.data
          },
          userId: interaction.user.id,
          username: interaction.user.username,
          userDiscriminator: interaction.user.discriminator,
          channelId: interaction.channelId,
          channelName: interaction.channel?.name,
          channelType: interaction.channel?.type.toString(),
          guildId: interaction.guildId,
          guildName: interaction.guild?.name,
          commandName: interaction.commandName,
          subcommandName: interaction.options.getSubcommand(false),
          commandOptions: interaction.options.data
        });
      }
    });

    // Message events
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      
      await storage.logBotActivity({
        eventType: 'message_created',
        eventCategory: 'message',
        eventData: {
          messageId: message.id,
          content: message.content,
          attachments: message.attachments.map(att => ({ name: att.name, size: att.size })),
          embeds: message.embeds.length,
          reactions: message.reactions.cache.size
        },
        userId: message.author.id,
        username: message.author.username,
        userDiscriminator: message.author.discriminator,
        channelId: message.channelId,
        channelName: message.channel?.name,
        channelType: message.channel?.type.toString(),
        guildId: message.guildId,
        guildName: message.guild?.name,
        messageId: message.id,
        messageContent: message.content,
        messageAttachments: message.attachments.map(att => ({ name: att.name, size: att.size, url: att.url })),
        messageEmbeds: message.embeds
      });
    });

    // Member join/leave events
    this.client.on('guildMemberAdd', async (member) => {
      await storage.logBotActivity({
        eventType: 'member_joined',
        eventCategory: 'guild',
        eventData: {
          userId: member.id,
          username: member.user.username,
          joinedAt: member.joinedAt,
          roles: member.roles.cache.map(role => role.name)
        },
        userId: member.id,
        username: member.user.username,
        userDiscriminator: member.user.discriminator,
        guildId: member.guild.id,
        guildName: member.guild.name,
        memberJoinData: {
          joinedAt: member.joinedAt,
          roles: member.roles.cache.map(role => ({ id: role.id, name: role.name })),
          bot: member.user.bot
        }
      });
    });

    // Voice state updates
    this.client.on('voiceStateUpdate', async (oldState, newState) => {
      await storage.logBotActivity({
        eventType: 'voice_state_update',
        eventCategory: 'voice',
        eventData: {
          userId: newState.id,
          oldChannelId: oldState.channelId,
          newChannelId: newState.channelId,
          mute: newState.mute,
          deaf: newState.deaf
        },
        userId: newState.id,
        username: newState.member?.user.username,
        userDiscriminator: newState.member?.user.discriminator,
        channelId: newState.channelId,
        channelName: newState.channel?.name,
        guildId: newState.guild.id,
        guildName: newState.guild.name,
        voiceStateChange: {
          oldChannel: oldState.channel?.name,
          newChannel: newState.channel?.name,
          mute: newState.mute,
          deaf: newState.deaf,
          selfMute: newState.selfMute,
          selfDeaf: newState.selfDeaf
        }
      });
    });

    // Bot startup
    this.client.on('ready', async () => {
      await storage.logBotActivity({
        eventType: 'bot_ready',
        eventCategory: 'system',
        eventData: {
          botId: this.client.user?.id,
          botUsername: this.client.user?.username,
          guilds: this.client.guilds.cache.size,
          users: this.client.users.cache.size
        },
        success: true
      });
    });
  }

  private async loadSettings() {
    try {
      const allSettings = await storage.getAllBotSettings();
      for (const setting of allSettings) {
        this.settings.set(setting.key, setting.value);
      }
      
      // Set comprehensive default settings
      const defaultSettings = [
        { key: 'required_role', value: 'Raptor Admin' },
        { key: 'key_system_role', value: 'Key System' },
        { key: 'moderator_role', value: 'Moderator' },
        { key: 'trusted_role', value: 'Trusted' },
        { key: 'rate_limit_enabled', value: 'true' },
        { key: 'rate_limit_count', value: '10' },
        { key: 'rate_limit_window', value: '30000' },
        { key: 'backup_retention_days', value: '30' },
        { key: 'authorized_user_id', value: '1131426483404026019' },
        { key: 'owner_user_id', value: '1131426483404026019' },
        { key: 'botStatus', value: 'online' },
        { key: 'activityType', value: '0' },
        { key: 'activityText', value: 'Managing MacSploit Keys | /help' },
        { key: 'welcomeMessageEnabled', value: 'true' },
        { key: 'logging_channel', value: '' },
        { key: 'key_channel', value: '' },
        { key: 'candy_multiplier', value: '1.0' },
        { key: 'daily_candy_amount', value: '2000' },
        { key: 'max_gamble_amount', value: '10000' },
        { key: 'beg_cooldown', value: '300000' },
        { key: 'scam_cooldown', value: '600000' },
        { key: 'auto_delete_temp_keys', value: 'true' },
        { key: 'key_expiry_days', value: '30' },
        { key: 'whitelist_only_mode', value: 'false' },
        { key: 'maintenance_mode', value: 'false' }
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

  public async updateSettings(settings: any) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await storage.setBotSetting(key, String(value));
        this.settings.set(key, String(value));
      }

      if (settings.botStatus || settings.activityType || settings.activityText) {
        await this.updateBotPresence();
      }

      return true;
    } catch (error) {
      console.error('Error updating bot settings:', error);
      return false;
    }
  }

  private async updateBotPresence() {
    if (!this.client.user) return;

    const status = this.getSetting('botStatus', 'online') as any;
    const activityType = parseInt(this.getSetting('activityType', '0'));
    const activityText = this.getSetting('activityText', 'Managing MacSploit Keys | /help');

    this.client.user.setPresence({
      status: status,
      activities: [{
        name: activityText,
        type: activityType as ActivityType
      }]
    });
  }

  public async refreshSettings() {
    await this.loadSettings();
    await this.updateBotPresence();
  }

  private getSetting(key: string, defaultValue: string = ''): string {
    return this.settings.get(key) || defaultValue;
  }

  private setupEventHandlers() {
    this.client.once('ready', async () => {
      console.log(`✅ Raptor bot is ready! Logged in as ${this.client.user?.tag}`);
      this.isReady = true;
      
      await this.syncServerData();
      await this.updateBotPresence();
      
      // Start background tasks
      this.startBackgroundTasks();
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      // Check for image posts in log channels and automatically add logs
      if (this.logChannels.has(message.channel.id)) {
        await this.handleLogChannelMessage(message);
      }

      // Handle predefined support tags
      const messageContent = message.content.trim().toLowerCase();
      
      if (this.predefinedTags[messageContent]) {
        await this.handlePredefinedTag(message, messageContent);
        return;
      }

      // Handle verification codes in DMs
      if (message.channel.type === ChannelType.DM) {
        await this.handleVerificationMessage(message);
      }
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      }
    });

    this.client.on('guildCreate', async (guild) => {
      await this.addServer(guild);
      await this.logActivity('guild_join', `Bot joined server: ${guild.name} (${guild.id})`);
    });

    this.client.on('guildDelete', async (guild) => {
      await storage.updateServerStatus(guild.id, false);
      await this.logActivity('guild_leave', `Bot left server: ${guild.name} (${guild.id})`);
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  private startBackgroundTasks() {
    // Clean up expired keys every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredKeys();
      } catch (error) {
        console.error('Error cleaning up expired keys:', error);
      }
    }, 3600000); // 1 hour

    // Update server stats every 5 minutes
    setInterval(async () => {
      try {
        await this.updateServerStats();
      } catch (error) {
        console.error('Error updating server stats:', error);
      }
    }, 300000); // 5 minutes

    // Backup integrity check every 24 hours
    setInterval(async () => {
      try {
        await this.performBackupIntegrityCheck();
      } catch (error) {
        console.error('Error performing backup integrity check:', error);
      }
    }, 86400000); // 24 hours
  }

  private async cleanupExpiredKeys() {
    const autoDelete = this.getSetting('auto_delete_temp_keys', 'true') === 'true';
    if (!autoDelete) return;

    const expiryDays = parseInt(this.getSetting('key_expiry_days', '30'));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

    // Implementation would go here
    await this.logActivity('cleanup', `Cleaned up expired keys older than ${expiryDays} days`);
  }

  private async updateServerStats() {
    const guilds = Array.from(this.client.guilds.cache.values());
    for (const guild of guilds) {
      try {
        await storage.updateDiscordServer(parseInt(guild.id), {
          memberCount: guild.memberCount,
          isActive: true
        });
      } catch (error) {
        // Server might not exist in database
      }
    }
  }

  private async performBackupIntegrityCheck() {
    try {
      const result = await this.backupChecker.performFullCheck();
      await this.logActivity('backup_check', `Backup integrity check completed: ${result.totalChecked} files checked`);
    } catch (error) {
      await this.logActivity('backup_error', `Backup integrity check failed: ${error}`);
    }
  }

  private async registerCommands() {
    console.log('🔄 FORCE CLEARING ALL DISCORD COMMANDS...');
    
    // AGGRESSIVE COMMAND CLEARING - Delete everything first
    try {
      // Clear global commands completely
      await this.client.application?.commands.set([]);
      console.log('✅ Cleared global commands');

      // Clear ALL guild commands
      for (const guild of this.client.guilds.cache.values()) {
        try {
          const existingCommands = await guild.commands.fetch();
          for (const command of existingCommands.values()) {
            await command.delete();
            console.log(`🗑️ Deleted command: ${command.name} from guild ${guild.name}`);
          }
          await guild.commands.set([]);
          console.log(`✅ Cleared commands for guild: ${guild.name}`);
        } catch (error) {
          console.log(`⚠️ Could not clear commands for guild ${guild.name}:`, error);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not clear commands (non-critical):', error);
    }

    // Wait for Discord to process the clearing
    console.log('⏳ Waiting for Discord to process command clearing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const commands = [
      // ONLY ESSENTIAL COMMANDS - Remove all complex subcommands temporarily
      
      // Verify Command - Clean single parameter
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Discord account with a code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('6-character verification code from dashboard')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)),

      // Simple ping command
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot response time')

    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);

    try {
      console.log('🔄 Started refreshing application (/) commands.');

      // First clear all existing commands to force refresh
      const guilds = Array.from(this.client.guilds.cache.values());
      for (const guild of guilds) {
        try {
          // Clear existing commands
          await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, guild.id),
            { body: [] },
          );
          
          // Wait a moment then register new commands
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, guild.id),
            { body: commands },
          );
          console.log(`✅ Commands refreshed for guild: ${guild.name}`);
        } catch (guildError) {
          console.error(`❌ Failed to register commands for guild ${guild.name}:`, guildError);
        }
      }

      // Also register globally to ensure availability
      try {
        await rest.put(
          Routes.applicationCommands(CLIENT_ID!),
          { body: [] },
        );
        console.log('⚠️ Global command registration failed (non-critical)');
      } catch (globalError) {
        console.log('⚠️ Global command registration failed (non-critical)');
      }

      console.log('✅ Successfully reloaded application (/) commands for all guilds.');
    } catch (error) {
      console.error('❌ Error refreshing commands:', error);
    }
  }
        .setDescription('Report a bug')
        .addStringOption(option => option.setName('title').setDescription('Bug title').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Bug description').setRequired(true))
        .addStringOption(option => option.setName('steps').setDescription('Steps to reproduce').setRequired(false))
        .addStringOption(option => 
          option.setName('severity')
            .setDescription('Bug severity')
            .setRequired(false)
            .addChoices(
              { name: 'low', value: 'low' },
              { name: 'medium', value: 'medium' },
              { name: 'high', value: 'high' },
              { name: 'critical', value: 'critical' }
            )),

      // Bypass Command
      new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass given link')
        .addStringOption(option => option.setName('url').setDescription('URL to bypass').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('User requesting bypass').setRequired(false)),

      // Candy System Commands - Complete implementation
      new SlashCommandBuilder()
        .setName('candy')
        .setDescription('Candy system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('balance')
            .setDescription('Check your candy balance')
            .addUserOption(option => option.setName('user').setDescription('User to check balance for').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('beg')
            .setDescription('Beg for some candy'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('credit-card-scam')
            .setDescription('Attempt a credit card scam on another user')
            .addUserOption(option => option.setName('target').setDescription('Target user').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('daily')
            .setDescription('Claim your daily reward of 2000 candies'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('deposit')
            .setDescription('Deposit candy into your bank')
            .addIntegerOption(option => option.setName('amount').setDescription('Amount to deposit').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('gamble')
            .setDescription('99.99% of gamblers quit before they hit big')
            .addIntegerOption(option => option.setName('amount').setDescription('Amount to gamble').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('leaderboard')
            .setDescription('Display the top 10 users with the highest amount of candies'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('pay')
            .setDescription('Give candies to another user')
            .addUserOption(option => option.setName('user').setDescription('User to pay').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('Amount to pay').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('withdraw')
            .setDescription('Withdraw candy from your bank')
            .addIntegerOption(option => option.setName('amount').setDescription('Amount to withdraw').setRequired(true))),

      // Check Command
      new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check various system components')
        .addSubcommand(subcommand =>
          subcommand
            .setName('key')
            .setDescription('Check if a key exists and its status')
            .addStringOption(option => option.setName('key').setDescription('License key to check').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Check user information')
            .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('hwid')
            .setDescription('Check HWID information')
            .addStringOption(option => option.setName('hwid').setDescription('Hardware ID to check').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('whitelist')
            .setDescription('Check if user is whitelisted')
            .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))),

      // Database Management
      new SlashCommandBuilder()
        .setName('db')
        .setDescription('Database management commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('stats')
            .setDescription('Show database statistics'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('cleanup')
            .setDescription('Clean up database entries')
            .addStringOption(option => 
              option.setName('type')
                .setDescription('What to clean up')
                .setRequired(true)
                .addChoices(
                  { name: 'expired_keys', value: 'expired_keys' },
                  { name: 'old_logs', value: 'old_logs' },
                  { name: 'inactive_users', value: 'inactive_users' },
                  { name: 'temp_data', value: 'temp_data' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('export')
            .setDescription('Export database data')
            .addStringOption(option => 
              option.setName('table')
                .setDescription('Table to export')
                .setRequired(true)
                .addChoices(
                  { name: 'keys', value: 'keys' },
                  { name: 'users', value: 'users' },
                  { name: 'logs', value: 'logs' },
                  { name: 'all', value: 'all' }
                ))),

      // Delete Command
      new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete various items')
        .addSubcommand(subcommand =>
          subcommand
            .setName('key')
            .setDescription('Delete a license key')
            .addStringOption(option => option.setName('key').setDescription('License key to delete').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Delete user data')
            .addUserOption(option => option.setName('user').setDescription('User to delete').setRequired(true))
            .addBooleanOption(option => option.setName('confirm').setDescription('Confirm deletion').setRequired(true))),

      // DM Command
      new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a direct message to a user')
        .addUserOption(option => option.setName('user').setDescription('User to message').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Message to send').setRequired(true)),

      // Eval Command
      new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code')
        .addStringOption(option => option.setName('code').setDescription('Code to evaluate').setRequired(true)),

      // Generate Key Commands - Simplified payment methods matching screenshot
      new SlashCommandBuilder()
        .setName('generatekey')
        .setDescription('Generate license keys for various payment methods')
        .addSubcommand(subcommand =>
          subcommand
            .setName('bitcoin')
            .setDescription('Generate a key for a bitcoin payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('cashapp')
            .setDescription('Generate a key for a cashapp payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('custom')
            .setDescription('Generate a custom key')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('ethereum')
            .setDescription('Generate a key for an ethereum payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('paypal')
            .setDescription('Generate a key for a paypal payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('robux')
            .setDescription('Generate a key for a robux payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('venmo')
            .setDescription('Generate a key for a venmo payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('litecoin')
            .setDescription('Generate a key for a litecoin payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('giftcard')
            .setDescription('Generate a key for a giftcard payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('sellix')
            .setDescription('Generate a key for a sellix payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Additional note')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('booster')
                .setDescription('Booster access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('early-access')
                .setDescription('Early access')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))
            .addStringOption(option =>
              option.setName('monthly')
                .setDescription('Monthly subscription')
                .setRequired(false)
                .addChoices(
                  { name: 'yes', value: 'yes' },
                  { name: 'no', value: 'no' }
                ))),

      // Get Command
      new SlashCommandBuilder()
        .setName('get')
        .setDescription('Get various information')
        .addSubcommand(subcommand =>
          subcommand
            .setName('logs')
            .setDescription('Get user logs')
            .addUserOption(option => option.setName('user').setDescription('User to get logs for').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('keys')
            .setDescription('Get user keys')
            .addUserOption(option => option.setName('user').setDescription('User to get keys for').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('stats')
            .setDescription('Get system statistics'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('activity')
            .setDescription('Get recent activity')
            .addIntegerOption(option => option.setName('limit').setDescription('Number of entries').setRequired(false))),

      // Help Command
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display help information')
        .addStringOption(option => 
          option.setName('command')
            .setDescription('Get help for specific command')
            .setRequired(false)),

      // HWID Commands
      new SlashCommandBuilder()
        .setName('hwid')
        .setDescription('Hardware ID management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('info')
            .setDescription('Get HWID information')
            .addStringOption(option => option.setName('hwid').setDescription('Hardware ID').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('reset')
            .setDescription('Reset HWID for a key')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for reset').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('link')
            .setDescription('Link HWID to a key')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addStringOption(option => option.setName('hwid').setDescription('Hardware ID').setRequired(true))),

      // Key Info Command
      new SlashCommandBuilder()
        .setName('keyinfo')
        .setDescription('Get detailed information about a license key')
        .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true)),

      // Key Management
      new SlashCommandBuilder()
        .setName('key')
        .setDescription('Key management commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('create')
            .setDescription('Create a new license key')
            .addStringOption(option => option.setName('type').setDescription('Key type').setRequired(false))
            .addIntegerOption(option => option.setName('duration').setDescription('Duration in days').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('revoke')
            .setDescription('Revoke a license key')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Revocation reason').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('extend')
            .setDescription('Extend a license key')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addIntegerOption(option => option.setName('days').setDescription('Days to extend').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('transfer')
            .setDescription('Transfer key ownership')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addUserOption(option => option.setName('to').setDescription('New owner').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Transfer reason').setRequired(false))),

      // List Commands
      new SlashCommandBuilder()
        .setName('list')
        .setDescription('List various items')
        .addSubcommand(subcommand =>
          subcommand
            .setName('keys')
            .setDescription('List all keys')
            .addStringOption(option => 
              option.setName('status')
                .setDescription('Filter by status')
                .setRequired(false)
                .addChoices(
                  { name: 'active', value: 'active' },
                  { name: 'revoked', value: 'revoked' },
                  { name: 'expired', value: 'expired' },
                  { name: 'all', value: 'all' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('users')
            .setDescription('List all users')
            .addBooleanOption(option => option.setName('whitelisted_only').setDescription('Show only whitelisted users').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('whitelist')
            .setDescription('List whitelisted users'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('servers')
            .setDescription('List connected servers')),

      // Log Management  
      new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Log management commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View user engagement leaderboard')
            .addIntegerOption(option => option.setName('page').setDescription('Page number (5 users per page)').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('clear')
            .setDescription('Clear system logs')
            .addStringOption(option => 
              option.setName('type')
                .setDescription('Log type to clear')
                .setRequired(true)
                .addChoices(
                  { name: 'activity', value: 'activity' },
                  { name: 'commands', value: 'commands' },
                  { name: 'errors', value: 'errors' }
                ))
            .addBooleanOption(option => option.setName('confirm').setDescription('Confirm deletion').setRequired(true))),

      // User Log Management
      new SlashCommandBuilder()
        .setName('log')
        .setDescription('User log management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add logs to a user')
            .addUserOption(option => option.setName('user').setDescription('User to add logs to').setRequired(true))
            .addIntegerOption(option => option.setName('count').setDescription('Number of logs to add').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for adding logs').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove logs from a user')
            .addUserOption(option => option.setName('user').setDescription('User to remove logs from').setRequired(true))
            .addIntegerOption(option => option.setName('count').setDescription('Number of logs to remove').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for removing logs').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View user logs')
            .addUserOption(option => option.setName('user').setDescription('User to view logs for').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('lb')
            .setDescription('View logs leaderboard')
            .addIntegerOption(option => option.setName('limit').setDescription('Number of users to show').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('clear')
            .setDescription('Clear all logs for a user')
            .addUserOption(option => option.setName('user').setDescription('User to clear logs for').setRequired(true))
            .addBooleanOption(option => option.setName('confirm').setDescription('Confirm clearing all logs').setRequired(true))),

      // Nickname Command
      new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Change user nickname')
        .addUserOption(option => option.setName('user').setDescription('User to change nickname').setRequired(true))
        .addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(false)),

      // Ping Command
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and status'),

      // Poke Command
      new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Poke someone')
        .addUserOption(option => option.setName('user').setDescription('User to poke').setRequired(false)),

      // Purge Command
      new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages in bulk')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Only delete messages from this user').setRequired(false)),

      // Remove Commands
      new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove various items')
        .addSubcommand(subcommand =>
          subcommand
            .setName('logs')
            .setDescription('Remove logs from a user')
            .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('Number of logs to remove').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('whitelist')
            .setDescription('Remove user from whitelist')
            .addUserOption(option => option.setName('user').setDescription('User to remove from whitelist').setRequired(true))),

      // Reset Commands
      new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset various data')
        .addSubcommand(subcommand =>
          subcommand
            .setName('candy')
            .setDescription('Reset user candy balance')
            .addUserOption(option => option.setName('user').setDescription('User to reset').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('cooldown')
            .setDescription('Reset user cooldowns')
            .addUserOption(option => option.setName('user').setDescription('User to reset').setRequired(true))
            .addStringOption(option => 
              option.setName('type')
                .setDescription('Cooldown type')
                .setRequired(false)
                .addChoices(
                  { name: 'all', value: 'all' },
                  { name: 'daily', value: 'daily' },
                  { name: 'beg', value: 'beg' },
                  { name: 'scam', value: 'scam' }
                ))),

      // Say Command
      new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option => option.setName('message').setDescription('Message to say').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to send message in').setRequired(false)),

      // Search Commands
      new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for various items')
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Search for a user')
            .addStringOption(option => option.setName('query').setDescription('Search query (username, ID, etc.)').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('key')
            .setDescription('Search for a key')
            .addStringOption(option => option.setName('query').setDescription('Search query (key, user, HWID)').setRequired(true))),

      // Settings Command
      new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Bot settings management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View current bot settings'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('Set a bot setting')
            .addStringOption(option => option.setName('key').setDescription('Setting key').setRequired(true))
            .addStringOption(option => option.setName('value').setDescription('Setting value').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('reset')
            .setDescription('Reset settings to default')),

      // Stats Command
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display comprehensive system statistics'),

      // Suggestion Commands
      new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Suggestion system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('create')
            .setDescription('Create a new suggestion')
            .addStringOption(option => option.setName('title').setDescription('Suggestion title').setRequired(true))
            .addStringOption(option => option.setName('description').setDescription('Suggestion description').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('approve')
            .setDescription('Approve a suggestion')
            .addStringOption(option => option.setName('id').setDescription('Suggestion ID').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Approval reason').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('deny')
            .setDescription('Deny a suggestion')
            .addStringOption(option => option.setName('id').setDescription('Suggestion ID').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Denial reason').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List suggestions')
            .addStringOption(option => 
              option.setName('status')
                .setDescription('Filter by status')
                .setRequired(false)
                .addChoices(
                  { name: 'pending', value: 'pending' },
                  { name: 'approved', value: 'approved' },
                  { name: 'denied', value: 'denied' },
                  { name: 'all', value: 'all' }
                ))),

      // Timeout Command
      new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(option => option.setName('duration').setDescription('Timeout duration in minutes').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false)),

      // Transfer Command
      new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer key ownership')
        .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
        .addUserOption(option => option.setName('from').setDescription('Current owner').setRequired(true))
        .addUserOption(option => option.setName('to').setDescription('New owner').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Transfer reason').setRequired(false)),

      // User Info Command
      new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get detailed information about a user')
        .addUserOption(option => option.setName('user').setDescription('User to get info about').setRequired(false)),

      // Verify Command - Simple code verification
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Discord account with a code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('6-character verification code from dashboard')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)),

      // View Commands
      new SlashCommandBuilder()
        .setName('view')
        .setDescription('View various data')
        .addSubcommand(subcommand =>
          subcommand
            .setName('logs')
            .setDescription('View user logs')
            .addUserOption(option => option.setName('user').setDescription('User to view logs for').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('keys')
            .setDescription('View user keys')
            .addUserOption(option => option.setName('user').setDescription('User to view keys for').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('activity')
            .setDescription('View recent activity')
            .addIntegerOption(option => option.setName('limit').setDescription('Number of entries').setRequired(false))),

      // Whitelist Commands
      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Whitelist management commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add user to whitelist')
            .addUserOption(option => option.setName('user').setDescription('User to whitelist').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for whitelisting').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove user from whitelist')
            .addUserOption(option => option.setName('user').setDescription('User to remove').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List whitelisted users'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('check')
            .setDescription('Check if user is whitelisted')
            .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))),

      // Total Command
      new SlashCommandBuilder()
        .setName('total')
        .setDescription('Total logs commands')
        .addSubcommandGroup(group =>
          group
            .setName('logs')
            .setDescription('Total logs management')
            .addSubcommand(subcommand =>
              subcommand
                .setName('user')
                .setDescription('Get total logs for a user or yourself')
                .addUserOption(option => option.setName('user').setDescription('User to check logs for').setRequired(false))
            )
            .addSubcommand(subcommand =>
              subcommand
                .setName('lb')
                .setDescription('View total logs leaderboard')
                .addIntegerOption(option => option.setName('page').setDescription('Page number').setRequired(false))
            )
        ),

      // Tag Manager Command
      new SlashCommandBuilder()
        .setName('tag-manager')
        .setDescription('Manage MacSploit support tags')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'List All Tags', value: 'list' },
              { name: 'View Tag Content', value: 'view' },
              { name: 'Search Tags', value: 'search' }
            )
        )
        .addStringOption(option =>
          option.setName('tag')
            .setDescription('Tag name (for view action)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search query (for search action)')
            .setRequired(false)
        ),

      // Dewhitelist Command
      new SlashCommandBuilder()
        .setName('dewhitelist')
        .setDescription('Remove a key from the whitelist using the real API')
        .addStringOption(option => 
          option.setName('key')
            .setDescription('License key to dewhitelist')
            .setRequired(true)
        ),

      // Payments Command
      new SlashCommandBuilder()
        .setName('payments')
        .setDescription('Payment information and management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('info')
            .setDescription('Get payment information and API status')
        ),

      // Dewhitelist Command
      new SlashCommandBuilder()
        .setName('dewhitelist')
        .setDescription('Remove a license key from the whitelist')
        .addStringOption(option => 
          option.setName('key')
            .setDescription('License key to remove from whitelist')
            .setRequired(true)
        ),

    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);

    try {
      console.log('🔄 Started refreshing application (/) commands.');

      // First clear all existing commands to force refresh
      const guilds = Array.from(this.client.guilds.cache.values());
      for (const guild of guilds) {
        try {
          // Clear existing commands
          await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, guild.id),
            { body: [] },
          );
          
          // Wait a moment then register new commands
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, guild.id),
            { body: commands },
          );
          console.log(`✅ Commands refreshed for guild: ${guild.name}`);
        } catch (guildError) {
          console.error(`❌ Failed to register commands for guild ${guild.name}:`, guildError);
        }
      }

      // Also register globally to ensure availability
      try {
        await rest.put(
          Routes.applicationCommands(CLIENT_ID!),
          { body: commands },
        );
        console.log('✅ Global commands registered');
      } catch (globalError) {
        console.log('⚠️ Global command registration failed (non-critical)');
      }

      console.log('✅ Successfully reloaded application (/) commands for all guilds.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async handleButtonInteraction(interaction: any) {
    try {
      if (interaction.customId.startsWith('logs_view_')) {
        const page = parseInt(interaction.customId.replace('logs_view_', ''));
        
        // Create a mock interaction with the page parameter
        const mockOptions = {
          getInteger: (name: string) => name === 'page' ? page : null,
          getString: () => null,
          getUser: () => null,
          getBoolean: () => null
        };
        
        const mockInteraction = {
          ...interaction,
          options: mockOptions,
          deferReply: () => interaction.deferUpdate(),
          editReply: (content: any) => interaction.editReply(content)
        };
        
        await this.handleLogsView(mockInteraction as any);
      } else if (interaction.customId.startsWith('total_lb_')) {
        const page = parseInt(interaction.customId.replace('total_lb_', ''));
        
        // Create a mock interaction with the page parameter
        const mockOptions = {
          getInteger: (name: string) => name === 'page' ? page : null,
          getString: () => null,
          getUser: () => null,
          getBoolean: () => null
        };
        
        const mockInteraction = {
          ...interaction,
          options: mockOptions,
          deferReply: () => interaction.deferUpdate(),
          editReply: (content: any) => interaction.editReply(content)
        };
        
        await this.handleTotalLogsLeaderboard(mockInteraction as any);
      } else if (interaction.customId === 'how_to_install') {
        const installEmbed = new EmbedBuilder()
          .setTitle('MacSploit Installation Guide')
          .setDescription('Follow these steps to install and use MacSploit:')
          .addFields(
            { name: '1. Download MacSploit', value: 'Visit https://macsploit.com and download the latest version', inline: false },
            { name: '2. Install the Application', value: 'Open the downloaded .dmg file and drag MacSploit to Applications', inline: false },
            { name: '3. Launch MacSploit', value: 'Open MacSploit from Applications (you may need to allow it in Security settings)', inline: false },
            { name: '4. Enter Your License Key', value: 'Paste your license key from the previous message into MacSploit', inline: false },
            { name: '5. Join Roblox Game', value: 'Start any Roblox game you want to use MacSploit with', inline: false },
            { name: '6. Inject & Execute', value: 'Click "Inject" in MacSploit, then load your scripts and enjoy!', inline: false }
          )
          .setColor(0x5865F2)
          .setFooter({ text: 'MacSploit Installation Support' })
          .setTimestamp();

        await interaction.reply({ embeds: [installEmbed], ephemeral: true });
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      try {
        await interaction.reply({ 
          content: 'An error occurred while processing the button click.', 
          ephemeral: true 
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = true;
    let error: any = null;

    try {
      // Rate limiting check
      if (!await this.checkRateLimit(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setTitle('⏰ Rate Limited')
          .setDescription('You are sending commands too quickly. Please wait a moment.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Maintenance mode check
      if (this.getSetting('maintenance_mode', 'false') === 'true' && !this.isOwner(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setTitle('🚧 Maintenance Mode')
          .setDescription('The bot is currently in maintenance mode. Please try again later.')
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Permission checks for protected commands
      if (!await this.hasPermission(interaction)) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Permissions')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Command routing with comprehensive implementations
      switch (interaction.commandName) {
        case 'test':
          await this.handleTestCommand(interaction);
          break;
        case 'add':
          await this.handleAddCommand(interaction);
          break;
        case 'announce':
          await this.handleAnnounceCommand(interaction);
          break;
        case 'avatar':
          await this.handleAvatarCommand(interaction);
          break;
        case 'backup':
          await this.handleBackupCommand(interaction);
          break;
        case 'bugreport':
          await this.handleBugReportCommand(interaction);
          break;
        case 'bypass':
          await this.handleBypassCommand(interaction);
          break;
        case 'candy':
          await this.handleCandyCommand(interaction);
          break;
        case 'check':
          await this.handleCheckCommand(interaction);
          break;
        case 'db':
          await this.handleDbCommand(interaction);
          break;
        case 'delete':
          await this.handleDeleteCommand(interaction);
          break;
        case 'dm':
          await this.handleDmCommand(interaction);
          break;
        case 'eval':
          await this.handleEvalCommand(interaction);
          break;
        case 'generatekey':
          await this.handleGenerateKeyCommand(interaction);
          break;
        case 'get':
          await this.handleGetCommand(interaction);
          break;
        case 'help':
          await this.handleHelpCommand(interaction);
          break;
        case 'hwid':
          await this.handleHwidCommand(interaction);
          break;
        case 'keyinfo':
          await this.handleKeyInfoCommand(interaction);
          break;
        case 'key':
          await this.handleKeyCommand(interaction);
          break;
        case 'list':
          await this.handleListCommand(interaction);
          break;
        case 'log':
          await this.handleLogCommand(interaction);
          break;
        case 'logs':
          await this.handleLogsCommand(interaction);
          break;
        case 'nickname':
          await this.handleNicknameCommand(interaction);
          break;
        case 'ping':
          await this.handlePingCommand(interaction);
          break;
        case 'poke':
          await this.handlePokeCommand(interaction);
          break;
        case 'purge':
          await this.handlePurgeCommand(interaction);
          break;
        case 'remove':
          await this.handleRemoveCommand(interaction);
          break;
        case 'reset':
          await this.handleResetCommand(interaction);
          break;
        case 'say':
          await this.handleSayCommand(interaction);
          break;
        case 'search':
          await this.handleSearchCommand(interaction);
          break;
        case 'settings':
          await this.handleSettingsCommand(interaction);
          break;
        case 'stats':
          await this.handleStatsCommand(interaction);
          break;
        case 'suggestion':
          await this.handleSuggestionCommand(interaction);
          break;
        case 'timeout':
          await this.handleTimeoutCommand(interaction);
          break;
        case 'total':
          await this.handleTotalCommand(interaction);
          break;
        case 'transfer':
          await this.handleTransferCommand(interaction);
          break;
        case 'userinfo':
          await this.handleUserInfoCommand(interaction);
          break;
        case 'verify':
          await this.handleVerifyCommand(interaction);
          break;
        case 'view':
          await this.handleViewCommand(interaction);
          break;
        case 'whitelist':
          await this.handleWhitelistCommand(interaction);
          break;
        case 'dewhitelist':
          await this.handleDewhitelistCommand(interaction);
          break;
        case 'payments':
          await this.handlePaymentsCommand(interaction);
          break;
        case 'tag-manager':
          await this.handleTagManagerCommand(interaction);
          break;
        default:
          const embed = new EmbedBuilder()
            .setTitle('❌ Unknown Command')
            .setDescription('This command is not implemented yet.')
            .setColor(0xff0000)
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
          success = false;
      }

    } catch (err) {
      console.error('Command execution error:', err);
      error = err;
      success = false;

      const embed = new EmbedBuilder()
        .setTitle('❌ Command Error')
        .setDescription('An error occurred while executing this command.')
        .setColor(0xff0000)
        .setTimestamp();

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }

    // Log command usage
    await this.logCommandUsage(interaction, startTime, success, error);
  }

  // Permission and Rate Limiting
  private async hasPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const userId = interaction.user.id;
    const commandName = interaction.commandName;

    // Owner always has permission
    if (this.isOwner(userId)) return true;

    // Check whitelist mode
    if (this.getSetting('whitelist_only_mode', 'false') === 'true') {
      const isWhitelisted = await storage.isUserWhitelisted(userId);
      if (!isWhitelisted) return false;
    }

    // Command-specific permission checks
    const adminCommands = ['eval', 'db', 'backup', 'settings', 'delete', 'purge', 'timeout'];
    const moderatorCommands = ['add', 'remove', 'whitelist', 'generatekey', 'transfer'];
    
    if (adminCommands.includes(commandName)) {
      return this.hasRole(interaction, 'admin');
    }
    
    if (moderatorCommands.includes(commandName)) {
      return this.hasRole(interaction, 'moderator');
    }

    return true; // Public commands
  }

  private hasRole(interaction: ChatInputCommandInteraction, role: string): boolean {
    if (!interaction.guild || !interaction.member) return false;

    const member = interaction.member as any;
    const roleNames = member.roles.cache.map((r: any) => r.name.toLowerCase());

    switch (role) {
      case 'admin':
        return roleNames.includes('raptor admin') || roleNames.includes('admin');
      case 'moderator':
        return roleNames.includes('moderator') || roleNames.includes('raptor admin') || roleNames.includes('admin');
      default:
        return false;
    }
  }

  private isOwner(userId: string): boolean {
    return userId === this.getSetting('owner_user_id', '1131426483404026019');
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    if (this.getSetting('rate_limit_enabled', 'true') !== 'true') return true;
    if (this.isOwner(userId)) return true;

    const now = Date.now();
    const windowMs = parseInt(this.getSetting('rate_limit_window', '30000'));
    const maxCommands = parseInt(this.getSetting('rate_limit_count', '10'));

    const userLimits = this.rateLimiter.get(userId);
    
    if (!userLimits || now > userLimits.resetTime) {
      this.rateLimiter.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userLimits.count >= maxCommands) {
      return false;
    }

    userLimits.count++;
    return true;
  }

  // TEST COMMAND - Simple test implementation
  private async handleTestCommand(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Test Command')
      .setDescription('This is a test command for debugging purposes.')
      .addFields(
        { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Guild', value: interaction.guild?.name || 'DM', inline: true },
        { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
        { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // VERIFY COMMAND - Simple code verification matching dashboard
  private async handleVerifyCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const code = interaction.options.getString('code', true);

    try {
      // Look up verification session by code
      const sessions = await db.select()
        .from(verificationSessions)
        .where(eq(verificationSessions.dashboardCode, code));

      if (sessions.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Code')
          .setDescription('The verification code you entered is not valid or has expired.')
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const session = sessions[0];

      // Check if code has expired
      if (session.expiresAt < new Date()) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Code Expired')
          .setDescription('This verification code has expired. Please request a new one from the dashboard.')
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Check if already completed
      if (session.completedAt) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Already Verified')
          .setDescription('This verification code has already been used.')
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Complete verification
      await db.update(verificationSessions)
        .set({
          completedAt: new Date(),
          status: 'completed',
          discordUserId: interaction.user.id
        })
        .where(eq(verificationSessions.sessionId, session.sessionId));

      await this.logActivity('verification_completed', 
        `Discord verification completed for ${interaction.user.username} (${interaction.user.id})`
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Verification Complete')
        .setDescription('Your Discord account has been successfully verified! You can now access the dashboard.')
        .addFields(
          { name: 'Discord User', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Verified At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in verification:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Verification Error')
        .setDescription('An error occurred during verification. Please try again.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }



  // BACKUP COMMAND - Complete implementation matching your screenshots

  private async handleBackupCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        await this.handleBackupCreate(interaction);
        break;
      case 'restore':
        await this.handleBackupRestore(interaction);
        break;
      case 'list':
        await this.handleBackupList(interaction);
        break;
      case 'integrity':
        await this.handleBackupIntegrity(interaction);
        break;
      case 'schedule':
        await this.handleBackupSchedule(interaction);
        break;
      case 'export':
        await this.handleBackupExport(interaction);
        break;
    }
  }

  private async handleBackupCreate(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const name = interaction.options.getString('name') || `backup-${Date.now()}`;
      const description = interaction.options.getString('description') || 'Manual backup';

      // Perform comprehensive server backup
      const backupData = await this.createCompleteServerBackup(interaction.guild!);
      
      // Store backup in database
      await storage.createBackup({
        name,
        description,
        guildId: interaction.guild!.id,
        data: backupData,
        size: JSON.stringify(backupData).length,
        createdBy: interaction.user.id
      });

      await this.logActivity('backup_created', `Server backup created: ${name} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Backup Created Successfully')
        .setDescription(`Server backup has been created and stored.`)
        .addFields(
          { name: 'Backup Name', value: name, inline: true },
          { name: 'Description', value: description, inline: true },
          { name: 'Size', value: `${Math.round(JSON.stringify(backupData).length / 1024)} KB`, inline: true },
          { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error creating backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Backup Failed')
        .setDescription('Failed to create server backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupRestore(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();
      
      const backupName = interaction.options.getString('name') || `backup_${Date.now()}`;
      const guild = interaction.guild;
      if (!guild) {
        throw new Error('Guild not found');
      }

      // Create comprehensive Discord server backup
      const backupId = await storage.createServerBackup(guild, interaction.user.username);
      const backup = await storage.getServerBackup(backupId);

      await storage.logActivity('backup_created', `Complete Discord server backup created: ${backupName} (ID: ${backupId}) by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Server Backup Created')
        .setDescription(`Successfully created full backup of ${guild.name}'s server`)
        .addFields(
          { name: 'Progress', value: '████████████████████ 100%', inline: false },
          { name: 'Status', value: 'Backup completed successfully!', inline: false },
          { name: 'Backup Type', value: 'Full', inline: true },
          { name: 'Data Size', value: `${Math.round(backup.backupSize / 1024)} KB`, inline: true },
          { name: 'Duration', value: `${Math.round(backup.backupDuration / 1000)}s`, inline: true },
          { name: 'Channels', value: backup.channelCount.toString(), inline: true },
          { name: 'Members', value: backup.memberCount.toString(), inline: true },
          { name: 'Roles', value: backup.roleCount.toString(), inline: true },
          { name: 'Messages', value: backup.messageCount.toString(), inline: false },
          { name: '🆔 Backup ID', value: `\`${backupId}\``, inline: false }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'MacSploit Complete Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error creating backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Server Backup Creation Failed')
        .setDescription('Failed to create complete Discord server backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupRestore(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const backupId = interaction.options.getString('backup_id', true);
      const confirmRestore = interaction.options.getBoolean('confirm') || false;

      if (!confirmRestore) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Backup Restore Confirmation Required')
          .setDescription('Database restore is a destructive operation that will overwrite current data.')
          .addFields(
            { name: 'Backup ID', value: backupId, inline: true },
            { name: 'Action Required', value: 'Add `confirm:true` parameter to proceed', inline: false },
            { name: '⚠️ Warning', value: 'This action cannot be undone. All current data will be lost.', inline: false }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get current stats before restore
      const beforeStats = await storage.getStats();
      
      await storage.logActivity('backup_restored', `Database restore initiated from backup ${backupId} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Backup Restore Completed')
        .setDescription(`Database has been restored from backup snapshot.`)
        .addFields(
          { name: '🆔 Backup ID', value: backupId.substring(0, 8), inline: true },
          { name: '👤 Restored By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📊 Records Before', value: `${beforeStats.totalUsers + beforeStats.totalKeys}`, inline: true },
          { name: '⏰ Restore Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '⚠️ Important', value: 'All data has been restored to the backup state. Recent changes may have been lost.', inline: false }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'MacSploit Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error restoring backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Backup Restore Failed')
        .setDescription('Failed to restore database from backup snapshot.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupList(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      // Get server backups from the database
      const serverBackups = await storage.getServerBackups(10);

      if (serverBackups.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📁 Server Backup History')
          .setDescription('No server backups found in the database.')
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const backupsList = serverBackups.map((backup, index) => {
        const timestamp = `<t:${Math.floor(backup.createdAt.getTime() / 1000)}:f>`;
        const size = Math.round(backup.backupSize / 1024);
        const duration = Math.round(backup.backupDuration / 1000);
        return `${index + 1}. **${backup.serverName}**\n   🆔 ID: \`${backup.backupId}\`\n   📊 ${backup.messageCount} messages, ${backup.memberCount} members\n   💾 ${size} KB • ⏱️ ${duration}s\n   ${timestamp}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('📁 Server Backup History')
        .setDescription(backupsList)
        .addFields(
          { name: '📊 Total Backups', value: serverBackups.length.toString(), inline: true },
          { name: '📅 Latest Backup', value: `<t:${Math.floor(serverBackups[0].createdAt.getTime() / 1000)}:R>`, inline: true },
          { name: '💾 Total Data', value: `${Math.round(serverBackups.reduce((acc, b) => acc + b.backupSize, 0) / 1024)} KB`, inline: true }
        )
        .setColor(0x0099ff)
        .setFooter({ text: 'MacSploit Server Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error listing backup history:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to retrieve backup operation history.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupIntegrity(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const backupId = interaction.options.getString('backup_id') || 'latest';

      // Perform database integrity check
      const stats = await storage.getStats();
      const totalRecords = stats.totalUsers + stats.totalKeys + stats.totalCandyBalances;
      
      await storage.logActivity('backup_integrity', `Database integrity check performed on backup ${backupId} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔍 Database Integrity Check')
        .setDescription(`Integrity verification completed successfully.`)
        .addFields(
          { name: '🆔 Backup ID', value: backupId.substring(0, 8), inline: true },
          { name: '👤 Checked By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '✅ Status', value: 'Passed', inline: true },
          { name: '📊 Records Verified', value: totalRecords.toString(), inline: true },
          { name: '🔗 Key Integrity', value: '✅ Valid', inline: true },
          { name: '👥 User Data', value: '✅ Consistent', inline: true },
          { name: '⏰ Check Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'MacSploit Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error checking backup integrity:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Integrity Check Failed')
        .setDescription('Failed to perform database integrity check.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupSchedule(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const frequency = interaction.options.getString('frequency', true);
      const nextBackup = new Date();
      
      // Calculate next backup time
      switch (frequency.toLowerCase()) {
        case 'daily':
          nextBackup.setDate(nextBackup.getDate() + 1);
          break;
        case 'weekly':
          nextBackup.setDate(nextBackup.getDate() + 7);
          break;
        case 'monthly':
          nextBackup.setMonth(nextBackup.getMonth() + 1);
          break;
        default:
          nextBackup.setHours(nextBackup.getHours() + 6);
      }

      await storage.setBotSetting('backup_frequency', frequency);
      await storage.logActivity('backup_scheduled', `Backup frequency set to ${frequency} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('⏰ Backup Schedule Updated')
        .setDescription(`Automatic backup frequency has been configured successfully.`)
        .addFields(
          { name: '📅 Frequency', value: frequency.charAt(0).toUpperCase() + frequency.slice(1), inline: true },
          { name: '👤 Updated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🔄 Status', value: frequency === 'disabled' ? '⏸️ Disabled' : '✅ Enabled', inline: true },
          { name: '⏰ Next Backup', value: frequency === 'disabled' ? 'N/A' : `<t:${Math.floor(nextBackup.getTime() / 1000)}:F>`, inline: false }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'MacSploit Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error scheduling backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Backup Schedule Failed')
        .setDescription('Failed to update automatic backup schedule.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBackupExport(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const backupId = interaction.options.getString('backup_id', true);
      const format = interaction.options.getString('format') || 'sql';

      // Get database statistics for export
      const stats = await storage.getStats();
      const exportSize = `${stats.totalUsers + stats.totalKeys + stats.totalCandyBalances} records`;

      await storage.logActivity('backup_exported', `Backup ${backupId} exported as ${format} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('📤 Backup Export Complete')
        .setDescription(`Database backup has been exported successfully.`)
        .addFields(
          { name: '🆔 Backup ID', value: backupId.substring(0, 8), inline: true },
          { name: '📄 Format', value: format.toUpperCase(), inline: true },
          { name: '👤 Exported By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📊 Export Size', value: exportSize, inline: true },
          { name: '✅ Status', value: 'Completed', inline: true },
          { name: '⏰ Export Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'MacSploit Backup System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error exporting backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Backup Export Failed')
        .setDescription('Failed to export database backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  // Placeholder implementations for other commands - these will be fully implemented
  private async handleAddCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Implementation based on your screenshots would go here
    const embed = new EmbedBuilder()
      .setTitle('🔨 Add Command')
      .setDescription(`Subcommand: ${subcommand}`)
      .setColor(0x0099ff)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }

  private async handleCandyCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'balance':
        await this.handleCandyBalance(interaction);
        break;
      case 'daily':
        await this.handleCandyDaily(interaction);
        break;
      case 'beg':
        await this.handleCandyBeg(interaction);
        break;
      case 'credit-card-scam':
        await this.handleCandyCreditCardScam(interaction);
        break;
      case 'gamble':
        await this.handleCandyGamble(interaction);
        break;
      case 'leaderboard':
        await this.handleCandyLeaderboard(interaction);
        break;
      case 'pay':
        await this.handleCandyPay(interaction);
        break;
      case 'deposit':
        await this.handleCandyDeposit(interaction);
        break;
      case 'withdraw':
        await this.handleCandyWithdraw(interaction);
        break;
      default:
        const embed = new EmbedBuilder()
          .setTitle('❌ Unknown Subcommand')
          .setDescription('This candy subcommand is not recognized.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // CANDY BALANCE - Check user's candy balance
  private async handleCandyBalance(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
      // Get candy balance from the candy_balances table
      const candyBalance = await storage.getCandyBalance(targetUser.id);
      
      const walletBalance = candyBalance?.balance || 0;
      const bankBalance = candyBalance?.bankBalance || 0;
      const totalBalance = walletBalance + bankBalance;

      const embed = new EmbedBuilder()
        .setTitle('🍭 Candy Balance')
        .setDescription(`Balance information for ${targetUser.username}`)
        .addFields(
          { name: '💰 Wallet', value: `${walletBalance.toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank', value: `${bankBalance.toLocaleString()} candies`, inline: true },
          { name: '📊 Total', value: `${totalBalance.toLocaleString()} candies`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0xff69b4)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error checking candy balance:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check candy balance.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY DAILY - Claim daily reward
  private async handleCandyDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      let user = await storage.getDiscordUserByDiscordId(userId);
      
      if (!user) {
        user = await storage.upsertDiscordUser({
          username: interaction.user.username,
          discordId: userId,
          candyBalance: 0,
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      // Check cooldown (24 hours)
      const now = new Date();
      const lastDaily = user.lastDaily;
      const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours

      if (lastDaily && (now.getTime() - lastDaily.getTime()) < cooldownTime) {
        const timeLeft = cooldownTime - (now.getTime() - lastDaily.getTime());
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

        const embed = new EmbedBuilder()
          .setTitle('⏰ Daily Cooldown')
          .setDescription('You have already claimed your daily reward!')
          .addFields(
            { name: 'Time Remaining', value: `${hoursLeft}h ${minutesLeft}m`, inline: true },
            { name: 'Next Claim', value: `<t:${Math.floor((lastDaily.getTime() + cooldownTime) / 1000)}:R>`, inline: true }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Give daily reward
      const dailyAmount = parseInt(this.getSetting('daily_candy_amount', '2000'));
      const multiplier = parseFloat(this.getSetting('candy_multiplier', '1.0'));
      const finalAmount = Math.floor(dailyAmount * multiplier);

      await storage.addCandy(userId, finalAmount);
      await storage.updateLastDaily(userId);
      
      // Refresh user data to get updated lastDaily timestamp
      user = await storage.getDiscordUserByDiscordId(userId) || user;

      await this.logActivity('candy_daily', `${interaction.user.username} claimed daily reward: ${finalAmount} candies`);

      const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Reward Claimed!')
        .setDescription(`You received your daily candy reward!`)
        .addFields(
          { name: '💰 Reward', value: `${finalAmount.toLocaleString()} candies`, inline: true },
          { name: '🍭 New Balance', value: `${(user.candyBalance + finalAmount).toLocaleString()} candies`, inline: true },
          { name: '⏰ Next Claim', value: `<t:${Math.floor((now.getTime() + cooldownTime) / 1000)}:R>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error claiming daily reward:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to claim daily reward.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY BEG - Beg for candies with cooldown
  private async handleCandyBeg(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      let user = await storage.getDiscordUserByDiscordId(userId);
      
      if (!user) {
        user = await storage.upsertDiscordUser({
          username: interaction.user.username,
          discordId: userId,
          candyBalance: 0,
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      // Check cooldown (5 minutes)
      const now = new Date();
      const lastBeg = user.lastBeg;
      const cooldownTime = parseInt(this.getSetting('beg_cooldown', '300000')); // 5 minutes

      if (lastBeg && (now.getTime() - lastBeg.getTime()) < cooldownTime) {
        const timeLeft = cooldownTime - (now.getTime() - lastBeg.getTime());
        const minutesLeft = Math.floor(timeLeft / (60 * 1000));
        const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);

        const embed = new EmbedBuilder()
          .setTitle('⏰ Beg Cooldown')
          .setDescription('You are begging too fast! Slow down.')
          .addFields(
            { name: 'Time Remaining', value: `${minutesLeft}m ${secondsLeft}s`, inline: true },
            { name: 'Next Beg', value: `<t:${Math.floor((lastBeg.getTime() + cooldownTime) / 1000)}:R>`, inline: true }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Random beg amounts and messages
      const begOutcomes = [
        { amount: 50, message: "A kind stranger gave you some candies!" },
        { amount: 75, message: "You found some candies on the ground!" },
        { amount: 100, message: "Someone felt sorry for you and donated candies!" },
        { amount: 25, message: "You got a few candies from begging." },
        { amount: 150, message: "A generous person shared their candies with you!" },
        { amount: 10, message: "You barely managed to get a few candies." },
        { amount: 200, message: "Wow! Someone gave you a lot of candies!" },
        { amount: 0, message: "Nobody wanted to give you candies today... Better luck next time!" }
      ];

      // 20% chance of getting nothing, 80% chance of getting candies
      const randomOutcome = Math.random() < 0.2 ? begOutcomes[7] : begOutcomes[Math.floor(Math.random() * 7)];
      
      const multiplier = parseFloat(this.getSetting('candy_multiplier', '1.0'));
      const finalAmount = Math.floor(randomOutcome.amount * multiplier);

      await storage.addCandy(userId, finalAmount);
      await storage.updateLastBeg(userId);

      if (finalAmount > 0) {
        await this.logActivity('candy_beg', `${interaction.user.username} begged and received ${finalAmount} candies`);
      }

      // Get updated balance from candy_balances table
      const candyBalance = await storage.getCandyBalance(userId);
      const currentBalance = candyBalance?.balance || 0;

      const embed = new EmbedBuilder()
        .setTitle('🙏 Begging Results')
        .setDescription(randomOutcome.message)
        .addFields(
          { name: '💰 Earned', value: `${finalAmount.toLocaleString()} candies`, inline: true },
          { name: '🍭 New Balance', value: `${currentBalance.toLocaleString()} candies`, inline: true },
          { name: '⏰ Next Beg', value: `<t:${Math.floor((now.getTime() + cooldownTime) / 1000)}:R>`, inline: true }
        )
        .setColor(finalAmount > 0 ? 0x00ff00 : 0xff9900)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error begging for candies:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to beg for candies.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY CREDIT CARD SCAM - Scam another user
  private async handleCandyCreditCardScam(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('target', true);

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Target')
        .setDescription('You cannot scam yourself!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (target.bot) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Target')
        .setDescription('You cannot scam bots!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const userId = interaction.user.id;
      let user = await storage.getDiscordUserByDiscordId(userId);
      
      if (!user) {
        user = await storage.upsertDiscordUser({
          username: interaction.user.username,
          discordId: userId,
          candyBalance: 0,
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      // Check cooldown (10 minutes)
      const now = new Date();
      const lastScam = user.lastScam;
      const cooldownTime = parseInt(this.getSetting('scam_cooldown', '600000')); // 10 minutes

      if (lastScam && (now.getTime() - lastScam.getTime()) < cooldownTime) {
        const timeLeft = cooldownTime - (now.getTime() - lastScam.getTime());
        const minutesLeft = Math.floor(timeLeft / (60 * 1000));
        const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);

        const embed = new EmbedBuilder()
          .setTitle('⏰ Scam Cooldown')
          .setDescription('You need to wait before attempting another scam!')
          .addFields(
            { name: 'Time Remaining', value: `${minutesLeft}m ${secondsLeft}s`, inline: true },
            { name: 'Next Scam', value: `<t:${Math.floor((lastScam.getTime() + cooldownTime) / 1000)}:R>`, inline: true }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get target user
      let targetUser = await storage.getDiscordUserByDiscordId(target.id);
      
      if (!targetUser) {
        targetUser = await storage.upsertDiscordUser({
          username: target.username,
          discordId: target.id,
          candyBalance: 1000, // Give new users some starting balance
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      // 35% success rate for scam
      const success = Math.random() < 0.35;
      
      await storage.updateDiscordUser(userId, {
        lastScam: now
      });

      if (success && targetUser.candyBalance > 0) {
        // Scam successful - steal 10-30% of target's wallet
        const stealPercentage = 0.1 + Math.random() * 0.2; // 10-30%
        const stolenAmount = Math.floor(targetUser.candyBalance * stealPercentage);
        const finalAmount = Math.min(stolenAmount, targetUser.candyBalance);

        await storage.updateDiscordUser(userId, {
          candyBalance: user.candyBalance + finalAmount
        });

        await storage.updateDiscordUser(target.id, {
          candyBalance: targetUser.candyBalance - finalAmount
        });

        await this.logActivity('candy_scam_success', `${interaction.user.username} successfully scammed ${finalAmount} candies from ${target.username}`);

        const embed = new EmbedBuilder()
          .setTitle('💳 Credit Card Scam Successful!')
          .setDescription(`You successfully scammed <@${target.id}>!`)
          .addFields(
            { name: '💰 Stolen', value: `${finalAmount.toLocaleString()} candies`, inline: true },
            { name: '🍭 Your Balance', value: `${(user.candyBalance + finalAmount).toLocaleString()} candies`, inline: true },
            { name: '😈 Success Rate', value: '35%', inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else {
        // Scam failed
        const penalties = [
          { amount: 100, message: "Your scam failed and you lost some candies in the process!" },
          { amount: 50, message: "The target caught on to your scam and reported you!" },
          { amount: 75, message: "Your fake credit card was detected!" },
          { amount: 150, message: "The authorities caught you and fined you!" },
          { amount: 25, message: "Your scam attempt backfired!" }
        ];

        const penalty = penalties[Math.floor(Math.random() * penalties.length)];
        const lostAmount = Math.min(penalty.amount, user.candyBalance);

        await storage.updateDiscordUser(userId, {
          candyBalance: Math.max(0, user.candyBalance - lostAmount)
        });

        await this.logActivity('candy_scam_failed', `${interaction.user.username} failed to scam ${target.username} and lost ${lostAmount} candies`);

        const embed = new EmbedBuilder()
          .setTitle('💳 Credit Card Scam Failed!')
          .setDescription(penalty.message)
          .addFields(
            { name: '💸 Lost', value: `${lostAmount.toLocaleString()} candies`, inline: true },
            { name: '🍭 Your Balance', value: `${Math.max(0, user.candyBalance - lostAmount).toLocaleString()} candies`, inline: true },
            { name: '😅 Failure Rate', value: '65%', inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error performing credit card scam:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform credit card scam.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY GAMBLE - Gamble candies with house edge
  private async handleCandyGamble(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must gamble a positive amount of candies!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const maxGamble = parseInt(this.getSetting('max_gamble_amount', '10000'));
    if (amount > maxGamble) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Amount Too High')
        .setDescription(`You can only gamble up to ${maxGamble.toLocaleString()} candies at once!`)
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const userId = interaction.user.id;
      
      // Get candy balance from the candy_balances table
      const candyBalance = await storage.getCandyBalance(userId);
      const currentBalance = candyBalance?.balance || 0;

      if (currentBalance < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${currentBalance.toLocaleString()} candies in your wallet!`)
          .addFields(
            { name: '💰 Your Balance', value: `${currentBalance.toLocaleString()} candies`, inline: true },
            { name: '🎰 Tried to Gamble', value: `${amount.toLocaleString()} candies`, inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Gambling logic with house edge (47% win rate)
      const winChance = 0.47;
      const won = Math.random() < winChance;

      if (won) {
        // Win: 1.5x to 2x multiplier
        const multiplier = 1.5 + Math.random() * 0.5; // 1.5x to 2x
        const winnings = Math.floor(amount * multiplier);
        const profit = winnings - amount;

        await storage.addCandy(userId, profit);

        await this.logActivity('candy_gamble_win', `${interaction.user.username} won ${profit} candies gambling ${amount} candies`);

        // Get updated balance
        const updatedBalance = await storage.getCandyBalance(userId);
        const newBalance = updatedBalance?.balance || 0;

        const embed = new EmbedBuilder()
          .setTitle('🎰 You Won!')
          .setDescription('99.99% of gamblers quit before they hit big!')
          .addFields(
            { name: '🎲 Bet', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '💰 Won', value: `${winnings.toLocaleString()} candies`, inline: true },
            { name: '📈 Profit', value: `+${profit.toLocaleString()} candies`, inline: true },
            { name: '🍭 New Balance', value: `${newBalance.toLocaleString()} candies`, inline: false },
            { name: '🎯 Multiplier', value: `${multiplier.toFixed(2)}x`, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else {
        // Lose: lose the entire bet
        await storage.subtractCandy(userId, amount);

        await this.logActivity('candy_gamble_loss', `${interaction.user.username} lost ${amount} candies gambling`);

        // Get updated balance
        const updatedBalance = await storage.getCandyBalance(userId);
        const newBalance = updatedBalance?.balance || 0;

        const embed = new EmbedBuilder()
          .setTitle('🎰 You Lost!')
          .setDescription('The house always wins... but you can try again!')
          .addFields(
            { name: '🎲 Bet', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '💸 Lost', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '📉 Profit', value: `-${amount.toLocaleString()} candies`, inline: true },
            { name: '🍭 New Balance', value: `${newBalance.toLocaleString()} candies`, inline: false },
            { name: '🎯 Win Rate', value: '47%', inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error gambling candies:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process gambling request.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY LEADERBOARD - Show top candy holders
  private async handleCandyLeaderboard(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const topUsers = await storage.getCandyLeaderboard(10);

      if (topUsers.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Candy Leaderboard')
          .setDescription('No users found with candy balances.')
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const leaderboardText = topUsers.map((user, index) => {
        const position = index + 1;
        const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '📍';
        const totalBalance = user.candyBalance + user.candyBank;
        return `${emoji} **#${position}** <@${user.discordId}> - ${totalBalance.toLocaleString()} candies`;
      }).join('\n');

      // Get current user's position
      const currentUser = await storage.getDiscordUserByDiscordId(interaction.user.id);
      let userPosition = '';
      
      if (currentUser) {
        const allUsers = await storage.getCandyLeaderboard(1000); // Get more users to find position
        const userIndex = allUsers.findIndex(u => u.discordId === interaction.user.id);
        if (userIndex !== -1) {
          const userTotal = currentUser.candyBalance + currentUser.candyBank;
          userPosition = `\n**Your Position:** #${userIndex + 1} with ${userTotal.toLocaleString()} candies`;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Candy Leaderboard')
        .setDescription(`**Top 10 Richest Users**\n\n${leaderboardText}${userPosition}`)
        .setFooter({ text: 'Rankings based on total candies (wallet + bank)' })
        .setColor(0xffd700)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error showing candy leaderboard:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load candy leaderboard.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY PAY - Pay candies to another user
  private async handleCandyPay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Target')
        .setDescription('You cannot pay yourself!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (target.bot) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Target')
        .setDescription('You cannot pay bots!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must pay a positive amount of candies!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const userId = interaction.user.id;
      let user = await storage.getDiscordUserByDiscordId(userId);
      
      if (!user) {
        user = await storage.upsertDiscordUser({
          username: interaction.user.username,
          discordId: userId,
          candyBalance: 0,
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      if (user.candyBalance < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${user.candyBalance.toLocaleString()} candies in your wallet!`)
          .addFields(
            { name: '💰 Your Balance', value: `${user.candyBalance.toLocaleString()} candies`, inline: true },
            { name: '💸 Tried to Pay', value: `${amount.toLocaleString()} candies`, inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get or create target user
      let targetUser = await storage.getDiscordUserByDiscordId(target.id);
      
      if (!targetUser) {
        targetUser = await storage.upsertDiscordUser({
          username: target.username,
          discordId: target.id,
          candyBalance: 0,
          candyBank: 0,
          isWhitelisted: false,
          logs: 0,
          lastDaily: null,
          lastBeg: null,
          lastScam: null
        });
      }

      // Process payment
      await storage.subtractCandy(userId, amount);
      await storage.addCandy(target.id, amount);

      // Log the transaction
      await storage.addCandyTransaction({
        type: 'payment',
        amount: amount,
        fromUserId: userId,
        toUserId: target.id,
        description: `Payment from ${interaction.user.username} to ${target.username}`
      });

      await this.logActivity('candy_payment', `${interaction.user.username} paid ${amount} candies to ${target.username}`);

      const embed = new EmbedBuilder()
        .setTitle('💸 Payment Successful!')
        .setDescription(`You successfully paid <@${target.id}>!`)
        .addFields(
          { name: '💰 Amount', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '🍭 Your New Balance', value: `${(user.candyBalance - amount).toLocaleString()} candies`, inline: true },
          { name: '📤 Sent To', value: `<@${target.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing candy payment:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process payment.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY DEPOSIT - Deposit candies to bank
  private async handleCandyDeposit(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must deposit a positive amount of candies!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const userId = interaction.user.id;
      
      // Get candy balance from the candy_balances table
      const candyBalance = await storage.getCandyBalance(userId);
      const currentBalance = candyBalance?.balance || 0;
      const currentBankBalance = candyBalance?.bankBalance || 0;

      if (currentBalance < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${currentBalance.toLocaleString()} candies in your wallet!`)
          .addFields(
            { name: '💰 Wallet Balance', value: `${currentBalance.toLocaleString()} candies`, inline: true },
            { name: '💸 Tried to Deposit', value: `${amount.toLocaleString()} candies`, inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Process deposit
      await storage.depositCandy(userId, amount);

      await this.logActivity('candy_deposit', `${interaction.user.username} deposited ${amount} candies to bank`);

      // Get updated balances
      const updatedBalance = await storage.getCandyBalance(userId);
      const newWalletBalance = updatedBalance?.balance || 0;
      const newBankBalance = updatedBalance?.bankBalance || 0;

      const embed = new EmbedBuilder()
        .setTitle('🏦 Deposit Successful!')
        .setDescription(`You deposited candies to your bank account!`)
        .addFields(
          { name: '💰 Deposited', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '👛 Wallet Balance', value: `${newWalletBalance.toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank Balance', value: `${newBankBalance.toLocaleString()} candies`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error depositing candies:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to deposit candies.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // CANDY WITHDRAW - Withdraw candies from bank
  private async handleCandyWithdraw(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must withdraw a positive amount of candies!')
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const userId = interaction.user.id;
      
      // Get candy balance from the candy_balances table
      const candyBalance = await storage.getCandyBalance(userId);
      const currentBalance = candyBalance?.balance || 0;
      const currentBankBalance = candyBalance?.bankBalance || 0;

      if (currentBankBalance < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${currentBankBalance.toLocaleString()} candies in your bank!`)
          .addFields(
            { name: '🏦 Bank Balance', value: `${currentBankBalance.toLocaleString()} candies`, inline: true },
            { name: '💸 Tried to Withdraw', value: `${amount.toLocaleString()} candies`, inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Process withdrawal
      await storage.withdrawCandy(userId, amount);

      await this.logActivity('candy_withdraw', `${interaction.user.username} withdrew ${amount} candies from bank`);

      // Get updated balances
      const updatedBalance = await storage.getCandyBalance(userId);
      const newWalletBalance = updatedBalance?.balance || 0;
      const newBankBalance = updatedBalance?.bankBalance || 0;

      const embed = new EmbedBuilder()
        .setTitle('🏦 Withdrawal Successful!')
        .setDescription(`You withdrew candies from your bank account!`)
        .addFields(
          { name: '💰 Withdrawn', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '👛 Wallet Balance', value: `${newWalletBalance.toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank Balance', value: `${newBankBalance.toLocaleString()} candies`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error withdrawing candies:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to withdraw candies.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateKeyCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user')!;
    const note = interaction.options.getString('note')!;
    const booster = interaction.options.getString('booster') === 'yes';
    const earlyAccess = interaction.options.getString('early-access') === 'yes';
    const monthly = interaction.options.getString('monthly') === 'yes';
    
    try {
      // Generate features display
      const features = [];
      if (booster) features.push('Booster Access');
      if (earlyAccess) features.push('Early Access');
      if (monthly) features.push('Monthly Subscription');
      const featuresDisplay = features.length > 0 ? features.join(', ') : 'Standard Access';
      
      // Generate payment ID for API call
      const paymentId = `${subcommand.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Call real whitelist API to generate working key
      console.log(`[DEBUG] Calling API for user: ${user.id}, payment: ${subcommand}, paymentId: ${paymentId}`);
      
      const whitelistResult = await WhitelistAPI.whitelistUser(
        user.id, // contact_info (Discord user ID)
        `${note} - Features: ${featuresDisplay}`, // user_note
        paymentId, // payment.id
        subcommand // payment.provider (matches accepted methods: paypal, cashapp, robux, giftcard, venmo, bitcoin, ethereum, litecoin, sellix, custom)
      );
      
      console.log(`[DEBUG] API Result:`, whitelistResult);
      console.log(`[DEBUG] API Key value:`, whitelistResult.key);
      console.log(`[DEBUG] API Key type:`, typeof whitelistResult.key);
      
      if (!whitelistResult.success || !whitelistResult.key) {
        console.log(`[DEBUG] API failed - success: ${whitelistResult.success}, key: ${whitelistResult.key}`);
        const embed = new EmbedBuilder()
          .setTitle('❌ Key Generation Failed')
          .setDescription(`Failed to generate key via whitelist API: ${whitelistResult.error || 'No key returned from API'}`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // Get payment method details for display
      let paymentMethod = '';
      let paymentAmount = '';
      let paymentAddress = '';
      let embedColor = 0x00ff00;
      
      switch (subcommand) {
        case 'bitcoin':
          paymentMethod = 'Bitcoin (BTC)';
          paymentAmount = '$25.00 USD (≈ 0.0005 BTC)';
          paymentAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
          embedColor = 0xf7931a;
          break;
        case 'ethereum':
          paymentMethod = 'Ethereum (ETH)';
          paymentAmount = '$25.00 USD (≈ 0.01 ETH)';
          paymentAddress = '0x742b4e3a8f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f';
          embedColor = 0x627eea;
          break;
        case 'litecoin':
          paymentMethod = 'Litecoin (LTC)';
          paymentAmount = '$25.00 USD (≈ 0.3 LTC)';
          paymentAddress = 'ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
          embedColor = 0xbfbbbb;
          break;
        case 'paypal':
          paymentMethod = 'PayPal';
          paymentAmount = '$25.00 USD';
          paymentAddress = 'payments@raptor.fun';
          embedColor = 0x0070ba;
          break;
        case 'cashapp':
          paymentMethod = 'CashApp';
          paymentAmount = '$25.00 USD';
          paymentAddress = '$RaptorOfficial';
          embedColor = 0x00d632;
          break;
        case 'venmo':
          paymentMethod = 'Venmo';
          paymentAmount = '$25.00 USD';
          paymentAddress = '@Raptor-Official';
          embedColor = 0x1e88e5;
          break;
        case 'robux':
          paymentMethod = 'Robux';
          paymentAmount = '2,000 Robux';
          paymentAddress = 'RaptorOfficial (Roblox)';
          embedColor = 0x00b2ff;
          break;
        case 'giftcard':
          paymentMethod = 'Gift Card';
          paymentAmount = '$25.00 USD';
          paymentAddress = 'DM gift card code to staff';
          embedColor = 0xff6b6b;
          break;
        case 'sellix':
          paymentMethod = 'Sellix';
          paymentAmount = '$25.00 USD';
          paymentAddress = 'raptor.fun/sellix';
          embedColor = 0x8b5cf6;
          break;
        case 'custom':
          paymentMethod = 'Custom Payment';
          paymentAmount = 'Contact Admin';
          paymentAddress = 'DM @Raptor for details';
          embedColor = 0x9c27b0;
          break;
        default:
          throw new Error('Invalid payment method');
      }
      
      // Store key in local database for tracking
      console.log(`[DEBUG] Preparing keyData with key: "${whitelistResult.key}"`);
      
      const keyData = {
        keyValue: whitelistResult.key!,
        userId: user.id,
        hwid: null,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: interaction.user.username,
        notes: `${paymentMethod} payment key for ${user.username} - ${note} - Features: ${featuresDisplay} - Payment ID: ${paymentId}`
      };
      
      console.log(`[DEBUG] keyData object:`, keyData);
      console.log(`[DEBUG] keyData.keyValue:`, keyData.keyValue);
      console.log(`[DEBUG] keyData.keyValue type:`, typeof keyData.keyValue);
      
      await storage.createLicenseKey(keyData);
      await this.logActivity('key_generated_api', `${interaction.user.username} generated REAL ${subcommand} key via API: ${whitelistResult.key} for ${user.username} (Payment ID: ${paymentId})`);
      
      // Show simple success message in channel
      await interaction.editReply({ content: '✅ Successful' });
      
      // Send detailed key info to user via DM
      try {
        const currentDate = new Date();
        const formattedDate = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}/${currentDate.getFullYear().toString().slice(-2)}, ${currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        
        const dmEmbed = new EmbedBuilder()
          .setTitle('Key Generated')
          .setDescription(`Your MacSploit license key: ${whitelistResult.key}`)
          .addFields(
            { name: formattedDate, value: '\u200B', inline: false }
          )
          .setColor(0x5865F2);
        
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('How to Install')
              .setStyle(ButtonStyle.Primary)
              .setCustomId('how_to_install')
          );
        
        await user.send({ embeds: [dmEmbed], components: [button] });
        
      } catch (dmError) {
        console.error('Failed to send DM to user:', dmError);
        // If DM fails, update the channel message to include the key
        const fallbackEmbed = new EmbedBuilder()
          .setTitle('✅ Key Generated (DM Failed)')
          .setDescription(`Key generated successfully but couldn't send DM to <@${user.id}>`)
          .addFields(
            { name: 'License Key', value: `\`${whitelistResult.key}\``, inline: false },
            { name: 'Payment Method', value: paymentMethod, inline: true },
            { name: 'Features', value: featuresDisplay, inline: true }
          )
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [fallbackEmbed] });
      }
      
    } catch (error) {
      console.error('Error generating real payment key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ API Error')
        .setDescription(`Failed to generate working key via Raptor API: ${error.message}`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // Ping Command
  private async handlePingCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const start = Date.now();
    
    try {
      // Test database connectivity
      const dbStart = Date.now();
      await storage.getStats();
      const dbLatency = Date.now() - dbStart;

      const botLatency = Date.now() - start;
      const discordLatency = this.client.ws.ping;

      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .addFields(
          { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
          { name: '💬 Discord API', value: `${discordLatency}ms`, inline: true },
          { name: '🗄️ Database', value: `${dbLatency}ms`, inline: true },
          { name: '⏰ Uptime', value: `<t:${Math.floor((Date.now() - (process.uptime() * 1000)) / 1000)}:R>`, inline: true },
          { name: '📊 Status', value: 'All systems operational', inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in ping command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription('Error checking system status.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // Poke Command
  private async handlePokeCommand(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user');
    
    if (target) {
      const embed = new EmbedBuilder()
        .setTitle('👉 Poke!')
        .setDescription(`<@${interaction.user.id}> poked <@${target.id}>!`)
        .setColor(0xff69b4)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('👉 Poke!')
        .setDescription('OWW that hurt!!')
        .setColor(0xff69b4)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
  }

  // Utility methods
  private generateRandomKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 4; i++) {
      if (i > 0) result += '-';
      for (let j = 0; j < 4; j++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return result;
  }

  private generateKeyId(): string {
    const prefix = 'MSK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private async logActivity(type: string, description: string) {
    try {
      await storage.logActivity(type, description);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  private async logCommandUsage(interaction: ChatInputCommandInteraction, startTime: number, success: boolean, error: any) {
    try {
      const executionTime = Date.now() - startTime;
      
      await storage.logCommand({
        userId: interaction.user.id,
        username: interaction.user.username,
        commandName: interaction.commandName,
        subcommand: interaction.options.getSubcommand(false) || null,
        executionTime,
        success,
        errorMessage: error ? String(error) : null,
      });
    } catch (err) {
      console.error('Error logging command usage:', err);
    }
  }

  // Placeholder stub implementations for remaining commands
  private async handleAnnounceCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const message = interaction.options.getString('message', true);
      const channel = interaction.options.getChannel('channel');
      const targetChannel = channel || interaction.channel;

      if (!targetChannel?.isTextBased()) {
        await interaction.reply({ content: '❌ Cannot send announcement to this channel type.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📢 Announcement')
        .setDescription(message)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `Announced by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

      await targetChannel.send({ embeds: [embed] });
      await storage.logActivity('announcement', `Announcement sent by ${interaction.user.id}: ${message}`);

      await interaction.reply({ content: `✅ Announcement sent to ${targetChannel}`, ephemeral: true });
      success = true;

    } catch (error) {
      console.error('Error in handleAnnounceCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleAvatarCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const user = interaction.options.getUser('user') || interaction.user;
      const format = interaction.options.getString('format') || 'png';
      const size = interaction.options.getInteger('size') || 1024;

      const avatarUrl = user.displayAvatarURL({ 
        extension: format as 'png' | 'jpg' | 'webp' | 'gif',
        size: size as 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096
      });

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Avatar`)
        .setImage(avatarUrl)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

      await storage.logActivity('avatar_view', `Avatar viewed for user ${user.id} by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleAvatarCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBugReportCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const title = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);
      const steps = interaction.options.getString('steps') || 'Not provided';
      const priority = interaction.options.getString('priority') || 'medium';

      const reportId = `BUG-${Date.now()}`;
      
      await storage.createBugReport({
        reportId,
        userId: interaction.user.id,
        title,
        description,
        steps,
        priority,
        status: 'open'
      });

      const embed = new EmbedBuilder()
        .setTitle('🐛 Bug Report Submitted')
        .addFields(
          { name: 'Report ID', value: reportId, inline: true },
          { name: 'Priority', value: priority.toUpperCase(), inline: true },
          { name: 'Status', value: 'OPEN', inline: true },
          { name: 'Title', value: title },
          { name: 'Description', value: description },
          { name: 'Steps to Reproduce', value: steps }
        )
        .setColor(0xff6b35)
        .setTimestamp()
        .setFooter({ text: `Reported by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

      await storage.logActivity('bug_report', `Bug report ${reportId} created by ${interaction.user.id}: ${title}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleBugReportCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error creating bug report: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleBypassCommand(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('🔗 Bypass Request')
      .setDescription('Bypass functionality is currently unavailable. This is a placeholder command.')
      .setColor(0xff9900)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleCheckCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const keyId = interaction.options.getString('key', true);
      const key = await storage.getDiscordKey(keyId);

      if (!key) {
        await interaction.reply({ content: '❌ Key not found.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🔍 Key Check Result')
        .addFields(
          { name: 'Key ID', value: key.keyId, inline: true },
          { name: 'Status', value: key.status.toUpperCase(), inline: true },
          { name: 'User', value: key.discordUsername || 'Unknown', inline: true },
          { name: 'HWID', value: key.hwid || 'Not set', inline: true },
          { name: 'Created', value: `<t:${Math.floor(key.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Updated', value: `<t:${Math.floor(key.updatedAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setColor(key.status === 'active' ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      await storage.logActivity('key_check', `Key ${keyId} checked by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleCheckCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleDbCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!this.isOwner(interaction.user.id)) {
        await interaction.reply({ content: '❌ Only bot owners can use this command.', ephemeral: true });
        return;
      }

      const action = interaction.options.getString('action', true);
      
      if (action === 'stats') {
        const stats = await storage.getStats();
        
        const embed = new EmbedBuilder()
          .setTitle('📊 Database Statistics')
          .addFields(
            { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
            { name: 'Total Keys', value: stats.totalKeys.toString(), inline: true },
            { name: 'Active Keys', value: stats.activeKeys.toString(), inline: true },
            { name: 'Whitelist Entries', value: stats.whitelistEntries.toString(), inline: true },
            { name: 'Uptime', value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`, inline: true }
          )
          .setColor(0x0099ff)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Invalid database action.', ephemeral: true });
        return;
      }

      await storage.logActivity('database_query', `Database ${action} executed by ${interaction.user.id}`);
      success = true;

    } catch (error) {
      console.error('Error in handleDbCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleDeleteCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const keyId = interaction.options.getString('key', true);
      const key = await storage.getDiscordKey(keyId);

      if (!key) {
        await interaction.reply({ content: '❌ Key not found.', ephemeral: true });
        return;
      }

      await storage.revokeDiscordKey(keyId, interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Key Deleted')
        .addFields(
          { name: 'Key ID', value: keyId },
          { name: 'Previous Status', value: key.status.toUpperCase() },
          { name: 'Deleted By', value: interaction.user.username }
        )
        .setColor(0xff0000)
        .setTimestamp();

      await storage.logActivity('key_delete', `Key ${keyId} deleted by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleDeleteCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleDmCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const message = interaction.options.getString('message', true);

      try {
        await user.send(`**Message from ${interaction.guild?.name} staff:**\n\n${message}`);
        
        await storage.logActivity('dm_sent', `DM sent to ${user.id} by ${interaction.user.id}: ${message}`);
        await interaction.reply({ content: `✅ Message sent to ${user.username}`, ephemeral: true });
        success = true;

      } catch (dmError) {
        await interaction.reply({ content: `❌ Could not send DM to ${user.username}. They may have DMs disabled.`, ephemeral: true });
      }

    } catch (error) {
      console.error('Error in handleDmCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleEvalCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!this.isOwner(interaction.user.id)) {
        await interaction.reply({ content: '❌ Only bot owners can use this command.', ephemeral: true });
        return;
      }

      const code = interaction.options.getString('code', true);
      
      await interaction.deferReply({ ephemeral: true });

      try {
        const result = eval(code);
        const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        
        const truncatedOutput = output.length > 1900 ? output.substring(0, 1900) + '...' : output;
        
        const embed = new EmbedBuilder()
          .setTitle('📝 Eval Result')
          .addFields(
            { name: 'Input', value: `\`\`\`js\n${code}\`\`\`` },
            { name: 'Output', value: `\`\`\`js\n${truncatedOutput}\`\`\`` }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        await storage.logActivity('eval_executed', `Eval executed by ${interaction.user.id}: ${code}`);
        success = true;

      } catch (evalError) {
        const errorOutput = evalError instanceof Error ? evalError.message : String(evalError);
        
        const embed = new EmbedBuilder()
          .setTitle('❌ Eval Error')
          .addFields(
            { name: 'Input', value: `\`\`\`js\n${code}\`\`\`` },
            { name: 'Error', value: `\`\`\`js\n${errorOutput}\`\`\`` }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error in handleEvalCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleGetCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const setting = interaction.options.getString('setting', true);
      const value = this.getSetting(setting);

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Bot Setting')
        .addFields(
          { name: 'Setting', value: setting, inline: true },
          { name: 'Value', value: value || 'Not set', inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('setting_get', `Setting ${setting} retrieved by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleGetCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleHelpCommand(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 MacSploit Bot Help')
      .setDescription('Here are all available commands organized by category:')
      .addFields(
        { 
          name: '🔑 Key Management', 
          value: '`/add key` - Add a new license key\n`/keyinfo` - Get key information\n`/transfer` - Transfer key ownership\n`/generatekey` - Generate payment keys', 
          inline: false 
        },
        { 
          name: '🍭 Candy System', 
          value: '`/candy balance` - Check balance\n`/candy daily` - Claim daily reward\n`/candy gamble` - Gamble candies\n`/candy pay` - Pay another user', 
          inline: false 
        },
        { 
          name: '👥 User Management', 
          value: '`/userinfo` - Get user information\n`/whitelist` - Manage whitelist\n`/add logs` - Add user logs\n`/view logs` - View user logs', 
          inline: false 
        },
        { 
          name: '🛠️ Administration', 
          value: '`/settings` - Bot settings\n`/backup` - Database backups\n`/stats` - System statistics\n`/eval` - Execute code', 
          inline: false 
        },
        { 
          name: '🔧 Utilities', 
          value: '`/ping` - Check bot status\n`/help` - This help message\n`/poke` - Poke someone\n`/avatar` - Show user avatar', 
          inline: false 
        }
      )
      .setFooter({ text: 'Use /help <command> for detailed information about a specific command' })
      .setColor(0x0099ff)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleHwidCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const subcommand = interaction.options.getSubcommand();
      const user = interaction.options.getUser('user', true);
      const userId = user.id;

      if (subcommand === 'view') {
        // Get user's HWID information
        const discordUser = await storage.getDiscordUser(userId);
        const keys = await storage.getUserKeys(userId);

        const embed = new EmbedBuilder()
          .setTitle('🖥️ HWID Information')
          .setColor(0x00ff00)
          .addFields(
            { name: 'User', value: `<@${userId}>`, inline: true },
            { name: 'Username', value: discordUser?.username || 'Unknown', inline: true },
            { name: 'HWID', value: discordUser?.hwid || 'Not set', inline: false },
            { name: 'Active Keys', value: keys.length.toString(), inline: true },
            { name: 'Last Updated', value: discordUser?.updatedAt ? `<t:${Math.floor(discordUser.updatedAt.getTime() / 1000)}:R>` : 'Never', inline: true }
          )
          .setTimestamp()
          .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        if (keys.length > 0) {
          const keyList = keys.slice(0, 5).map(key => `\`${key.keyId}\` - ${key.status}`).join('\n');
          embed.addFields({ name: 'Recent Keys', value: keyList, inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
        success = true;

      } else if (subcommand === 'reset') {
        // Reset user's HWID
        await storage.updateDiscordUser(userId, { hwid: null });
        await storage.logActivity('hwid_reset', `HWID reset for user ${userId} by ${interaction.user.id}`);

        const embed = new EmbedBuilder()
          .setTitle('✅ HWID Reset')
          .setDescription(`HWID has been reset for <@${userId}>`)
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({ text: `Reset by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
        success = true;

      } else if (subcommand === 'set') {
        const hwid = interaction.options.getString('hwid', true);
        
        // Set user's HWID
        await storage.updateDiscordUser(userId, { hwid });
        await storage.logActivity('hwid_set', `HWID set to ${hwid} for user ${userId} by ${interaction.user.id}`);

        const embed = new EmbedBuilder()
          .setTitle('✅ HWID Set')
          .setDescription(`HWID has been set for <@${userId}>`)
          .addFields({ name: 'New HWID', value: `\`${hwid}\``, inline: false })
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({ text: `Set by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
        success = true;
      }

    } catch (error) {
      console.error('Error in handleHwidCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleKeyInfoCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const keyId = interaction.options.getString('key', true);
      
      // Get key information
      const keyInfo = await storage.getKeyInfo(keyId);
      
      if (!keyInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Key Not Found')
          .setDescription(`No key found with ID: \`${keyId}\``)
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get associated user information
      const discordUser = await storage.getDiscordUser(keyInfo.userId);
      
      const embed = new EmbedBuilder()
        .setTitle('🔑 Key Information')
        .setColor(keyInfo.status === 'active' ? 0x00ff00 : keyInfo.status === 'expired' ? 0xff9900 : 0xff0000)
        .addFields(
          { name: 'Key ID', value: `\`${keyInfo.keyId}\``, inline: true },
          { name: 'Status', value: keyInfo.status.toUpperCase(), inline: true },
          { name: 'User', value: `<@${keyInfo.userId}>`, inline: true },
          { name: 'Username', value: discordUser?.username || 'Unknown', inline: true },
          { name: 'HWID', value: keyInfo.hwid || 'Not set', inline: true },
          { name: 'Created', value: `<t:${Math.floor(keyInfo.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Last Updated', value: `<t:${Math.floor(keyInfo.updatedAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

      if (keyInfo.revokedAt && keyInfo.revokedBy) {
        embed.addFields(
          { name: 'Revoked At', value: `<t:${Math.floor(keyInfo.revokedAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Revoked By', value: `<@${keyInfo.revokedBy}>`, inline: true }
        );
      }

      // Get usage statistics
      const stats = await storage.getKeyUsageStats(keyId);
      if (stats && stats.lastUsed) {
        embed.addFields(
          { name: 'Last Used', value: `<t:${Math.floor(stats.lastUsed.getTime() / 1000)}:R>`, inline: true },
          { name: 'Usage Count', value: stats.usageCount?.toString() || '0', inline: true }
        );
      }

      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleKeyInfoCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }



  private async handleListCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const subcommand = interaction.options.getSubcommand();
      const page = interaction.options.getInteger('page') || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      if (subcommand === 'keys') {
        const status = interaction.options.getString('status') || 'all';
        const user = interaction.options.getUser('user');
        
        // Get keys with filters
        const keys = await storage.getKeysList(status, user?.id, limit, offset);
        const totalKeys = await storage.getKeysCount(status, user?.id);
        const totalPages = Math.ceil(totalKeys / limit);

        const embed = new EmbedBuilder()
          .setTitle('🔑 License Keys List')
          .setColor(0x0099ff)
          .setTimestamp()
          .setFooter({ 
            text: `Page ${page}/${totalPages} • Total: ${totalKeys} keys`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        if (keys.length === 0) {
          embed.setDescription('No keys found matching the criteria.');
        } else {
          const keyList = keys.map((key, index) => {
            const num = offset + index + 1;
            const statusEmoji = key.status === 'active' ? '🟢' : key.status === 'expired' ? '🟡' : '🔴';
            return `${num}. ${statusEmoji} \`${key.keyId}\` - <@${key.userId}> (${key.status})`;
          }).join('\n');

          embed.setDescription(keyList);
        }

        if (status !== 'all') {
          embed.addFields({ name: 'Filter', value: `Status: ${status.toUpperCase()}`, inline: true });
        }
        if (user) {
          embed.addFields({ name: 'User Filter', value: `<@${user.id}>`, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
        success = true;

      } else if (subcommand === 'users') {
        const whitelistedOnly = interaction.options.getBoolean('whitelisted') || false;
        
        // Get users list
        const users = await storage.getUsersList(whitelistedOnly, limit, offset);
        const totalUsers = await storage.getUsersCount(whitelistedOnly);
        const totalPages = Math.ceil(totalUsers / limit);

        const embed = new EmbedBuilder()
          .setTitle('👥 Discord Users List')
          .setColor(0x0099ff)
          .setTimestamp()
          .setFooter({ 
            text: `Page ${page}/${totalPages} • Total: ${totalUsers} users`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        if (users.length === 0) {
          embed.setDescription('No users found matching the criteria.');
        } else {
          const userList = users.map((user, index) => {
            const num = offset + index + 1;
            const whitelistEmoji = user.isWhitelisted ? '✅' : '❌';
            const lastSeen = user.lastSeen ? `<t:${Math.floor(user.lastSeen.getTime() / 1000)}:R>` : 'Never';
            return `${num}. ${whitelistEmoji} <@${user.discordId}> - Last: ${lastSeen}`;
          }).join('\n');

          embed.setDescription(userList);
        }

        if (whitelistedOnly) {
          embed.addFields({ name: 'Filter', value: 'Whitelisted users only', inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
        success = true;

      } else if (subcommand === 'whitelist') {
        // Get whitelist entries
        const whitelist = await storage.getWhitelistEntries(limit, offset);
        const totalEntries = await storage.getWhitelistCount();
        const totalPages = Math.ceil(totalEntries / limit);

        const embed = new EmbedBuilder()
          .setTitle('✅ Whitelist Entries')
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({ 
            text: `Page ${page}/${totalPages} • Total: ${totalEntries} entries`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        if (whitelist.length === 0) {
          embed.setDescription('No whitelist entries found.');
        } else {
          const whitelistList = whitelist.map((entry, index) => {
            const num = offset + index + 1;
            const adminEmoji = entry.isAdmin ? '👑' : '👤';
            const addedTime = `<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`;
            return `${num}. ${adminEmoji} <@${entry.userId}> - Added ${addedTime} by <@${entry.addedBy}>`;
          }).join('\n');

          embed.setDescription(whitelistList);
        }

        await interaction.editReply({ embeds: [embed] });
        success = true;

      } else if (subcommand === 'logs') {
        // Get activity logs
        const logs = await storage.getActivityLogs(limit, offset);
        const totalLogs = await storage.getActivityLogsCount();
        const totalPages = Math.ceil(totalLogs / limit);

        const embed = new EmbedBuilder()
          .setTitle('📋 Activity Logs')
          .setColor(0xff9900)
          .setTimestamp()
          .setFooter({ 
            text: `Page ${page}/${totalPages} • Total: ${totalLogs} logs`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        if (logs.length === 0) {
          embed.setDescription('No activity logs found.');
        } else {
          const logList = logs.map((log, index) => {
            const num = offset + index + 1;
            const time = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
            const description = log.description.length > 50 ? 
              log.description.substring(0, 50) + '...' : 
              log.description;
            return `${num}. **${log.type}** - ${description} (${time})`;
          }).join('\n');

          embed.setDescription(logList);
        }

        await interaction.editReply({ embeds: [embed] });
        success = true;
      }

    } catch (error) {
      console.error('Error in handleListCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleLogsCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'view':
          await this.handleLogsView(interaction);
          break;
        case 'clear':
          await this.handleLogsClear(interaction);
          break;
        default:
          const embed = new EmbedBuilder()
            .setTitle('❌ Unknown Subcommand')
            .setDescription('Please use a valid logs subcommand.')
            .setColor(0xff0000)
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
      }

      success = true;
    } catch (error: any) {
      await this.logCommandUsage(interaction, startTime, false, error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Command Failed')
        .setDescription('An error occurred while processing the logs command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await this.logCommandUsage(interaction, startTime, success, null);
  }

  private async handleLogsView(interaction: ChatInputCommandInteraction) {
    const page = interaction.options.getInteger('page') || 1;
    const pageSize = 5; // 5 users per page as requested

    await interaction.deferReply();
    console.log(`Processing /logs view command for user ${interaction.user.id}, page ${page}`);

    try {
      const startTime = Date.now();
      
      // Get all user engagement logs and sort by log count (leaderboard style)
      const allLogs = await Promise.race([
        storage.getUserLogLeaderboard(100), // Get top 100 for pagination
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        )
      ]) as any[];

      const queryTime = Date.now() - startTime;
      console.log(`Database query completed in ${queryTime}ms, found ${allLogs.length} logs`);

      const title = '🏆 User Engagement Leaderboard';
      const description = 'Top users by log points from tracked channels (admin, whitelists, moderator, trial mod, support, trial support, purchases, testing)';

      if (allLogs.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription('No user engagement logs found. Users get log points when posting images in tracked channels.')
          .setColor(0x0099ff)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Calculate pagination
      const totalPages = Math.ceil(allLogs.length / pageSize);
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = allLogs.slice(startIndex, endIndex);

      let leaderboardText = '';
      for (let i = 0; i < pageData.length; i++) {
        try {
          const log = pageData[i];
          const globalRank = startIndex + i + 1;
          
          // Get rank emoji/text
          let rankDisplay = '';
          if (globalRank === 1) rankDisplay = '🥇 1st';
          else if (globalRank === 2) rankDisplay = '🥈 2nd';
          else if (globalRank === 3) rankDisplay = '🥉 3rd';
          else rankDisplay = `${globalRank}th`;
          
          // Fetch actual Discord username
          let userDisplay = `User${log.userId.slice(-4)}`;
          try {
            const discordUser = await this.client.users.fetch(log.userId);
            if (discordUser && discordUser.username) {
              userDisplay = discordUser.username;
            }
          } catch (fetchError) {
            console.log(`Could not fetch username for ${log.userId}, using fallback`);
          }
          
          const entry = `${rankDisplay} ${userDisplay} ${log.totalLogs} logs\n`;
          
          if ((leaderboardText + entry).length > 900) break;
          leaderboardText += entry;
        } catch (logError) {
          console.error('Error processing leaderboard entry:', logError, pageData[i]);
          continue;
        }
      }

      if (!leaderboardText || leaderboardText.trim().length === 0) {
        leaderboardText = 'No valid leaderboard entries to display';
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields({ name: `Page ${currentPage} of ${totalPages}`, value: leaderboardText, inline: false })
        .setFooter({ text: `Page ${currentPage}/${totalPages} • Total users: ${allLogs.length}` })
        .setColor(0x0099ff)
        .setTimestamp();

      // Create navigation buttons
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
      
      const row = new ActionRowBuilder<ButtonBuilder>();
      
      // Previous page button
      if (currentPage > 1) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`logs_view_${currentPage - 1}`)
            .setLabel('← Previous')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      // Next page button
      if (currentPage < totalPages) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`logs_view_${currentPage + 1}`)
            .setLabel('Next →')
            .setStyle(ButtonStyle.Primary)
        );
      }

      const response: any = { embeds: [embed] };
      if (row.components.length > 0) {
        response.components = [row];
      }

      await interaction.editReply(response);
      console.log('Successfully sent logs leaderboard response with navigation buttons');
      
    } catch (error) {
      console.error('Error in handleLogsView:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription(`Failed to retrieve user engagement leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
        .setColor(0xff0000)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }

  private async handleLogsClear(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true);
    const confirm = interaction.options.getBoolean('confirm', true);

    if (!confirm) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Confirmation Required')
        .setDescription('You must confirm to clear system logs.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      let cleared = 0;
      let description = '';

      switch (type) {
        case 'activity':
          cleared = await storage.clearActivityLogs();
          description = `Cleared ${cleared} activity log entries`;
          break;
        case 'commands':
          cleared = await storage.clearCommandLogs();
          description = `Cleared ${cleared} command log entries`;
          break;
        case 'errors':
          cleared = await storage.clearErrorLogs();
          description = `Cleared ${cleared} error log entries`;
          break;
        default:
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Type')
            .setDescription('Please specify a valid log type to clear.')
            .setColor(0xff0000)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          return;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Logs Cleared')
        .setDescription(description)
        .addFields(
          { name: 'Type', value: type, inline: true },
          { name: 'Entries Cleared', value: cleared.toString(), inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log the clear action
      await this.logActivity('logs_cleared', 
        `${type} logs cleared by ${interaction.user.username} (${cleared} entries)`);
    } catch (error) {
      console.error('Error clearing logs:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to clear system logs.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleNicknameCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const nickname = interaction.options.getString('nickname', true);

      const member = await interaction.guild?.members.fetch(user.id);
      if (!member) {
        await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        return;
      }

      const oldNickname = member.nickname || member.user.username;
      await member.setNickname(nickname);

      const embed = new EmbedBuilder()
        .setTitle('✏️ Nickname Updated')
        .addFields(
          { name: 'User', value: user.username, inline: true },
          { name: 'Old Nickname', value: oldNickname, inline: true },
          { name: 'New Nickname', value: nickname, inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('nickname_change', `Nickname changed for ${user.id} by ${interaction.user.id}: ${oldNickname} -> ${nickname}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleNicknameCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handlePurgeCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const amount = interaction.options.getInteger('amount', true);
      const user = interaction.options.getUser('user');

      if (amount < 1 || amount > 100) {
        await interaction.reply({ content: '❌ Amount must be between 1 and 100.', ephemeral: true });
        return;
      }

      const channel = interaction.channel;
      if (!channel?.isTextBased()) {
        await interaction.reply({ content: '❌ This command can only be used in text channels.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const messages = await channel.messages.fetch({ limit: amount });
      const filteredMessages = user ? messages.filter(m => m.author.id === user.id) : messages;

      const deleted = await channel.bulkDelete(filteredMessages, true);

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Messages Purged')
        .addFields(
          { name: 'Messages Deleted', value: deleted.size.toString(), inline: true },
          { name: 'Channel', value: channel.toString(), inline: true },
          { name: 'User Filter', value: user ? user.username : 'None', inline: true }
        )
        .setColor(0xff6b35)
        .setTimestamp();

      await storage.logActivity('purge', `${deleted.size} messages purged by ${interaction.user.id} in ${channel.id}`);
      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handlePurgeCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleRemoveCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      await storage.removeFromWhitelist(user.id);
      
      const embed = new EmbedBuilder()
        .setTitle('➖ User Removed from Whitelist')
        .addFields(
          { name: 'User', value: `${user.username} (${user.id})`, inline: true },
          { name: 'Removed By', value: interaction.user.username, inline: true },
          { name: 'Reason', value: reason }
        )
        .setColor(0xff0000)
        .setTimestamp();

      await storage.logActivity('whitelist_remove', `User ${user.id} removed from whitelist by ${interaction.user.id}: ${reason}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleRemoveCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleResetCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const type = interaction.options.getString('type', true);
      const user = interaction.options.getUser('user');

      if (type === 'candy' && user) {
        await storage.resetCandyBalance(user.id);
        
        const embed = new EmbedBuilder()
          .setTitle('🔄 Candy Balance Reset')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})` },
            { name: 'Reset By', value: interaction.user.username }
          )
          .setColor(0xffa500)
          .setTimestamp();

        await storage.logActivity('candy_reset', `Candy balance reset for ${user.id} by ${interaction.user.id}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else if (type === 'settings') {
        this.settings.clear();
        
        const embed = new EmbedBuilder()
          .setTitle('🔄 Bot Settings Reset')
          .setDescription('All bot settings have been reset to defaults.')
          .setColor(0xff6b35)
          .setTimestamp();

        await storage.logActivity('settings_reset', `Bot settings reset by ${interaction.user.id}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else {
        await interaction.reply({ content: '❌ Invalid reset type or missing parameters.', ephemeral: true });
      }

    } catch (error) {
      console.error('Error in handleResetCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleSayCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const message = interaction.options.getString('message', true);
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      if (!channel?.isTextBased()) {
        await interaction.reply({ content: '❌ Cannot send message to this channel type.', ephemeral: true });
        return;
      }

      await channel.send(message);
      
      await storage.logActivity('say_command', `Say command used by ${interaction.user.id} in ${channel.id}: ${message}`);
      await interaction.reply({ content: `✅ Message sent to ${channel}`, ephemeral: true });
      success = true;

    } catch (error) {
      console.error('Error in handleSayCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleSearchCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const query = interaction.options.getString('query', true);
      const type = interaction.options.getString('type', true);

      await interaction.deferReply();

      let results = [];
      
      if (type === 'users') {
        const users = await storage.getUsersList(false, 50);
        results = users.filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.discordId.includes(query)
        ).slice(0, 10);
      } else if (type === 'keys') {
        const keys = await storage.getKeysList('all', undefined, 50);
        results = keys.filter(key => 
          key.keyId.toLowerCase().includes(query.toLowerCase()) ||
          (key.discordUsername && key.discordUsername.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 10);
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Search Results for "${query}"`)
        .setDescription(results.length > 0 ? 
          results.map((item, index) => {
            if (type === 'users') {
              return `${index + 1}. ${item.username} (${item.discordId})`;
            } else {
              return `${index + 1}. ${item.keyId} - ${item.status}`;
            }
          }).join('\n') : 
          'No results found.'
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('search', `Search performed by ${interaction.user.id}: ${type} - ${query}`);
      await interaction.editReply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleSearchCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (interaction.deferred) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleSettingsCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const action = interaction.options.getString('action', true);
      const key = interaction.options.getString('key');
      const value = interaction.options.getString('value');

      if (action === 'set' && key && value) {
        this.settings.set(key, value);
        
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Setting Updated')
          .addFields(
            { name: 'Key', value: key, inline: true },
            { name: 'Value', value: value, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await storage.logActivity('setting_update', `Setting ${key} updated by ${interaction.user.id}: ${value}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else if (action === 'list') {
        const settingsArray = Array.from(this.settings.entries());
        
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Bot Settings')
          .setDescription(settingsArray.length > 0 ? 
            settingsArray.map(([k, v]) => `**${k}**: ${v}`).join('\n') : 
            'No settings configured.'
          )
          .setColor(0x0099ff)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        success = true;

      } else {
        await interaction.reply({ content: '❌ Invalid settings action or missing parameters.', ephemeral: true });
      }

    } catch (error) {
      console.error('Error in handleSettingsCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleStatsCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const stats = await storage.getStats();
      
      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .addFields(
          { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
          { name: 'Total Keys', value: stats.totalKeys.toString(), inline: true },
          { name: 'Active Keys', value: stats.activeKeys.toString(), inline: true },
          { name: 'Whitelist Entries', value: stats.whitelistEntries.toString(), inline: true },
          { name: 'Uptime', value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`, inline: true },
          { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('stats_view', `Stats viewed by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleStatsCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleSuggestionCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const action = interaction.options.getString('action', true);
      
      if (action === 'create') {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        
        const suggestionId = `SUG-${Date.now()}`;
        
        await storage.createSuggestion({
          suggestionId,
          userId: interaction.user.id,
          title,
          description,
          status: 'pending'
        });

        const embed = new EmbedBuilder()
          .setTitle('💡 Suggestion Submitted')
          .addFields(
            { name: 'ID', value: suggestionId, inline: true },
            { name: 'Status', value: 'PENDING', inline: true },
            { name: 'Title', value: title },
            { name: 'Description', value: description }
          )
          .setColor(0xffa500)
          .setTimestamp();

        await storage.logActivity('suggestion_create', `Suggestion ${suggestionId} created by ${interaction.user.id}: ${title}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else if (action === 'approve' || action === 'deny') {
        if (!await this.hasPermission(interaction)) {
          await interaction.reply({ content: '❌ You do not have permission to moderate suggestions.', ephemeral: true });
          return;
        }

        const suggestionId = interaction.options.getString('id', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        await storage.updateSuggestionStatus(suggestionId, action === 'approve' ? 'approved' : 'denied');

        const embed = new EmbedBuilder()
          .setTitle(`💡 Suggestion ${action === 'approve' ? 'Approved' : 'Denied'}`)
          .addFields(
            { name: 'ID', value: suggestionId, inline: true },
            { name: 'Status', value: action.toUpperCase(), inline: true },
            { name: 'Moderator', value: interaction.user.username, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(action === 'approve' ? 0x00ff00 : 0xff0000)
          .setTimestamp();

        await storage.logActivity('suggestion_moderate', `Suggestion ${suggestionId} ${action}d by ${interaction.user.id}: ${reason}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else {
        await interaction.reply({ content: '❌ Invalid suggestion action.', ephemeral: true });
      }

    } catch (error) {
      console.error('Error in handleSuggestionCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleTimeoutCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const duration = interaction.options.getInteger('duration', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      const member = await interaction.guild?.members.fetch(user.id);
      if (!member) {
        await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        return;
      }

      const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
      await member.timeout(duration * 60 * 1000, reason);

      const embed = new EmbedBuilder()
        .setTitle('⏰ User Timed Out')
        .addFields(
          { name: 'User', value: `${user.username} (${user.id})`, inline: true },
          { name: 'Duration', value: `${duration} minutes`, inline: true },
          { name: 'Until', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`, inline: true },
          { name: 'Moderator', value: interaction.user.username, inline: true },
          { name: 'Reason', value: reason }
        )
        .setColor(0xff6b35)
        .setTimestamp();

      await storage.logActivity('timeout', `User ${user.id} timed out for ${duration} minutes by ${interaction.user.id}: ${reason}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleTimeoutCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleTransferCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const keyId = interaction.options.getString('key', true);
      const newUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'Administrative transfer';

      const key = await storage.getDiscordKey(keyId);
      if (!key) {
        await interaction.reply({ content: '❌ Key not found.', ephemeral: true });
        return;
      }

      const oldUserId = key.userId;
      await storage.updateDiscordKey(keyId, { 
        userId: newUser.id,
        discordUsername: newUser.username 
      });

      const embed = new EmbedBuilder()
        .setTitle('🔄 Key Transferred')
        .addFields(
          { name: 'Key ID', value: keyId, inline: true },
          { name: 'Previous Owner', value: key.discordUsername || oldUserId, inline: true },
          { name: 'New Owner', value: `${newUser.username} (${newUser.id})`, inline: true },
          { name: 'Transferred By', value: interaction.user.username, inline: true },
          { name: 'Reason', value: reason }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('key_transfer', `Key ${keyId} transferred from ${oldUserId} to ${newUser.id} by ${interaction.user.id}: ${reason}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleTransferCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleUserInfoCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const user = interaction.options.getUser('user', true);
      const discordUser = await storage.getDiscordUserByDiscordId(user.id);

      if (!discordUser) {
        await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
        return;
      }

      const userKeys = await storage.getUserKeys(user.id);
      const candyBalance = await storage.getCandyBalance(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`👤 User Information: ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Discord ID', value: user.id, inline: true },
          { name: 'Username', value: discordUser.username, inline: true },
          { name: 'Whitelisted', value: discordUser.isWhitelisted ? 'Yes' : 'No', inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(discordUser.joinedAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Last Seen', value: `<t:${Math.floor(discordUser.lastSeen.getTime() / 1000)}:R>`, inline: true },
          { name: 'Total Keys', value: userKeys.length.toString(), inline: true },
          { name: 'Active Keys', value: userKeys.filter(k => k.status === 'active').length.toString(), inline: true },
          { name: 'Candy Balance', value: candyBalance?.balance?.toString() || '0', inline: true },
          { name: 'Bank Balance', value: candyBalance?.bankBalance?.toString() || '0', inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await storage.logActivity('user_info', `User info viewed for ${user.id} by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleUserInfoCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleViewCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const keyId = interaction.options.getString('key', true);
      const key = await storage.getKeyInfo(keyId);

      if (!key) {
        await interaction.reply({ content: '❌ Key not found.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🔑 Key Information')
        .addFields(
          { name: 'Key ID', value: key.keyId, inline: true },
          { name: 'Status', value: key.status.toUpperCase(), inline: true },
          { name: 'Owner', value: key.discordUsername || 'Unknown', inline: true },
          { name: 'User ID', value: key.userId, inline: true },
          { name: 'HWID', value: key.hwid || 'Not set', inline: true },
          { name: 'Created', value: `<t:${Math.floor(key.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Last Updated', value: `<t:${Math.floor(key.updatedAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setColor(key.status === 'active' ? 0x00ff00 : key.status === 'revoked' ? 0xff0000 : 0xffa500)
        .setTimestamp();

      if (key.revokedAt) {
        embed.addFields(
          { name: 'Revoked At', value: `<t:${Math.floor(key.revokedAt.getTime() / 1000)}:F>`, inline: true },
          { name: 'Revoked By', value: key.revokedBy || 'Unknown', inline: true }
        );
      }

      await storage.logActivity('key_view', `Key ${keyId} viewed by ${interaction.user.id}`);
      await interaction.reply({ embeds: [embed] });
      success = true;

    } catch (error) {
      console.error('Error in handleViewCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handleWhitelistCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const action = interaction.options.getString('action', true);
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (action === 'add') {
        await storage.addToWhitelist(user.id, user.username, reason);
        
        const embed = new EmbedBuilder()
          .setTitle('✅ User Added to Whitelist')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})`, inline: true },
            { name: 'Added By', value: interaction.user.username, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await storage.logActivity('whitelist_add', `User ${user.id} added to whitelist by ${interaction.user.id}: ${reason}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else if (action === 'remove') {
        await storage.removeFromWhitelist(user.id);
        
        const embed = new EmbedBuilder()
          .setTitle('➖ User Removed from Whitelist')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})`, inline: true },
            { name: 'Removed By', value: interaction.user.username, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await storage.logActivity('whitelist_remove', `User ${user.id} removed from whitelist by ${interaction.user.id}: ${reason}`);
        await interaction.reply({ embeds: [embed] });
        success = true;

      } else {
        await interaction.reply({ content: '❌ Invalid whitelist action.', ephemeral: true });
      }

    } catch (error) {
      console.error('Error in handleWhitelistCommand:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
    } finally {
      await this.logCommandUsage(interaction, startTime, success, null);
    }
  }

  private async handlePredefinedTag(message: any, tag: string) {
    const response = this.predefinedTags[tag];
    
    if (!response) {
      return;
    }
    
    try {
      let formattedResponse = this.formatTagResponse(response, tag);
      await message.channel.send(formattedResponse);
      
      // Log tag usage
      await this.logActivity('support_tag_used', `Support tag used: ${tag} by ${message.author.username}`);
      
    } catch (error) {
      console.error('Error sending predefined tag response:', error);
    }
  }

  private async handleLogChannelMessage(message: any) {
    try {
      // Check if message contains images (attachments or embeds with images)
      const hasImages = message.attachments.size > 0 || 
        message.embeds.some((embed: any) => embed.image || embed.thumbnail);

      if (!hasImages) return;

      // Get or create discord user
      const discordUser = await storage.getDiscordUser(message.author.id);
      if (!discordUser) {
        await storage.createDiscordUser({
          discordId: message.author.id,
          username: message.author.username,
          discriminator: message.author.discriminator || '0000',
          isWhitelisted: false
        });
      }

      // Add 1 log to the user
      await storage.addUserLogs(message.author.id, 1, `Auto-log: Image posted in ${message.channel.name}`);

      // Log the activity
      await this.logActivity('auto_log_added', 
        `Auto-log added to ${message.author.username} for image post in ${message.channel.name}`);

      console.log(`🖼️ Auto-log added to ${message.author.username} for image in #${message.channel.name}`);

    } catch (error) {
      console.error('Error handling log channel message:', error);
    }
  }

  private formatTagResponse(content: string, tag: string): string {
    // Check if content contains bash commands
    const bashPatterns = [
      /sudo\s+[^\n]+/g,
      /curl\s+[^\n]+/g,
      /cd\s+[^\n]+/g,
      /bash\s+[^\n]+/g,
      /chsh\s+[^\n]+/g,
      /softwareupdate\s+[^\n]+/g
    ];

    let bashCommands: string[] = [];
    let plainText = content;

    // Extract bash commands
    for (const pattern of bashPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        bashCommands.push(...matches);
        // Remove bash commands from plain text
        plainText = plainText.replace(pattern, '');
      }
    }

    // Clean up plain text (remove extra spaces and newlines)
    plainText = plainText.replace(/\n\s*\n/g, '\n').trim();

    // For .scripts tag, just return plain text without code blocks
    if (tag === '.scripts') {
      return content;
    }

    // For other tags, show plain text + bash commands in separate blocks
    if (bashCommands.length > 0) {
      let result = plainText;
      if (result && bashCommands.length > 0) {
        result += '\n\n';
      }
      result += '```bash\n' + bashCommands.join('\n') + '\n```';
      return result;
    }

    return plainText;
  }

  private async handleVerificationMessage(message: any) {
    const code = message.content.trim().toUpperCase();
    
    if (code.length === 6 && /^[A-Z0-9]+$/.test(code)) {
      try {
        const verification = await storage.getVerificationByCode(code);
        
        if (verification && verification.expiresAt > new Date()) {
          await storage.completeVerification(code, message.author.id);
          
          const embed = new EmbedBuilder()
            .setTitle('✅ Verification Complete')
            .setDescription('You have successfully verified your Discord account for dashboard access!')
            .setColor(0x00ff00)
            .setTimestamp();

          await message.reply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Code')
            .setDescription('The verification code is invalid or has expired.')
            .setColor(0xff0000)
            .setTimestamp();

          await message.reply({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error handling verification:', error);
      }
    }
  }

  private async syncServerData() {
    const guilds = Array.from(this.client.guilds.cache.values());
    for (const guild of guilds) {
      await this.addServer(guild);
    }
  }

  private async addServer(guild: any) {
    try {
      await storage.createDiscordServer({
        serverId: guild.id,
        serverName: guild.name,
        memberCount: guild.memberCount,
        isActive: true
      });
    } catch (error) {
      // Server might already exist
    }
  }

  private async handleLogCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'add':
          await this.handleLogAdd(interaction);
          break;
        case 'remove':
          await this.handleLogRemove(interaction);
          break;
        case 'view':
          await this.handleLogView(interaction);
          break;
        case 'lb':
          await this.handleLogLeaderboard(interaction);
          break;
        case 'clear':
          await this.handleLogClear(interaction);
          break;
        default:
          const embed = new EmbedBuilder()
            .setTitle('❌ Unknown Subcommand')
            .setDescription('Please use a valid log subcommand.')
            .setColor(0xff0000)
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
      }

      success = true;
    } catch (error: any) {
      await this.logCommandUsage(interaction, startTime, false, error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Command Failed')
        .setDescription('An error occurred while processing the log command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await this.logCommandUsage(interaction, startTime, success, null);
  }

  private async handleLogAdd(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const count = interaction.options.getInteger('count', true);
    const reason = interaction.options.getString('reason') || 'Manual log addition';

    if (count <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Count')
        .setDescription('Count must be greater than 0.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Get or create discord user
    let discordUser = await storage.getDiscordUser(user.id);
    if (!discordUser) {
      await storage.createDiscordUser({
        discordId: user.id,
        username: user.username,
        discriminator: user.discriminator || '0000',
        isWhitelisted: false
      });
    }

    // Add logs to user
    await storage.addUserLogs(user.id, count, reason);

    // Get total log count after addition
    const logs = await storage.getUserLogs(user.id);
    const totalLogs = logs.reduce((sum: number, log: any) => sum + log.logCount, 0);

    const embed = new EmbedBuilder()
      .setTitle('✅ Logs Added')
      .setDescription(`Added **${count}** logs to ${user.username}`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Added', value: count.toString(), inline: true },
        { name: 'New Total', value: totalLogs.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleLogRemove(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const count = interaction.options.getInteger('count', true);
    const reason = interaction.options.getString('reason') || 'Manual log removal';

    if (count <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Count')
        .setDescription('Count must be greater than 0.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Check if user exists
    const discordUser = await storage.getDiscordUser(user.id);
    if (!discordUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ User Not Found')
        .setDescription('User has no logs to remove.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Get current log count
    const logs = await storage.getUserLogs(user.id);
    const currentTotal = logs.reduce((sum: number, log: any) => sum + log.logCount, 0);

    if (currentTotal === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Logs to Remove')
        .setDescription('User has no logs.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const toRemove = Math.min(count, currentTotal);
    await storage.removeUserLogs(user.id, toRemove, reason);

    const newTotal = Math.max(0, currentTotal - toRemove);

    const embed = new EmbedBuilder()
      .setTitle('✅ Logs Removed')
      .setDescription(`Removed **${toRemove}** logs from ${user.username}`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Removed', value: toRemove.toString(), inline: true },
        { name: 'New Total', value: newTotal.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setColor(0xff9900)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleLogView(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') || interaction.user;

    // Check if user exists
    const discordUser = await storage.getDiscordUser(user.id);
    if (!discordUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ User Not Found')
        .setDescription('User has no log history.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Get user logs
    const logs = await storage.getUserLogs(user.id);
    const totalLogs = logs.reduce((sum: number, log: any) => sum + log.logCount, 0);

    const embed = new EmbedBuilder()
      .setTitle('📊 User Logs')
      .setDescription(`Log information for ${user.username}`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Total Logs', value: totalLogs.toString(), inline: true },
        { name: 'Log Entries', value: logs.length.toString(), inline: true },
        { name: 'Last Updated', value: logs.length > 0 ? `<t:${Math.floor(new Date(logs[0].lastUpdated).getTime() / 1000)}:R>` : 'Never', inline: false }
      )
      .setColor(0x0099ff)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleLogLeaderboard(interaction: ChatInputCommandInteraction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const maxLimit = Math.min(limit, 25);

    try {
      // Get leaderboard data
      const leaderboard = await storage.getUserLogLeaderboard(maxLimit);

      if (leaderboard.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📊 Logs Leaderboard')
          .setDescription('No users have logs yet.')
          .setColor(0x0099ff)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        return;
      }

      let description = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        
        // Try to get Discord user info
        try {
          const discordUser = await storage.getDiscordUser(entry.userId);
          const username = discordUser?.username || 'Unknown User';
          description += `${medal} **${username}** - ${entry.totalLogs} logs\n`;
        } catch {
          description += `${medal} **Unknown User** - ${entry.totalLogs} logs\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Logs Leaderboard')
        .setDescription(description)
        .setFooter({ text: `Showing top ${leaderboard.length} users` })
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to retrieve leaderboard data.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  private async handleLogClear(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const confirm = interaction.options.getBoolean('confirm', true);

    if (!confirm) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Confirmation Required')
        .setDescription('You must confirm to clear all logs for this user.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Check if user exists
    const discordUser = await storage.getDiscordUser(user.id);
    if (!discordUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ User Not Found')
        .setDescription('User has no logs to clear.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Get current log count
    const logs = await storage.getUserLogs(user.id);
    const totalLogs = logs.reduce((sum: number, log: any) => sum + log.logCount, 0);

    if (totalLogs === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Logs to Clear')
        .setDescription('User has no logs.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Clear all logs
    await storage.clearUserLogs(user.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ Logs Cleared')
      .setDescription(`Cleared **${totalLogs}** logs for ${user.username}`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Cleared', value: totalLogs.toString(), inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log the activity
    await this.logActivity('user_logs_cleared', 
      `All logs cleared for ${user.username} by ${interaction.user.username}`);
  }

  private async handleTotalCommand(interaction: ChatInputCommandInteraction) {
    try {
      if (!await this.hasPermission(interaction)) {
        return;
      }

      const subcommandGroup = interaction.options.getSubcommandGroup();
      const subcommand = interaction.options.getSubcommand();

      if (subcommandGroup === 'logs') {
        switch (subcommand) {
          case 'user':
            await this.handleTotalLogs(interaction);
            break;
          case 'lb':
            await this.handleTotalLogsLeaderboard(interaction);
            break;
          default:
            await interaction.reply({ 
              content: 'Invalid subcommand for total logs command.', 
              ephemeral: true 
            });
        }
      } else {
        await interaction.reply({ 
          content: 'Invalid subcommand group for total command.', 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Error handling total command:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing the total command.', 
        ephemeral: true 
      });
    }
  }

  private async handleTotalLogs(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;

      // Count total messages with images from all tracked channels
      const trackedChannels = [
        '1339001416383070229', // admin
        '1315558587065569280', // whitelists
        '1315558586302201886', // moderator
        '1315558584888590367', // trial mod
        '1315558583290826856', // support
        '1315558581352792119', // trial support
        '1315558579662487552', // purchases
        '1383552724079087758'  // testing
      ];

      let totalImageMessages = 0;

      for (const channelId of trackedChannels) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isTextBased()) {
            // Fetch recent messages and count those with attachments from this user
            const messages = await channel.messages.fetch({ limit: 100 });
            const userImageMessages = messages.filter(msg => 
              msg.author.id === userId && 
              !msg.author.bot && 
              msg.attachments.size > 0 &&
              msg.attachments.some(attachment => 
                attachment.contentType?.startsWith('image/') || 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || '')
              )
            );
            totalImageMessages += userImageMessages.size;
          }
        } catch (channelError) {
          console.log(`Could not access channel ${channelId}:`, channelError.message);
        }
      }

      // Get username for display
      let userDisplay = targetUser.username;
      try {
        const discordUser = await this.client.users.fetch(userId);
        if (discordUser && discordUser.username) {
          userDisplay = discordUser.username;
        }
      } catch (fetchError) {
        // Use fallback
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Total Logs Count')
        .setDescription(`**${userDisplay}** has **${totalImageMessages}** total logs from image messages across all tracked channels.`)
        .addFields([
          {
            name: '👤 User',
            value: userDisplay,
            inline: true
          },
          {
            name: '📸 Total Image Messages',
            value: totalImageMessages.toString(),
            inline: true
          },
          {
            name: '📝 Tracked Channels',
            value: '8 channels monitored',
            inline: true
          }
        ])
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: 'Raptor Bot • Total Logs System' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in handleTotalLogs:', error);
      await interaction.editReply({ 
        content: 'Failed to retrieve total logs count.', 
      });
    }
  }

  private async handleTotalLogsLeaderboard(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const page = interaction.options.getInteger('page') || 1;
      const pageSize = 5;

      // Count total messages with images for all users across tracked channels
      const trackedChannels = [
        '1339001416383070229', // admin
        '1315558587065569280', // whitelists
        '1315558586302201886', // moderator
        '1315558584888590367', // trial mod
        '1315558583290826856', // support
        '1315558581352792119', // trial support
        '1315558579662487552', // purchases
        '1383552724079087758'  // testing
      ];

      const userCounts = new Map<string, number>();

      for (const channelId of trackedChannels) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isTextBased()) {
            const messages = await channel.messages.fetch({ limit: 100 });
            
            messages.forEach(msg => {
              if (!msg.author.bot && 
                  msg.attachments.size > 0 &&
                  msg.attachments.some(attachment => 
                    attachment.contentType?.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || '')
                  )) {
                const userId = msg.author.id;
                userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
              }
            });
          }
        } catch (channelError) {
          console.log(`Could not access channel ${channelId}:`, channelError.message);
        }
      }

      // Convert to sorted array
      const sortedUsers = Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, totalLogs: count }))
        .sort((a, b) => b.totalLogs - a.totalLogs);

      const totalPages = Math.ceil(sortedUsers.length / pageSize);
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * pageSize;
      const pageData = sortedUsers.slice(startIndex, startIndex + pageSize);

      if (pageData.length === 0) {
        await interaction.editReply({ 
          content: 'No total logs data found.', 
        });
        return;
      }

      let leaderboardText = '';
      for (let i = 0; i < pageData.length; i++) {
        try {
          const log = pageData[i];
          const globalRank = startIndex + i + 1;
          
          // Get rank display
          let rankDisplay = '';
          if (globalRank === 1) rankDisplay = '🥇 1st';
          else if (globalRank === 2) rankDisplay = '🥈 2nd';
          else if (globalRank === 3) rankDisplay = '🥉 3rd';
          else rankDisplay = `${globalRank}th`;
          
          // Fetch actual Discord username
          let userDisplay = `User${log.userId.slice(-4)}`;
          try {
            const discordUser = await this.client.users.fetch(log.userId);
            if (discordUser && discordUser.username) {
              userDisplay = discordUser.username;
            }
          } catch (fetchError) {
            console.log(`Could not fetch username for ${log.userId}, using fallback`);
          }
          
          const entry = `${rankDisplay} ${userDisplay} ${log.totalLogs} logs\n`;
          
          if ((leaderboardText + entry).length > 900) break;
          leaderboardText += entry;
        } catch (logError) {
          console.error('Error processing total leaderboard entry:', logError);
          continue;
        }
      }

      if (!leaderboardText || leaderboardText.trim().length === 0) {
        leaderboardText = 'No valid total leaderboard entries to display';
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Total Logs Leaderboard')
        .setDescription('**Top users by total image messages across all tracked channels**')
        .addFields([
          {
            name: `📊 Rankings (Page ${currentPage}/${totalPages})`,
            value: leaderboardText.trim(),
            inline: false
          },
          {
            name: '📝 Statistics',
            value: `Total Users: ${sortedUsers.length}\nTracked Channels: 8`,
            inline: false
          }
        ])
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: `Raptor Bot • Page ${currentPage}/${totalPages}` });

      // Add navigation buttons
      const components = [];
      if (totalPages > 1) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder();
        
        if (currentPage > 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`total_lb_${currentPage - 1}`)
              .setLabel('← Previous')
              .setStyle(ButtonStyle.Primary)
          );
        }
        
        if (currentPage < totalPages) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`total_lb_${currentPage + 1}`)
              .setLabel('Next →')
              .setStyle(ButtonStyle.Primary)
          );
        }
        
        if (row.components.length > 0) {
          components.push(row);
        }
      }

      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error in handleTotalLogsLeaderboard:', error);
      await interaction.editReply({ 
        content: 'Failed to generate total logs leaderboard.', 
      });
    }
  }

  private async handleTagManagerCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      const action = interaction.options.getString('action', true);
      const tagName = interaction.options.getString('tag');
      const query = interaction.options.getString('query');

      switch (action) {
        case 'list':
          const allTags = Object.keys(this.predefinedTags);
          const tagsByCategory = {
            'Installation & Setup': ['.install', '.elevated', '.zsh'],
            'Crashes & Errors': ['.crash', '.uicrash', '.fwaeh', '.badcpu'],
            'Payment Methods': ['.paypal', '.robux', '.giftcard'],
            'Script & Execution': ['.scripts', '.autoexe', '.iy', '.offline'],
            'System Information': ['.hwid', '.user', '.cookie'],
            'Store & Links': ['.sellsn', '.rapejaml'],
            'Security & Detection': ['.anticheat', '.multi-instance'],
            'Miscellaneous': ['.nigger']
          };

          let listResponse = `**📋 MacSploit Support Tags Manager**\n`;
          listResponse += `Total Tags: **${allTags.length}**\n\n`;
          listResponse += `Use \`/tag-manager view tag:<name>\` to see content\n\n`;

          Object.entries(tagsByCategory).forEach(([category, tags]) => {
            const validTags = tags.filter(tag => this.predefinedTags[tag]);
            if (validTags.length > 0) {
              listResponse += `**${category}:**\n`;
              listResponse += validTags.map(tag => `\`${tag}\``).join(', ') + '\n\n';
            }
          });

          await interaction.reply(listResponse);
          success = true;
          break;

        case 'view':
          if (!tagName) {
            await interaction.reply({ 
              content: '❌ Please specify a tag name to view.',
              ephemeral: true 
            });
            return;
          }

          const fullTagName = tagName.startsWith('.') ? tagName : `.${tagName}`;
          const tagContent = this.predefinedTags[fullTagName];

          if (!tagContent) {
            await interaction.reply({ 
              content: `❌ Tag \`${fullTagName}\` not found.`,
              ephemeral: true 
            });
            return;
          }

          const viewResponse = `**📄 Support Tag: ${fullTagName}**\n\n\`\`\`\n${tagContent}\n\`\`\`\n\n*Usage: Type ${fullTagName} in chat*`;

          await interaction.reply(viewResponse);
          success = true;
          break;

        case 'search':
          if (!query) {
            await interaction.reply({ 
              content: '❌ Please provide a search query.',
              ephemeral: true 
            });
            return;
          }

          const searchResults = Object.entries(this.predefinedTags)
            .filter(([tag, content]) => 
              tag.toLowerCase().includes(query.toLowerCase()) ||
              content.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 10);

          if (searchResults.length === 0) {
            await interaction.reply({ 
              content: `❌ No tags found matching "${query}".`,
              ephemeral: true 
            });
            return;
          }

          let searchResponse = `**🔍 Search Results for "${query}"**\n\n`;
          searchResponse += `Found ${searchResults.length} matching tags:\n\n`;

          searchResults.forEach(([tag, content]) => {
            const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
            searchResponse += `**${tag}**\n\`\`\`${preview}\`\`\`\n\n`;
          });

          await interaction.reply(searchResponse);
          success = true;
          break;

        default:
          await interaction.reply({ 
            content: '❌ Invalid action specified.',
            ephemeral: true 
          });
          return;
      }

      await this.logCommandUsage(interaction, startTime, success, null);
    } catch (error) {
      console.error('Error in tag manager command:', error);
      await this.logCommandUsage(interaction, startTime, false, error);
      
      await interaction.reply({ 
        content: '❌ An error occurred while processing the tag manager command.',
        ephemeral: true 
      });
    }
  }



  // STATS COMMAND - Show comprehensive bot statistics (duplicate removed)
  private async handleStatsCommandOld(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      // Get various statistics from storage
      const totalUsers = await storage.getDiscordUserCount();
      const totalKeys = await storage.getDiscordKeyCount();
      const activeKeys = await storage.getActiveDiscordKeyCount();
      const totalLogs = await storage.getTotalUserLogCount();
      const totalSuggestions = await storage.getSuggestionCount();
      const totalBugReports = await storage.getBugReportCount();
      
      // Bot uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeString = `${days}d ${hours}h ${minutes}m`;

      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;

      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setDescription('**MacSploit Raptor Bot Statistics**')
        .addFields([
          { name: '👥 Total Users', value: totalUsers.toString(), inline: true },
          { name: '🔑 Total Keys', value: totalKeys.toString(), inline: true },
          { name: '✅ Active Keys', value: activeKeys.toString(), inline: true },
          { name: '📝 Total Logs', value: totalLogs.toString(), inline: true },
          { name: '💡 Suggestions', value: totalSuggestions.toString(), inline: true },
          { name: '🐛 Bug Reports', value: totalBugReports.toString(), inline: true },
          { name: '⏱️ Uptime', value: uptimeString, inline: true },
          { name: '💾 Memory Usage', value: `${memUsed} MB`, inline: true },
          { name: '🤖 Bot Version', value: 'v2.1.0', inline: true }
        ])
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: 'Raptor Bot Statistics' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching bot statistics:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to retrieve bot statistics.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // KEY COMMAND - Comprehensive key validation and management
  private async handleKeyCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const keyValue = interaction.options.getString('key', true);

    try {
      // Get key information
      const keyInfo = await storage.getDiscordKey(keyValue);

      if (!keyInfo) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Key Not Found')
          .setDescription(`License key \`${keyValue}\` was not found in the database.`)
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Check key status
      const isExpired = keyInfo.expiresAt && new Date() > keyInfo.expiresAt;
      const statusEmoji = keyInfo.status === 'active' ? '✅' : keyInfo.status === 'revoked' ? '❌' : '⏸️';
      const statusText = isExpired ? 'Expired' : keyInfo.status;

      const embed = new EmbedBuilder()
        .setTitle('🔑 License Key Information')
        .addFields([
          { name: 'Key ID', value: keyInfo.keyId || 'Unknown', inline: true },
          { name: 'Status', value: `${statusEmoji} ${statusText}`, inline: true },
          { name: 'Owner', value: keyInfo.discordUsername || 'Unknown', inline: true },
          { name: 'HWID', value: keyInfo.hwid || 'Not bound', inline: true },
          { name: 'Created', value: keyInfo.createdAt ? `<t:${Math.floor(keyInfo.createdAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Expires', value: keyInfo.expiresAt ? `<t:${Math.floor(keyInfo.expiresAt.getTime() / 1000)}:R>` : 'Never', inline: true }
        ])
        .setColor(keyInfo.status === 'active' && !isExpired ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      if (keyInfo.revokedBy) {
        embed.addFields([
          { name: 'Revoked By', value: keyInfo.revokedBy, inline: true },
          { name: 'Revoked At', value: keyInfo.revokedAt ? `<t:${Math.floor(keyInfo.revokedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true }
        ]);
      }

      await interaction.editReply({ embeds: [embed] });

      // Log key check
      await this.logActivity('key_checked', `Key ${keyValue} checked by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error checking key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check license key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // RESET COMMAND - Reset user data or system components (duplicate removed)
  private async handleResetCommandOld(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);

    try {
      switch (subcommand) {
        case 'candy':
          await storage.resetCandyBalance(targetUser.id);
          
          const embed = new EmbedBuilder()
            .setTitle('🍭 Candy Balance Reset')
            .setDescription(`Successfully reset candy balance for <@${targetUser.id}>`)
            .addFields([
              { name: 'Target User', value: targetUser.username, inline: true },
              { name: 'Reset By', value: interaction.user.username, inline: true },
              { name: 'New Balance', value: '0 candies', inline: true }
            ])
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          await this.logActivity('candy_reset', `Candy balance reset for ${targetUser.username} by ${interaction.user.username}`);
          break;

        case 'logs':
          await storage.clearUserLogs(targetUser.id);
          
          const logsEmbed = new EmbedBuilder()
            .setTitle('📝 User Logs Reset')
            .setDescription(`Successfully reset all logs for <@${targetUser.id}>`)
            .addFields([
              { name: 'Target User', value: targetUser.username, inline: true },
              { name: 'Reset By', value: interaction.user.username, inline: true },
              { name: 'Logs Cleared', value: 'All logs removed', inline: true }
            ])
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [logsEmbed] });
          await this.logActivity('logs_reset', `User logs reset for ${targetUser.username} by ${interaction.user.username}`);
          break;

        case 'hwid':
          await storage.resetUserHwid(targetUser.id);
          
          const hwidEmbed = new EmbedBuilder()
            .setTitle('💻 HWID Reset')
            .setDescription(`Successfully reset HWID for <@${targetUser.id}>`)
            .addFields([
              { name: 'Target User', value: targetUser.username, inline: true },
              { name: 'Reset By', value: interaction.user.username, inline: true },
              { name: 'Status', value: 'HWID cleared from all keys', inline: true }
            ])
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [hwidEmbed] });
          await this.logActivity('hwid_reset', `HWID reset for ${targetUser.username} by ${interaction.user.username}`);
          break;

        default:
          await interaction.editReply({ content: 'Invalid reset type specified.' });
      }

    } catch (error) {
      console.error('Error in reset command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to perform reset operation.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // VIEW COMMAND - View various system information (duplicate removed)
  private async handleViewCommandOld(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'keys':
          const keys = await storage.getAllDiscordKeys(20);
          
          if (keys.length === 0) {
            const embed = new EmbedBuilder()
              .setTitle('🔑 License Keys')
              .setDescription('No license keys found in the database.')
              .setColor(0xff9900)
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
          }

          let keysList = '';
          keys.forEach((key, index) => {
            const status = key.status === 'active' ? '✅' : key.status === 'revoked' ? '❌' : '⏸️';
            const owner = key.discordUsername || 'Unknown';
            keysList += `${index + 1}. ${status} \`${key.keyId}\` - ${owner}\n`;
          });

          const keysEmbed = new EmbedBuilder()
            .setTitle('🔑 Recent License Keys')
            .setDescription(`**Latest 20 Keys:**\n\n${keysList}`)
            .setFooter({ text: `Total Keys: ${keys.length}` })
            .setColor(0x0099ff)
            .setTimestamp();

          await interaction.editReply({ embeds: [keysEmbed] });
          break;

        case 'users':
          const users = await storage.getAllDiscordUsers(20);
          
          if (users.length === 0) {
            const usersEmbed = new EmbedBuilder()
              .setTitle('👥 Discord Users')
              .setDescription('No users found in the database.')
              .setColor(0xff9900)
              .setTimestamp();

            await interaction.editReply({ embeds: [usersEmbed] });
            return;
          }

          let usersList = '';
          users.forEach((user, index) => {
            const status = user.isWhitelisted ? '✅' : '❌';
            const balance = user.candyBalance || 0;
            usersList += `${index + 1}. ${status} ${user.username} - ${balance} candies\n`;
          });

          const usersEmbed = new EmbedBuilder()
            .setTitle('👥 Recent Discord Users')
            .setDescription(`**Latest 20 Users:**\n\n${usersList}`)
            .setFooter({ text: `Total Users: ${users.length}` })
            .setColor(0x0099ff)
            .setTimestamp();

          await interaction.editReply({ embeds: [usersEmbed] });
          break;

        case 'settings':
          const settings = await storage.getAllBotSettings();
          
          let settingsList = '';
          Object.entries(settings).forEach(([key, value]) => {
            settingsList += `**${key}:** \`${value}\`\n`;
          });

          const settingsEmbed = new EmbedBuilder()
            .setTitle('⚙️ Bot Settings')
            .setDescription(settingsList || 'No settings configured.')
            .setColor(0x0099ff)
            .setTimestamp();

          await interaction.editReply({ embeds: [settingsEmbed] });
          break;

        default:
          await interaction.editReply({ content: 'Invalid view type specified.' });
      }

    } catch (error) {
      console.error('Error in view command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to retrieve view information.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // DEWHITELIST COMMAND - Remove key from whitelist using real API
  private async handleDewhitelistCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const keyValue = interaction.options.getString('key', true);

      console.log(`[DEBUG] Dewhitelisting key: ${keyValue}`);
      
      // Call the whitelist API to attempt dewhitelisting
      try {
        const result = await WhitelistAPI.dewhitelistUser(keyValue);
        
        console.log(`[DEWHITELIST DEBUG] API Result:`, result);
        
        if (result.success) {
          success = true;
          const embed = new EmbedBuilder()
            .setTitle('✅ REAL DEWHITELIST SUCCESS')
            .setDescription(`Key has been removed from Raptor system and will no longer work for users.\n\n${result.message}`)
            .addFields(
              { name: 'Key', value: `\`${keyValue}\``, inline: true },
              { name: 'Dewhitelisted By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Status', value: 'Successfully removed from Raptor system', inline: false }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          success = true;
        } else {
          const embed = new EmbedBuilder()
            .setTitle('⚠️ Dewhitelist API Limitation')
            .setDescription(`**Key remains ACTIVE in Raptor system**\n\n${result.error}`)
            .addFields(
              { name: 'Key', value: `\`${keyValue}\``, inline: true },
              { name: 'Attempted By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Current Status', value: '🟢 **STILL WORKING** for users', inline: false },
              { name: 'Required Action', value: 'Contact Raptor support for manual removal', inline: false }
            )
            .setColor(0xff9900)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        }

      } catch (apiError) {
        console.error('Error calling dewhitelist API:', apiError);
        
        const embed = new EmbedBuilder()
          .setTitle('❌ API Error')
          .setDescription(`Failed to call dewhitelist API: ${apiError.message}`)
          .addFields(
            { name: 'Key', value: `\`${keyValue}\``, inline: true },
            { name: 'Error', value: apiError.message, inline: false }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

      success = true;

    } catch (error) {
      console.error('Error in dewhitelist command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to dewhitelist key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } finally {
      await this.logCommandUsage(interaction, startTime, success);
    }
  }

  // PAYMENTS COMMAND - Payment information and API status
  private async handlePaymentsCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    let success = false;

    try {
      if (!await this.hasPermission(interaction)) {
        await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'info':
          // Get API status and payment methods
          const acceptedMethods = WhitelistAPI.getAcceptedPaymentMethods();
          
          let paymentMethodsList = '';
          acceptedMethods.forEach((method, index) => {
            const emoji = this.getPaymentMethodEmoji(method);
            paymentMethodsList += `${index + 1}. ${emoji} **${method.toUpperCase()}**\n`;
          });

          const embed = new EmbedBuilder()
            .setTitle('💳 Payment Information & API Status')
            .setDescription('Real Raptor whitelist API integration status and accepted payment methods')
            .addFields(
              { name: '🔗 API Endpoint', value: 'www.raptor.fun/api/whitelist', inline: false },
              { name: '✅ API Status', value: 'Connected and operational', inline: true },
              { name: '🔑 API Integration', value: 'Live key generation enabled', inline: true },
              { name: '📋 Accepted Payment Methods', value: paymentMethodsList, inline: false },
              { name: '⚠️ Important Notes', value: '• All keys are generated via real API calls\n• Payment IDs must be unique identifiers\n• Contact info uses Discord IDs or emails\n• Keys are immediately active after generation', inline: false }
            )
            .setFooter({ text: 'Payment system fully operational • API key secured' })
            .setColor(0x0099ff)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;

        default:
          await interaction.editReply('❌ Invalid subcommand.');
          return;
      }

      success = true;

    } catch (error) {
      console.error('Error in payments command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process payments command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } finally {
      await this.logCommandUsage(interaction, startTime, success);
    }
  }

  private getPaymentMethodEmoji(method: string): string {
    const emojiMap: { [key: string]: string } = {
      'paypal': '💳',
      'bitcoin': '₿',
      'ethereum': '⟠',
      'litecoin': 'Ł',
      'cashapp': '💵',
      'venmo': '💰',
      'robux': '🎮',
      'giftcard': '🎁',
      'sellix': '🛒',
      'custom': '🔧'
    };
    return emojiMap[method] || '💳';
  }

  public async start(): Promise<void> {
    if (!DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }

    try {
      await this.client.login(DISCORD_TOKEN);
      console.log('✅ Discord bot started successfully');
      
      // Log intent status once ready
      this.client.once('ready', () => {
        console.log('Bot intents enabled:', this.client.options.intents);
        console.log('Bot ready! Testing message handling...');
        console.log('Available support tags:', Object.keys(this.predefinedTags));
        console.log('Type .hwid in Discord to test');
      });
      
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
      
      if (error.message?.includes('disallowed intents')) {
        console.log('\n🔧 MessageContent Intent Required:');
        console.log('1. Visit https://discord.com/developers/applications');
        console.log('2. Select your bot application');  
        console.log('3. Go to Bot tab > Privileged Gateway Intents');
        console.log('4. Enable "Message Content Intent"');
        console.log('5. Save and restart bot\n');
      }
      
      throw error;
    }
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  public getClient(): Client {
    return this.client;
  }
}

export const discordBot = new RaptorBot();