import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { storage } from './storage-simple';
import { db } from './db';
import { discordUsers, type DiscordUser } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { BackupIntegrityChecker } from './backup-integrity';
import crypto from 'crypto';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;

export class RaptorBot {
  private client: Client;
  private isReady = false;
  private settings: Map<string, string> = new Map();

  // Predefined support tags for MacSploit
  private predefinedTags: { [key: string]: string } = {
    '.sellsn': '**Serial Number Information**\n\nYour MacSploit serial number can be found in:\n- The email receipt from your purchase\n- Your MacSploit account dashboard\n- The "About" section in the MacSploit application\n\nIf you cannot locate your serial number, please contact support with your purchase email.',
    '.uicrash': '**UI Crash Troubleshooting**\n\n1. Close MacSploit completely\n2. Clear application cache: `~/Library/Caches/com.macsploit.app`\n3. Restart your Mac\n4. Re-launch MacSploit as administrator\n5. If issue persists, try running in compatibility mode',
    '.user': '**User Account Issues**\n\n- Verify your login credentials\n- Check your internet connection\n- Ensure MacSploit servers are online\n- Try logging out and back in\n- Contact support if account is suspended',
    '.zsh': '**Zsh Shell Configuration**\n\n```bash\n# Add to ~/.zshrc\nexport PATH="/usr/local/bin:$PATH"\nalias macsploit="/Applications/MacSploit.app/Contents/MacOS/MacSploit"\n```\n\nRestart your terminal after making changes.',
    '.anticheat': '**Anti-Cheat Detection**\n\n- Ensure Roblox is completely closed before injecting\n- Update MacSploit to the latest version\n- Disable real-time antivirus scanning temporarily\n- Run MacSploit as administrator\n- Check if your game supports script execution',
    '.autoexe': '**Auto-Execute Setup**\n\n1. Create folder: `~/Documents/MacSploit/autoexec`\n2. Place your scripts in the autoexec folder\n3. Scripts will run automatically after injection\n4. Ensure scripts have `.lua` extension\n5. Restart MacSploit to apply changes',
    '.badcpu': '**CPU Compatibility Issues**\n\n- MacSploit requires Intel or Apple Silicon Mac\n- Minimum macOS 10.14 (Mojave)\n- 4GB+ RAM recommended\n- Check Activity Monitor for CPU usage\n- Close unnecessary applications before running',
    '.cookie': '**Cookie Management**\n\n- Cookies are stored in: `~/Library/Application Support/MacSploit/cookies`\n- Clear cookies if experiencing login issues\n- Backup cookies before major updates\n- Use incognito mode for testing purposes',
    '.crash': '**Application Crash Resolution**\n\n1. Check crash logs in Console.app\n2. Update macOS to latest version\n3. Reinstall MacSploit from official source\n4. Disable conflicting applications\n5. Report crash logs to support team',
    '.elevated': '**Permission Elevation**\n\nMacSploit requires elevated permissions:\n1. Right-click MacSploit.app\n2. Select "Get Info"\n3. Check "Open using Rosetta" (Intel Macs)\n4. Run with administrator privileges\n5. Accept security prompts when launching',
    '.fwaeh': '**Firewall and Network Issues**\n\n- Add MacSploit to firewall exceptions\n- Check if corporate firewall blocks connections\n- Try different network (mobile hotspot)\n- Verify DNS settings (try 8.8.8.8)\n- Disable VPN if experiencing issues',
    '.giftcard': '**Gift Card Redemption**\n\n- Gift cards can be redeemed in account settings\n- Ensure code is entered correctly (no spaces)\n- Check gift card expiration date\n- Contact support for invalid/used codes\n- Gift cards are non-transferable',
    '.hwid': '**Hardware ID Management**\n\n- HWID locks your license to specific hardware\n- Reset requests limited to 3 per month\n- Contact support for hardware changes\n- Virtual machines may have HWID issues\n- Keep backup of HWID information',
    '.install': '**Installation Guide**\n\n1. Download from official website only\n2. Move to Applications folder\n3. Grant necessary permissions\n4. Run initial setup wizard\n5. Enter your license key\n6. Restart after installation',
    '.iy': '**Infinite Yield Script**\n\nInfinite Yield is a popular admin script:\n```lua\nloadstring(game:HttpGet("https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source"))())\n```\n\nFeatures include teleportation, game manipulation, and admin commands.',
    '.multi-instance': '**Multiple Instances**\n\n- Only one MacSploit instance allowed per license\n- Close all instances before starting new one\n- Use different user accounts for multiple instances\n- Consider upgrading to multi-device license\n- Monitor CPU usage with multiple instances',
    '.offline': '**Offline Mode**\n\n- MacSploit requires internet for license verification\n- Offline mode available for premium users only\n- Cache expires after 7 days offline\n- Some features disabled in offline mode\n- Reconnect to sync latest updates',
    '.paypal': '**PayPal Payment Issues**\n\n- Ensure PayPal account is verified\n- Check for payment holds or restrictions\n- Verify billing address matches PayPal\n- Contact PayPal support for payment failures\n- Alternative payment methods available',
    '.robux': '**Robux and Virtual Currency**\n\n- MacSploit does not generate free Robux\n- Be cautious of Robux generator scams\n- Use legitimate Roblox methods to earn Robux\n- Report suspicious Robux-related activities\n- Purchase Robux through official Roblox channels',
    '.scripts': '**Script Execution Help**\n\n- Place scripts in Documents/MacSploit/scripts\n- Use .lua file extension\n- Check script compatibility with current game\n- Monitor console for error messages\n- Join our Discord for script sharing'
  };

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
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

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      // Handle predefined support tags
      const messageContent = message.content.trim().toLowerCase();
      if (this.predefinedTags[messageContent]) {
        await this.handlePredefinedTag(message, messageContent);
        return;
      }

      // Handle verification codes in DMs
      if (message.channel.type === 1) { // DM channel
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

  private async handlePredefinedTag(message: any, tag: string) {
    try {
      const response = this.predefinedTags[tag];
      await message.reply(response);
      
      // Log tag usage
      await storage.logActivity({
        type: 'support_tag',
        description: `Support tag ${tag} used by ${message.author.username}`,
        metadata: { tag, userId: message.author.id, channelId: message.channel.id }
      });
    } catch (error) {
      console.error('Error handling predefined tag:', error);
    }
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

      // Verification System
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Discord account for dashboard access')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('6-character verification code from dashboard')
            .setRequired(true)
        ),

      // Administration Commands
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and status'),

      new SlashCommandBuilder()
        .setName('keyinfo')
        .setDescription('Get information about a license key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to lookup')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to get information about')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('hwidinfo')
        .setDescription('Get HWID information for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to get HWID info for')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage user whitelist status')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add user to whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove user from whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to remove from whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('check')
            .setDescription('Check if user is whitelisted')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to check')
                .setRequired(true)
            )
        ),

      new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer a license key to another user')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to transfer')
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName('newowner')
            .setDescription('New owner of the key')
            .setRequired(true)
        ),

      // Payment Key Generation
      new SlashCommandBuilder()
        .setName('generate-bitcoin')
        .setDescription('Generate a Bitcoin payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('amount')
            .setDescription('Payment amount')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generate-ethereum')
        .setDescription('Generate an Ethereum payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('amount')
            .setDescription('Payment amount')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generate-paypal')
        .setDescription('Generate a PayPal payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('amount')
            .setDescription('Payment amount')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generate-cashapp')
        .setDescription('Generate a CashApp payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('amount')
            .setDescription('Payment amount')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generate-venmo')
        .setDescription('Generate a Venmo payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('amount')
            .setDescription('Payment amount')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generate-robux')
        .setDescription('Generate a Robux payment key')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to generate key for')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Robux amount')
            .setRequired(true)
        ),

      // System Administration
      new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Execute JavaScript code (Admin only)')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('JavaScript code to execute')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Create a backup of the database'),

      new SlashCommandBuilder()
        .setName('restore')
        .setDescription('Restore from a backup')
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('Backup ID to restore from')
            .setRequired(true)
        ),

      // Moderation Commands
      new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message to send')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send message to')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to DM')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message to send')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages')
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
          option.setName('duration')
            .setDescription('Timeout duration in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(40320)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for timeout')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Change a user\'s nickname')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to change nickname for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('nickname')
            .setDescription('New nickname (leave empty to reset)')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Announcement message')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to announce in')
            .setRequired(false)
        ),

      // Suggestion System
      new SlashCommandBuilder()
        .setName('suggestion-create')
        .setDescription('Create a new suggestion')
        .addStringOption(option =>
          option.setName('suggestion')
            .setDescription('Your suggestion')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('suggestion-approve')
        .setDescription('Approve a suggestion')
        .addStringOption(option =>
          option.setName('suggestion_id')
            .setDescription('Suggestion ID to approve')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('suggestion-deny')
        .setDescription('Deny a suggestion')
        .addStringOption(option =>
          option.setName('suggestion_id')
            .setDescription('Suggestion ID to deny')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for denial')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('suggestion-list')
        .setDescription('List all pending suggestions'),

      // Help Command
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands and usage'),

      // Stats Command
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show bot and system statistics'),

      // Test Command for development
      new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command for development purposes')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('Feature to test')
            .setRequired(false)
        )
    ];

    if (!DISCORD_TOKEN || !CLIENT_ID) {
      console.error('❌ Discord token or client ID not found');
      return;
    }

    try {
      console.log('🔄 Started refreshing application (/) commands...');
      
      const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
      
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands.map(cmd => cmd.toJSON()) }
      );

      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const startTime = Date.now();
    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      // Check rate limits
      if (await this.checkRateLimit(userId)) {
        await interaction.reply({ 
          content: '⏰ You are being rate limited. Please wait before using another command.', 
          ephemeral: true 
        });
        return;
      }

      // Handle commands
      switch (commandName) {
        case 'ping':
          await this.handlePing(interaction);
          break;
        case 'add':
          await this.handleAdd(interaction);
          break;
        case 'keyinfo':
          await this.handleKeyInfo(interaction);
          break;
        case 'userinfo':
          await this.handleUserInfo(interaction);
          break;
        case 'hwidinfo':
          await this.handleHwidInfo(interaction);
          break;
        case 'transfer':
          await this.handleTransfer(interaction);
          break;
        case 'whitelist':
          await this.handleWhitelist(interaction);
          break;
        case 'candy':
          await this.handleCandyCommands(interaction);
          break;
        case 'verify':
          await this.handleVerify(interaction);
          break;
        case 'generate-bitcoin':
        case 'generate-ethereum':
        case 'generate-paypal':
        case 'generate-cashapp':
        case 'generate-venmo':
        case 'generate-robux':
          await this.handleGenerateKeyCommands(interaction);
          break;
        case 'eval':
          await this.handleEval(interaction);
          break;
        case 'backup':
          await this.handleBackup(interaction);
          break;
        case 'restore':
          await this.handleRestore(interaction);
          break;
        case 'say':
          await this.handleSay(interaction);
          break;
        case 'dm':
          await this.handleDM(interaction);
          break;
        case 'purge':
          await this.handlePurge(interaction);
          break;
        case 'timeout':
          await this.handleTimeout(interaction);
          break;
        case 'nickname':
          await this.handleNickname(interaction);
          break;
        case 'announce':
          await this.handleAnnounce(interaction);
          break;
        case 'suggestion-create':
          await this.handleSuggestionCreate(interaction);
          break;
        case 'suggestion-approve':
          await this.handleSuggestionApprove(interaction);
          break;
        case 'suggestion-deny':
          await this.handleSuggestionDeny(interaction);
          break;
        case 'suggestion-list':
          await this.handleSuggestionList(interaction);
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
        case 'help':
          await this.handleHelp(interaction);
          break;
        case 'stats':
          await this.handleStats(interaction);
          break;
        case 'test':
          await this.handleTest(interaction);
          break;
        default:
          await interaction.reply({ 
            content: '❌ Unknown command. Use `/help` to see available commands.', 
            ephemeral: true 
          });
      }

      // Log command execution
      const executionTime = Date.now() - startTime;
      await storage.logCommandExecution({
        userId,
        username,
        commandName,
        executionTime,
        success: true,
        metadata: { args: interaction.options.data }
      });

    } catch (error) {
      console.error(`❌ Error executing command ${commandName}:`, error);
      
      const executionTime = Date.now() - startTime;
      await storage.logCommandExecution({
        userId,
        username,
        commandName,
        executionTime,
        success: false,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ An error occurred while executing this command.', 
          ephemeral: true 
        });
      }
    }
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    try {
      return await storage.checkRateLimit(userId, 10, 30000); // 10 commands per 30 seconds
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }

  private async handlePing(interaction: ChatInputCommandInteraction) {
    const ping = this.client.ws.ping;
    const uptime = process.uptime();
    
    await interaction.reply({
      content: `🏓 **Pong!**\n\n📡 **API Latency:** ${ping}ms\n⏱️ **Uptime:** ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s\n✅ **Status:** Online and operational`
    });
  }

  // Candy system command handlers
  private async handleCandyCommands(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'balance':
        await this.handleCandyBalance(interaction);
        break;
      case 'beg':
        await this.handleCandyBeg(interaction);
        break;
      case 'credit-card-scam':
        await this.handleCreditCardScam(interaction);
        break;
      case 'daily':
        await this.handleCandyDaily(interaction);
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

  private async handleCandyBalance(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;

    try {
      const balance = await storage.getCandyBalance(userId);
      
      await interaction.reply({
        content: `💰 **${targetUser.username}'s Balance**\n\n🍬 **Wallet:** ${balance.wallet} candies\n🏦 **Bank:** ${balance.bank} candies\n💎 **Total:** ${balance.wallet + balance.bank} candies`
      });
    } catch (error) {
      console.error('Error in candy balance command:', error);
      await interaction.reply({ content: 'Error retrieving balance.', ephemeral: true });
    }
  }

  private async handleCandyBeg(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    try {
      // Check cooldown (5 minutes)
      const lastBeg = await storage.getLastBegTime(userId);
      const now = Date.now();
      const cooldown = 5 * 60 * 1000; // 5 minutes

      if (lastBeg && now - lastBeg.getTime() < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastBeg.getTime())) / 1000 / 60);
        await interaction.reply({ 
          content: `⏰ You can beg again in ${remaining} minutes!`, 
          ephemeral: true 
        });
        return;
      }

      // Generate random amount (1-100 candies)
      const amount = Math.floor(Math.random() * 100) + 1;
      
      await storage.addCandy(userId, amount);
      await storage.updateLastBegTime(userId);

      const responses = [
        `A kind stranger gave you **${amount}** candies! 🍬`,
        `You found **${amount}** candies on the ground! 🍭`,
        `Someone felt sorry for you and gave **${amount}** candies! 😢`,
        `You begged successfully and received **${amount}** candies! 🙏`
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];
      await interaction.reply({ content: response });

    } catch (error) {
      console.error('Error in candy beg command:', error);
      await interaction.reply({ content: 'Error processing beg request.', ephemeral: true });
    }
  }

  private async handleCreditCardScam(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    try {
      // Check cooldown (1 hour)
      const lastScam = await storage.getLastScamTime(userId);
      const now = Date.now();
      const cooldown = 60 * 60 * 1000; // 1 hour

      if (lastScam && now - lastScam.getTime() < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastScam.getTime())) / 1000 / 60);
        await interaction.reply({ 
          content: `⏰ You need to wait ${remaining} minutes before attempting another scam!`, 
          ephemeral: true 
        });
        return;
      }

      // 30% success rate
      const success = Math.random() < 0.3;
      
      if (success) {
        const amount = Math.floor(Math.random() * 500) + 100; // 100-600 candies
        await storage.addCandy(userId, amount);
        await interaction.reply({ 
          content: `💳 **Success!** Your credit card scam worked and you gained **${amount}** candies! 💰\n\n*Note: This is just a game feature - never attempt real scams!*` 
        });
      } else {
        const lost = Math.floor(Math.random() * 200) + 50; // Lose 50-250 candies
        await storage.removeCandy(userId, lost);
        await interaction.reply({ 
          content: `🚨 **Busted!** Your scam failed and you lost **${lost}** candies! The authorities are onto you! 👮‍♂️` 
        });
      }

      await storage.updateLastScamTime(userId);

    } catch (error) {
      console.error('Error in credit card scam command:', error);
      await interaction.reply({ content: 'Error processing scam attempt.', ephemeral: true });
    }
  }

  private async handleCandyDaily(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    try {
      const lastDaily = await storage.getLastDailyTime(userId);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (lastDaily) {
        const lastDailyDate = new Date(lastDaily.getFullYear(), lastDaily.getMonth(), lastDaily.getDate());
        if (lastDailyDate.getTime() === today.getTime()) {
          await interaction.reply({ 
            content: '⏰ You have already claimed your daily reward today! Come back tomorrow.', 
            ephemeral: true 
          });
          return;
        }
      }

      const dailyAmount = 2000;
      await storage.addCandy(userId, dailyAmount);
      await storage.updateLastDailyTime(userId);

      await interaction.reply({ 
        content: `🎁 **Daily Reward Claimed!**\n\nYou received **${dailyAmount}** candies! 🍬\n\nCome back tomorrow for another daily reward!` 
      });

    } catch (error) {
      console.error('Error in candy daily command:', error);
      await interaction.reply({ content: 'Error processing daily reward.', ephemeral: true });
    }
  }

  private async handleCandyDeposit(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);
    const userId = interaction.user.id;

    if (amount <= 0) {
      await interaction.reply({ content: '❌ Amount must be positive!', ephemeral: true });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(userId);
      
      if (balance.wallet < amount) {
        await interaction.reply({ content: `❌ You don't have enough candies in your wallet. You have **${balance.wallet}** candies.`, ephemeral: true });
        return;
      }

      await storage.transferToBank(userId, amount);
      
      await interaction.reply({ 
        content: `🏦 Successfully deposited **${amount}** candies into your bank!` 
      });

    } catch (error) {
      console.error('Error in candy deposit command:', error);
      await interaction.reply({ content: 'Error processing deposit.', ephemeral: true });
    }
  }

  private async handleCandyGamble(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);
    const userId = interaction.user.id;

    if (amount <= 0) {
      await interaction.reply({ content: '❌ Amount must be positive!', ephemeral: true });
      return;
    }

    try {
      const balance = await storage.getCandyBalance(userId);
      
      if (balance.wallet < amount) {
        await interaction.reply({ content: `❌ You don't have enough candies. You have **${balance.wallet}** candies.`, ephemeral: true });
        return;
      }

      // 45% chance to win, 55% chance to lose
      const won = Math.random() < 0.45;
      
      if (won) {
        const winAmount = Math.floor(amount * (Math.random() * 0.5 + 0.5)); // Win 50-100% of bet
        await storage.addCandy(userId, winAmount);
        await interaction.reply({ 
          content: `🎰 **You won!** 🎉\n\nYou bet **${amount}** candies and won **${winAmount}** candies!` 
        });
      } else {
        await storage.removeCandy(userId, amount);
        await interaction.reply({ 
          content: `🎰 **You lost!** 😢\n\nYou bet **${amount}** candies and lost them all. Better luck next time!` 
        });
      }

    } catch (error) {
      console.error('Error in candy gamble command:', error);
      await interaction.reply({ content: 'Error processing gamble.', ephemeral: true });
    }
  }

  private async handleCandyLeaderboard(interaction: ChatInputCommandInteraction) {
    try {
      const leaderboard = await storage.getCandyLeaderboard(10);
      
      if (leaderboard.length === 0) {
        await interaction.reply({ content: 'No users found in the candy leaderboard.', ephemeral: true });
        return;
      }

      let leaderboardText = '🏆 **Candy Leaderboard - Top 10**\n\n';
      
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const position = i + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        leaderboardText += `${medal} **${user.username}** - ${user.totalCandies} candies\n`;
      }

      await interaction.reply({ content: leaderboardText });

    } catch (error) {
      console.error('Error in candy leaderboard command:', error);
      await interaction.reply({ content: 'Error retrieving leaderboard.', ephemeral: true });
    }
  }

  private async handleCandyPay(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const userId = interaction.user.id;
    
    if (targetUser.id === userId) {
      await interaction.reply({ content: '❌ You cannot pay yourself!', ephemeral: true });
      return;
    }
    
    if (amount <= 0) {
      await interaction.reply({ content: '❌ Amount must be positive!', ephemeral: true });
      return;
    }
    
    try {
      const userBalance = await storage.getCandyBalance(userId);
      
      if (userBalance.wallet < amount) {
        await interaction.reply({ content: `❌ You don't have enough candies. You have **${userBalance.wallet}** candies.`, ephemeral: true });
        return;
      }
      
      await storage.transferCandy(userId, targetUser.id, amount);
      
      await interaction.reply({ 
        content: `💸 Successfully transferred **${amount}** candies to ${targetUser.toString()}!` 
      });
      
    } catch (error) {
      console.error('Error in candy pay command:', error);
      await interaction.reply({ content: 'Error processing payment.', ephemeral: true });
    }
  }

  // Additional command handlers would continue here...
  // Due to length constraints, I'll implement the remaining handlers in the next section

  public async start(): Promise<void> {
    if (!DISCORD_TOKEN) {
      throw new Error('Discord token not found in environment variables');
    }

    try {
      await this.client.login(DISCORD_TOKEN);
      console.log('✅ Discord bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
      throw error;
    }
  }

  public isOnline(): boolean {
    return this.isReady;
  }

  private async syncServerData() {
    try {
      for (const guild of this.client.guilds.cache.values()) {
        await this.addServer(guild);
      }
    } catch (error) {
      console.error('Error syncing server data:', error);
    }
  }

  private async addServer(guild: any) {
    try {
      await storage.addServer({
        serverId: guild.id,
        serverName: guild.name,
        memberCount: guild.memberCount || 0,
        isActive: true
      });
    } catch (error) {
      console.error('Error adding server:', error);
    }
  }

  // Placeholder implementations for remaining command handlers
  private async handleAdd(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Add command implementation coming soon...', ephemeral: true });
  }

  private async handleKeyInfo(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'KeyInfo command implementation coming soon...', ephemeral: true });
  }

  private async handleUserInfo(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'UserInfo command implementation coming soon...', ephemeral: true });
  }

  private async handleHwidInfo(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'HwidInfo command implementation coming soon...', ephemeral: true });
  }

  private async handleTransfer(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Transfer command implementation coming soon...', ephemeral: true });
  }

  private async handleWhitelist(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Whitelist command implementation coming soon...', ephemeral: true });
  }

  private async handleGenerateKeyCommands(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Generate key commands implementation coming soon...', ephemeral: true });
  }

  private async handleEval(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Eval command implementation coming soon...', ephemeral: true });
  }

  private async handleBackup(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Backup command implementation coming soon...', ephemeral: true });
  }

  private async handleRestore(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Restore command implementation coming soon...', ephemeral: true });
  }

  private async handleSay(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Say command implementation coming soon...', ephemeral: true });
  }

  private async handleDM(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'DM command implementation coming soon...', ephemeral: true });
  }

  private async handlePurge(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Purge command implementation coming soon...', ephemeral: true });
  }

  private async handleTimeout(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Timeout command implementation coming soon...', ephemeral: true });
  }

  private async handleNickname(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Nickname command implementation coming soon...', ephemeral: true });
  }

  private async handleAnnounce(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Announce command implementation coming soon...', ephemeral: true });
  }

  private async handleSuggestionCreate(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Suggestion create command implementation coming soon...', ephemeral: true });
  }

  private async handleSuggestionApprove(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Suggestion approve command implementation coming soon...', ephemeral: true });
  }

  private async handleSuggestionDeny(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Suggestion deny command implementation coming soon...', ephemeral: true });
  }

  private async handleSuggestionList(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Suggestion list command implementation coming soon...', ephemeral: true });
  }

  private async handleAvatar(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Avatar command implementation coming soon...', ephemeral: true });
  }

  private async handleBugReport(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Bug report command implementation coming soon...', ephemeral: true });
  }

  private async handleBypass(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Bypass command implementation coming soon...', ephemeral: true });
  }

  private async handleHelp(interaction: ChatInputCommandInteraction) {
    const helpText = `🤖 **Raptor Bot Commands**

**License Management:**
\`/add\` - Add a new license key
\`/keyinfo\` - Get license key information
\`/transfer\` - Transfer a key to another user

**Candy System:**
\`/candy balance\` - Check candy balance
\`/candy beg\` - Beg for candies
\`/candy daily\` - Claim daily reward
\`/candy gamble\` - Gamble your candies
\`/candy pay\` - Pay candies to another user

**Administration:**
\`/ping\` - Check bot status
\`/stats\` - View statistics
\`/userinfo\` - Get user information
\`/whitelist\` - Manage whitelist

**Verification:**
\`/verify\` - Verify your Discord account

**Support Tags:**
Type any of these in chat: \`.sellsn\`, \`.uicrash\`, \`.user\`, \`.zsh\`, \`.anticheat\`, etc.

Use \`/help\` for this menu anytime!`;

    await interaction.reply({ content: helpText, ephemeral: true });
  }

  private async handleStats(interaction: ChatInputCommandInteraction) {
    try {
      const stats = await storage.getBotStats();
      
      const statsText = `📊 **Bot Statistics**

🗝️ **License Keys:** ${stats.totalKeys || 0}
👥 **Registered Users:** ${stats.totalUsers || 0}
🍬 **Total Candies:** ${stats.totalCandies || 0}
📋 **Commands Executed:** ${stats.totalCommands || 0}
🆙 **Uptime:** ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m
🏓 **Ping:** ${this.client.ws.ping}ms`;

      await interaction.reply({ content: statsText });
    } catch (error) {
      console.error('Error in stats command:', error);
      await interaction.reply({ content: 'Error retrieving statistics.', ephemeral: true });
    }
  }

  private async handleTest(interaction: ChatInputCommandInteraction) {
    const feature = interaction.options.getString('feature') || 'basic';
    
    await interaction.reply({ 
      content: `🧪 **Test Command**\n\nTesting feature: **${feature}**\n\nBot is operational and responding to commands!`,
      ephemeral: true 
    });
  }
}

export const raptorBot = new RaptorBot();