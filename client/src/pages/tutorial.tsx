import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Code, 
  Database, 
  Bot, 
  Shield, 
  Zap, 
  Users, 
  Settings,
  BookOpen,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Terminal,
  Server,
  Cpu
} from "lucide-react";
// Use the Roblox character image URL directly
const robloxCharacterImage = "/attached_assets/Screenshot 2025-06-18 at 12.03.30 PM_1750273413097.png";

// Animated background component
const AnimatedBackground = ({ background, particles, showRoblox }: { 
  background: string; 
  particles?: boolean; 
  showRoblox?: boolean; 
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20"
        style={{ background }}
      />
      
      {/* Matrix rain effect for coding sections */}
      {particles && (
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            >
              <div className="w-1 h-1 bg-green-400 rounded-full opacity-60" />
            </div>
          ))}
        </div>
      )}
      
      {/* Floating code elements */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-xs font-mono text-white animate-bounce"
            style={{
              left: `${Math.random() * 90}%`,
              top: `${Math.random() * 90}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            {['const', 'function', 'async', 'await', 'return', '{}', '[]', '=>'][i]}
          </div>
        ))}
      </div>
      
      {/* Roblox character for MacSploit sections */}
      {showRoblox && (
        <div className="absolute top-20 right-20 z-10 animate-bounce">
          <div className="relative">
            <img 
              src={robloxCharacterImage} 
              alt="Roblox Character" 
              className="w-40 h-40 object-cover rounded-xl border-4 border-yellow-400/50 shadow-2xl transform hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xs bg-black/50 px-2 py-1 rounded">
              MacSploit
            </div>
          </div>
        </div>
      )}
      
      {/* Geometric patterns */}
      <div className="absolute inset-0 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
};

export default function Tutorial() {
  const [currentCutscene, setCurrentCutscene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<number[]>([]);

  const cutscenes = [
    {
      id: 0,
      title: "Command Overview",
      icon: <Bot className="w-6 h-6" />,
      duration: 30,
      description: "How to use the Discord bot commands effectively",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Raptor Bot Commands - How Everything Works

## Getting Started
The bot has **60+ slash commands** that handle MacSploit license management. All commands work through Discord's slash command system - just type "/" in any channel where the bot has permissions.

## Basic Command Structure
Most commands follow this pattern:
\`\`\`
/command-name required-parameter optional-parameter
\`\`\`

## Key Features
- **Real-time database updates** - All changes are instantly saved
- **MacSploit API integration** - Commands generate actual working license keys  
- **Permission-based access** - Different roles can use different commands
- **Comprehensive logging** - All actions are tracked for security

## Command Categories
1. **License Key Generation** - Create keys for payments
2. **User Management** - Whitelist and manage users
3. **Verification System** - Link Discord to dashboard
4. **Moderation Tools** - Server administration
5. **Candy Economy** - Fun reward system
      `
    },
    {
      id: 1,
      title: "License Key Commands",
      icon: <Shield className="w-6 h-6" />,
      duration: 45,
      description: "How to generate and manage MacSploit license keys",
      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      particles: true,
      showRoblox: false,
      content: `
# License Key Generation Commands

## How Key Generation Works
The bot connects to MacSploit's API to create real working license keys. When you run a generate command, it:
1. **Validates your permissions** - Only authorized users can generate keys
2. **Calls MacSploit API** - Creates an actual license in their system
3. **Saves to database** - Records the transaction for tracking
4. **Sends to user** - DMs the key directly to the recipient

## Generate Key Commands
\`\`\`
/generatekey paypal user:@user note:"PayPal payment $20"
/generatekey bitcoin user:@user note:"BTC payment"
/generatekey robux user:@user note:"Robux trade"
/generatekey cashapp user:@user note:"CashApp $15"
\`\`\`

## Optional Features
Add these to any generate command:
- **early-access:yes** - Gives beta features access
- **booster:yes** - For Discord server boosters
- **monthly:yes** - Monthly subscription tier

## Example Usage
\`\`\`
/generatekey paypal user:@JohnDoe note:"PayPal $25" early-access:yes booster:yes
\`\`\`

This creates a key with early access and booster perks for a PayPal payment.
- **Activity Logging**: Every transaction recorded with payment IDs
- **Staff Attribution**: Commands track which staff member generated keys

### Candy Economy System (19 Commands)
\`\`\`typescript
/daily        // 2,000 candies every 24 hours
/balance      // Check candy balance
/deposit 1000 // Bank system with interest
/gamble 500   // 47% win rate with house edge
/leaderboard  // Top candy holders
\`\`\`

### Server Backup System
\`\`\`typescript
/backup create name:"Full Server Backup"
// Captures: Messages, Users, Roles, Channels, Emojis, 
//          Stickers, Invites, Webhooks, Audit logs, 
//          Voice states, Threads, Events, Icons
\`\`\`
      `
    },
    {
      id: 2,
      title: "User Management Commands",
      icon: <Users className="w-6 h-6" />,
      duration: 35,
      description: "How to manage users, whitelist, and verification",
      background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      particles: true,
      showRoblox: false,
      content: `
# User Management Commands

## Whitelist Commands
Control who can access MacSploit:
\`\`\`
/whitelist add user:@user     // Add user to MacSploit whitelist
/whitelist remove user:@user  // Remove user from whitelist
/whitelist check user:@user   // Check if user is whitelisted
\`\`\`

## User Information Commands
Get detailed user data:
\`\`\`
/userinfo user:@user    // Shows Discord profile, join date, roles
/hwidinfo user:@user    // Hardware ID and linked devices
/keyinfo key:ABC123     // License key details and status
\`\`\`

## Verification System
Link Discord accounts to dashboard:
\`\`\`
/verify    // Generates 6-character code for dashboard
\`\`\`

**How verification works:**
1. User runs `/verify` in Discord
2. Bot generates a unique 6-character code
3. User enters code in dashboard login
4. System links Discord account to web access

## Admin Commands
For server moderators:
\`\`\`
/dewhitelist key:ABC123    // Remove key from MacSploit system
/transfer from:@user to:@newuser key:ABC123    // Change key ownership
\`\`\`
      `
    },
    {
      id: 3,
      title: "Candy Economy & Fun Commands",
      icon: <Sparkles className="w-6 h-6" />,
      duration: 40,
      description: "Complete candy economy with games and banking",
      background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Candy Economy Commands

## Basic Candy Commands
The bot includes a fun candy economy system:
\`\`\`
/daily         // Get 2,000 candies every 24 hours
/balance       // Check your candy balance
/leaderboard   // See top candy holders
/pay @user 500 // Send candies to another user
\`\`\`

## Banking System
Store candies safely with interest:
\`\`\`
/deposit 1000   // Put candies in the bank
/withdraw 500   // Take candies out
/bank          // Check bank balance
\`\`\`

## Games & Activities
Earn candies through mini-games:
\`\`\`
/beg           // Random candy rewards (50-500 candies)
/scam          // Credit card scam game (35% success rate)
/gamble 1000   // Gambling with 47% win rate
\`\`\`

## How It Works
- **Daily Reset**: Get 2,000 candies every 24 hours
- **Banking Interest**: Earn extra candies over time
- **Risk vs Reward**: Gambling and scamming have failure chances
- **Leaderboards**: Compete with other users for top spots

This system keeps users engaged while providing entertainment value.

## Google OAuth Integration
\`\`\`typescript
// OAuth configuration with OpenID Connect
import { Strategy } from 'openid-client/passport';

const googleConfig = await client.discovery(
  new URL('https://accounts.google.com/.well-known/openid_configuration'),
  process.env.GOOGLE_CLIENT_ID
);

passport.use(new Strategy({
  config: googleConfig,
  scope: 'openid email profile',
  callbackURL: '/api/auth/google/callback'
}, verify));
\`\`\`

## Discord Verification System
\`\`\`typescript
// Generate 6-character verification codes
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Discord command implementation
{
  name: 'verify',
  description: 'Get verification code for dashboard access',
  async execute(interaction) {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    await storage.createVerificationSession({
      discordUserId: interaction.user.id,
      dashboardCode: code,
      expiresAt
    });
    
    await interaction.reply({
      content: \`Your verification code: **\${code}**\nValid for 30 minutes.\`,
      ephemeral: true
    });
  }
}
\`\`\`

## Security Features
- **Session-based Authentication**: Secure server-side sessions
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: 10 commands per 30 seconds per user
- **Permission Validation**: Role-based access control
- **Secure Cookies**: HttpOnly, Secure, SameSite protection
- **Password-Protected Installation**: Bot installation requires secure key

## Installation Security
1. **Bot Installation Key**: \`RaptorBot2025!SecureInstall#9847\`
2. **Owner Code Access**: \`RaptorOwner2025!CodeAccess#1337\`
3. **GitHub Integration**: Direct repository management for owners
      `
    },
    {
      id: 4,
      title: "MacSploit API Integration",
      icon: <Zap className="w-6 h-6" />,
      duration: 35,
      description: "Real-time license key generation with MacSploit whitelist API",
      background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      particles: true,
      showRoblox: true,
      content: `
# MacSploit API Integration - Production Implementation

## API Configuration
\`\`\`typescript
const MACSPLOIT_API = {
  endpoint: 'https://www.raptor.fun/api/whitelist',
  apiKey: process.env.RAPTOR_ADMIN_API_KEY, // Protected secret
  adminEndpoint: process.env.RAPTOR_DEWHITELIST_ENDPOINT
};
\`\`\`

## License Key Generation
\`\`\`typescript
async function generateMacSploitKey(params: {
  contact: string;
  payment_method: string;
  payment_note: string;
  staff_name: string;
  early_access?: boolean;
}) {
  const paymentId = \`\${params.payment_method.toUpperCase()}-\${Date.now()}-\${Math.random().toString(36).substring(2, 8)}\`;
  
  const response = await fetch(MACSPLOIT_API.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${MACSPLOIT_API.apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...params,
      payment_id: paymentId
    })
  });
  
  const data = await response.json();
  const licenseKey = data.responseData?.data?.new_key;
  
  // Store in database with full audit trail
  await storage.createDiscordKey({
    keyId: licenseKey,
    userId: params.contact,
    discordUsername: params.staff_name,
    status: 'active'
  });
  
  return { licenseKey, paymentId };
}
\`\`\`

## Supported Payment Methods
- **PayPal**: Instant key generation
- **Bitcoin/Ethereum/Litecoin**: Crypto payments
- **CashApp/Venmo**: Mobile payment apps
- **Robux**: Roblox virtual currency
- **Giftcard**: Various gift card types
- **Sellix**: E-commerce platform
- **Custom**: Manual payment processing

## Admin Dewhitelist System
\`\`\`typescript
// Real admin API for removing keys
async function dewhitelistKey(keyId: string) {
  const response = await fetch(MACSPLOIT_API.adminEndpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': \`Bearer \${MACSPLOIT_API.apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key: keyId })
  });
  
  if (response.ok) {
    await storage.revokeDiscordKey(keyId, 'admin_action');
    return true;
  }
  return false;
}
\`\`\`

## Feature Parameters
- **early_access**: Premium features access
- **server_booster**: Discord Nitro booster benefits
- **monthly**: Monthly subscription keys
      `
    },
    {
      id: 4,
      title: "Support & Moderation Commands", 
      icon: <Settings className="w-6 h-6" />,
      duration: 30,
      description: "MacSploit support tags and server moderation tools",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Support & Moderation Commands

## MacSploit Support Tags
The bot responds to support messages automatically:
\`\`\`
.hwid          // Hardware ID troubleshooting guide
.crash         // MacSploit crash fixes and solutions
.install       // Installation instructions for MacSploit
.scripts       // Script execution and debugging help
.paypal        // PayPal payment troubleshooting
.robux         // Robux payment issues and solutions
\`\`\`

## How Support Tags Work
When users type `.hwid` or `.crash` in chat, the bot automatically responds with detailed help information. No slash commands needed - just type the tag and get instant support.

## Moderation Commands
Server administration tools:
\`\`\`
/purge 10           // Delete last 10 messages
/timeout @user 1h   // Timeout user for 1 hour
/say Hello everyone // Bot sends a message
/dm @user message   // Send private message to user
/announce message   // Server-wide announcement
\`\`\`

## Backup & System Commands
Server management and data protection:
\`\`\`
/backup create name:"Full Backup"    // Complete server backup
/backup restore id:123              // Restore from backup
/ping                              // Check bot response time
/stats                            // System statistics
\`\`\`

These commands help maintain server order and provide technical support for MacSploit users.
      `
    },
    {
      id: 6,
      title: "Production Deployment",
      icon: <Settings className="w-6 h-6" />,
      duration: 25,
      description: "Complete deployment guide and system monitoring",
      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Production Deployment - Live System

## Current Status
✅ **Live Production System**: https://raptor-bot.replit.app/
✅ **Discord Bot Active**: All 60+ commands operational
✅ **Database Connected**: PostgreSQL with full schema
✅ **API Integration**: MacSploit whitelist API working
✅ **Authentication**: Google OAuth + Discord verification

## System Architecture
\`\`\`
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Express Server  │◄──►│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │  Discord Bot    │              │
         │              │  (60+ Commands) │              │
         │              └────────┬────────┘              │
         │                       │                       │
         └───────────────────────▼───────────────────────┘
                     MacSploit API Integration
\`\`\`

## Environment Configuration
\`\`\`bash
# Required Environment Variables
DATABASE_URL=postgresql://...
DISCORD_CLIENT_ID=1382224347892027412
DISCORD_CLIENT_SECRET=***
DISCORD_TOKEN=***
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
RAPTOR_ADMIN_API_KEY=85f9e513-8030-4e88-a04d-042e62e0f707
RAPTOR_DEWHITELIST_ENDPOINT=***
SESSION_SECRET=***
\`\`\`

## Monitoring & Logging
- **Activity Logs**: All user actions tracked
- **Command Logs**: Discord bot usage statistics
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time monitoring
- **Backup Integrity**: Automated backup validation

## Security Measures
- **HTTPS Only**: SSL/TLS encryption
- **CORS Protection**: Cross-origin request filtering
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Comprehensive data sanitization
- **Secret Management**: Environment variable protection

## Maintenance
- **Automated Backups**: Daily database backups
- **Health Checks**: System status monitoring
- **Log Rotation**: Automatic log management
- **Performance Optimization**: Query optimization and caching
      `
    }
  ];

  const currentSection = cutscenes[currentCutscene];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / currentSection.duration);
          if (newProgress >= 100) {
            setIsPlaying(false);
            if (!completedSections.includes(currentCutscene)) {
              setCompletedSections([...completedSections, currentCutscene]);
            }
            return 100;
          }
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentSection.duration, currentCutscene, completedSections]);

  const handlePlay = () => {
    if (progress >= 100) {
      setProgress(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleSkip = () => {
    setProgress(100);
    setIsPlaying(false);
    if (!completedSections.includes(currentCutscene)) {
      setCompletedSections([...completedSections, currentCutscene]);
    }
  };

  const handleNextSection = () => {
    if (currentCutscene < cutscenes.length - 1) {
      setCurrentCutscene(currentCutscene + 1);
      setProgress(0);
      setIsPlaying(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Raptor Bot Complete Tutorial
        </h1>
        <p className="text-lg text-muted-foreground">
          Interactive tutorial showing how everything was built and how all systems work together
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Tutorial Progress
          </CardTitle>
          <CardDescription>
            {completedSections.length} of {cutscenes.length} sections completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {cutscenes.map((section, index) => (
              <Badge
                key={section.id}
                variant={completedSections.includes(index) ? "default" : "secondary"}
                className={`cursor-pointer transition-all ${
                  currentCutscene === index ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => {
                  setCurrentCutscene(index);
                  setProgress(0);
                  setIsPlaying(false);
                }}
              >
                {completedSections.includes(index) && (
                  <CheckCircle className="w-3 h-3 mr-1" />
                )}
                {section.icon}
                <span className="ml-1">{section.title}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tutorial Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tutorial Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tutorial Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cutscenes.map((section, index) => (
              <Button
                key={section.id}
                variant={currentCutscene === index ? "default" : "ghost"}
                className="w-full justify-start text-left"
                onClick={() => {
                  setCurrentCutscene(index);
                  setProgress(0);
                  setIsPlaying(false);
                }}
              >
                <div className="flex items-center gap-3">
                  {completedSections.includes(index) ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    section.icon
                  )}
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {section.duration}s • {section.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Tutorial Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentSection.icon}
                  {currentSection.title}
                </CardTitle>
                <CardDescription>{currentSection.description}</CardDescription>
              </div>
              <Badge variant="outline">{currentSection.duration}s</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Video Controls */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  size="sm"
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleSkip}>
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                <div className="text-sm text-muted-foreground">
                  {Math.round(progress)}% complete
                </div>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Tutorial Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {currentSection.content}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <Button
                variant="outline"
                disabled={currentCutscene === 0}
                onClick={() => {
                  setCurrentCutscene(currentCutscene - 1);
                  setProgress(0);
                  setIsPlaying(false);
                }}
              >
                Previous Section
              </Button>
              
              <Button
                disabled={currentCutscene === cutscenes.length - 1}
                onClick={handleNextSection}
              >
                Next Section
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Go to Dashboard Button */}
      <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <ChevronRight className="w-5 h-5" />
            Ready to Use the Dashboard?
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Access the main dashboard to manage your Discord bot, view statistics, and control all system features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <ChevronRight className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>

      {/* Tutorial Completion */}
      {completedSections.length === cutscenes.length && (
        <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Tutorial Complete!
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              You've completed the full Raptor Bot tutorial. You now understand how the entire system works!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700 dark:text-green-300">
              <p className="mb-2">What you've learned:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Complete system architecture and technology stack</li>
                <li>60+ Discord bot commands with database integration</li>
                <li>PostgreSQL schema design and optimization</li>
                <li>Multi-layer authentication with Google and Discord OAuth</li>
                <li>MacSploit API integration for license key generation</li>
                <li>React dashboard with real-time data and responsive design</li>
                <li>Production deployment and monitoring</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}