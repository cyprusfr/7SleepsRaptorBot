import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { storage } from './storage';
import { db } from './db';
import { discordUsers, type DiscordUser } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
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
      
      await this.syncServerData();
      this.client.user?.setActivity('Managing Keys | /help', { type: 0 });
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      const messageContent = message.content.trim().toLowerCase();
      if (this.predefinedTags[messageContent]) {
        await this.handlePredefinedTag(message, messageContent);
        return;
      }

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
    const commands = [
      // License Key Management
      new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a new license key to the database')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to assign the key to')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to add')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('generatedby')
            .setDescription('Who generated this key')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for generating this key')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Fetch a user\'s avatar from the server')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to get avatar from')
            .setRequired(false)
        )
        .addUserOption(option =>
          option.setName('user2')
            .setDescription('Second user (optional)')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('bug-report')
        .setDescription('Report a bug to the developers'),

      new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypass given link')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('URL to bypass')
            .setRequired(true)
        ),

      // Candy System Commands
      new SlashCommandBuilder()
        .setName('candy')
        .setDescription('Candy system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('balance')
            .setDescription('Check your balance')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('beg')
            .setDescription('Beg for some candy')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('credit-card-scam')
            .setDescription('Attempt a credit card scam on another user')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('daily')
            .setDescription('Claim your daily reward of 2000 candies')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('deposit')
            .setDescription('Deposit candy into your bank')
            .addIntegerOption(option =>
              option.setName('amount')
                .setDescription('Amount to deposit')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('gamble')
            .setDescription('99.99% of gamblers quit before they hit big')
            .addIntegerOption(option =>
              option.setName('amount')
                .setDescription('Amount to gamble')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('leaderboard')
            .setDescription('Display the top 10 users with the highest amt of candies')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('pay')
            .setDescription('Give candies to another user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to pay')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('amount')
                .setDescription('Amount to pay')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluates code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('Code to evaluate')
            .setRequired(true)
        ),

      // Key Generation Commands
      new SlashCommandBuilder()
        .setName('generatekey')
        .setDescription('Generate keys for various payment methods')
        .addSubcommand(subcommand =>
          subcommand
            .setName('bitcoin')
            .setDescription('Generate a key for a bitcoin payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('txid')
                .setDescription('Transaction ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('cashapp')
            .setDescription('Generate a key for a cashapp payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('identifier')
                .setDescription('Payment identifier')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('custom')
            .setDescription('Generate a key for a custom payment method')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('note')
                .setDescription('Payment note')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('ethereum')
            .setDescription('Generate a key for an eth payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('txid')
                .setDescription('Transaction ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('g2a')
            .setDescription('Generate a key for a g2a gift code')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('litecoin')
            .setDescription('Generate a key for a litecoin payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('txid')
                .setDescription('Transaction ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('paypal')
            .setDescription('Generate a key for a paypal payment')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('robux')
            .setDescription('Generate a key for a robux payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('roblox_user_id')
                .setDescription('Roblox user ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('venmo')
            .setDescription('Generate a key for a venmo payment')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to generate key for')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('txid')
                .setDescription('Transaction ID')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Key type')
                .setRequired(false)
                .addChoices(
                  { name: 'note', value: 'note' },
                  { name: 'booster', value: 'booster' },
                  { name: 'early-access', value: 'early-access' },
                  { name: 'monthly', value: 'monthly' }
                )
            )
        ),

      // HWID Commands
      new SlashCommandBuilder()
        .setName('hwidinfo')
        .setDescription('Get HWID information')
        .addSubcommand(subcommand =>
          subcommand
            .setName('hwid')
            .setDescription('Get HWID information by HWID')
            .addStringOption(option =>
              option.setName('hwid')
                .setDescription('Hardware ID to lookup')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Get HWID information by user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to lookup HWID for')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('keyinfo')
        .setDescription('Get information about a license key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to lookup')
            .setRequired(true)
        ),

      // Lockdown Commands
      new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Server lockdown commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('end')
            .setDescription('End server lockdown')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('initiate')
            .setDescription('Initiate server lockdown')
        ),

      // Log Commands
      new SlashCommandBuilder()
        .setName('log')
        .setDescription('User log management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add logs for a user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to add logs for')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('count')
                .setDescription('Number of logs to add')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('lb')
            .setDescription('View the logs leaderboard')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove logs from a user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to remove logs from')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('count')
                .setDescription('Number of logs to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View logs for a user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to view logs for')
                .setRequired(false)
            )
        ),

      new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Poke the bot'),

      new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Suggestion system')
        .addSubcommand(subcommand =>
          subcommand
            .setName('setup')
            .setDescription('Setup the suggestion channels')
            .addChannelOption(option =>
              option.setName('suggestion-channel')
                .setDescription('Channel for suggestions')
                .setRequired(true)
            )
            .addChannelOption(option =>
              option.setName('results-channel')
                .setDescription('Channel for results')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test all bot commands and functionality'),

      new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer a key to another user')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Key to transfer')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to transfer to')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your dashboard access with a verification code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('The verification code from the dashboard')
            .setRequired(true)
        ),

      // Whitelist Commands
      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Whitelist management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to add to whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all whitelisted users')
        )
        .addSubcommandGroup(group =>
          group
            .setName('admin')
            .setDescription('Whitelist admin management')
            .addSubcommand(subcommand =>
              subcommand
                .setName('add')
                .setDescription('Add a whitelist admin')
                .addUserOption(option =>
                  option.setName('user')
                    .setDescription('User to make whitelist admin')
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand =>
              subcommand
                .setName('list')
                .setDescription('List all whitelist admins')
            )
            .addSubcommand(subcommand =>
              subcommand
                .setName('remove')
                .setDescription('Remove a whitelist admin')
                .addUserOption(option =>
                  option.setName('user')
                    .setDescription('User to remove from whitelist admins')
                    .setRequired(true)
                )
            )
        )
    ];

    try {
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);
      console.log('Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(CLIENT_ID!),
        { body: commands },
      );

      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    
    try {
      if (interaction.commandName !== 'verify' && !this.hasRequiredPermissions(interaction)) {
        await interaction.reply({ content: 'You don\'t have permission to use this command.', ephemeral: true });
        return;
      }

      if (await this.isRateLimited(interaction.user.id)) {
        await interaction.reply({ content: 'You are being rate limited. Please wait before using another command.', ephemeral: true });
        return;
      }

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);

      switch (interaction.commandName) {
        case 'add':
          await this.handleAdd(interaction);
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
          await this.handleCandyCommands(interaction);
          break;
        case 'eval':
          await this.handleEval(interaction);
          break;
        case 'generatekey':
          await this.handleGenerateKeyCommands(interaction);
          break;
        case 'hwidinfo':
          await this.handleHwidInfoCommands(interaction);
          break;
        case 'keyinfo':
          await this.handleKeyInfo(interaction);
          break;
        case 'lockdown':
          await this.handleLockdownCommands(interaction);
          break;
        case 'log':
          await this.handleLogCommands(interaction);
          break;
        case 'poke':
          await this.handlePoke(interaction);
          break;
        case 'suggestion':
          await this.handleSuggestionCommands(interaction);
          break;
        case 'test':
          await this.handleTest(interaction);
          break;
        case 'transfer':
          await this.handleTransfer(interaction);
          break;
        case 'verify':
          await this.handleVerify(interaction);
          break;
        case 'whitelist':
          await this.handleWhitelistCommands(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: true });
          break;
      }

      await this.logCommandUsage(interaction, startTime, true);

    } catch (error) {
      console.error(`Error handling command ${interaction.commandName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await this.logCommandUsage(interaction, startTime, false, errorMessage);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      }
    }
  }

  // Candy System Implementation
  private async handleCandyCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'balance':
        await this.handleBalance(interaction);
        break;
      case 'beg':
        await this.handleCandyBeg(interaction);
        break;
      case 'credit-card-scam':
        await this.handleCreditCardScam(interaction);
        break;
      case 'daily':
        await this.handleDaily(interaction);
        break;
      case 'deposit':
        await this.handleCandyDeposit(interaction);
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
      default:
        await interaction.reply({ content: 'Unknown candy subcommand.', ephemeral: true });
    }
  }

  private async handleCandyBeg(interaction: ChatInputCommandInteraction) {
    try {
      const userId = interaction.user.id;
      
      const chance = Math.random();
      let amount = 0;
      let message = '';
      
      if (chance < 0.1) {
        amount = Math.floor(Math.random() * 500) + 100;
        message = `🍭 Lucky you! You found **${amount}** candies!`;
      } else if (chance < 0.6) {
        amount = Math.floor(Math.random() * 50) + 1;
        message = `🍬 You begged and received **${amount}** candies.`;
      } else {
        message = `😔 Your begging was unsuccessful. Try again later!`;
      }
      
      if (amount > 0) {
        await storage.updateCandyBalance(userId, amount);
      }
      
      await interaction.reply({ content: message });
      
    } catch (error) {
      console.error('Error in candy beg command:', error);
      await interaction.reply({ content: 'Error processing beg command.', ephemeral: true });
    }
  }

  private async handleCreditCardScam(interaction: ChatInputCommandInteraction) {
    try {
      const userId = interaction.user.id;
      
      const chance = Math.random();
      let amount = 0;
      let message = '';
      
      if (chance < 0.3) {
        amount = Math.floor(Math.random() * 1000) + 200;
        message = `💳 Your credit card scam was successful! You gained **${amount}** candies!`;
        await storage.updateCandyBalance(userId, amount);
      } else {
        message = `🚨 Your credit card scam failed! Better luck next time.`;
      }
      
      await interaction.reply({ content: message });
      
    } catch (error) {
      console.error('Error in credit card scam command:', error);
      await interaction.reply({ content: 'Error processing credit card scam command.', ephemeral: true });
    }
  }

  private async handleBypass(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString('url', true);
    
    await interaction.reply({ 
      content: `🔗 Bypass functionality for URL: ${url}\n\n*This feature is currently under development.*`,
      ephemeral: true 
    });
  }

  // MacSploit Support Tags - predefined responses for common issues
  private predefinedTags: Record<string, any> = {
    '.sellsn': {
      title: 'Selling Serial Numbers',
      description: 'Information about serial number selling policies and procedures.'
    },
    '.uicrash': {
      title: 'UI Crash Issues',
      description: 'Troubleshooting steps for UI crashes and interface problems.'
    },
    '.user': {
      title: 'User Account Help',
      description: 'General user account assistance and common questions.'
    },
    '.zsh': {
      title: 'ZSH Terminal Issues',
      description: 'Solutions for ZSH terminal configuration and execution problems.'
    },
    '.anticheat': {
      title: 'Anticheat Detection',
      description: 'Information about anticheat systems and bypass methods.'
    },
    '.autoexe': {
      title: 'Auto Execute Problems',
      description: 'Troubleshooting auto-execution features and script loading.'
    },
    '.badcpu': {
      title: 'CPU Compatibility',
      description: 'CPU compatibility issues and performance optimization.'
    },
    '.cookie': {
      title: 'Cookie Management',
      description: 'Cookie handling, storage, and authentication issues.'
    },
    '.crash': {
      title: 'General Crashes',
      description: 'Troubleshooting application crashes and stability issues.'
    },
    '.elevated': {
      title: 'Elevated Permissions',
      description: 'Running with administrator/elevated permissions requirements.'
    },
    '.fwaeh': {
      title: 'Firewall Issues',
      description: 'Firewall configuration and connection problems.'
    },
    '.giftcard': {
      title: 'Gift Card Payments',
      description: 'Gift card payment processing and verification.'
    },
    '.hwid': {
      title: 'HWID Problems',
      description: 'Hardware ID issues, resets, and key linking problems.'
    },
    '.install': {
      title: 'Installation Guide',
      description: 'Step-by-step installation instructions and common errors.'
    },
    '.iy': {
      title: 'IY Script Issues',
      description: 'Infinite Yield script compatibility and execution problems.'
    },
    '.multi-instance': {
      title: 'Multiple Instances',
      description: 'Running multiple instances and session management.'
    },
    '.offline': {
      title: 'Offline Mode',
      description: 'Offline functionality and connectivity requirements.'
    },
    '.paypal': {
      title: 'PayPal Payments',
      description: 'PayPal payment processing and transaction issues.'
    },
    '.robux': {
      title: 'Robux Payments',
      description: 'Robux payment methods and verification procedures.'
    },
    '.scripts': {
      title: 'Script Execution',
      description: 'Script loading, execution, and compatibility issues.'
    }
  };

  private async handlePredefinedTag(message: any, tagName: string) {
    const tag = this.predefinedTags[tagName];
    if (!tag) return;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`📋 ${tag.title}`)
      .setDescription(tag.description)
      .setFooter({ text: 'MacSploit Support • Use /help for more commands' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async handleVerificationMessage(message: any) {
    if (message.channel.type !== 1) return; // Only handle DMs
    
    const content = message.content.trim();
    if (content.length === 6 && /^\d{6}$/.test(content)) {
      try {
        const session = await storage.getVerificationSessionByDiscordUserId(message.author.id);
        if (session && session.dashboardCode === content) {
          await storage.completeVerificationSession(session.sessionId, content);
          
          const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Verification Complete')
            .setDescription('Your dashboard access has been verified successfully!')
            .setTimestamp();
            
          await message.reply({ embeds: [embed] });
        } else {
          await message.reply('❌ Invalid verification code or session expired.');
        }
      } catch (error) {
        console.error('Error handling verification:', error);
        await message.reply('❌ Error processing verification code.');
      }
    }
  }

  private async syncServerData() {
    if (!this.client.guilds) return;
    
    const guilds = Array.from(this.client.guilds.cache.values());
    for (const guild of guilds) {
      await this.addServer(guild);
    }
  }

  private async addServer(guild: any) {
    try {
      await storage.upsertDiscordServer({
        serverId: guild.id,
        serverName: guild.name,
        memberCount: guild.memberCount || 0,
        permissions: {},
        isActive: true
      });
    } catch (error) {
      console.error('Error adding server:', error);
    }
  }

  private hasRequiredPermissions(interaction: ChatInputCommandInteraction): boolean {
    if (!interaction.guild) return false;
    
    const member = interaction.member as any;
    if (!member) return false;
    
    // Check for required roles
    const requiredRole = this.getSetting('required_role', 'Raptor Admin');
    const keySystemRole = this.getSetting('key_system_role', 'Key System');
    
    const hasRequiredRole = member.roles.cache.some((role: any) => 
      role.name === requiredRole || 
      role.name === keySystemRole ||
      role.permissions.has(PermissionFlagsBits.Administrator)
    );
    
    return hasRequiredRole;
  }

  private rateLimitMap = new Map<string, number[]>();

  private async isRateLimited(userId: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = 30 * 1000; // 30 seconds
    const maxRequests = 10; // 10 commands per 30 seconds
    
    if (!this.rateLimitMap.has(userId)) {
      this.rateLimitMap.set(userId, []);
    }
    
    const userRequests = this.rateLimitMap.get(userId)!;
    
    // Remove old requests
    const validRequests = userRequests.filter(time => now - time < windowMs);
    this.rateLimitMap.set(userId, validRequests);
    
    if (validRequests.length >= maxRequests) {
      return true;
    }
    
    validRequests.push(now);
    this.rateLimitMap.set(userId, validRequests);
    return false;
  }

  private async storeUserData(user: any, member: any, guild: any) {
    try {
      await storage.upsertDiscordUser({
        discordId: user.id,
        username: user.username || user.globalName || 'Unknown',
        discriminator: user.discriminator || '0000',
        avatarUrl: user.displayAvatarURL?.() || null,
        roles: member?.roles?.cache?.map((role: any) => role.name) || [],
        metadata: {
          guildId: guild?.id,
          guildName: guild?.name
        }
      });
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  private async logCommandUsage(interaction: ChatInputCommandInteraction, startTime: number, success: boolean = true, errorMessage?: string): Promise<void> {
    try {
      const executionTime = Date.now() - startTime;
      
      await storage.logCommand({
        commandName: interaction.commandName,
        userId: interaction.user.id,
        username: interaction.user.username || 'Unknown',
        serverId: interaction.guild?.id || null,
        serverName: interaction.guild?.name || null,
        channelId: interaction.channel?.id || null,
        channelName: (interaction.channel as any)?.name || null,
        arguments: interaction.options.data || {},
        executionTime,
        success,
        errorMessage: errorMessage || null
      });
    } catch (error) {
      console.error('Error logging command usage:', error);
    }
  }

  // Command handlers - implementing with placeholders for now
  private async handleAdd(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Add command executed.', ephemeral: true });
  }

  private async handleAvatar(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Avatar command executed.', ephemeral: true });
  }

  private async handleBugReport(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Bug report command executed.', ephemeral: true });
  }

  private async handleEval(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Eval command executed.', ephemeral: true });
  }

  private async handleGenerateKeyCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Generate key command executed.', ephemeral: true });
  }

  private async handleHwidInfoCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ HWID info command executed.', ephemeral: true });
  }

  private async handleKeyInfo(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Key info command executed.', ephemeral: true });
  }

  private async handleLockdownCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Lockdown command executed.', ephemeral: true });
  }

  private async handleLogCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Log command executed.', ephemeral: true });
  }

  private async handlePoke(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '🤖 Poked!', ephemeral: true });
  }

  private async handleSuggestionCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Suggestion command executed.', ephemeral: true });
  }

  private async handleTest(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Test command executed.', ephemeral: true });
  }

  private async handleTransfer(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Transfer command executed.', ephemeral: true });
  }

  private async handleVerify(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Verify command executed.', ephemeral: true });
  }

  private async handleWhitelistCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: '✅ Whitelist command executed.', ephemeral: true });
  }

  private async handleBalance(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;
      
      const balance = await storage.getCandyBalance(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🍬 Candy Balance')
        .setDescription(`**${targetUser.username}'s Balance**`)
        .addFields(
          { name: '💰 Wallet', value: `${balance.wallet.toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank', value: `${balance.bank.toLocaleString()} candies`, inline: true },
          { name: '💎 Total', value: `${balance.total.toLocaleString()} candies`, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in balance command:', error);
      await interaction.reply({ content: 'Error fetching balance.', ephemeral: true });
    }
  }

  private async handleDaily(interaction: ChatInputCommandInteraction) {
    try {
      const userId = interaction.user.id;
      
      const canClaim = await storage.checkDailyCandy(userId);
      if (!canClaim) {
        await interaction.reply({ 
          content: '❌ You have already claimed your daily reward today! Come back tomorrow.', 
          ephemeral: true 
        });
        return;
      }
      
      const amount = await storage.claimDailyCandy(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎁 Daily Reward Claimed!')
        .setDescription(`You received **${amount.toLocaleString()}** candies!`)
        .addFields(
          { name: '💰 Reward', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '⏰ Next Claim', value: 'Tomorrow', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in daily command:', error);
      await interaction.reply({ content: 'Error claiming daily reward.', ephemeral: true });
    }
  }

  private async handleCandyDeposit(interaction: ChatInputCommandInteraction) {
    try {
      const amount = interaction.options.getInteger('amount', true);
      const userId = interaction.user.id;
      
      if (amount < 1) {
        await interaction.reply({ content: '❌ You must deposit at least 1 candy.', ephemeral: true });
        return;
      }
      
      const balance = await storage.getCandyBalance(userId);
      if (balance.wallet < amount) {
        await interaction.reply({ content: '❌ You don\'t have enough candies in your wallet to deposit.', ephemeral: true });
        return;
      }
      
      await storage.depositCandy(userId, amount);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🏦 Deposit Successful')
        .setDescription(`You successfully deposited **${amount.toLocaleString()}** candies into your bank!`)
        .addFields(
          { name: '💰 Deposited', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '🏦 Bank Balance', value: `${(balance.bank + amount).toLocaleString()} candies`, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in candy deposit command:', error);
      await interaction.reply({ content: 'Error processing deposit.', ephemeral: true });
    }
  }

  private async handleCandyGamble(interaction: ChatInputCommandInteraction) {
    try {
      const amount = interaction.options.getInteger('amount', true);
      const userId = interaction.user.id;
      
      if (amount < 1) {
        await interaction.reply({ content: '❌ You must gamble at least 1 candy.', ephemeral: true });
        return;
      }
      
      const balance = await storage.getCandyBalance(userId);
      if (balance.wallet < amount) {
        await interaction.reply({ content: '❌ You don\'t have enough candies to gamble.', ephemeral: true });
        return;
      }
      
      const winChance = 0.45; // 45% win chance
      const won = Math.random() < winChance;
      
      let resultAmount = amount;
      let resultMessage = '';
      let color = '#FF0000';
      
      if (won) {
        const multiplier = Math.random() * 1.5 + 1.2; // 1.2x to 2.7x multiplier
        resultAmount = Math.floor(amount * multiplier);
        await storage.updateCandyBalance(userId, resultAmount - amount);
        color = '#00FF00';
        resultMessage = `🎉 **YOU WON!** You gained **${(resultAmount - amount).toLocaleString()}** candies!`;
      } else {
        await storage.updateCandyBalance(userId, -amount);
        color = '#FF0000';
        resultMessage = `💸 **You lost!** You lost **${amount.toLocaleString()}** candies.`;
      }
      
      const embed = new EmbedBuilder()
        .setColor(color as any)
        .setTitle('🎰 Gambling Results')
        .setDescription(resultMessage)
        .addFields(
          { name: '💰 Bet Amount', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: won ? '🎁 Total Won' : '💸 Total Lost', value: `${won ? resultAmount.toLocaleString() : amount.toLocaleString()} candies`, inline: true }
        )
        .setFooter({ text: '99.99% of gamblers quit before they hit big' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in candy gamble command:', error);
      await interaction.reply({ content: 'Error processing gamble.', ephemeral: true });
    }
  }

  private async handleCandyLeaderboard(interaction: ChatInputCommandInteraction) {
    try {
      const leaderboard = await storage.getCandyLeaderboard(10);
      
      if (leaderboard.length === 0) {
        await interaction.reply({ content: 'No candy data available yet.', ephemeral: true });
        return;
      }
      
      let description = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} <@${user.discordId}> - **${user.candyBalance.toLocaleString()}** candies\n`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Candy Leaderboard')
        .setDescription('**Top 10 Users with the Highest Amount of Candies**\n\n' + description)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in candy leaderboard command:', error);
      await interaction.reply({ content: 'Error fetching leaderboard.', ephemeral: true });
    }
  }

  private async handleCandyPay(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const userId = interaction.user.id;
      
      if (targetUser.id === userId) {
        await interaction.reply({ content: '❌ You cannot pay yourself.', ephemeral: true });
        return;
      }
      
      if (amount < 1) {
        await interaction.reply({ content: '❌ You must pay at least 1 candy.', ephemeral: true });
        return;
      }
      
      const balance = await storage.getCandyBalance(userId);
      if (balance.wallet < amount) {
        await interaction.reply({ content: '❌ You don\'t have enough candies to make this payment.', ephemeral: true });
        return;
      }
      
      await storage.transferCandy(userId, targetUser.id, amount);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💸 Payment Successful')
        .setDescription(`You successfully paid **${amount.toLocaleString()}** candies to ${targetUser.toString()}!`)
        .addFields(
          { name: '💰 Amount', value: `${amount.toLocaleString()} candies`, inline: true },
          { name: '👤 Recipient', value: targetUser.toString(), inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in candy pay command:', error);
      await interaction.reply({ content: 'Error processing payment.', ephemeral: true });
    }
  }

  public async start() {
    if (!DISCORD_TOKEN) {
      console.log('⚠️ Discord bot token not provided. Bot will not start.');
      return;
    }

    try {
      await this.client.login(DISCORD_TOKEN);
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
    }
  }

  public isOnline(): boolean {
    return this.isReady;
  }
}

export const raptorBot = new RaptorBot();