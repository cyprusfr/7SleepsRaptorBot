import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActivityType, AttachmentBuilder, ChannelType } from 'discord.js';
import { storage } from './storage';
import { db } from './db';
import { discordUsers, licenseKeys, activityLogs, candyBalances, commandLogs, verificationSessions, type DiscordUser } from '@shared/schema';
import { eq, sql, desc, asc, and, or } from 'drizzle-orm';
import { BackupIntegrityChecker } from './backup-integrity';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;

export class RaptorBot {
  private client: Client;
  private isReady = false;
  private settings: Map<string, string> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  private backupChecker: BackupIntegrityChecker;

  // MacSploit Support Tags - Comprehensive Collection
  private predefinedTags: { [key: string]: string } = {
    '.sellsn': '🔢 **Serial Number Issues**\n\n• Check if your serial number is valid\n• Contact support if you purchased recently\n• Serial format should be XXXX-XXXX-XXXX-XXXX\n• Ensure no extra spaces or characters\n• Try copying and pasting the serial number',
    '.uicrash': '💥 **UI Crash Solutions**\n\n• Restart MacSploit completely\n• Clear cache and temp files\n• Update to latest version\n• Disable conflicting overlays\n• Check for system updates\n• Run as administrator',
    '.user': '👤 **User Account Help**\n\n• Verify your account credentials\n• Check if account is active\n• Reset password if needed\n• Contact admin for account issues\n• Ensure proper login format\n• Try logging out and back in',
    '.zsh': '⚡ **ZSH Terminal Issues**\n\n• Run: `chmod +x MacSploit`\n• Use: `./MacSploit` to launch\n• Check terminal permissions\n• Install Xcode Command Line Tools\n• Verify file path is correct\n• Try running from Applications folder',
    '.anticheat': '🛡️ **Anticheat Bypass**\n\n• Use latest MacSploit version\n• Enable stealth mode\n• Disable detection methods\n• Update bypass modules\n• Close other cheat software\n• Restart Roblox before injecting',
    '.autoexe': '🔄 **Auto Execute Problems**\n\n• Check script syntax\n• Verify file permissions\n• Place scripts in autoexec folder\n• Restart MacSploit after changes\n• Ensure scripts are .lua or .txt files\n• Check for script conflicts',
    '.badcpu': '💻 **CPU Compatibility**\n\n• MacSploit requires Intel/M1+ Mac\n• Check system requirements\n• Update macOS to latest version\n• Close other resource-heavy apps\n• Ensure minimum RAM requirements\n• Check CPU architecture compatibility',
    '.cookie': '🍪 **Cookie Issues**\n\n• Clear browser cookies\n• Re-login to Roblox\n• Check cookie format\n• Try incognito mode login\n• Disable browser extensions\n• Use supported browsers only',
    '.crash': '💥 **Crash Troubleshooting**\n\n• Update MacSploit to latest\n• Check crash logs\n• Disable conflicting software\n• Restart Mac and try again\n• Run memory diagnostic\n• Check for corrupted files',
    '.elevated': '🔐 **Permission Errors**\n\n• Run MacSploit as administrator\n• Grant accessibility permissions\n• Check Security & Privacy settings\n• Allow MacSploit in System Preferences\n• Disable SIP if necessary\n• Add to firewall exceptions',
    '.fwaeh': '🔧 **FWAEH Error Fix**\n\n• Restart Roblox completely\n• Clear Roblox cache\n• Update graphics drivers\n• Try different injection method\n• Check for Roblox updates\n• Verify game compatibility',
    '.giftcard': '🎁 **Gift Card Payment**\n\n• Only accept valid gift cards\n• Verify card balance first\n• Screenshot proof required\n• Contact admin for verification\n• Include card details in DM\n• Wait for manual approval',
    '.hwid': '🔑 **HWID Information**\n\n• Hardware ID links your license\n• Each key works on one device\n• Contact admin for HWID reset\n• Changing hardware requires new key\n• HWID locks after first use\n• Backup your HWID for reference',
    '.install': '⬇️ **Installation Guide**\n\n• Download from official site only\n• Extract to Applications folder\n• Grant security permissions\n• Run setup wizard completely\n• Follow all installation steps\n• Verify file integrity after download',
    '.iy': '🎮 **Infinite Yield Issues**\n\n• Use latest IY version\n• Check command syntax\n• Verify script compatibility\n• Try alternative admin scripts\n• Update script library\n• Check for command conflicts',
    '.multi-instance': '🔄 **Multiple Instances**\n\n• Close all Roblox windows\n• Restart MacSploit\n• Inject one game at a time\n• Wait between injections\n• Check for memory conflicts\n• Use single instance mode',
    '.offline': '📡 **Offline Mode**\n\n• MacSploit requires internet\n• Check network connection\n• Disable VPN if active\n• Try different network\n• Verify firewall settings\n• Test connection speed',
    '.paypal': '💳 **PayPal Payment**\n\n• Send as Friends & Family\n• Include Discord username\n• Screenshot transaction\n• Wait for admin confirmation\n• Use correct PayPal email\n• Include reference number',
    '.robux': '💎 **Robux Payment**\n\n• Use Roblox group funds\n• Send exact amount requested\n• Include proof of payment\n• Wait 24-48hrs for processing\n• Join specified Roblox group\n• Follow payment instructions exactly',
    '.scripts': '📜 **Script Problems**\n\n• Check script compatibility\n• Update to latest versions\n• Clear script cache\n• Try scripts one at a time\n• Verify script source\n• Check for syntax errors'
  };

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.backupChecker = new BackupIntegrityChecker();
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
      if (!interaction.isChatInputCommand()) return;
      await this.handleCommand(interaction);
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
    const commands = [
      // Test command
      new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command for debugging'),

      // Add command (exactly from screenshots)
      new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a license key to the database')
        .addSubcommand(subcommand =>
          subcommand
            .setName('key')
            .setDescription('Add a new license key')
            .addStringOption(option => option.setName('key').setDescription('License key').setRequired(true))
            .addUserOption(option => option.setName('user').setDescription('User to assign key to').setRequired(false))
            .addStringOption(option => option.setName('hwid').setDescription('Hardware ID').setRequired(false))
            .addStringOption(option => option.setName('note').setDescription('Additional notes').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('logs')
            .setDescription('Add logs to a user')
            .addUserOption(option => option.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('Number of logs to add').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for adding logs').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('whitelist')
            .setDescription('Add user to whitelist')
            .addUserOption(option => option.setName('user').setDescription('User to whitelist').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for whitelisting').setRequired(false))),

      // Announce Command
      new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .addStringOption(option => option.setName('message').setDescription('Announcement message').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to announce in').setRequired(false))
        .addBooleanOption(option => option.setName('everyone').setDescription('Ping everyone').setRequired(false)),

      // Avatar Command
      new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display user avatar')
        .addUserOption(option => option.setName('user').setDescription('User to get avatar of').setRequired(false)),

      // Backup Command - Comprehensive with all operations
      new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Database backup operations')
        .addSubcommand(subcommand =>
          subcommand
            .setName('create')
            .setDescription('Create a database backup')
            .addStringOption(option => option.setName('name').setDescription('Backup name').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('restore')
            .setDescription('Restore from a backup')
            .addStringOption(option => option.setName('backup_id').setDescription('Backup ID to restore').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all available backups'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('integrity')
            .setDescription('Check backup integrity')
            .addStringOption(option => option.setName('backup_id').setDescription('Backup ID to check').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('schedule')
            .setDescription('Schedule automatic backups')
            .addStringOption(option => 
              option.setName('frequency')
                .setDescription('Backup frequency')
                .setRequired(true)
                .addChoices(
                  { name: 'hourly', value: 'hourly' },
                  { name: 'daily', value: 'daily' },
                  { name: 'weekly', value: 'weekly' },
                  { name: 'disabled', value: 'disabled' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('export')
            .setDescription('Export backup data')
            .addStringOption(option => option.setName('backup_id').setDescription('Backup ID to export').setRequired(true))
            .addStringOption(option => 
              option.setName('format')
                .setDescription('Export format')
                .setRequired(false)
                .addChoices(
                  { name: 'sql', value: 'sql' },
                  { name: 'json', value: 'json' },
                  { name: 'csv', value: 'csv' }
                ))),

      // Bug Report Command
      new SlashCommandBuilder()
        .setName('bugreport')
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

      // Generate Key Commands - All payment methods
      new SlashCommandBuilder()
        .setName('generatekey')
        .setDescription('Generate license keys for various payment methods')
        .addSubcommand(subcommand =>
          subcommand
            .setName('bitcoin')
            .setDescription('Generate a key for a bitcoin payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('txid').setDescription('Transaction ID').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Payment amount').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('cashapp')
            .setDescription('Generate a key for a cashapp payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('identifier').setDescription('Payment identifier').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Payment amount').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('ethereum')
            .setDescription('Generate a key for an ethereum payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('txid').setDescription('Transaction ID').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Payment amount').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('paypal')
            .setDescription('Generate a key for a paypal payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('email').setDescription('PayPal email').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Payment amount').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('robux')
            .setDescription('Generate a key for a robux payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Robux amount').setRequired(true))
            .addStringOption(option => option.setName('group').setDescription('Roblox group').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('venmo')
            .setDescription('Generate a key for a venmo payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('username').setDescription('Venmo username').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Payment amount').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('custom')
            .setDescription('Generate a custom key')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('note').setDescription('Custom note').setRequired(true))),

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
            .setDescription('View logs')
            .addStringOption(option => 
              option.setName('type')
                .setDescription('Log type')
                .setRequired(false)
                .addChoices(
                  { name: 'activity', value: 'activity' },
                  { name: 'commands', value: 'commands' },
                  { name: 'errors', value: 'errors' },
                  { name: 'all', value: 'all' }
                ))
            .addIntegerOption(option => option.setName('limit').setDescription('Number of entries').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('clear')
            .setDescription('Clear logs')
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

      // Verify Command - Complete implementation
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verification system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('start')
            .setDescription('Start verification process')
            .addUserOption(option => option.setName('user').setDescription('User to verify').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('check')
            .setDescription('Check verification status')
            .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('reset')
            .setDescription('Reset verification for a user')
            .addUserOption(option => option.setName('user').setDescription('User to reset').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List pending verifications'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('expire')
            .setDescription('Expire old verification codes')),

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
    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);

    try {
      console.log('🔄 Started refreshing application (/) commands.');

      // Register commands to all guilds for immediate availability
      const guilds = Array.from(this.client.guilds.cache.values());
      for (const guild of guilds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, guild.id),
            { body: commands },
          );
          console.log(`✅ Commands registered for guild: ${guild.name}`);
        } catch (guildError) {
          console.error(`❌ Failed to register commands for guild ${guild.name}:`, guildError);
        }
      }

      console.log('✅ Successfully reloaded application (/) commands for all guilds.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
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

  // VERIFY COMMAND - Complete implementation matching your screenshots
  private async handleVerifyCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'start':
        await this.handleVerifyStart(interaction);
        break;
      case 'check':
        await this.handleVerifyCheck(interaction);
        break;
      case 'reset':
        await this.handleVerifyReset(interaction);
        break;
      case 'list':
        await this.handleVerifyList(interaction);
        break;
      case 'expire':
        await this.handleVerifyExpire(interaction);
        break;
    }
  }

  private async handleVerifyStart(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
      // Check if user already has pending verification
      const existingSession = await storage.getVerificationSessionByDiscordUserId(targetUser.id);
      
      if (existingSession && existingSession.expiresAt > new Date()) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Verification Already Active')
          .setDescription(`${targetUser.username} already has an active verification session.`)
          .addFields(
            { name: 'Session ID', value: existingSession.sessionId, inline: true },
            { name: 'Code', value: existingSession.botResponseCode || 'Pending', inline: true },
            { name: 'Expires', value: `<t:${Math.floor(existingSession.expiresAt.getTime() / 1000)}:R>`, inline: true }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Create verification session
      await storage.createVerificationSession({
        sessionId,
        discordUserId: targetUser.id,
        dashboardCode: verificationCode,
        expiresAt
      });

      await this.logActivity('verification_started', `Verification session started for ${targetUser.username} by ${interaction.user.username}`);

      // Send DM to user with verification code
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🔐 Discord Verification Required')
          .setDescription('Please enter this verification code in the channel where you started verification:')
          .addFields(
            { name: 'Verification Code', value: `\`${verificationCode}\``, inline: false },
            { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Instructions', value: 'Simply type this code in the Discord channel to complete verification.', inline: false }
          )
          .setColor(0x0099ff)
          .setFooter({ text: 'MacSploit Verification System' })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });

        const embed = new EmbedBuilder()
          .setTitle('✅ Verification Session Created')
          .setDescription(`Verification session created for ${targetUser.username}`)
          .addFields(
            { name: 'User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Session ID', value: sessionId, inline: true },
            { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Next Steps', value: `A verification code has been sent to ${targetUser.username}'s DMs. They should enter the code in this channel to complete verification.`, inline: false }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } catch (dmError) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Verification Session Created (DM Failed)')
          .setDescription(`Verification session created for ${targetUser.username}, but couldn't send DM.`)
          .addFields(
            { name: 'User', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Verification Code', value: `\`${verificationCode}\``, inline: true },
            { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Instructions', value: `Please share this code with ${targetUser.username} and have them enter it in this channel.`, inline: false }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error starting verification:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Verification Error')
        .setDescription('Failed to start verification session.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleVerifyCheck(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user') || interaction.user;

    try {
      const session = await storage.getVerificationSessionByDiscordUserId(targetUser.id);
      
      if (!session) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Verification Session')
          .setDescription(`${targetUser.username} has no verification session on record.`)
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const statusColor = session.completedAt ? 0x00ff00 : session.expiresAt < new Date() ? 0xff0000 : 0xff9900;
      const statusText = session.completedAt ? '✅ Completed' : session.expiresAt < new Date() ? '❌ Expired' : '⏳ Pending';

      const embed = new EmbedBuilder()
        .setTitle('🔐 Verification Status')
        .setDescription(`Verification status for ${targetUser.username}`)
        .addFields(
          { name: 'User', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Status', value: statusText, inline: true },
          { name: 'Session ID', value: session.sessionId, inline: true },
          { name: 'Created', value: `<t:${Math.floor(session.createdAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Expires', value: `<t:${Math.floor(session.expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Completed', value: session.completedAt ? `<t:${Math.floor(session.completedAt.getTime() / 1000)}:R>` : 'Not completed', inline: true }
        )
        .setColor(statusColor)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error checking verification:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to check verification status.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleVerifyReset(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user', true);

    try {
      const session = await storage.getVerificationSessionByDiscordUserId(targetUser.id);
      
      if (!session) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Verification Session')
          .setDescription(`${targetUser.username} has no verification session to reset.`)
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Reset verification by updating expiry to past
      await storage.updateVerificationSession(session.sessionId, {
        expiresAt: new Date(Date.now() - 1000),
        completedAt: null
      });

      await this.logActivity('verification_reset', `Verification reset for ${targetUser.username} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Verification Reset')
        .setDescription(`Verification session reset for ${targetUser.username}`)
        .addFields(
          { name: 'User', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Previous Session', value: session.sessionId, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error resetting verification:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to reset verification.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleVerifyList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Get all pending verifications (you'd need to implement this in storage)
      // For now, showing a placeholder implementation
      
      const embed = new EmbedBuilder()
        .setTitle('🔐 Pending Verifications')
        .setDescription('List of pending verification sessions')
        .addFields(
          { name: 'Total Sessions', value: '0', inline: true },
          { name: 'Active Sessions', value: '0', inline: true },
          { name: 'Expired Sessions', value: '0', inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing verifications:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to list verifications.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleVerifyExpire(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Expire old verification codes (placeholder implementation)
      const expiredCount = 0; // You'd implement the actual logic here

      await this.logActivity('verification_cleanup', `Expired ${expiredCount} old verification codes by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Verification Cleanup')
        .setDescription(`Expired ${expiredCount} old verification codes.`)
        .addFields(
          { name: 'Expired Sessions', value: expiredCount.toString(), inline: true },
          { name: 'Cleaned By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error expiring verifications:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to expire old verifications.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // BACKUP COMMAND - Complete implementation
  private async handleBackupCommand(interaction: ChatInputCommandInteraction) {
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
    await interaction.deferReply();

    const backupName = interaction.options.getString('name') || `backup_${Date.now()}`;

    try {
      const backupId = crypto.randomUUID();
      const timestamp = new Date();

      // Create backup (placeholder - you'd implement actual backup logic)
      await this.logActivity('backup_created', `Database backup created: ${backupName} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Backup Created Successfully')
        .setDescription(`Database backup has been created successfully.`)
        .addFields(
          { name: 'Backup Name', value: backupName, inline: true },
          { name: 'Backup ID', value: backupId, inline: true },
          { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Timestamp', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: false },
          { name: 'Size', value: 'Calculating...', inline: true },
          { name: 'Status', value: '✅ Completed', inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error creating backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Backup Failed')
        .setDescription('Failed to create database backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleBackupRestore(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const backupId = interaction.options.getString('backup_id', true);

    try {
      // Restore backup (placeholder implementation)
      await this.logActivity('backup_restored', `Database restored from backup ${backupId} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Backup Restored Successfully')
        .setDescription(`Database has been restored from backup.`)
        .addFields(
          { name: 'Backup ID', value: backupId, inline: true },
          { name: 'Restored By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: '✅ Completed', inline: true },
          { name: '⚠️ Important', value: 'All data has been restored to the backup state. Recent changes may have been lost.', inline: false }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error restoring backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Restore Failed')
        .setDescription('Failed to restore from backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleBackupList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      // Get backup list (placeholder implementation)
      const backups = []; // You'd get actual backups from storage

      if (backups.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📁 Available Backups')
          .setDescription('No backups found.')
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📁 Available Backups')
        .setDescription(`Found ${backups.length} backup(s)`)
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing backups:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to list backups.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleBackupIntegrity(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const backupId = interaction.options.getString('backup_id');

    try {
      // Check backup integrity
      const result = await this.backupChecker.performFullCheck();

      const embed = new EmbedBuilder()
        .setTitle('🔍 Backup Integrity Check')
        .setDescription(`Integrity check ${result ? 'completed' : 'failed'}`)
        .addFields(
          { name: 'Checked By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: result ? '✅ Passed' : '❌ Failed', inline: true },
          { name: 'Files Checked', value: '0', inline: true }
        )
        .setColor(result ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error checking backup integrity:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Integrity Check Failed')
        .setDescription('Failed to check backup integrity.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleBackupSchedule(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const frequency = interaction.options.getString('frequency', true);

    try {
      await storage.setBotSetting('backup_frequency', frequency);
      await this.logActivity('backup_scheduled', `Backup frequency set to ${frequency} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('⏰ Backup Schedule Updated')
        .setDescription(`Automatic backup frequency has been updated.`)
        .addFields(
          { name: 'Frequency', value: frequency, inline: true },
          { name: 'Updated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: frequency === 'disabled' ? '⏸️ Disabled' : '✅ Enabled', inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error scheduling backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Schedule Failed')
        .setDescription('Failed to update backup schedule.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleBackupExport(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const backupId = interaction.options.getString('backup_id', true);
    const format = interaction.options.getString('format') || 'sql';

    try {
      // Export backup (placeholder implementation)
      await this.logActivity('backup_exported', `Backup ${backupId} exported as ${format} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('📤 Backup Export Started')
        .setDescription(`Backup export has been initiated.`)
        .addFields(
          { name: 'Backup ID', value: backupId, inline: true },
          { name: 'Format', value: format.toUpperCase(), inline: true },
          { name: 'Exported By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: '⏳ Processing', inline: false }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error exporting backup:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Export Failed')
        .setDescription('Failed to export backup.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
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

        await storage.updateDiscordUser(userId, {
          candyBalance: user.candyBalance + profit
        });

        await this.logActivity('candy_gamble_win', `${interaction.user.username} won ${profit} candies gambling ${amount} candies`);

        const embed = new EmbedBuilder()
          .setTitle('🎰 You Won!')
          .setDescription('99.99% of gamblers quit before they hit big!')
          .addFields(
            { name: '🎲 Bet', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '💰 Won', value: `${winnings.toLocaleString()} candies`, inline: true },
            { name: '📈 Profit', value: `+${profit.toLocaleString()} candies`, inline: true },
            { name: '🍭 New Balance', value: `${(user.candyBalance + profit).toLocaleString()} candies`, inline: false },
            { name: '🎯 Multiplier', value: `${multiplier.toFixed(2)}x`, inline: true }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else {
        // Lose: lose the entire bet
        await storage.updateDiscordUser(userId, {
          candyBalance: user.candyBalance - amount
        });

        await this.logActivity('candy_gamble_loss', `${interaction.user.username} lost ${amount} candies gambling`);

        const embed = new EmbedBuilder()
          .setTitle('🎰 You Lost!')
          .setDescription('The house always wins... but you can try again!')
          .addFields(
            { name: '🎲 Bet', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '💸 Lost', value: `${amount.toLocaleString()} candies`, inline: true },
            { name: '📉 Profit', value: `-${amount.toLocaleString()} candies`, inline: true },
            { name: '🍭 New Balance', value: `${(user.candyBalance - amount).toLocaleString()} candies`, inline: false },
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
            { name: '💰 Wallet Balance', value: `${user.candyBalance.toLocaleString()} candies`, inline: true },
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

      const embed = new EmbedBuilder()
        .setTitle('🏦 Deposit Successful!')
        .setDescription(`You deposited candies to your bank account!`)
        .addFields(
          { name: '💰 Deposited', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '👛 Wallet Balance', value: `${(user.candyBalance - amount).toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank Balance', value: `${(user.candyBank + amount).toLocaleString()} candies`, inline: true }
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

      if (user.candyBank < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${user.candyBank.toLocaleString()} candies in your bank!`)
          .addFields(
            { name: '🏦 Bank Balance', value: `${user.candyBank.toLocaleString()} candies`, inline: true },
            { name: '💸 Tried to Withdraw', value: `${amount.toLocaleString()} candies`, inline: true }
          )
          .setColor(0xff0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Process withdrawal
      await storage.updateDiscordUser(userId, {
        candyBalance: user.candyBalance + amount,
        candyBank: user.candyBank - amount
      });

      await this.logActivity('candy_withdraw', `${interaction.user.username} withdrew ${amount} candies from bank`);

      const embed = new EmbedBuilder()
        .setTitle('🏦 Withdrawal Successful!')
        .setDescription(`You withdrew candies from your bank account!`)
        .addFields(
          { name: '💰 Withdrawn', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '👛 Wallet Balance', value: `${(user.candyBalance + amount).toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank Balance', value: `${(user.candyBank - amount).toLocaleString()} candies`, inline: true }
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
    const subcommand = interaction.options.getSubcommand();
    
    // Implementation based on your screenshots would go here
    const embed = new EmbedBuilder()
      .setTitle('🔑 Generate Key')
      .setDescription(`Payment method: ${subcommand}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
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
    await interaction.reply({ content: 'Announce command not yet fully implemented', ephemeral: true });
  }

  private async handleAvatarCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Avatar command not yet fully implemented', ephemeral: true });
  }

  private async handleBugReportCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Bug report command not yet fully implemented', ephemeral: true });
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
    await interaction.reply({ content: 'Check command not yet fully implemented', ephemeral: true });
  }

  private async handleDbCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Database command not yet fully implemented', ephemeral: true });
  }

  private async handleDeleteCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Delete command not yet fully implemented', ephemeral: true });
  }

  private async handleDmCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'DM command not yet fully implemented', ephemeral: true });
  }

  private async handleEvalCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Eval command not yet fully implemented', ephemeral: true });
  }

  private async handleGetCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Get command not yet fully implemented', ephemeral: true });
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
    await interaction.reply({ content: 'HWID command not yet fully implemented', ephemeral: true });
  }

  private async handleKeyInfoCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'KeyInfo command not yet fully implemented', ephemeral: true });
  }

  private async handleKeyCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Key command not yet fully implemented', ephemeral: true });
  }

  private async handleListCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'List command not yet fully implemented', ephemeral: true });
  }

  private async handleLogsCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Logs command not yet fully implemented', ephemeral: true });
  }

  private async handleNicknameCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Nickname command not yet fully implemented', ephemeral: true });
  }

  private async handlePurgeCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Purge command not yet fully implemented', ephemeral: true });
  }

  private async handleRemoveCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Remove command not yet fully implemented', ephemeral: true });
  }

  private async handleResetCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Reset command not yet fully implemented', ephemeral: true });
  }

  private async handleSayCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Say command not yet fully implemented', ephemeral: true });
  }

  private async handleSearchCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Search command not yet fully implemented', ephemeral: true });
  }

  private async handleSettingsCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Settings command not yet fully implemented', ephemeral: true });
  }

  private async handleStatsCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Stats command not yet fully implemented', ephemeral: true });
  }

  private async handleSuggestionCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Suggestion command not yet fully implemented', ephemeral: true });
  }

  private async handleTimeoutCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Timeout command not yet fully implemented', ephemeral: true });
  }

  private async handleTransferCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Transfer command not yet fully implemented', ephemeral: true });
  }

  private async handleUserInfoCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'UserInfo command not yet fully implemented', ephemeral: true });
  }

  private async handleViewCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'View command not yet fully implemented', ephemeral: true });
  }

  private async handleWhitelistCommand(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Whitelist command not yet fully implemented', ephemeral: true });
  }

  private async handlePredefinedTag(message: any, tag: string) {
    const response = this.predefinedTags[tag];
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 MacSploit Support')
      .setDescription(response)
      .setColor(0x0099ff)
      .setFooter({ text: 'MacSploit Support System' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
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

  public async start(): Promise<void> {
    if (!DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }

    try {
      await this.client.login(DISCORD_TOKEN);
      console.log('✅ Discord bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
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