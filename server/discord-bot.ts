import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { storage } from './storage-simple';
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
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
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
        .setName('keyinfo')
        .setDescription('Get information about a license key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to look up')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer license data from one account to another')
        .addStringOption(option =>
          option.setName('from_user')
            .setDescription('Source user ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('to_user')
            .setDescription('Destination user ID')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('candy')
        .setDescription('Candy system commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('balance')
            .setDescription('Check your candy balance')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('daily')
            .setDescription('Claim your daily reward of 2000 candies')
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
            .setDescription('Display the top 10 users with the highest amount of candies')
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
        ),

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
            .setName('ethereum')
            .setDescription('Generate a key for an ethereum payment')
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
            .setDescription('Generate a key for a PayPal payment')
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
            .setDescription('Generate a key for a CashApp payment')
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
            .setName('venmo')
            .setDescription('Generate a key for a Venmo payment')
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
            .setName('robux')
            .setDescription('Generate a key for a Robux payment')
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

      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage whitelist operations')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to the whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to add to whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to remove from whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('check')
            .setDescription('Check if a user is whitelisted')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to check')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('hwidinfo')
        .setDescription('Get HWID information')
        .addSubcommand(subcommand =>
          subcommand
            .setName('user')
            .setDescription('Get HWID info for a user')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to check HWID for')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('hwid')
            .setDescription('Get info for a specific HWID')
            .addStringOption(option =>
              option.setName('hwid')
                .setDescription('HWID to look up')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify with the dashboard')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('Verification code from dashboard')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test bot functionality'),

      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

      new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code (Admin only)')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('JavaScript code to evaluate')
            .setRequired(true)
        ),
    ];

    if (!DISCORD_TOKEN || !CLIENT_ID) {
      console.error('❌ Missing Discord bot token or client ID');
      return;
    }

    try {
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      
      console.log('🔄 Started refreshing application (/) commands...');
      
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands.map(command => command.toJSON()) },
      );
      
      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const startTime = performance.now();
    const { commandName } = interaction;

    try {
      if (await this.isRateLimited(interaction.user.id)) {
        await interaction.reply({ 
          content: '⏰ You are being rate limited. Please wait before using another command.', 
          ephemeral: true 
        });
        return;
      }

      const adminCommands = ['eval', 'add', 'transfer'];
      if (adminCommands.includes(commandName) && !this.hasRequiredPermissions(interaction)) {
        await interaction.reply({ 
          content: '❌ You do not have permission to use this command.', 
          ephemeral: true 
        });
        return;
      }

      await this.storeUserData(interaction.user, interaction.member, interaction.guild);

      switch (commandName) {
        case 'add':
          await this.handleAdd(interaction);
          break;
        case 'keyinfo':
          await this.handleKeyInfo(interaction);
          break;
        case 'transfer':
          await this.handleTransfer(interaction);
          break;
        case 'candy':
          await this.handleCandyCommands(interaction);
          break;
        case 'generatekey':
          await this.handleGenerateKeyCommands(interaction);
          break;
        case 'whitelist':
          await this.handleWhitelistCommands(interaction);
          break;
        case 'hwidinfo':
          await this.handleHwidInfoCommands(interaction);
          break;
        case 'verify':
          await this.handleVerify(interaction);
          break;
        case 'test':
          await this.handleTest(interaction);
          break;
        case 'ping':
          await this.handlePing(interaction);
          break;
        case 'eval':
          await this.handleEval(interaction);
          break;
        default:
          await interaction.reply({ 
            content: '❌ Unknown command.', 
            ephemeral: true 
          });
      }

      await this.logCommandUsage(interaction, startTime, true);

    } catch (error) {
      console.error(`❌ Error handling command ${commandName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: `❌ An error occurred: ${errorMessage}`, 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: `❌ An error occurred: ${errorMessage}`, 
            ephemeral: true 
          });
        }
      } catch (replyError) {
        console.error('❌ Error sending error message:', replyError);
      }

      await this.logCommandUsage(interaction, startTime, false, errorMessage);
    }
  }

  private async handleCandyCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'balance':
        await this.handleBalance(interaction);
        break;
      case 'daily':
        await this.handleDaily(interaction);
        break;
      case 'beg':
        await this.handleCandyBeg(interaction);
        break;
      case 'credit-card-scam':
        await this.handleCreditCardScam(interaction);
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
      default:
        await interaction.reply({ content: '❌ Unknown candy subcommand.', ephemeral: true });
    }
  }

  private async handleBalance(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
      const balance = await storage.getCandyBalance(targetUser.id);
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🍬 Candy Balance')
        .setDescription(`Balance for ${targetUser.toString()}`)
        .addFields(
          { name: '💰 Wallet', value: balance.wallet.toLocaleString(), inline: true },
          { name: '🏦 Bank', value: balance.bank.toLocaleString(), inline: true },
          { name: '💎 Total', value: (balance.wallet + balance.bank).toLocaleString(), inline: true }
        )
        .setFooter({ text: 'MacSploit Candy System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in balance command:', error);
      await interaction.reply({ content: '❌ Error fetching balance.', ephemeral: true });
    }
  }

  private async handleDaily(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    
    try {
      const lastDaily = await storage.getLastDaily(userId);
      const now = new Date();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (lastDaily && (now.getTime() - lastDaily.getTime()) < twentyFourHours) {
        const timeLeft = twentyFourHours - (now.getTime() - lastDaily.getTime());
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        
        await interaction.reply({ 
          content: `⏰ You already claimed your daily reward! Try again in ${hoursLeft}h ${minutesLeft}m.`, 
          ephemeral: true 
        });
        return;
      }
      
      const dailyAmount = 2000;
      await storage.addCandy(userId, dailyAmount);
      await storage.updateLastDaily(userId);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎁 Daily Reward Claimed!')
        .setDescription(`You received **${dailyAmount.toLocaleString()}** candies!`)
        .setFooter({ text: 'Come back tomorrow for more!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in daily command:', error);
      await interaction.reply({ content: '❌ Error processing daily reward.', ephemeral: true });
    }
  }

  private async handleCandyBeg(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    
    try {
      const lastBeg = await storage.getLastBeg(userId);
      const now = new Date();
      const cooldown = 5 * 60 * 1000;
      
      if (lastBeg && (now.getTime() - lastBeg.getTime()) < cooldown) {
        const timeLeft = cooldown - (now.getTime() - lastBeg.getTime());
        const minutesLeft = Math.floor(timeLeft / (60 * 1000));
        const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);
        
        await interaction.reply({ 
          content: `⏰ You need to wait ${minutesLeft}m ${secondsLeft}s before begging again!`, 
          ephemeral: true 
        });
        return;
      }
      
      const amount = Math.floor(Math.random() * 100) + 1;
      await storage.addCandy(userId, amount);
      await storage.updateLastBeg(userId);
      
      const responses = [
        `A kind stranger gave you **${amount}** candies!`,
        `You found **${amount}** candies on the ground!`,
        `Someone felt sorry for you and gave **${amount}** candies!`,
        `You begged successfully and received **${amount}** candies!`
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      await interaction.reply({ content: `🍬 ${response}` });
      
    } catch (error) {
      console.error('Error in beg command:', error);
      await interaction.reply({ content: '❌ Error processing beg request.', ephemeral: true });
    }
  }

  private async handleCreditCardScam(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    
    try {
      const lastScam = await storage.getLastScam(userId);
      const now = new Date();
      const cooldown = 30 * 60 * 1000;
      
      if (lastScam && (now.getTime() - lastScam.getTime()) < cooldown) {
        const timeLeft = cooldown - (now.getTime() - lastScam.getTime());
        const minutesLeft = Math.floor(timeLeft / (60 * 1000));
        
        await interaction.reply({ 
          content: `⏰ You need to wait ${minutesLeft} minutes before attempting another scam!`, 
          ephemeral: true 
        });
        return;
      }
      
      const successChance = 0.3;
      const isSuccess = Math.random() < successChance;
      
      await storage.updateLastScam(userId);
      
      if (isSuccess) {
        const amount = Math.floor(Math.random() * 5000) + 1000;
        await storage.addCandy(userId, amount);
        
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('💳 Credit Card Scam Successful!')
          .setDescription(`You successfully scammed **${amount.toLocaleString()}** candies!`)
          .setFooter({ text: 'FBI wants to know your location' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        const lostAmount = Math.floor(Math.random() * 500) + 100;
        await storage.subtractCandy(userId, lostAmount);
        
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('💳 Credit Card Scam Failed!')
          .setDescription(`Your scam failed and you lost **${lostAmount.toLocaleString()}** candies to legal fees!`)
          .setFooter({ text: 'Crime doesn\'t pay... sometimes' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Error in credit card scam command:', error);
      await interaction.reply({ content: '❌ Error processing scam attempt.', ephemeral: true });
    }
  }

  private async handleCandyGamble(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('amount', true);
    
    if (amount <= 0) {
      await interaction.reply({ content: '❌ You must gamble a positive amount!', ephemeral: true });
      return;
    }
    
    try {
      const balance = await storage.getCandyBalance(userId);
      
      if (balance.wallet < amount) {
        await interaction.reply({ 
          content: `❌ You don't have enough candies! You have **${balance.wallet.toLocaleString()}** candies.`, 
          ephemeral: true 
        });
        return;
      }
      
      const winChance = 0.45;
      const isWin = Math.random() < winChance;
      
      if (isWin) {
        const multiplier = Math.random() * 1.5 + 0.5;
        const winAmount = Math.floor(amount * multiplier);
        await storage.addCandy(userId, winAmount);
        
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎰 You Won!')
          .setDescription(`You bet **${amount.toLocaleString()}** candies and won **${winAmount.toLocaleString()}** candies!`)
          .addFields({ name: 'Multiplier', value: `${multiplier.toFixed(2)}x`, inline: true })
          .setFooter({ text: '99.99% of gamblers quit before they hit big!' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        await storage.subtractCandy(userId, amount);
        
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🎰 You Lost!')
          .setDescription(`You bet **${amount.toLocaleString()}** candies and lost them all!`)
          .setFooter({ text: 'The house always wins...' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Error in gamble command:', error);
      await interaction.reply({ content: '❌ Error processing gamble.', ephemeral: true });
    }
  }

  private async handleCandyLeaderboard(interaction: ChatInputCommandInteraction) {
    try {
      const topUsers = await storage.getTopCandyUsers(10);
      
      if (topUsers.length === 0) {
        await interaction.reply({ content: 'No users found on the leaderboard.', ephemeral: true });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🍬 Candy Leaderboard')
        .setDescription('Top 10 users with the most candies')
        .setFooter({ text: 'MacSploit Candy System' })
        .setTimestamp();

      let description = '';
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} <@${user.discordId}>: **${user.candyBalance.toLocaleString()}** candies\n`;
      }
      
      embed.setDescription(description);
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.reply({ content: '❌ Error fetching leaderboard.', ephemeral: true });
    }
  }

  private async handleCandyPay(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const userId = interaction.user.id;
    
    if (amount <= 0) {
      await interaction.reply({ content: '❌ You must pay a positive amount!', ephemeral: true });
      return;
    }
    
    if (targetUser.id === userId) {
      await interaction.reply({ content: '❌ You cannot pay yourself!', ephemeral: true });
      return;
    }
    
    try {
      const userBalance = await storage.getCandyBalance(userId);
      
      if (userBalance.wallet < amount) {
        await interaction.reply({ 
          content: `❌ You don't have enough candies! You have **${userBalance.wallet.toLocaleString()}** candies.`, 
          ephemeral: true 
        });
        return;
      }
      
      await storage.transferCandy(userId, targetUser.id, amount);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💸 Payment Successful!')
        .setDescription(`You paid **${amount.toLocaleString()}** candies to ${targetUser.toString()}`)
        .setFooter({ text: 'MacSploit Candy System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in pay command:', error);
      await interaction.reply({ content: '❌ Error processing payment.', ephemeral: true });
    }
  }

  private async handleCandyDeposit(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);
    const userId = interaction.user.id;
    
    if (amount <= 0) {
      await interaction.reply({ content: '❌ You must deposit a positive amount!', ephemeral: true });
      return;
    }
    
    try {
      const balance = await storage.getCandyBalance(userId);
      
      if (balance.wallet < amount) {
        await interaction.reply({ 
          content: `❌ You don't have enough candies in your wallet! You have **${balance.wallet.toLocaleString()}** candies.`, 
          ephemeral: true 
        });
        return;
      }
      
      await storage.depositCandy(userId, amount);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🏦 Deposit Successful!')
        .setDescription(`You deposited **${amount.toLocaleString()}** candies into your bank`)
        .setFooter({ text: 'Your candies are now safe!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in deposit command:', error);
      await interaction.reply({ content: '❌ Error processing deposit.', ephemeral: true });
    }
  }

  private async handleAdd(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    const key = interaction.options.getString('key', true);
    const generatedBy = interaction.options.getString('generatedby', true);
    const reason = interaction.options.getString('reason', true);

    try {
      const existingKey = await storage.getDiscordKeyByKeyId(key);
      if (existingKey) {
        await interaction.reply({ content: '❌ This key already exists in the database.', ephemeral: true });
        return;
      }

      const hwid = crypto.randomBytes(16).toString('hex');

      await storage.createDiscordKey({
        keyId: key,
        discordUserId: targetUser.id,
        discordUsername: targetUser.username,
        hwid,
        generatedBy,
        reason
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ License Key Added Successfully')
        .addFields(
          { name: '🔑 Key', value: `\`${key}\``, inline: false },
          { name: '👤 User', value: targetUser.toString(), inline: true },
          { name: '💻 HWID', value: `\`${hwid}\``, inline: true },
          { name: '👨‍💼 Generated By', value: generatedBy, inline: true },
          { name: '📝 Reason', value: reason, inline: false }
        )
        .setFooter({ text: 'MacSploit License System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await storage.logActivity({
        type: 'key_added',
        description: `License key ${key} added for user ${targetUser.username} by ${interaction.user.username}`,
        metadata: { keyId: key, userId: targetUser.id, generatedBy, reason }
      });

    } catch (error) {
      console.error('Error in add command:', error);
      await interaction.reply({ content: '❌ Error adding license key.', ephemeral: true });
    }
  }

  private async handleKeyInfo(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);

    try {
      const keyData = await storage.getDiscordKeyByKeyId(key);
      
      if (!keyData) {
        await interaction.reply({ content: '❌ License key not found.', ephemeral: true });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔍 License Key Information')
        .addFields(
          { name: '🔑 Key ID', value: `\`${keyData.keyId}\``, inline: false },
          { name: '👤 Username', value: keyData.discordUsername || 'Not specified', inline: true },
          { name: '📊 Status', value: '✅ Active', inline: true },
          { name: '💻 HWID', value: keyData.hwid || 'Not linked', inline: true },
          { name: '📅 Created', value: keyData.createdAt?.toLocaleDateString() || 'Unknown', inline: true }
        )
        .setFooter({ text: 'MacSploit License System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in keyinfo command:', error);
      await interaction.reply({ content: '❌ Error retrieving key information.', ephemeral: true });
    }
  }

  private async handleTransfer(interaction: ChatInputCommandInteraction) {
    const fromUserId = interaction.options.getString('from_user', true);
    const toUserId = interaction.options.getString('to_user', true);

    if (fromUserId === toUserId) {
      await interaction.reply({ content: '❌ Cannot transfer to the same user.', ephemeral: true });
      return;
    }

    try {
      const userKeys = await storage.getDiscordKeysByUserId(fromUserId);
      
      if (userKeys.length === 0) {
        await interaction.reply({ content: '❌ No keys found for the source user.', ephemeral: true });
        return;
      }

      for (const key of userKeys) {
        await storage.updateDiscordKeyUser(key.keyId, toUserId);
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 License Transfer Complete')
        .addFields(
          { name: '📤 From User', value: `<@${fromUserId}>`, inline: true },
          { name: '📥 To User', value: `<@${toUserId}>`, inline: true },
          { name: '🔑 Keys Transferred', value: userKeys.length.toString(), inline: true }
        )
        .setFooter({ text: 'MacSploit License System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await storage.logActivity({
        type: 'key_transfer',
        description: `Transferred ${userKeys.length} keys from user ${fromUserId} to ${toUserId}`,
        metadata: { fromUserId, toUserId, keyCount: userKeys.length }
      });

    } catch (error) {
      console.error('Error in transfer command:', error);
      await interaction.reply({ content: '❌ Error transferring keys.', ephemeral: true });
    }
  }

  private async handleGenerateKeyCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);
    const txid = interaction.options.getString('txid', true);
    const keyType = interaction.options.getString('type') || 'monthly';

    const paymentMethods = {
      bitcoin: '₿ Bitcoin',
      ethereum: '⟠ Ethereum', 
      paypal: '💳 PayPal',
      cashapp: '💵 CashApp',
      venmo: '📱 Venmo',
      robux: '🟦 Robux'
    };

    try {
      const keyId = `MSX-${keyType.toUpperCase()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const hwid = crypto.randomBytes(16).toString('hex');

      await storage.createDiscordKey({
        keyId,
        discordUserId: targetUser.id,
        discordUsername: targetUser.username,
        hwid,
        generatedBy: interaction.user.username,
        reason: `${paymentMethods[subcommand as keyof typeof paymentMethods]} payment: ${txid}`
      });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${paymentMethods[subcommand as keyof typeof paymentMethods]} Key Generated`)
        .addFields(
          { name: '🔑 License Key', value: `\`${keyId}\``, inline: false },
          { name: '👤 User', value: targetUser.toString(), inline: true },
          { name: '📝 Type', value: keyType, inline: true },
          { name: '💰 Payment ID', value: `\`${txid}\``, inline: true },
          { name: '💻 HWID', value: `\`${hwid}\``, inline: false }
        )
        .setFooter({ text: 'MacSploit License System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      await storage.logActivity({
        type: 'key_generated',
        description: `${paymentMethods[subcommand as keyof typeof paymentMethods]} key ${keyId} generated for ${targetUser.username}`,
        metadata: { keyId, paymentMethod: subcommand, txid, keyType }
      });

    } catch (error) {
      console.error('Error generating key:', error);
      await interaction.reply({ content: '❌ Error generating license key.', ephemeral: true });
    }
  }

  private async handleWhitelistCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);

    try {
      switch (subcommand) {
        case 'add':
          await storage.addUserToWhitelist(targetUser.id);
          await interaction.reply({ 
            content: `✅ Added ${targetUser.toString()} to the whitelist.` 
          });
          break;

        case 'remove':
          await storage.removeUserFromWhitelist(targetUser.id);
          await interaction.reply({ 
            content: `❌ Removed ${targetUser.toString()} from the whitelist.` 
          });
          break;

        case 'check':
          const isWhitelisted = await storage.isUserWhitelisted(targetUser.id);
          const status = isWhitelisted ? '✅ Whitelisted' : '❌ Not Whitelisted';
          await interaction.reply({ 
            content: `${targetUser.toString()} is ${status}` 
          });
          break;

        default:
          await interaction.reply({ content: '❌ Unknown whitelist command.', ephemeral: true });
      }
    } catch (error) {
      console.error('Error in whitelist command:', error);
      await interaction.reply({ content: '❌ Error processing whitelist command.', ephemeral: true });
    }
  }

  private async handleHwidInfoCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'user':
          const targetUser = interaction.options.getUser('user', true);
          const userKeys = await storage.getDiscordKeysByUserId(targetUser.id);
          
          if (userKeys.length === 0) {
            await interaction.reply({ content: '❌ No keys found for this user.', ephemeral: true });
            return;
          }

          const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('💻 User HWID Information')
            .setDescription(`HWID data for ${targetUser.toString()}`)
            .setFooter({ text: 'MacSploit License System' })
            .setTimestamp();

          let hwidList = '';
          for (const key of userKeys.slice(0, 10)) {
            hwidList += `🔑 \`${key.keyId}\` → \`${key.hwid}\`\n`;
          }
          
          if (userKeys.length > 10) {
            hwidList += `\n... and ${userKeys.length - 10} more keys`;
          }

          embed.addFields({ name: 'Key → HWID Mappings', value: hwidList || 'No data', inline: false });
          
          await interaction.reply({ embeds: [embed] });
          break;

        case 'hwid':
          const hwid = interaction.options.getString('hwid', true);
          const keysWithHwid = await storage.getDiscordKeysByHwid(hwid);
          
          if (keysWithHwid.length === 0) {
            await interaction.reply({ content: '❌ No keys found for this HWID.', ephemeral: true });
            return;
          }

          const hwidEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔍 HWID Information')
            .addFields(
              { name: '💻 HWID', value: `\`${hwid}\``, inline: false },
              { name: '🔑 Associated Keys', value: keysWithHwid.length.toString(), inline: true }
            )
            .setFooter({ text: 'MacSploit License System' })
            .setTimestamp();

          let keysList = '';
          for (const key of keysWithHwid.slice(0, 10)) {
            keysList += `\`${key.keyId}\` (${key.discordUsername})\n`;
          }
          
          if (keysWithHwid.length > 10) {
            keysList += `\n... and ${keysWithHwid.length - 10} more keys`;
          }

          hwidEmbed.addFields({ name: 'Keys', value: keysList || 'No keys', inline: false });
          
          await interaction.reply({ embeds: [hwidEmbed] });
          break;

        default:
          await interaction.reply({ content: '❌ Unknown HWID command.', ephemeral: true });
      }
    } catch (error) {
      console.error('Error in hwidinfo command:', error);
      await interaction.reply({ content: '❌ Error retrieving HWID information.', ephemeral: true });
    }
  }

  private async handleVerify(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const code = interaction.options.getString('code')?.trim();

    if (!code) {
      await interaction.reply({ content: 'Please provide a verification code.', ephemeral: true });
      return;
    }

    const verificationCodeMatch = code.match(/^[A-Z0-9]{6}$/);
    if (!verificationCodeMatch) {
      await interaction.reply({ content: 'Please provide a valid 6-character verification code (e.g., ABC123)', ephemeral: true });
      return;
    }

    try {
      const session = await storage.getVerificationSessionByDiscordUserId(userId);
      
      if (!session) {
        await interaction.reply({ content: 'No active verification session found. Please start verification from the dashboard first.', ephemeral: true });
        return;
      }

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

      const botResponseCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await storage.updateVerificationSession(session.sessionId, {
        botResponseCode,
        status: 'bot_responded'
      });

      await interaction.reply({ content: `✅ Verification code accepted! Your response code is: **${botResponseCode}**\n\nPlease enter this code in the dashboard to complete verification.`, ephemeral: true });

      await storage.logActivity({
        type: 'verification',
        description: `Bot responded to verification request from user ${userId}`,
        metadata: { userId, sessionId: session.sessionId },
      });

    } catch (error) {
      console.error('Error in verification process:', error);
      await interaction.reply({ content: 'An error occurred while processing your verification. Please try again.', ephemeral: true });
    }
  }

  private async handleVerificationMessage(message: any) {
    const content = message.content.trim().toUpperCase();
    const userId = message.author.id;

    if (!/^[A-Z0-9]{6}$/.test(content)) {
      await message.reply('Please send a valid 6-character verification code from the dashboard.');
      return;
    }

    try {
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

      const botResponseCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await storage.updateVerificationSession(session.sessionId, {
        botResponseCode,
        status: 'bot_responded',
      });

      await message.reply(`✅ Verification code received! Your verification code is: **${botResponseCode}**\n\nEnter this code in the dashboard to complete verification.`);

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

  private async handleTest(interaction: ChatInputCommandInteraction) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🧪 Bot Test')
        .setDescription('Bot is functioning correctly!')
        .addFields(
          { name: '🏓 Latency', value: `${this.client.ws.ping}ms`, inline: true },
          { name: '🕒 Uptime', value: this.formatUptime(this.client.uptime || 0), inline: true },
          { name: '📊 Status', value: this.isReady ? '✅ Ready' : '❌ Not Ready', inline: true }
        )
        .setFooter({ text: 'MacSploit Bot System' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in test command:', error);
      await interaction.reply({ content: '❌ Error running test.', ephemeral: true });
    }
  }

  private async handlePing(interaction: ChatInputCommandInteraction) {
    const latency = this.client.ws.ping;
    const color = latency < 100 ? '#00FF00' : latency < 200 ? '#FFFF00' : '#FF0000';
    
    const embed = new EmbedBuilder()
      .setColor(color as any)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
        { name: 'API Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleEval(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('code', true);

    const authorizedUserId = this.getSetting('authorized_user_id');
    if (interaction.user.id !== authorizedUserId) {
      await interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
      return;
    }

    try {
      let result = eval(code);
      
      if (typeof result !== 'string') {
        result = require('util').inspect(result, { depth: 0 });
      }

      if (result.length > 1990) {
        result = result.substring(0, 1990) + '...';
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📝 Eval Result')
        .addFields(
          { name: 'Input', value: `\`\`\`js\n${code}\n\`\`\``, inline: false },
          { name: 'Output', value: `\`\`\`js\n${result}\n\`\`\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await storage.logActivity({
        type: 'eval_executed',
        description: `Eval command executed by ${interaction.user.username}`,
        metadata: { code, result: result.substring(0, 500) }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Eval Error')
        .addFields(
          { name: 'Input', value: `\`\`\`js\n${code}\n\`\`\``, inline: false },
          { name: 'Error', value: `\`\`\`\n${errorMessage}\n\`\`\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  private predefinedTags: Record<string, any> = {
    '.sellsn': {
      title: '🛒 Selling Serial Numbers',
      description: 'We do not sell serial numbers. MacSploit provides legitimate software access.',
      color: '#FF6B6B'
    },
    '.uicrash': {
      title: '💥 UI Crash Fix',
      description: 'If MacSploit UI is crashing:\n1. Restart MacSploit\n2. Clear cache\n3. Reinstall if necessary',
      color: '#4ECDC4'
    },
    '.user': {
      title: '👤 User Account Issues',
      description: 'For account issues:\n1. Check your login credentials\n2. Verify email\n3. Contact support if needed',
      color: '#45B7D1'
    },
    '.zsh': {
      title: '🖥️ ZSH Terminal Issues',
      description: 'ZSH terminal problems:\n1. Check permissions\n2. Restart terminal\n3. Verify MacSploit installation',
      color: '#96CEB4'
    },
    '.anticheat': {
      title: '🛡️ Anti-Cheat Detection',
      description: 'If detected by anti-cheat:\n1. Use stealth mode\n2. Clear traces\n3. Wait before retrying',
      color: '#FFEAA7'
    },
    '.autoexe': {
      title: '⚙️ Auto-Execute Issues',
      description: 'Auto-execute not working:\n1. Check script permissions\n2. Verify file path\n3. Restart MacSploit',
      color: '#DDA0DD'
    },
    '.badcpu': {
      title: '💻 CPU Compatibility',
      description: 'CPU not supported:\n1. Check system requirements\n2. Update MacSploit\n3. Contact support for compatibility',
      color: '#98D8C8'
    },
    '.cookie': {
      title: '🍪 Cookie Issues',
      description: 'Cookie problems:\n1. Clear browser cookies\n2. Restart browser\n3. Re-login to Roblox',
      color: '#F7DC6F'
    },
    '.crash': {
      title: '💥 Application Crash',
      description: 'MacSploit crashing:\n1. Check logs for errors\n2. Restart application\n3. Reinstall if persistent',
      color: '#F1948A'
    },
    '.elevated': {
      title: '🔐 Admin Privileges',
      description: 'Need elevated permissions:\n1. Run as Administrator\n2. Check security settings\n3. Disable conflicting software',
      color: '#85C1E9'
    },
    '.fwaeh': {
      title: '❓ FWAEH Error',
      description: 'FWAEH error encountered:\n1. Restart MacSploit\n2. Clear temp files\n3. Check for updates',
      color: '#D7BDE2'
    },
    '.giftcard': {
      title: '🎁 Gift Card Issues',
      description: 'Gift card problems:\n1. Verify card validity\n2. Check balance\n3. Contact support for redemption',
      color: '#A9DFBF'
    },
    '.hwid': {
      title: '🔢 HWID Issues',
      description: 'Hardware ID problems:\n1. Check HWID status\n2. Reset if needed\n3. Contact support for HWID reset',
      color: '#F8C471'
    },
    '.install': {
      title: '📦 Installation Help',
      description: 'Installation issues:\n1. Download latest version\n2. Run as Administrator\n3. Disable antivirus temporarily',
      color: '#AED6F1'
    },
    '.iy': {
      title: '🔧 IY (Infinite Yield)',
      description: 'Infinite Yield script:\n1. Load script properly\n2. Check for updates\n3. Verify compatibility',
      color: '#C39BD3'
    },
    '.multi-instance': {
      title: '🖥️ Multiple Instances',
      description: 'Running multiple instances:\n1. Close other instances\n2. Wait 30 seconds\n3. Launch single instance',
      color: '#7FB3D3'
    },
    '.offline': {
      title: '🌐 Offline Mode',
      description: 'Offline functionality:\n1. Check internet connection\n2. Verify server status\n3. Try again later',
      color: '#85929E'
    },
    '.paypal': {
      title: '💳 PayPal Payment',
      description: 'PayPal payment issues:\n1. Verify payment completion\n2. Check email confirmation\n3. Contact support with transaction ID',
      color: '#5DADE2'
    },
    '.robux': {
      title: '💎 Robux Payment',
      description: 'Robux payment problems:\n1. Verify Robux balance\n2. Check gamepass purchase\n3. Wait for processing',
      color: '#58D68D'
    },
    '.scripts': {
      title: '📜 Script Execution',
      description: 'Script not working:\n1. Check script syntax\n2. Verify compatibility\n3. Try different script',
      color: '#F4D03F'
    }
  };

  private async handlePredefinedTag(message: any, tagName: string) {
    const tag = this.predefinedTags[tagName];
    if (!tag) return;

    const embed = new EmbedBuilder()
      .setColor(tag.color)
      .setTitle(tag.title)
      .setDescription(tag.description)
      .setFooter({ text: 'MacSploit Support • React with ❌ to delete' })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed] });
    
    await reply.react('❌');
    
    const filter = (reaction: any, user: any) => {
      return reaction.emoji.name === '❌' && !user.bot;
    };

    const collector = reply.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', async () => {
      try {
        await reply.delete();
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });
  }

  private async syncServerData() {
    try {
      const guilds = Array.from(this.client.guilds.cache.values());
      for (const guild of guilds) {
        await this.addServer(guild);
      }
    } catch (error) {
      console.error('Error syncing server data:', error);
    }
  }

  private async addServer(guild: any) {
    try {
      await storage.upsertDiscordServer({
        serverId: guild.id,
        serverName: guild.name,
        isActive: true
      });
    } catch (error) {
      console.error('Error adding server:', error);
    }
  }

  private hasRequiredPermissions(interaction: ChatInputCommandInteraction): boolean {
    const requiredRole = this.getSetting('required_role', 'Raptor Admin');
    const authorizedUserId = this.getSetting('authorized_user_id');
    
    if (interaction.user.id === authorizedUserId) {
      return true;
    }
    
    if (interaction.member && 'roles' in interaction.member) {
      const member = interaction.member as any;
      return member.roles.cache.some((role: any) => role.name === requiredRole);
    }
    
    return false;
  }

  private rateLimitMap = new Map<string, number[]>();
  private readonly RATE_LIMIT_COUNT = 10;
  private readonly RATE_LIMIT_WINDOW = 30 * 1000;

  private async isRateLimited(userId: string): Promise<boolean> {
    if (!this.getSetting('rate_limit_enabled', 'true')) return false;
    
    const now = Date.now();
    const userCommands = this.rateLimitMap.get(userId) || [];
    
    const recentCommands = userCommands.filter(time => now - time < this.RATE_LIMIT_WINDOW);
    
    if (recentCommands.length >= this.RATE_LIMIT_COUNT) {
      return true;
    }
    
    recentCommands.push(now);
    this.rateLimitMap.set(userId, recentCommands);
    
    return false;
  }

  private async storeUserData(user: any, member: any, guild: any) {
    try {
      await storage.upsertDiscordUser({
        discordId: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  private async logCommandUsage(interaction: ChatInputCommandInteraction, startTime: number, success: boolean = true, errorMessage?: string): Promise<void> {
    try {
      const executionTime = performance.now() - startTime;
      
      await storage.logCommandUsage({
        username: interaction.user.username,
        userId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand: interaction.options.getSubcommand(false),
        executionTime: Math.round(executionTime),
        success,
        errorMessage
      });
    } catch (error) {
      console.error('Error logging command usage:', error);
    }
  }

  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  public async start() {
    if (!DISCORD_TOKEN) {
      console.error('❌ No Discord bot token provided');
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