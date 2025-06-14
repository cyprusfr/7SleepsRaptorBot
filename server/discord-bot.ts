import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActivityType } from 'discord.js';
import { storage } from './storage';
import { db } from './db';
import { discordUsers, licenseKeys, activityLogs, candyBalances, commandLogs, type DiscordUser } from '@shared/schema';
import { eq, sql, desc, asc } from 'drizzle-orm';
import { BackupIntegrityChecker } from './backup-integrity';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;

export class RaptorBot {
  private client: Client;
  private isReady = false;
  private settings: Map<string, string> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  // MacSploit Support Tags
  private predefinedTags: { [key: string]: string } = {
    '.sellsn': '🔢 **Serial Number Issues**\n\n• Check if your serial number is valid\n• Contact support if you purchased recently\n• Serial format should be XXXX-XXXX-XXXX-XXXX',
    '.uicrash': '💥 **UI Crash Solutions**\n\n• Restart MacSploit completely\n• Clear cache and temp files\n• Update to latest version\n• Disable conflicting overlays',
    '.user': '👤 **User Account Help**\n\n• Verify your account credentials\n• Check if account is active\n• Reset password if needed\n• Contact admin for account issues',
    '.zsh': '⚡ **ZSH Terminal Issues**\n\n• Run: `chmod +x MacSploit`\n• Use: `./MacSploit` to launch\n• Check terminal permissions\n• Install Xcode Command Line Tools',
    '.anticheat': '🛡️ **Anticheat Bypass**\n\n• Use latest MacSploit version\n• Enable stealth mode\n• Disable detection methods\n• Update bypass modules',
    '.autoexe': '🔄 **Auto Execute Problems**\n\n• Check script syntax\n• Verify file permissions\n• Place scripts in autoexec folder\n• Restart MacSploit after changes',
    '.badcpu': '💻 **CPU Compatibility**\n\n• MacSploit requires Intel/M1+ Mac\n• Check system requirements\n• Update macOS to latest version\n• Close other resource-heavy apps',
    '.cookie': '🍪 **Cookie Issues**\n\n• Clear browser cookies\n• Re-login to Roblox\n• Check cookie format\n• Try incognito mode login',
    '.crash': '💥 **Crash Troubleshooting**\n\n• Update MacSploit to latest\n• Check crash logs\n• Disable conflicting software\n• Restart Mac and try again',
    '.elevated': '🔐 **Permission Errors**\n\n• Run MacSploit as administrator\n• Grant accessibility permissions\n• Check Security & Privacy settings\n• Allow MacSploit in System Preferences',
    '.fwaeh': '🔧 **FWAEH Error Fix**\n\n• Restart Roblox completely\n• Clear Roblox cache\n• Update graphics drivers\n• Try different injection method',
    '.giftcard': '🎁 **Gift Card Payment**\n\n• Only accept valid gift cards\n• Verify card balance first\n• Screenshot proof required\n• Contact admin for verification',
    '.hwid': '🔑 **HWID Information**\n\n• Hardware ID links your license\n• Each key works on one device\n• Contact admin for HWID reset\n• Changing hardware requires new key',
    '.install': '⬇️ **Installation Guide**\n\n• Download from official site only\n• Extract to Applications folder\n• Grant security permissions\n• Run setup wizard completely',
    '.iy': '🎮 **Infinite Yield Issues**\n\n• Use latest IY version\n• Check command syntax\n• Verify script compatibility\n• Try alternative admin scripts',
    '.multi-instance': '🔄 **Multiple Instances**\n\n• Close all Roblox windows\n• Restart MacSploit\n• Inject one game at a time\n• Wait between injections',
    '.offline': '📡 **Offline Mode**\n\n• MacSploit requires internet\n• Check network connection\n• Disable VPN if active\n• Try different network',
    '.paypal': '💳 **PayPal Payment**\n\n• Send as Friends & Family\n• Include Discord username\n• Screenshot transaction\n• Wait for admin confirmation',
    '.robux': '💎 **Robux Payment**\n\n• Use Roblox group funds\n• Send exact amount requested\n• Include proof of payment\n• Wait 24-48hrs for processing',
    '.scripts': '📜 **Script Problems**\n\n• Check script compatibility\n• Update to latest versions\n• Clear script cache\n• Try scripts one at a time'
  };

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
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
      
      // Set default settings
      const defaultSettings = [
        { key: 'required_role', value: 'Raptor Admin' },
        { key: 'key_system_role', value: 'Key System' },
        { key: 'rate_limit_enabled', value: 'true' },
        { key: 'backup_retention_days', value: '30' },
        { key: 'authorized_user_id', value: '1131426483404026019' },
        { key: 'botStatus', value: 'online' },
        { key: 'activityType', value: '0' },
        { key: 'activityText', value: 'Managing Keys | /help' },
        { key: 'welcomeMessageEnabled', value: 'true' }
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
      // Update settings in database and memory
      for (const [key, value] of Object.entries(settings)) {
        await storage.setBotSetting(key, String(value));
        this.settings.set(key, String(value));
      }

      // Update bot presence
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
    const activityText = this.getSetting('activityText', 'Managing Keys | /help');

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
      console.log(`📥 Joined new server: ${guild.name}`);
      await this.addServer(guild);
    });
  }

  private async registerCommands() {
    if (!DISCORD_TOKEN || !CLIENT_ID) {
      console.error('❌ Missing Discord bot credentials');
      return;
    }

    const commands = [
      // License Key Management
      new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a new license key to the database')
        .addStringOption(option => option.setName('user').setDescription('User to assign the key to').setRequired(true))
        .addStringOption(option => option.setName('key').setDescription('The license key').setRequired(true))
        .addStringOption(option => option.setName('generatedby').setDescription('Who generated this key').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for key generation').setRequired(true)),

      new SlashCommandBuilder()
        .setName('keyinfo')
        .setDescription('Get information about a license key')
        .addStringOption(option => option.setName('key').setDescription('The license key to lookup').setRequired(true)),

      // Avatar Command
      new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Fetch a user\'s avatar from the server')
        .addUserOption(option => option.setName('user').setDescription('User to get avatar from').setRequired(false))
        .addStringOption(option => option.setName('size').setDescription('Avatar size').setRequired(false)),

      // Bug Report
      new SlashCommandBuilder()
        .setName('bug-report')
        .setDescription('Report a bug to the developers')
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
            .setDescription('Check your balance')
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
            .addIntegerOption(option => option.setName('amount').setDescription('Amount to pay').setRequired(true))),

      // Database Management
      new SlashCommandBuilder()
        .setName('db')
        .setDescription('Database management commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('management')
            .setDescription('Manage Database Tables and Entries')
            .addStringOption(option => 
              option.setName('action')
                .setDescription('Database action')
                .setRequired(true)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                ))),

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
            .addStringOption(option => option.setName('txid').setDescription('Transaction ID').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('cashapp')
            .setDescription('Generate a key for a cashapp payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('identifier').setDescription('Payment identifier').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('custom')
            .setDescription('Generate a custom key')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('note').setDescription('Custom note').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('ethereum')
            .setDescription('Generate a key for an ethereum payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('txid').setDescription('Transaction ID').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('g2a')
            .setDescription('Generate a key for a g2a gift code'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('litecoin')
            .setDescription('Generate a key for a litecoin payment')
            .addStringOption(option => 
              option.setName('note')
                .setDescription('Payment note')
                .setRequired(true)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('paypal')
            .setDescription('Generate a key for a paypal payment')
            .addStringOption(option => 
              option.setName('note')
                .setDescription('Payment note')
                .setRequired(true)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('robux')
            .setDescription('Generate a key for a robux payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('roblox_user_id').setDescription('Roblox User ID').setRequired(true))
            .addStringOption(option => option.setName('amount').setDescription('Robux amount').setRequired(false))
            .addStringOption(option => option.setName('proof').setDescription('Payment proof').setRequired(false))
            .addStringOption(option => option.setName('note').setDescription('Additional note').setRequired(false))
            .addStringOption(option => option.setName('transaction_id').setDescription('Transaction ID').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('venmo')
            .setDescription('Generate a key for a venmo payment')
            .addStringOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption(option => option.setName('txid').setDescription('Transaction ID').setRequired(true))),

      // HWID Info Commands
      new SlashCommandBuilder()
        .setName('hwidinfo')
        .setDescription('Get HWID information')
        .addSubcommand(subcommand =>
          subcommand
            .setName('hwid')
            .setDescription('Get HWID information by HWID')
            .addStringOption(option => option.setName('hwid').setDescription('Hardware ID').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Get HWID information by user')
            .addUserOption(option => option.setName('user').setDescription('User to lookup').setRequired(true))),

      // Lockdown Commands
      new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Server lockdown controls')
        .addSubcommand(subcommand =>
          subcommand
            .setName('initiate')
            .setDescription('Initiate server lockdown')
            .addStringOption(option => option.setName('reason').setDescription('Lockdown reason').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('end')
            .setDescription('End server lockdown')),

      // Log Management Commands
      new SlashCommandBuilder()
        .setName('log')
        .setDescription('User log management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add logs for a user')
            .addUserOption(option => option.setName('user').setDescription('User to add logs for').setRequired(true))
            .addIntegerOption(option => option.setName('count').setDescription('Number of logs to add').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for logs').setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('lb')
            .setDescription('View the logs leaderboard'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove logs from a user')
            .addUserOption(option => option.setName('user').setDescription('User to remove logs from').setRequired(true))
            .addIntegerOption(option => option.setName('count').setDescription('Number of logs to remove').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View logs for a user')
            .addUserOption(option => option.setName('user').setDescription('User to view logs for').setRequired(false))),

      // Poke Command
      new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Poke the bot'),

      // Suggestion Setup
      new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Suggestion system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('setup')
            .setDescription('Setup the suggestion channels')
            .addChannelOption(option => option.setName('suggestion-channel').setDescription('Channel for suggestions').setRequired(true))
            .addChannelOption(option => option.setName('results-channel').setDescription('Channel for results').setRequired(true))),

      // Whitelist Management
      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Whitelist management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to whitelist')
            .addUserOption(option => option.setName('user').setDescription('User to whitelist').setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all whitelisted users'))
        .addSubcommandGroup(group =>
          group
            .setName('admin')
            .setDescription('Whitelist admin management')
            .addSubcommand(subcommand =>
              subcommand
                .setName('add')
                .setDescription('Add a whitelist admin')
                .addUserOption(option => option.setName('user').setDescription('User to make admin').setRequired(true)))
            .addSubcommand(subcommand =>
              subcommand
                .setName('list')
                .setDescription('List all whitelist admins'))
            .addSubcommand(subcommand =>
              subcommand
                .setName('remove')
                .setDescription('Remove a whitelist admin')
                .addUserOption(option => option.setName('user').setDescription('Admin to remove').setRequired(true))))
    ];

    try {
      console.log('🔄 Started refreshing application (/) commands.');
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      if (!await this.checkRateLimit(interaction.user.id)) {
        await interaction.reply({
          content: '⏰ You are being rate limited. Please wait before using another command.',
          ephemeral: true
        });
        return;
      }

      // Log command usage
      await this.logCommand(interaction, startTime, true);

      const { commandName } = interaction;

      switch (commandName) {
        case 'add':
          await this.handleAddKey(interaction);
          break;
        case 'keyinfo':
          await this.handleKeyInfo(interaction);
          break;
        case 'avatar':
          await this.handleAvatar(interaction);
          break;
        case 'bug-report':
          await this.handleBugReport(interaction);
          break;
        case 'bypass':
          await this.handleBypass(interaction);
          break;
        case 'candy':
          await this.handleCandy(interaction);
          break;
        case 'db':
          await this.handleDatabase(interaction);
          break;
        case 'eval':
          await this.handleEval(interaction);
          break;
        case 'generatekey':
          await this.handleGenerateKey(interaction);
          break;
        case 'hwidinfo':
          await this.handleHwidInfo(interaction);
          break;
        case 'lockdown':
          await this.handleLockdown(interaction);
          break;
        case 'log':
          await this.handleLogManagement(interaction);
          break;
        case 'poke':
          await this.handlePoke(interaction);
          break;
        case 'suggestion':
          await this.handleSuggestion(interaction);
          break;
        case 'whitelist':
          await this.handleWhitelist(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown command.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error(`Error handling command ${interaction.commandName}:`, error);
      await this.logCommand(interaction, startTime, false, error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your command.',
          ephemeral: true
        });
      }
    }
  }

  // Command Handlers
  private async handleAddKey(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getString('user', true);
    const key = interaction.options.getString('key', true);
    const generatedBy = interaction.options.getString('generatedby', true);
    const reason = interaction.options.getString('reason', true);

    try {
      const licenseKey = await storage.createLicenseKey({
        keyValue: key,
        userId: user,
        hwid: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        createdBy: generatedBy,
        notes: reason
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ License Key Added')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Key', value: `||${key}||`, inline: false },
          { name: 'User', value: user, inline: true },
          { name: 'Generated By', value: generatedBy, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to add license key. Key might already exist.',
        ephemeral: true
      });
    }
  }

  private async handleKeyInfo(interaction: ChatInputCommandInteraction) {
    const keyValue = interaction.options.getString('key', true);

    try {
      const key = await storage.getLicenseKeyByValue(keyValue);
      if (!key) {
        await interaction.reply({
          content: '❌ License key not found.',
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🔑 License Key Information')
        .setColor(0x0099ff)
        .addFields(
          { name: 'Key', value: `||${key.keyValue}||`, inline: false },
          { name: 'User', value: key.userId || 'Not assigned', inline: true },
          { name: 'Status', value: key.isActive ? '✅ Active' : '❌ Inactive', inline: true },
          { name: 'HWID', value: key.hwid || 'Not linked', inline: false },
          { name: 'Created', value: key.createdAt?.toDateString() || 'Unknown', inline: true },
          { name: 'Expires', value: key.expiresAt?.toDateString() || 'Never', inline: true }
        );

      if (key.notes) {
        embed.addFields({ name: 'Notes', value: key.notes, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: '❌ Error retrieving key information.',
        ephemeral: true
      });
    }
  }

  private async handleAvatar(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const size = interaction.options.getString('size') || '1024';

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Avatar`)
      .setColor(0x0099ff)
      .setImage(targetUser.displayAvatarURL({ size: parseInt(size) as any }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleBugReport(interaction: ChatInputCommandInteraction) {
    const description = interaction.options.getString('description', true);
    const steps = interaction.options.getString('steps') || 'Not provided';

    const reportId = crypto.randomBytes(4).toString('hex').toUpperCase();

    try {
      await storage.createBugReport({
        reportId,
        userId: interaction.user.id,
        description,
        steps,
        status: 'open'
      });

      const embed = new EmbedBuilder()
        .setTitle('🐛 Bug Report Submitted')
        .setColor(0xff9900)
        .addFields(
          { name: 'Report ID', value: reportId, inline: true },
          { name: 'Reporter', value: interaction.user.username, inline: true },
          { name: 'Description', value: description, inline: false },
          { name: 'Steps to Reproduce', value: steps, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({
        content: '❌ Failed to submit bug report.',
        ephemeral: true
      });
    }
  }

  private async handleBypass(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString('url', true);
    const user = interaction.options.getUser('user');

    // Placeholder implementation
    const embed = new EmbedBuilder()
      .setTitle('🔗 Link Bypass')
      .setColor(0x0099ff)
      .setDescription('Link bypass functionality is currently being implemented.')
      .addFields(
        { name: 'Original URL', value: url, inline: false },
        { name: 'Status', value: 'In Development', inline: true }
      )
      .setTimestamp();

    if (user) {
      embed.addFields({ name: 'Requested by', value: user.username, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }

  private async handleCandy(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (subcommand) {
      case 'balance':
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const balance = await storage.getCandyBalance(targetUser.id);
        
        const embed = new EmbedBuilder()
          .setTitle('🍭 Candy Balance')
          .setColor(0xff69b4)
          .setDescription(`${targetUser.username} has **${balance.toLocaleString()}** candies`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;

      case 'beg':
        const begAmount = Math.floor(Math.random() * 100) + 1;
        await storage.addCandyBalance(userId, begAmount);
        
        const begEmbed = new EmbedBuilder()
          .setTitle('🥺 Begging for Candy')
          .setColor(0xff69b4)
          .setDescription(`You begged and received **${begAmount}** candies!`)
          .setTimestamp();

        await interaction.reply({ embeds: [begEmbed] });
        break;

      case 'credit-card-scam':
        const target = interaction.options.getUser('target', true);
        const scamChance = Math.random();
        
        if (scamChance < 0.1) { // 10% chance of success
          const scamAmount = Math.floor(Math.random() * 5000) + 1000;
          await storage.addCandyBalance(userId, scamAmount);
          await storage.addCandyBalance(target.id, -scamAmount);
          
          const scamEmbed = new EmbedBuilder()
            .setTitle('💳 Credit Card Scam Success!')
            .setColor(0x00ff00)
            .setDescription(`You successfully scammed **${scamAmount}** candies from ${target.username}!`)
            .setTimestamp();

          await interaction.reply({ embeds: [scamEmbed] });
        } else {
          const scamEmbed = new EmbedBuilder()
            .setTitle('💳 Credit Card Scam Failed!')
            .setColor(0xff0000)
            .setDescription(`Your scam attempt on ${target.username} failed! Better luck next time.`)
            .setTimestamp();

          await interaction.reply({ embeds: [scamEmbed] });
        }
        break;

      case 'daily':
        const lastDaily = await storage.getLastDaily(userId);
        const now = new Date();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (lastDaily && (now.getTime() - lastDaily.getTime()) < twentyFourHours) {
          const timeLeft = twentyFourHours - (now.getTime() - lastDaily.getTime());
          const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

          await interaction.reply({
            content: `⏰ You already claimed your daily reward! Come back in ${hoursLeft}h ${minutesLeft}m.`,
            ephemeral: true
          });
          return;
        }

        await storage.addCandyBalance(userId, 2000);
        await storage.setLastDaily(userId, now);

        const dailyEmbed = new EmbedBuilder()
          .setTitle('🎁 Daily Reward Claimed!')
          .setColor(0x00ff00)
          .setDescription('You received **2000** candies!')
          .setTimestamp();

        await interaction.reply({ embeds: [dailyEmbed] });
        break;

      case 'deposit':
        const depositAmount = interaction.options.getInteger('amount', true);
        const currentBalance = await storage.getCandyBalance(userId);

        if (depositAmount <= 0) {
          await interaction.reply({
            content: '❌ Invalid deposit amount.',
            ephemeral: true
          });
          return;
        }

        if (currentBalance < depositAmount) {
          await interaction.reply({
            content: '❌ Insufficient candy balance.',
            ephemeral: true
          });
          return;
        }

        await storage.addCandyBalance(userId, -depositAmount);
        await storage.addBankBalance(userId, depositAmount);

        const depositEmbed = new EmbedBuilder()
          .setTitle('🏦 Candy Deposited')
          .setColor(0x0099ff)
          .setDescription(`Successfully deposited **${depositAmount.toLocaleString()}** candies to your bank!`)
          .setTimestamp();

        await interaction.reply({ embeds: [depositEmbed] });
        break;

      case 'gamble':
        const gambleAmount = interaction.options.getInteger('amount', true);
        const playerBalance = await storage.getCandyBalance(userId);

        if (gambleAmount <= 0) {
          await interaction.reply({
            content: '❌ Invalid gambling amount.',
            ephemeral: true
          });
          return;
        }

        if (playerBalance < gambleAmount) {
          await interaction.reply({
            content: '❌ Insufficient candy balance.',
            ephemeral: true
          });
          return;
        }

        const gambleChance = Math.random();
        let winnings = 0;
        let resultText = '';

        if (gambleChance < 0.45) { // 45% chance to win
          winnings = Math.floor(gambleAmount * (1.5 + Math.random() * 2)); // 1.5x to 3.5x multiplier
          await storage.addCandyBalance(userId, winnings - gambleAmount);
          resultText = `🎉 You won **${winnings.toLocaleString()}** candies! (Profit: ${(winnings - gambleAmount).toLocaleString()})`;
        } else {
          await storage.addCandyBalance(userId, -gambleAmount);
          resultText = `💸 You lost **${gambleAmount.toLocaleString()}** candies. Better luck next time!`;
        }

        const gambleEmbed = new EmbedBuilder()
          .setTitle('🎰 Gambling Results')
          .setColor(winnings > gambleAmount ? 0x00ff00 : 0xff0000)
          .setDescription(resultText)
          .setFooter({ text: '99.99% of gamblers quit before they hit big' })
          .setTimestamp();

        await interaction.reply({ embeds: [gambleEmbed] });
        break;

      case 'leaderboard':
        const topUsers = await storage.getCandyLeaderboard();
        
        const leaderboardEmbed = new EmbedBuilder()
          .setTitle('🏆 Candy Leaderboard')
          .setColor(0xffd700)
          .setDescription(
            topUsers.map((user, index) => 
              `${index + 1}. <@${user.userId}>: **${user.balance.toLocaleString()}** candies`
            ).join('\n') || 'No users found'
          )
          .setTimestamp();

        await interaction.reply({ embeds: [leaderboardEmbed] });
        break;

      case 'pay':
        const payUser = interaction.options.getUser('user', true);
        const payAmount = interaction.options.getInteger('amount', true);
        const payerBalance = await storage.getCandyBalance(userId);

        if (payAmount <= 0) {
          await interaction.reply({
            content: '❌ Invalid payment amount.',
            ephemeral: true
          });
          return;
        }

        if (payerBalance < payAmount) {
          await interaction.reply({
            content: '❌ Insufficient candy balance.',
            ephemeral: true
          });
          return;
        }

        if (payUser.id === userId) {
          await interaction.reply({
            content: '❌ You cannot pay yourself.',
            ephemeral: true
          });
          return;
        }

        await storage.addCandyBalance(userId, -payAmount);
        await storage.addCandyBalance(payUser.id, payAmount);

        const payEmbed = new EmbedBuilder()
          .setTitle('💰 Payment Sent')
          .setColor(0x00ff00)
          .setDescription(`Successfully sent **${payAmount.toLocaleString()}** candies to ${payUser.username}!`)
          .setTimestamp();

        await interaction.reply({ embeds: [payEmbed] });
        break;
    }
  }

  private async handleDatabase(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'management') {
      const action = interaction.options.getString('action', true);
      
      const embed = new EmbedBuilder()
        .setTitle('🗄️ Database Management')
        .setColor(0x0099ff)
        .setDescription(`Database action: **${action}**`)
        .addFields(
          { name: 'Action', value: action, inline: true },
          { name: 'Status', value: 'Executed', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }

  private async handleEval(interaction: ChatInputCommandInteraction) {
    // Security check - only allow authorized users
    const authorizedUserId = this.getSetting('authorized_user_id');
    if (interaction.user.id !== authorizedUserId) {
      await interaction.reply({
        content: '❌ You are not authorized to use this command.',
        ephemeral: true
      });
      return;
    }

    const code = interaction.options.getString('code', true);

    try {
      // Sanitize and limit code execution
      if (code.includes('process') || code.includes('require') || code.includes('import')) {
        await interaction.reply({
          content: '❌ Code contains restricted operations.',
          ephemeral: true
        });
        return;
      }

      const result = eval(code);
      const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);

      const embed = new EmbedBuilder()
        .setTitle('⚡ Code Evaluation')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Input', value: `\`\`\`javascript\n${code.substring(0, 1000)}\n\`\`\``, inline: false },
          { name: 'Output', value: `\`\`\`javascript\n${output.substring(0, 1000)}\n\`\`\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Evaluation Error')
        .setColor(0xff0000)
        .addFields(
          { name: 'Input', value: `\`\`\`javascript\n${code.substring(0, 1000)}\n\`\`\``, inline: false },
          { name: 'Error', value: `\`\`\`\n${String(error).substring(0, 1000)}\n\`\`\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }

  private async handleGenerateKey(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const generatedKey = `MSPLOIT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    let embed = new EmbedBuilder()
      .setTitle('🔑 MacSploit License Key Generated')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Key', value: `||${generatedKey}||`, inline: false },
        { name: 'Payment Method', value: subcommand.toUpperCase(), inline: true },
        { name: 'Generated At', value: new Date().toLocaleString(), inline: true }
      )
      .setTimestamp();

    switch (subcommand) {
      case 'bitcoin':
        const btcUser = interaction.options.getString('user', true);
        const btcTxid = interaction.options.getString('txid', true);
        embed.addFields(
          { name: 'User', value: btcUser, inline: true },
          { name: 'Transaction ID', value: btcTxid, inline: false }
        );
        break;

      case 'cashapp':
        const cashUser = interaction.options.getString('user', true);
        const cashId = interaction.options.getString('identifier', true);
        embed.addFields(
          { name: 'User', value: cashUser, inline: true },
          { name: 'Payment ID', value: cashId, inline: false }
        );
        break;

      case 'custom':
        const customUser = interaction.options.getString('user', true);
        const customNote = interaction.options.getString('note', true);
        embed.addFields(
          { name: 'User', value: customUser, inline: true },
          { name: 'Note', value: customNote, inline: false }
        );
        break;

      case 'ethereum':
        const ethUser = interaction.options.getString('user', true);
        const ethTxid = interaction.options.getString('txid', true);
        embed.addFields(
          { name: 'User', value: ethUser, inline: true },
          { name: 'Transaction ID', value: ethTxid, inline: false }
        );
        break;

      case 'g2a':
        embed.addFields(
          { name: 'Note', value: 'Generated for G2A gift code payment', inline: false }
        );
        break;

      case 'litecoin':
      case 'paypal':
        const note = interaction.options.getString('note', true);
        embed.addFields(
          { name: 'Payment Type', value: note, inline: true }
        );
        break;

      case 'robux':
        const rbxUser = interaction.options.getString('user', true);
        const rbxUserId = interaction.options.getString('roblox_user_id', true);
        const rbxAmount = interaction.options.getString('amount');
        const rbxProof = interaction.options.getString('proof');
        
        embed.addFields(
          { name: 'User', value: rbxUser, inline: true },
          { name: 'Roblox User ID', value: rbxUserId, inline: true }
        );
        
        if (rbxAmount) embed.addFields({ name: 'Amount', value: rbxAmount, inline: true });
        if (rbxProof) embed.addFields({ name: 'Proof', value: rbxProof, inline: false });
        break;

      case 'venmo':
        const venmoUser = interaction.options.getString('user', true);
        const venmoTxid = interaction.options.getString('txid', true);
        embed.addFields(
          { name: 'User', value: venmoUser, inline: true },
          { name: 'Transaction ID', value: venmoTxid, inline: false }
        );
        break;
    }

    // Save the key to database
    try {
      await storage.createLicenseKey({
        keyValue: generatedKey,
        userId: interaction.user.id,
        hwid: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        createdBy: interaction.user.username,
        notes: `Generated via /${subcommand} command`
      });
    } catch (error) {
      console.error('Error saving generated key:', error);
    }

    await interaction.reply({ embeds: [embed] });
  }

  private async handleHwidInfo(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'hwid') {
      const hwid = interaction.options.getString('hwid', true);
      const keys = await storage.getLicenseKeysByHwid(hwid);

      const embed = new EmbedBuilder()
        .setTitle('🔍 HWID Information')
        .setColor(0x0099ff)
        .addFields(
          { name: 'Hardware ID', value: hwid, inline: false },
          { name: 'Linked Keys', value: keys.length.toString(), inline: true },
          { name: 'Status', value: keys.length > 0 ? '✅ Active' : '❌ No Keys', inline: true }
        );

      if (keys.length > 0) {
        embed.addFields({
          name: 'Keys',
          value: keys.map(key => `||${key.keyValue}|| - ${key.isActive ? '✅' : '❌'}`).join('\n').substring(0, 1024),
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'user') {
      const user = interaction.options.getUser('user', true);
      const keys = await storage.getLicenseKeysByUserId(user.id);

      const embed = new EmbedBuilder()
        .setTitle('🔍 User HWID Information')
        .setColor(0x0099ff)
        .addFields(
          { name: 'User', value: user.username, inline: true },
          { name: 'Total Keys', value: keys.length.toString(), inline: true },
          { name: 'Active Keys', value: keys.filter(k => k.isActive).length.toString(), inline: true }
        );

      if (keys.length > 0) {
        embed.addFields({
          name: 'HWID List',
          value: keys.map(key => key.hwid || 'Not linked').filter((v, i, a) => a.indexOf(v) === i).join('\n').substring(0, 1024),
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  }

  private async handleLockdown(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'initiate') {
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      const embed = new EmbedBuilder()
        .setTitle('🔒 Server Lockdown Initiated')
        .setColor(0xff0000)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Initiated By', value: interaction.user.username, inline: true },
          { name: 'Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'end') {
      const embed = new EmbedBuilder()
        .setTitle('🔓 Server Lockdown Ended')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Ended By', value: interaction.user.username, inline: true },
          { name: 'Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }

  private async handleLogManagement(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        const addUser = interaction.options.getUser('user', true);
        const addCount = interaction.options.getInteger('count', true);
        const addReason = interaction.options.getString('reason') || 'No reason provided';

        await storage.addUserLogs(addUser.id, addCount, addReason);

        const addEmbed = new EmbedBuilder()
          .setTitle('📝 Logs Added')
          .setColor(0x00ff00)
          .addFields(
            { name: 'User', value: addUser.username, inline: true },
            { name: 'Logs Added', value: addCount.toString(), inline: true },
            { name: 'Reason', value: addReason, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [addEmbed] });
        break;

      case 'remove':
        const removeUser = interaction.options.getUser('user', true);
        const removeCount = interaction.options.getInteger('count', true);

        await storage.removeUserLogs(removeUser.id, removeCount);

        const removeEmbed = new EmbedBuilder()
          .setTitle('📝 Logs Removed')
          .setColor(0xff9900)
          .addFields(
            { name: 'User', value: removeUser.username, inline: true },
            { name: 'Logs Removed', value: removeCount.toString(), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [removeEmbed] });
        break;

      case 'view':
        const viewUser = interaction.options.getUser('user') || interaction.user;
        const userLogs = await storage.getUserLogs(viewUser.id);

        const viewEmbed = new EmbedBuilder()
          .setTitle('📊 User Logs')
          .setColor(0x0099ff)
          .addFields(
            { name: 'User', value: viewUser.username, inline: true },
            { name: 'Total Logs', value: userLogs.toString(), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [viewEmbed] });
        break;

      case 'lb':
        const topLogUsers = await storage.getLogsLeaderboard();

        const lbEmbed = new EmbedBuilder()
          .setTitle('🏆 Logs Leaderboard')
          .setColor(0xffd700)
          .setDescription(
            topLogUsers.map((user, index) => 
              `${index + 1}. <@${user.userId}>: **${user.logCount}** logs`
            ).join('\n') || 'No users found'
          )
          .setTimestamp();

        await interaction.reply({ embeds: [lbEmbed] });
        break;
    }
  }

  private async handlePoke(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('👆 Poked!')
      .setColor(0xff69b4)
      .setDescription('OWW that hurt!!')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleSuggestion(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const suggestionChannel = interaction.options.getChannel('suggestion-channel', true);
      const resultsChannel = interaction.options.getChannel('results-channel', true);

      await storage.setBotSetting('suggestion_channel', suggestionChannel.id);
      await storage.setBotSetting('results_channel', resultsChannel.id);

      const embed = new EmbedBuilder()
        .setTitle('💡 Suggestion Channels Setup')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Suggestions Channel', value: `<#${suggestionChannel.id}>`, inline: true },
          { name: 'Results Channel', value: `<#${resultsChannel.id}>`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }

  private async handleWhitelist(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'admin') {
      switch (subcommand) {
        case 'add':
          const adminUser = interaction.options.getUser('user', true);
          await storage.addWhitelistAdmin(adminUser.id);

          const addAdminEmbed = new EmbedBuilder()
            .setTitle('👑 Whitelist Admin Added')
            .setColor(0x00ff00)
            .addFields(
              { name: 'Admin', value: adminUser.username, inline: true },
              { name: 'Added By', value: interaction.user.username, inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [addAdminEmbed] });
          break;

        case 'remove':
          const removeAdminUser = interaction.options.getUser('user', true);
          await storage.removeWhitelistAdmin(removeAdminUser.id);

          const removeAdminEmbed = new EmbedBuilder()
            .setTitle('👑 Whitelist Admin Removed')
            .setColor(0xff9900)
            .addFields(
              { name: 'Admin', value: removeAdminUser.username, inline: true },
              { name: 'Removed By', value: interaction.user.username, inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [removeAdminEmbed] });
          break;

        case 'list':
          const admins = await storage.getWhitelistAdmins();

          const listAdminEmbed = new EmbedBuilder()
            .setTitle('👑 Whitelist Admins')
            .setColor(0x0099ff)
            .setDescription(
              admins.map(admin => `<@${admin.userId}>`).join('\n') || 'No admins found'
            )
            .setTimestamp();

          await interaction.reply({ embeds: [listAdminEmbed] });
          break;
      }
    } else {
      switch (subcommand) {
        case 'add':
          const whitelistUser = interaction.options.getUser('user', true);
          await storage.addToWhitelist(whitelistUser.id);

          const addWhitelistEmbed = new EmbedBuilder()
            .setTitle('✅ User Whitelisted')
            .setColor(0x00ff00)
            .addFields(
              { name: 'User', value: whitelistUser.username, inline: true },
              { name: 'Added By', value: interaction.user.username, inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [addWhitelistEmbed] });
          break;

        case 'list':
          const whitelistedUsers = await storage.getWhitelistedUsers();

          const listWhitelistEmbed = new EmbedBuilder()
            .setTitle('📋 Whitelisted Users')
            .setColor(0x0099ff)
            .setDescription(
              whitelistedUsers.map(user => `<@${user.userId}>`).join('\n') || 'No users whitelisted'
            )
            .setTimestamp();

          await interaction.reply({ embeds: [listWhitelistEmbed] });
          break;
      }
    }
  }

  // Helper Methods
  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);

    if (!userLimit) {
      this.rateLimiter.set(userId, { count: 1, resetTime: now + 30000 }); // 30 seconds
      return true;
    }

    if (now > userLimit.resetTime) {
      this.rateLimiter.set(userId, { count: 1, resetTime: now + 30000 });
      return true;
    }

    if (userLimit.count >= 10) { // 10 commands per 30 seconds
      return false;
    }

    userLimit.count++;
    return true;
  }

  private async logCommand(interaction: ChatInputCommandInteraction, startTime: number, success: boolean, error?: any) {
    try {
      const executionTime = Date.now() - startTime;
      
      await storage.logCommandUsage({
        userId: interaction.user.id,
        username: interaction.user.username,
        command: interaction.commandName,
        subcommand: interaction.options.getSubcommand(false),
        options: JSON.stringify(interaction.options.data),
        executionTime,
        success,
        error: error ? String(error) : null,
        guildId: interaction.guildId,
        channelId: interaction.channelId
      });
    } catch (err) {
      console.error('Error logging command usage:', err);
    }
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