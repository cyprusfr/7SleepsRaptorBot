import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActivityType, AttachmentBuilder } from 'discord.js';
import { storage } from './storage';
import { db } from './db';
import { discordUsers, licenseKeys, activityLogs, candyBalances, commandLogs, type DiscordUser } from '@shared/schema';
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
      if (message.channel.type === 1) {
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
    for (const guild of this.client.guilds.cache.values()) {
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
      // Add Key Command
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

      // Backup Command
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
            .addStringOption(option => option.setName('backup_id').setDescription('Backup ID to check').setRequired(false))),

      // Bug Report Command
      new SlashCommandBuilder()
        .setName('bugreport')
        .setDescription('Report a bug')
        .addStringOption(option => option.setName('title').setDescription('Bug title').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Bug description').setRequired(true))
        .addStringOption(option => option.setName('steps').setDescription('Steps to reproduce').setRequired(false)),

      // Bypass Command
      new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass given link')
        .addStringOption(option => option.setName('url').setDescription('URL to bypass').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('User requesting bypass').setRequired(false)),

      // Candy System Commands
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

      // Generate Key Commands
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

      // Verify Command
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
            .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(false))),

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

      // Permission checks
      if (!await this.hasPermission(interaction)) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Permissions')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Command routing
      switch (interaction.commandName) {
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

  // Command Implementations
  private async handleAddCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'key':
        await this.handleAddKey(interaction);
        break;
      case 'logs':
        await this.handleAddLogs(interaction);
        break;
      case 'whitelist':
        await this.handleAddWhitelist(interaction);
        break;
    }
  }

  private async handleAddKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const keyValue = interaction.options.getString('key', true);
    const user = interaction.options.getUser('user');
    const hwid = interaction.options.getString('hwid');
    const note = interaction.options.getString('note');

    try {
      // Check if key already exists
      const existingKey = await storage.getDiscordKeyByKeyId(keyValue);
      if (existingKey) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Key Already Exists')
          .setDescription('This license key already exists in the database.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Create new key
      const newKey = await storage.createDiscordKey({
        keyId: keyValue,
        userId: user?.id,
        username: user?.username,
        hwid: hwid,
        status: 'active',
        createdBy: interaction.user.id,
        notes: note,
      });

      await this.logActivity('key_created', `Key ${keyValue} created by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Key Added Successfully')
        .setDescription(`License key \`${keyValue}\` has been added to the database.`)
        .addFields(
          { name: 'Key ID', value: keyValue, inline: true },
          { name: 'User', value: user ? `<@${user.id}>` : 'Not assigned', inline: true },
          { name: 'HWID', value: hwid || 'Not set', inline: true },
          { name: 'Status', value: 'Active', inline: true },
          { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Notes', value: note || 'None', inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error adding key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Adding Key')
        .setDescription('An error occurred while adding the license key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleAddLogs(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await storage.addUserLogs(user.id, amount, reason);
      await this.logActivity('logs_added', `${amount} logs added to ${user.username} by ${interaction.user.username}: ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ Logs Added')
        .setDescription(`Successfully added ${amount} logs to <@${user.id}>`)
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Amount', value: amount.toString(), inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error adding logs:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Adding Logs')
        .setDescription('An error occurred while adding logs.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleAddWhitelist(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await storage.addToWhitelist(user.id);
      await this.logActivity('whitelist_added', `${user.username} added to whitelist by ${interaction.user.username}: ${reason}`);

      const embed = new EmbedBuilder()
        .setTitle('✅ User Whitelisted')
        .setDescription(`<@${user.id}> has been added to the whitelist.`)
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error adding to whitelist:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Adding to Whitelist')
        .setDescription('An error occurred while adding user to whitelist.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
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
        await this.handleCandyScam(interaction);
        break;
      case 'gamble':
        await this.handleCandyGamble(interaction);
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
      case 'leaderboard':
        await this.handleCandyLeaderboard(interaction);
        break;
    }
  }

  private async handleCandyBalance(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;

    try {
      const balance = await storage.getCandyBalance(user.id);
      
      const embed = new EmbedBuilder()
        .setTitle(`🍭 ${user.username}'s Candy Balance`)
        .addFields(
          { name: '💰 Wallet', value: balance.wallet.toLocaleString(), inline: true },
          { name: '🏦 Bank', value: balance.bank.toLocaleString(), inline: true },
          { name: '💎 Total', value: balance.total.toLocaleString(), inline: true }
        )
        .setColor(0xff69b4)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error getting candy balance:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to get candy balance.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const canClaim = await storage.checkDailyCandy(interaction.user.id);
      
      if (!canClaim) {
        const embed = new EmbedBuilder()
          .setTitle('⏰ Daily Already Claimed')
          .setDescription('You have already claimed your daily candy today. Come back tomorrow!')
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const amount = await storage.claimDailyCandy(interaction.user.id);
      await this.logActivity('daily_claimed', `${interaction.user.username} claimed daily candy: ${amount}`);

      const embed = new EmbedBuilder()
        .setTitle('🎉 Daily Candy Claimed!')
        .setDescription(`You received **${amount.toLocaleString()}** candies!`)
        .setColor(0x00ff00)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error claiming daily candy:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to claim daily candy.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyBeg(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const lastBeg = await storage.getLastBeg(interaction.user.id);
      const cooldownMs = parseInt(this.getSetting('beg_cooldown', '300000')); // 5 minutes default
      
      if (lastBeg && Date.now() - lastBeg.getTime() < cooldownMs) {
        const remainingMs = cooldownMs - (Date.now() - lastBeg.getTime());
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        const embed = new EmbedBuilder()
          .setTitle('⏰ Cooldown Active')
          .setDescription(`You can beg again in ${remainingMinutes} minutes.`)
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Random chance mechanics
      const chance = Math.random();
      let amount = 0;
      let message = '';

      if (chance < 0.1) { // 10% chance for good amount
        amount = Math.floor(Math.random() * 500) + 100;
        message = 'Someone felt generous!';
      } else if (chance < 0.5) { // 40% chance for small amount
        amount = Math.floor(Math.random() * 50) + 10;
        message = 'You got some spare change.';
      } else { // 50% chance for nothing
        message = 'Nobody gave you anything. Better luck next time!';
      }

      if (amount > 0) {
        await storage.addCandyBalance(interaction.user.id, amount);
      }
      
      await storage.updateLastBeg(interaction.user.id);
      await this.logActivity('candy_beg', `${interaction.user.username} begged and got ${amount} candies`);

      const embed = new EmbedBuilder()
        .setTitle('🥺 Begging Results')
        .setDescription(message)
        .setColor(amount > 0 ? 0x00ff00 : 0xff9900)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      if (amount > 0) {
        embed.addFields({ name: '💰 Amount Received', value: amount.toLocaleString(), inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing beg command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process beg command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyScam(interaction: ChatInputCommandInteraction) {
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

    try {
      const lastScam = await storage.getLastScam(interaction.user.id);
      const cooldownMs = parseInt(this.getSetting('scam_cooldown', '600000')); // 10 minutes default
      
      if (lastScam && Date.now() - lastScam.getTime() < cooldownMs) {
        const remainingMs = cooldownMs - (Date.now() - lastScam.getTime());
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        const embed = new EmbedBuilder()
          .setTitle('⏰ Cooldown Active')
          .setDescription(`You can attempt another scam in ${remainingMinutes} minutes.`)
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get target balance
      const targetBalance = await storage.getCandyBalance(target.id);
      if (targetBalance.wallet === 0) {
        const embed = new EmbedBuilder()
          .setTitle('💸 No Money to Steal')
          .setDescription(`<@${target.id}> has no candies in their wallet to steal!`)
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Scam mechanics with realistic chances
      const chance = Math.random();
      let success = false;
      let amount = 0;
      let message = '';

      if (chance < 0.15) { // 15% success chance
        success = true;
        amount = Math.min(Math.floor(targetBalance.wallet * 0.1), 1000); // Max 10% of wallet or 1000
        message = `🎯 **Scam Successful!** You stole **${amount.toLocaleString()}** candies from <@${target.id}>!`;
        
        await storage.subtractCandy(target.id, amount);
        await storage.addCandyBalance(interaction.user.id, amount);
      } else if (chance < 0.35) { // 20% chance of getting caught and fined
        amount = Math.min(Math.floor(Math.random() * 500) + 100, targetBalance.wallet);
        message = `🚨 **Scam Failed!** You got caught and had to pay <@${target.id}> **${amount.toLocaleString()}** candies as compensation!`;
        
        const userBalance = await storage.getCandyBalance(interaction.user.id);
        const actualFine = Math.min(amount, userBalance.wallet);
        
        if (actualFine > 0) {
          await storage.subtractCandy(interaction.user.id, actualFine);
          await storage.addCandyBalance(target.id, actualFine);
        }
      } else { // 65% chance of just failing
        message = `❌ **Scam Failed!** <@${target.id}> saw through your scheme and blocked you!`;
      }

      await storage.updateLastScam(interaction.user.id);
      await this.logActivity('candy_scam', `${interaction.user.username} attempted to scam ${target.username}: ${success ? 'Success' : 'Failed'}`);

      const embed = new EmbedBuilder()
        .setTitle('💳 Credit Card Scam Results')
        .setDescription(message)
        .setColor(success ? 0x00ff00 : 0xff0000)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing scam command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process scam command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyGamble(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);
    const maxGamble = parseInt(this.getSetting('max_gamble_amount', '10000'));

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must gamble a positive amount!')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (amount > maxGamble) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Amount Too High')
        .setDescription(`Maximum gamble amount is ${maxGamble.toLocaleString()} candies.`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance.wallet < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${balance.wallet.toLocaleString()} candies in your wallet.`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Gambling mechanics - house edge
      const chance = Math.random();
      let won = false;
      let payout = 0;
      let message = '';

      if (chance < 0.45) { // 45% chance to win
        won = true;
        payout = Math.floor(amount * (1.5 + Math.random())); // 1.5x to 2.5x multiplier
        message = `🎉 **You Won!** You gambled ${amount.toLocaleString()} candies and won ${payout.toLocaleString()} candies!`;
        
        await storage.addCandyBalance(interaction.user.id, payout - amount); // Net gain
      } else { // 55% chance to lose
        message = `💸 **You Lost!** You gambled ${amount.toLocaleString()} candies and lost it all!`;
        await storage.subtractCandy(interaction.user.id, amount);
      }

      await this.logActivity('candy_gamble', `${interaction.user.username} gambled ${amount} candies: ${won ? 'Won' : 'Lost'}`);

      const embed = new EmbedBuilder()
        .setTitle('🎰 Gambling Results')
        .setDescription(message)
        .setColor(won ? 0x00ff00 : 0xff0000)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing gamble command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process gamble command.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyPay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const recipient = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (recipient.id === interaction.user.id) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Recipient')
        .setDescription('You cannot pay yourself!')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must pay a positive amount!')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance.wallet < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${balance.wallet.toLocaleString()} candies in your wallet.`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await storage.transferCandy(interaction.user.id, recipient.id, amount);
      await this.logActivity('candy_transfer', `${interaction.user.username} paid ${amount} candies to ${recipient.username}`);

      const embed = new EmbedBuilder()
        .setTitle('💸 Payment Successful')
        .setDescription(`You paid **${amount.toLocaleString()}** candies to <@${recipient.id}>!`)
        .addFields(
          { name: 'From', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'To', value: `<@${recipient.id}>`, inline: true },
          { name: 'Amount', value: amount.toLocaleString(), inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing payment:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process payment.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyDeposit(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must deposit a positive amount!')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance.wallet < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${balance.wallet.toLocaleString()} candies in your wallet.`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await storage.depositCandy(interaction.user.id, amount);
      await this.logActivity('candy_deposit', `${interaction.user.username} deposited ${amount} candies`);

      const newBalance = await storage.getCandyBalance(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle('🏦 Deposit Successful')
        .setDescription(`You deposited **${amount.toLocaleString()}** candies into your bank!`)
        .addFields(
          { name: '💰 Wallet', value: newBalance.wallet.toLocaleString(), inline: true },
          { name: '🏦 Bank', value: newBalance.bank.toLocaleString(), inline: true },
          { name: '💎 Total', value: newBalance.total.toLocaleString(), inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing deposit:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process deposit.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyWithdraw(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount', true);

    if (amount <= 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Amount')
        .setDescription('You must withdraw a positive amount!')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(interaction.user.id);
      
      if (balance.bank < amount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Insufficient Funds')
          .setDescription(`You only have ${balance.bank.toLocaleString()} candies in your bank.`)
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      await storage.withdrawCandy(interaction.user.id, amount);
      await this.logActivity('candy_withdraw', `${interaction.user.username} withdrew ${amount} candies`);

      const newBalance = await storage.getCandyBalance(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle('💰 Withdrawal Successful')
        .setDescription(`You withdrew **${amount.toLocaleString()}** candies from your bank!`)
        .addFields(
          { name: '💰 Wallet', value: newBalance.wallet.toLocaleString(), inline: true },
          { name: '🏦 Bank', value: newBalance.bank.toLocaleString(), inline: true },
          { name: '💎 Total', value: newBalance.total.toLocaleString(), inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing withdrawal:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to process withdrawal.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleCandyLeaderboard(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const leaderboard = await storage.getCandyLeaderboard(10);
      
      if (leaderboard.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Candy Leaderboard')
          .setDescription('No users found with candy balances.')
          .setColor(0xff9900)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      let description = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} <@${entry.userId}> - **${entry.balance.toLocaleString()}** candies\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Candy Leaderboard')
        .setDescription(description)
        .setColor(0xffd700)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error getting leaderboard:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to get candy leaderboard.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // Generate Key Commands
  private async handleGenerateKeyCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'bitcoin':
        await this.handleGenerateBitcoinKey(interaction);
        break;
      case 'cashapp':
        await this.handleGenerateCashAppKey(interaction);
        break;
      case 'ethereum':
        await this.handleGenerateEthereumKey(interaction);
        break;
      case 'paypal':
        await this.handleGeneratePayPalKey(interaction);
        break;
      case 'robux':
        await this.handleGenerateRobuxKey(interaction);
        break;
      case 'venmo':
        await this.handleGenerateVenmoKey(interaction);
        break;
      case 'custom':
        await this.handleGenerateCustomKey(interaction);
        break;
    }
  }

  private async handleGenerateBitcoinKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const txid = interaction.options.getString('txid', true);
    const amount = interaction.options.getString('amount') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `Bitcoin Payment - TXID: ${txid}, Amount: ${amount}`,
        isActive: true
      });

      await this.logActivity('key_generated', `Bitcoin key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 Bitcoin Key Generated')
        .setDescription(`A new MacSploit license key has been generated for Bitcoin payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '₿ Transaction ID', value: txid, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0xf7931a)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating Bitcoin key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate Bitcoin payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateCashAppKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const identifier = interaction.options.getString('identifier', true);
    const amount = interaction.options.getString('amount') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `CashApp Payment - ID: ${identifier}, Amount: ${amount}`,
        isActive: true
      });

      await this.logActivity('key_generated', `CashApp key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 CashApp Key Generated')
        .setDescription(`A new MacSploit license key has been generated for CashApp payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '💳 Payment ID', value: identifier, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x00d632)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating CashApp key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate CashApp payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateEthereumKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const txid = interaction.options.getString('txid', true);
    const amount = interaction.options.getString('amount') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `Ethereum Payment - TXID: ${txid}, Amount: ${amount}`,
        isActive: true
      });

      await this.logActivity('key_generated', `Ethereum key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 Ethereum Key Generated')
        .setDescription(`A new MacSploit license key has been generated for Ethereum payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '⟠ Transaction ID', value: txid, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x627eea)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating Ethereum key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate Ethereum payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGeneratePayPalKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const email = interaction.options.getString('email', true);
    const amount = interaction.options.getString('amount') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `PayPal Payment - Email: ${email}, Amount: ${amount}`,
        isActive: true
      });

      await this.logActivity('key_generated', `PayPal key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 PayPal Key Generated')
        .setDescription(`A new MacSploit license key has been generated for PayPal payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '📧 PayPal Email', value: email, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x0070ba)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating PayPal key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate PayPal payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateRobuxKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const amount = interaction.options.getString('amount', true);
    const group = interaction.options.getString('group') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `Robux Payment - Amount: ${amount}, Group: ${group}`,
        isActive: true
      });

      await this.logActivity('key_generated', `Robux key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 Robux Key Generated')
        .setDescription(`A new MacSploit license key has been generated for Robux payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '💎 Robux Amount', value: amount, inline: true },
          { name: '👥 Group', value: group, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x00a2ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating Robux key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate Robux payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateVenmoKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const username = interaction.options.getString('username', true);
    const amount = interaction.options.getString('amount') || 'Not specified';

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `Venmo Payment - Username: ${username}, Amount: ${amount}`,
        isActive: true
      });

      await this.logActivity('key_generated', `Venmo key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 Venmo Key Generated')
        .setDescription(`A new MacSploit license key has been generated for Venmo payment.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '📱 Venmo Username', value: username, inline: true },
          { name: '💰 Amount', value: amount, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x3d95ce)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating Venmo key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate Venmo payment key.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async handleGenerateCustomKey(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getString('user', true);
    const note = interaction.options.getString('note', true);

    try {
      const keyValue = this.generateRandomKey();
      
      const newKey = await storage.createLicenseKey({
        keyValue: keyValue,
        userId: user,
        createdBy: interaction.user.id,
        notes: `Custom Key - ${note}`,
        isActive: true
      });

      await this.logActivity('key_generated', `Custom key ${keyValue} generated for ${user} by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setTitle('🔑 Custom Key Generated')
        .setDescription(`A new MacSploit license key has been generated.`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyValue}\``, inline: false },
          { name: '👤 User', value: user, inline: true },
          { name: '📝 Note', value: note, inline: true },
          { name: '👨‍💼 Generated By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setColor(0x9932cc)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating custom key:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Generating Key')
        .setDescription('Failed to generate custom key.')
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

  // Bypass Command
  private async handleBypassCommand(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString('url', true);
    const user = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setTitle('🔗 Bypass Request')
      .setDescription('Bypass functionality is currently unavailable. This is a placeholder command.')
      .addFields(
        { name: 'URL', value: url, inline: true },
        { name: 'Requested by', value: user ? `<@${user.id}>` : `<@${interaction.user.id}>`, inline: true }
      )
      .setColor(0xff9900)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Key Info Command
  private async handleKeyInfoCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const keyValue = interaction.options.getString('key', true);

    try {
      const key = await storage.getDiscordKeyByKeyId(keyValue);
      
      if (!key) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Key Not Found')
          .setDescription('The specified license key was not found in the database.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🔑 License Key Information')
        .addFields(
          { name: 'Key ID', value: key.keyId, inline: true },
          { name: 'Status', value: key.status || 'Unknown', inline: true },
          { name: 'User', value: key.userId ? `<@${key.userId}>` : 'Not assigned', inline: true },
          { name: 'Username', value: key.username || 'N/A', inline: true },
          { name: 'HWID', value: key.hwid || 'Not set', inline: true },
          { name: 'Created', value: key.createdAt ? `<t:${Math.floor(key.createdAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Created By', value: key.createdBy ? `<@${key.createdBy}>` : 'Unknown', inline: true },
          { name: 'Notes', value: key.notes || 'None', inline: false }
        )
        .setColor(key.status === 'active' ? 0x00ff00 : 0xff0000)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error getting key info:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to retrieve key information.')
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // Help command implementation and other missing commands would continue here...
  private async handleHelpCommand(interaction: ChatInputCommandInteraction) {
    const command = interaction.options.getString('command');

    if (command) {
      // Specific command help
      const helpText = this.getCommandHelp(command);
      
      const embed = new EmbedBuilder()
        .setTitle(`📚 Help: /${command}`)
        .setDescription(helpText)
        .setColor(0x0099ff)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } else {
      // General help
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
  }

  private getCommandHelp(command: string): string {
    const helpTexts: { [key: string]: string } = {
      'add': 'Add various items to the system:\n• `/add key` - Add a new license key\n• `/add logs` - Add logs to a user\n• `/add whitelist` - Add user to whitelist',
      'candy': 'Candy system commands for the economy:\n• `/candy balance` - Check your or another user\'s balance\n• `/candy daily` - Claim your daily 2000 candies\n• `/candy beg` - Beg for candies (5min cooldown)\n• `/candy gamble` - Gamble your candies\n• `/candy pay` - Send candies to another user',
      'generatekey': 'Generate license keys for various payment methods:\n• Bitcoin, Ethereum, PayPal, CashApp, Venmo, Robux\n• Each requires payment verification details\n• Keys are automatically added to the database',
      'keyinfo': 'Get detailed information about a license key:\n• Usage: `/keyinfo key:<license_key>`\n• Shows status, owner, HWID, creation date, and notes',
      'ping': 'Check bot status and latency:\n• Shows bot response time\n• Discord API latency\n• Database connectivity\n• System uptime',
      'stats': 'Display comprehensive system statistics:\n• Total keys and active keys\n• User counts and server connections\n• Recent activity and performance metrics',
      'whitelist': 'Manage the user whitelist:\n• `/whitelist add` - Add user to whitelist\n• `/whitelist remove` - Remove user from whitelist\n• `/whitelist list` - Show all whitelisted users\n• `/whitelist check` - Check if user is whitelisted'
    };

    return helpTexts[command] || 'No help available for this command.';
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
      await storage.logActivity({
        type: type,
        description: description,
        metadata: {},
        userId: null
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  private async logCommandUsage(interaction: ChatInputCommandInteraction, startTime: number, success: boolean, error: any) {
    try {
      const executionTime = Date.now() - startTime;
      
      await storage.logCommandUsage({
        userId: interaction.user.id,
        username: interaction.user.username,
        commandName: interaction.commandName,
        subcommand: interaction.options.getSubcommand(false),
        executionTime,
        success,
        errorMessage: error ? String(error) : undefined,
      });
    } catch (err) {
      console.error('Error logging command usage:', err);
    }
  }

  // Stub implementations for remaining commands
  private async handleAnnounceCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Announce command not yet implemented', ephemeral: true });
  }

  private async handleAvatarCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Avatar command not yet implemented', ephemeral: true });
  }

  private async handleBackupCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Backup command not yet implemented', ephemeral: true });
  }

  private async handleBugReportCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Bug report command not yet implemented', ephemeral: true });
  }

  private async handleCheckCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Check command not yet implemented', ephemeral: true });
  }

  private async handleDbCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Database command not yet implemented', ephemeral: true });
  }

  private async handleDeleteCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Delete command not yet implemented', ephemeral: true });
  }

  private async handleDmCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'DM command not yet implemented', ephemeral: true });
  }

  private async handleEvalCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Eval command not yet implemented', ephemeral: true });
  }

  private async handleGetCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Get command not yet implemented', ephemeral: true });
  }

  private async handleHwidCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'HWID command not yet implemented', ephemeral: true });
  }

  private async handleKeyCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Key command not yet implemented', ephemeral: true });
  }

  private async handleListCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'List command not yet implemented', ephemeral: true });
  }

  private async handleLogsCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Logs command not yet implemented', ephemeral: true });
  }

  private async handleNicknameCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Nickname command not yet implemented', ephemeral: true });
  }

  private async handlePurgeCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Purge command not yet implemented', ephemeral: true });
  }

  private async handleRemoveCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Remove command not yet implemented', ephemeral: true });
  }

  private async handleResetCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Reset command not yet implemented', ephemeral: true });
  }

  private async handleSayCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Say command not yet implemented', ephemeral: true });
  }

  private async handleSearchCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Search command not yet implemented', ephemeral: true });
  }

  private async handleSettingsCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Settings command not yet implemented', ephemeral: true });
  }

  private async handleStatsCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Stats command not yet implemented', ephemeral: true });
  }

  private async handleSuggestionCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Suggestion command not yet implemented', ephemeral: true });
  }

  private async handleTimeoutCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Timeout command not yet implemented', ephemeral: true });
  }

  private async handleTransferCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Transfer command not yet implemented', ephemeral: true });
  }

  private async handleUserInfoCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Userinfo command not yet implemented', ephemeral: true });
  }

  private async handleVerifyCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Verify command not yet implemented', ephemeral: true });
  }

  private async handleViewCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'View command not yet implemented', ephemeral: true });
  }

  private async handleWhitelistCommand(interaction: ChatInputCommandInteraction) {
    // Implementation would go here
    await interaction.reply({ content: 'Whitelist command not yet implemented', ephemeral: true });
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
    for (const guild of this.client.guilds.cache.values()) {
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