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
        <div className="absolute bottom-4 right-4 opacity-30">
          <img 
            src={robloxCharacterImage} 
            alt="Roblox Character" 
            className="w-32 h-32 object-contain animate-pulse"
          />
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
      title: "Project Overview",
      icon: <Sparkles className="w-6 h-6" />,
      duration: 30,
      description: "Complete overview of the Raptor Bot Dashboard system",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Raptor Bot Dashboard - Complete System Architecture

## What We Built
A sophisticated Discord bot management system for MacSploit (Roblox executor) with:
- **60+ Discord slash commands** with real database operations
- **Google OAuth authentication** for web dashboard access
- **Discord verification system** for bot interactions
- **License key management** with MacSploit API integration
- **Payment processing** for Bitcoin, Ethereum, PayPal, CashApp, Venmo, Robux
- **HWID tracking** and hardware validation
- **Comprehensive backup system** capturing entire Discord servers
- **Activity logging** for complete audit trails

## Technology Stack
- **Frontend**: React + TypeScript + Shadcn UI + Tailwind CSS
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL with advanced schemas
- **Bot Framework**: Discord.js v14 with slash commands
- **Authentication**: Google OAuth + Discord OAuth
- **APIs**: MacSploit whitelist API integration
      `
    },
    {
      id: 1,
      title: "Discord Bot Commands",
      icon: <Bot className="w-6 h-6" />,
      duration: 45,
      description: "60+ production-ready Discord commands with database integration",
      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Discord Bot Commands - Complete Implementation

## Command Categories (60+ Total)

### License Key Management
\`\`\`typescript
// Generate key commands with real MacSploit API
/generatekey paypal user:@user note:"Payment note" early-access:yes
/generatekey bitcoin user:@user note:"BTC payment" booster:yes
/generatekey robux user:@user note:"Robux payment" monthly:yes

// API Integration Example
const response = await fetch('https://www.raptor.fun/api/whitelist', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 85f9e513-8030-4e88-a04d-042e62e0f707',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact: interaction.user.id,
    payment_method: paymentMethod,
    payment_note: note,
    staff_name: interaction.user.username,
    early_access: earlyAccess
  })
});
\`\`\`

### User Administration
\`\`\`typescript
/whitelist add user:@user   // Add to MacSploit whitelist
/whitelist remove user:@user // Remove from whitelist
/userinfo user:@user        // Complete user profile
/hwidinfo user:@user        // Hardware ID information
\`\`\`

### Payment System Integration
- **10 Payment Methods**: PayPal, CashApp, Robux, Bitcoin, Ethereum, Litecoin, Venmo, Giftcard, Sellix, Custom
- **Real API Calls**: Generates working MacSploit license keys
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
      title: "Database Architecture",
      icon: <Database className="w-6 h-6" />,
      duration: 35,
      description: "PostgreSQL schema with Drizzle ORM and comprehensive data management",
      background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Database Architecture - Production Schema

## Core Tables

### Users & Authentication
\`\`\`sql
-- Google OAuth users for dashboard access
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Discord bot users with candy system
CREATE TABLE discord_users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR UNIQUE NOT NULL,
  username VARCHAR NOT NULL,
  candy_balance INTEGER DEFAULT 0,
  candy_bank INTEGER DEFAULT 0,
  last_daily TIMESTAMP,
  is_whitelisted BOOLEAN DEFAULT FALSE
);
\`\`\`

### License Key Management
\`\`\`sql
CREATE TABLE discord_keys (
  id SERIAL PRIMARY KEY,
  key_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  discord_username VARCHAR,
  hwid VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by VARCHAR
);
\`\`\`

### Activity Logging
\`\`\`sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR,
  action VARCHAR NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR,
  user_agent VARCHAR
);
\`\`\`

## Advanced Features
- **JSONB Storage**: Flexible metadata and configuration storage
- **Indexed Queries**: Optimized for Discord user lookups
- **Audit Trails**: Complete history of all system operations
- **Session Management**: Secure user session storage
- **Backup Integrity**: SHA-256 checksums for backup validation
      `
    },
    {
      id: 3,
      title: "Authentication System",
      icon: <Shield className="w-6 h-6" />,
      duration: 40,
      description: "Dual OAuth system with Google and Discord integration",
      background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)",
      particles: true,
      showRoblox: false,
      content: `
# Authentication System - Multi-Layer Security

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
      id: 5,
      title: "Web Dashboard",
      icon: <Users className="w-6 h-6" />,
      duration: 30,
      description: "React-based dashboard with real-time data and responsive design",
      content: `
# Web Dashboard - Professional Interface

## Dashboard Features
\`\`\`tsx
// Main dashboard with real-time stats
function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 30000 // Real-time updates
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard 
        title="Total Users" 
        value={stats?.totalUsers} 
        icon={<Users />} 
      />
      <StatsCard 
        title="Active Keys" 
        value={stats?.activeKeys} 
        icon={<Shield />} 
      />
      <StatsCard 
        title="Daily Revenue" 
        value={stats?.dailyRevenue} 
        icon={<Zap />} 
      />
      <StatsCard 
        title="Server Uptime" 
        value={stats?.uptime} 
        icon={<Settings />} 
      />
    </div>
  );
}
\`\`\`

## Pages & Navigation
- **Dashboard**: Real-time system statistics
- **Key Management**: License key administration
- **User Management**: Discord user profiles
- **Activity Logs**: Complete audit trails
- **Backup Management**: Server backup controls
- **Bot Settings**: Discord bot configuration
- **Admin Panel**: Owner-only administrative tools

## Authentication Flow
\`\`\`tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginPage />;
  
  return <>{children}</>;
}
\`\`\`

## UI Components
- **Shadcn UI**: Professional component library
- **Dark/Light Theme**: System preference detection
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: WebSocket integration for live data
- **Toast Notifications**: User feedback system
- **Form Validation**: Zod schema validation
- **Data Tables**: Sortable, filterable tables with pagination

## Security Implementation
- **Protected Routes**: Authentication required
- **CSRF Tokens**: Request validation
- **Input Sanitization**: XSS prevention
- **Rate Limiting**: API abuse prevention
      `
    },
    {
      id: 6,
      title: "Production Deployment",
      icon: <Settings className="w-6 h-6" />,
      duration: 25,
      description: "Complete deployment guide and system monitoring",
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