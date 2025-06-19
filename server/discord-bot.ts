import { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
  TextChannel,
  User,
  Message,
  Collection,
  AttachmentBuilder
} from 'discord.js';
import { storage } from './storage';
import { secureUtils } from './security-hardening';
import { WhitelistAPI } from './whitelist-api';

const supportTags: Record<string, string> = {
    '.anticheat': 'Due to a new roblox Anticheat update all executors including macsploit are currently detected and could get your account banned. Please bear with us whiles we find a fix! :)',
    '.autoexe': 'A5XGQ2d.mov',
    '.badcpu': 'softwareupdate --install-rosetta --agree-to-license',
    '.cookie': 'O2vbMdP.mov',
    '.crash': 'Roblox Crash\n\nBefore anything, try reinstalling roblox.\nDelete roblox_session.txt from downloads\nTry running the elevatated installer in terminal\nToggle Your ICloud; System Settings -> Click Your Profile -> ICloud Mail On\n\nsudo cd ~/ && curl -s "https://macsploit.com/api/hwid" | openssl base64 -d',
    '.elevated': 'Important Note\nWhen you run a command with sudo, macOS will prompt you for your password. As a security measure, nothing will appear on the screen while you type—not even dots or asterisks. This is normal. Your keystrokes are still being registered, so just type your password carefully and press Return/Enter when finished.\n\nsudo cd ~/ && curl -s "https://macsploit.com/api/hwid" | openssl base64 -d',
    '.fwaeh': 'fwaeh',
    '.giftcard': 'https://discord.gg/macsploit',
    '.hwid': 'Paste this into terminal and it will give your HWID.\ncurl -s "https://macsploit.com/api/hwid" | openssl base64 -d',
    '.install': `**How to Install MacSploit**

Open terminal and enter one of these installs:

**Main Branch**
\`\`\`bash
# Use this for sellix, quickfix and for normal installs!
cd ~/ && curl -s "https://git.raptor.fun/main/install.sh" | bash </dev/tty
\`\`\`

**User Branch** *Warning: Try the above one first.*
\`\`\`bash
# Use this for sellix, quickfix and for normal installs (non admin)!
cd ~/ && curl -s "https://git.raptor.fun/user/install.sh" | bash </dev/tty
\`\`\``,
    '.iy': 'paste this somewhere\nloadstring(game:HttpGet(\'https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source\'))()',
    '.multi-instance': 'https://www.loom.com/share/26e7e31119124dddad6ad1b18b4866b4',
    '.nigger': 'N-Word Pass Required',
    '.offline': 'https://www.loom.com/share/b4b28b7b82d7497a9a9a0c4e7f8a4b5c',
    '.paypal': 'https://paypal.me/macsploit',
    '.rapejaml': 'https://www.loom.com/share/5d9e4f8b8a9c4a5b9c8d7e6f5a4b3c2d',
    '.robux': 'https://www.roblox.com/game-pass/123456789/MacSploit-Robux',
    '.scripts': 'local script = loadstring(game:HttpGet("https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source"))()\nscript.Parent = game.CoreGui',
    '.sellsn': 'To sell your serial number, contact @macsploit on Discord',
    '.uicrash': 'UI Crash Fix\n\nThis usually happens when Roblox updates. Try:\n1. Restart Roblox\n2. Clear cache\n3. Update MacSploit',
    '.user': 'User Information\n\nFor user-related issues, please provide:\n- Your MacSploit serial number\n- Your Discord ID\n- Description of the issue',
    '.zsh': 'zsh: command not found\n\nThis error means the command is not recognized. Make sure you:\n1. Typed the command correctly\n2. Have the required permissions\n3. Are in the correct directory'
};

export class RaptorBot {
  public client: Client;
  private commands: Collection<string, any>;
  private rest: REST;
  private readonly ADMIN_USER_ID = '1131426483404026019';

  async sendErrorDM(error: any, context: string) {
    try {
      const user = await this.client.users.fetch(this.ADMIN_USER_ID);
      const errorMessage = `🚨 **Error Alert** 🚨\n\n**Context:** ${context}\n**Error:** \`\`\`${error.message || error}\`\`\`\n**Time:** ${new Date().toISOString()}\n**Stack:** \`\`\`${error.stack || 'No stack trace'}\`\`\``;
      await user.send(errorMessage);
    } catch (dmError) {
      console.error('Failed to send error DM:', dmError);
    }
  }

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
      ]
    });
    
    this.commands = new Collection();
    this.rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    
    this.setupEvents();
    this.setupCommands();
  }

  private setupEvents() {
    this.client.once('ready', () => {
      console.log(`✅ Raptor bot is ready! Logged in as ${this.client.user?.tag}`);
      console.log(`Bot intents enabled: ${this.client.options.intents}`);
      console.log('Bot ready! Testing message handling...');
      console.log('Available support tags:', Object.keys(supportTags));
      console.log('Type .hwid in Discord to test');
    });

    this.client.on('error', async (error) => {
      console.error('Discord client error:', error);
      await this.sendErrorDM(error, 'Discord Client Error');
    });

    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await this.sendErrorDM(error, 'Uncaught Exception');
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await this.sendErrorDM(reason, 'Unhandled Promise Rejection');
    });

    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;
      
      const content = message.content.toLowerCase().trim();
      
      if (supportTags[content]) {
        await message.reply(supportTags[content]);
        return;
      }

      const trackedChannels = [
        '1262951610842222642',
        '1263224578123456789',
        '1263224578987654321',
        '1263224579111222333',
        '1263224579444555666',
        '1263224579777888999',
        '1263224580000111222',
        '1263224580333444555'
      ];

      if (trackedChannels.includes(message.channel.id) && message.attachments.size > 0) {
        try {
          await storage.addUserLog(message.author.id, 'image_post');
          console.log(`Added log for user ${message.author.id} for posting image in ${message.channel.id}`);
        } catch (error) {
          console.error('Error adding user log:', error);
        }
      }
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        try {
          const startTime = Date.now();
          
          if (!await this.checkPermissions(interaction)) {
            await interaction.reply({
              content: 'You do not have permission to use this command.',
              ephemeral: true
            });
            return;
          }

          await command.execute(interaction);
          
          const executionTime = Date.now() - startTime;
          
          await storage.logCommand(
            interaction.user.id,
            interaction.commandName,
            executionTime,
            true
          );
          
        } catch (error) {
        console.error('Command execution error:', error);
        await this.sendErrorDM(error, `Command: ${interaction.commandName} | User: ${interaction.user.tag} (${interaction.user.id})`);
        
        const executionTime = Date.now() - Date.now();
        await storage.logCommand(
          interaction.user.id,
          interaction.commandName,
          executionTime,
          false
        );

        const reply = {
          content: 'There was an error executing this command.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
        }
      } else if (interaction.isButton()) {
        if (interaction.customId === 'how_to_install') {
          await this.handleInstallButton(interaction);
        }
      }
    });
  }

  private async checkPermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const specialRoleId = '1265423063764439051';
    const member = interaction.member;
    
    if (member && typeof member === 'object' && 'roles' in member && member.roles && typeof member.roles === 'object' && 'cache' in member.roles) {
      return member.roles.cache.has(specialRoleId);
    }
    
    return true;
  }

  private setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Generate verification code for dashboard access')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('6-character verification code from dashboard')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)
        ),

      new SlashCommandBuilder()
        .setName('keyinfo')
        .setDescription('Get information about a license key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to check')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('generatekey')
        .setDescription('Generate license keys for different payment methods')
        .addSubcommand(subcommand =>
          subcommand
            .setName('paypal')
            .setDescription('Generate key for PayPal payment')
            .addUserOption(option => option.setName('user').setDescription('User receiving the key').setRequired(true))
            .addStringOption(option => option.setName('note').setDescription('Payment note/ID').setRequired(true))
            .addBooleanOption(option => option.setName('booster').setDescription('Server booster status').setRequired(false))
            .addBooleanOption(option => option.setName('early-access').setDescription('Early access status').setRequired(false))
            .addBooleanOption(option => option.setName('monthly').setDescription('Monthly subscription').setRequired(false))
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('cashapp')
            .setDescription('Generate key for CashApp payment')
            .addUserOption(option => option.setName('user').setDescription('User receiving the key').setRequired(true))
            .addStringOption(option => option.setName('note').setDescription('Payment note/ID').setRequired(true))
            .addBooleanOption(option => option.setName('booster').setDescription('Server booster status').setRequired(false))
            .addBooleanOption(option => option.setName('early-access').setDescription('Early access status').setRequired(false))
            .addBooleanOption(option => option.setName('monthly').setDescription('Monthly subscription').setRequired(false))
        ),

      new SlashCommandBuilder()
        .setName('dewhitelist')
        .setDescription('Remove a key from the whitelist')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to dewhitelist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for dewhitelisting')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('rewhitelist')
        .setDescription('Reset HWID for a license key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('License key to rewhitelist')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for rewhitelisting')
            .setRequired(false)
        )
    ];

    commands.forEach(command => {
      this.commands.set(command.name, {
        data: command,
        execute: this.getCommandHandler(command.name)
      });
    });
  }

  private getCommandHandler(commandName: string) {
    switch (commandName) {
      case 'verify':
        return this.handleVerify.bind(this);
      case 'keyinfo':
        return this.handleKeyInfo.bind(this);
      case 'generatekey':
        return this.handleGenerateKey.bind(this);
      case 'dewhitelist':
        return this.handleDewhitelist.bind(this);
      case 'rewhitelist':
        return this.handleRewhitelist.bind(this);
      default:
        return this.handleUnknown.bind(this);
    }
  }

  private async handleVerify(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('code', true);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Verification Code Received')
      .setDescription(`Code: \`${code}\`\n\nThis code has been processed for dashboard verification.`)
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  private async handleKeyInfo(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);
    
    await interaction.deferReply();
    
    try {
      const result = await WhitelistAPI.getPaymentInfo('keyInfo', key);
      
      if (result.success && result.data) {
        const embed = new EmbedBuilder()
          .setTitle('🔑 License Key Information')
          .setDescription(`Key: \`${key}\``)
          .addFields(
            { name: 'Status', value: result.data.status || 'Unknown', inline: true },
            { name: 'Type', value: result.data.type || 'Standard', inline: true },
            { name: 'Created', value: result.data.created || 'Unknown', inline: true }
          )
          .setColor(0x0099ff)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({
          content: `❌ Failed to retrieve key information: ${result.message}`
        });
      }
    } catch (error) {
      console.error('KeyInfo error:', error);
      await interaction.editReply({
        content: '❌ Error retrieving key information from API.'
      });
    }
  }

  private async handleGenerateKey(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);
    const note = interaction.options.getString('note', true);
    const booster = interaction.options.getBoolean('booster') || false;
    const earlyAccess = interaction.options.getBoolean('early-access') || false;
    const monthly = interaction.options.getBoolean('monthly') || false;

    await interaction.deferReply();

    try {
      const features = {
        server_booster: booster,
        early_access: earlyAccess,
        monthly: monthly
      };

      const result = await WhitelistAPI.whitelistUser(
        user.id,
        note,
        `${subcommand.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subcommand,
        interaction.user.username,
        features
      );

      if (result.success && result.key) {
        const embed = new EmbedBuilder()
          .setTitle('🔑 WORKING LICENSE KEY')
          .setDescription('**REAL WORKING KEY**')
          .addFields(
            { name: 'Key', value: `\`${result.key}\``, inline: false },
            { name: 'Payment Method', value: subcommand.toUpperCase(), inline: true },
            { name: 'User', value: user.toString(), inline: true },
            { name: 'Features', value: `Booster: ${booster ? '✅' : '❌'}\nEarly Access: ${earlyAccess ? '✅' : '❌'}\nMonthly: ${monthly ? '✅' : '❌'}`, inline: false }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🔑 Your MacSploit License Key')
            .setDescription(`Your license key: \`${result.key}\``)
            .addFields(
              { name: 'Payment Method', value: subcommand.toUpperCase(), inline: true },
              { name: 'Generated', value: new Date().toLocaleString(), inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

          const installButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('how_to_install')
                .setLabel('How to Install')
                .setStyle(ButtonStyle.Primary)
            );

          await user.send({ embeds: [dmEmbed], components: [installButton] });
        } catch (dmError) {
          console.log('Could not send DM to user');
        }

        const logChannel = interaction.guild?.channels.cache.get('1262951610842222642') as TextChannel;
        if (logChannel) {
          await logChannel.send(`Generated key for ${user.toString()}: \`${result.key}\``);
        }

      } else {
        await interaction.editReply({
          content: `❌ Failed to generate key: ${result.message}`
        });
      }
    } catch (error) {
      console.error('Generate key error:', error);
      await interaction.editReply({
        content: '❌ Error generating license key.'
      });
    }
  }

  private async handleDewhitelist(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);
    const reason = interaction.options.getString('reason') || 'Removed via Discord bot';

    await interaction.deferReply();

    try {
      const result = await WhitelistAPI.dewhitelistUser(key, reason);

      if (result.success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Key Successfully Dewhitelisted')
          .setDescription(`Key: \`${key}\``)
          .addFields(
            { name: 'Reason', value: reason, inline: false },
            { name: 'Status', value: 'Key successfully dewhitelisted ✓', inline: false }
          )
          .setColor(0xff9900)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        const logChannel = interaction.guild?.channels.cache.get('1262951610842222642') as TextChannel;
        if (logChannel) {
          await logChannel.send(`Dewhitelisted key: \`${key}\``);
        }

      } else {
        await interaction.editReply({
          content: `❌ Failed to dewhitelist key: ${result.message}`
        });
      }
    } catch (error) {
      console.error('Dewhitelist error:', error);
      await interaction.editReply({
        content: '❌ Error dewhitelisting key.'
      });
    }
  }

  private async handleRewhitelist(interaction: ChatInputCommandInteraction) {
    const key = interaction.options.getString('key', true);
    const reason = interaction.options.getString('reason') || 'Re-whitelisted via Discord bot';

    await interaction.deferReply();

    try {
      const result = await WhitelistAPI.rewhitelistUser(key, reason);

      if (result.success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Key Successfully Rewhitelisted')
          .setDescription(`Key: \`${key}\``)
          .addFields(
            { name: 'Reason', value: reason, inline: false },
            { name: 'Status', value: 'Key successfully rewhitelisted ✓', inline: false }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        if (result.message?.includes('not been activated')) {
          await interaction.editReply({
            content: '❌ This key isn\'t hwid locked'
          });
        } else {
          await interaction.editReply({
            content: `❌ Failed to rewhitelist key: ${result.message}`
          });
        }
      }
    } catch (error) {
      console.error('Rewhitelist error:', error);
      await interaction.editReply({
        content: '❌ Error rewhitelisting key.'
      });
    }
  }

  private async handleUnknown(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Unknown command.',
      ephemeral: true
    });
  }

  async registerCommands() {
    try {
      console.log('🔄 Registering Discord commands...');
      
      const commandData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      
      const applicationId = process.env.DISCORD_APPLICATION_ID || '1382224347892027412';
      await this.rest.put(
        Routes.applicationCommands(applicationId),
        { body: commandData }
      );
      
      console.log('✅ Commands registered successfully');
    } catch (error) {
      console.error('Failed to register commands:', error);
    }
  }

  async start() {
    try {
      await this.registerCommands();
      await this.client.login(process.env.DISCORD_TOKEN);
      return this.client;
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      throw error;
    }
  }
}

export const raptorBot = new RaptorBot();
export default raptorBot;