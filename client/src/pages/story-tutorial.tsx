import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

// Create the bot logo as SVG since we can't import the image directly
const BotLogo = () => (
  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
    <div className="text-6xl">⚡</div>
  </div>
);

export default function StoryTutorial() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const sections = [
    {
      id: 0,
      content: (
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
          <BotLogo />
          <h1 className="text-6xl font-bold text-white mb-4 mt-8">Bot</h1>
          <h2 className="text-4xl font-bold text-gray-300">How we did it</h2>
          <div className="mt-12 text-gray-400 animate-bounce">
            <p>Scroll down</p>
            <ChevronRight className="w-6 h-6 mx-auto mt-2 rotate-90" />
          </div>
        </div>
      )
    },
    {
      id: 1,
      content: (
        <div className="min-h-screen flex items-center justify-start px-16">
          <div className="max-w-2xl">
            <blockquote className="text-5xl font-bold text-white leading-relaxed">
              "They said it was impossible"
            </blockquote>
            <cite className="text-2xl text-gray-400 mt-4 block">-Nexus40</cite>
          </div>
        </div>
      )
    },
    {
      id: 2,
      content: (
        <div className="min-h-screen flex items-center justify-end px-16">
          <div className="max-w-2xl text-right">
            <blockquote className="text-5xl font-bold text-white leading-relaxed">
              "They said I couldn't do it"
            </blockquote>
            <cite className="text-2xl text-gray-400 mt-4 block">-Nexus41</cite>
          </div>
        </div>
      )
    },
    {
      id: 3,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <blockquote className="text-6xl font-bold text-white leading-relaxed">
              "But I proved them all wrong."
            </blockquote>
            <cite className="text-3xl text-gray-400 mt-6 block">-Nexus42</cite>
          </div>
        </div>
      )
    },
    {
      id: 4,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-8">Here's how I did it.</h2>
          </div>
        </div>
      )
    },
    {
      id: 5,
      content: (
        <div className="min-h-screen flex items-center justify-center px-8 py-16">
          <div className="max-w-7xl">
            <h3 className="text-5xl font-bold text-white mb-16 text-center">The Development Process</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <Card className="bg-gray-900 border-gray-700 hover:border-purple-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-purple-400 mb-3">Foundation & Planning</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Started with Discord.js v14 framework and TypeScript for type safety. Designed the architecture around MacSploit's licensing needs.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Project structure planning</li>
                    <li>• Discord application setup</li>
                    <li>• OAuth flow design</li>
                    <li>• Database schema planning</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700 hover:border-blue-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-blue-400 mb-3">Discord Bot Core</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Built 60+ slash commands with advanced permission systems, rate limiting, and comprehensive error handling.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Slash command registration</li>
                    <li>• Permission-based access</li>
                    <li>• Rate limiting implementation</li>
                    <li>• Command logging system</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700 hover:border-green-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-green-400 mb-3">Database Architecture</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    PostgreSQL with Drizzle ORM, featuring users, license keys, activity logs, verification sessions, and candy economy.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• User management tables</li>
                    <li>• License key tracking</li>
                    <li>• Activity audit logs</li>
                    <li>• Session management</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700 hover:border-yellow-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-yellow-400 mb-3">MacSploit API Integration</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Real API integration for license key generation, whitelist management, and payment processing across 10 payment methods.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• License key generation</li>
                    <li>• Whitelist API calls</li>
                    <li>• Payment method validation</li>
                    <li>• Admin dewhitelist operations</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700 hover:border-red-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-red-400 mb-3">Authentication System</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Dual OAuth with Google and Discord, secure session management, and role-based access control for different user levels.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Google OAuth integration</li>
                    <li>• Discord verification system</li>
                    <li>• Session management</li>
                    <li>• Role-based permissions</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700 hover:border-cyan-500 transition-colors">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-cyan-400 mb-3">Frontend Dashboard</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    React-based dashboard with Shadcn UI, real-time data updates, responsive design, and comprehensive admin controls.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• React + TypeScript</li>
                    <li>• Shadcn UI components</li>
                    <li>• Real-time data updates</li>
                    <li>• Responsive design</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      content: (
        <div className="min-h-screen flex items-center justify-center px-8 py-16">
          <div className="max-w-6xl">
            <h3 className="text-4xl font-bold text-white mb-12 text-center">Advanced Features Built</h3>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-purple-400 mb-4">Candy Economy System</h4>
                    <p className="text-gray-300 mb-4">
                      Complete virtual economy with banking, gambling, daily rewards, and transfer systems.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>• Daily rewards (2,000 candies every 24 hours)</p>
                      <p>• Banking system with deposit/withdrawal</p>
                      <p>• Gambling with realistic odds (47% win rate)</p>
                      <p>• Credit card scam mini-game (35% success)</p>
                      <p>• Leaderboards and balance tracking</p>
                      <p>• Anti-cheat cooldown systems</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-blue-400 mb-4">License Key Management</h4>
                    <p className="text-gray-300 mb-4">
                      Comprehensive system for creating, validating, and managing MacSploit license keys.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>• Generate keys for 10 payment methods</p>
                      <p>• Real-time validation and status tracking</p>
                      <p>• HWID linking and management</p>
                      <p>• Key transfer and ownership changes</p>
                      <p>• Automatic expiration handling</p>
                      <p>• Admin revocation capabilities</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-green-400 mb-4">Server Management Tools</h4>
                    <p className="text-gray-300 mb-4">
                      Complete Discord server administration with backups, moderation, and monitoring.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>• Full server backup and restore</p>
                      <p>• Message purging and moderation</p>
                      <p>• User timeout and ban management</p>
                      <p>• Server announcements system</p>
                      <p>• Activity monitoring and logs</p>
                      <p>• Integrity checking for backups</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-yellow-400 mb-4">MacSploit Support System</h4>
                    <p className="text-gray-300 mb-4">
                      Intelligent support tag system with 22+ predefined responses for common issues.
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>• Automatic script detection (.scripts)</p>
                      <p>• Hardware troubleshooting (.hwid)</p>
                      <p>• Installation guides (.install)</p>
                      <p>• Crash fix solutions (.crash)</p>
                      <p>• Payment support (.paypal, .robux)</p>
                      <p>• Smart language detection for code</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 7,
      content: (
        <div className="min-h-screen flex items-center justify-center px-8 py-16">
          <div className="max-w-6xl">
            <h3 className="text-4xl font-bold text-white mb-12 text-center">How to Use the Bot</h3>
            <div className="space-y-8">
              
              <Card className="bg-gradient-to-r from-purple-900 to-blue-900 border-purple-700">
                <CardContent className="p-8">
                  <h4 className="text-3xl font-bold text-white mb-6 text-center">Getting Started</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h5 className="text-xl font-bold text-purple-300 mb-4">1. Bot Installation</h5>
                      <div className="space-y-2 text-gray-300">
                        <p>• Use the secure invitation URL with password protection</p>
                        <p>• Bot requires Administrator permissions for full functionality</p>
                        <p>• Automatic tutorial redirect after successful installation</p>
                        <p>• Dashboard key generation for web access</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xl font-bold text-blue-300 mb-4">2. Account Verification</h5>
                      <div className="space-y-2 text-gray-300">
                        <p>• Run <code className="bg-gray-800 px-2 py-1 rounded">/verify</code> in Discord to get verification code</p>
                        <p>• Enter the 6-character code in the web dashboard</p>
                        <p>• Links your Discord account to dashboard access</p>
                        <p>• Required for all advanced features</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-8">
                <Card className="bg-gradient-to-br from-green-900 to-emerald-900 border-green-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-green-300 mb-4">License Key Management Commands</h4>
                    <div className="space-y-4 text-sm">
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-green-400 text-lg">/generatekey</code>
                          <span className="text-xs text-gray-500">Admin Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Generate working MacSploit license keys using real API integration</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Required Parameters:</strong></p>
                          <p className="text-xs text-gray-400">• <span className="text-blue-400">payment:</span> Payment method (paypal, cashapp, robux, giftcard, venmo, bitcoin, ethereum, litecoin, sellix, custom)</p>
                          <p className="text-xs text-gray-400">• <span className="text-blue-400">user:</span> Discord user who paid for the key</p>
                          <p className="text-xs text-gray-400">• <span className="text-blue-400">note:</span> Payment description or transaction details</p>
                          <p className="text-xs text-gray-400"><strong>Optional:</strong> booster (yes/no), early-access (yes/no), monthly (yes/no)</p>
                          <p className="text-xs text-green-400 mt-2"><strong>Result:</strong> Creates real working license key via MacSploit API, stores in database, sends key to user via DM</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-green-400 text-lg">/keyinfo</code>
                          <span className="text-xs text-gray-500">Staff Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Display comprehensive information about any license key</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Parameter:</strong> key_id (the license key to lookup)</p>
                          <p className="text-xs text-green-400"><strong>Shows:</strong> Key status, owner, HWID, creation date, payment method, usage history, validity</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-green-400 text-lg">/transfer</code>
                          <span className="text-xs text-gray-500">Admin Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Transfer license key ownership between users with full validation</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Parameters:</strong> key_id (key to transfer), new_user (recipient)</p>
                          <p className="text-xs text-green-400"><strong>Process:</strong> Validates key exists, updates database ownership, logs transfer activity, notifies both users</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-green-400 text-lg">/dewhitelist</code>
                          <span className="text-xs text-gray-500">Admin Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Remove license keys from MacSploit whitelist using admin API</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Parameter:</strong> key_id (key to remove from whitelist)</p>
                          <p className="text-xs text-green-400"><strong>Function:</strong> Calls real MacSploit admin API to dewhitelist key, updates database status, logs action</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-900 to-cyan-900 border-blue-700">
                  <CardContent className="p-6">
                    <h4 className="text-2xl font-bold text-blue-300 mb-4">User Management Commands</h4>
                    <div className="space-y-4 text-sm">
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-blue-400 text-lg">/whitelist</code>
                          <span className="text-xs text-gray-500">Admin Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Manage user whitelist status for bot access permissions</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Parameters:</strong> user (Discord user), action (add/remove)</p>
                          <p className="text-xs text-blue-400"><strong>Function:</strong> Updates database whitelist status, affects command access permissions, logs all changes</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-blue-400 text-lg">/userinfo</code>
                          <span className="text-xs text-gray-500">Staff Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Display comprehensive user profile and activity statistics</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Parameter:</strong> user (optional, defaults to command executor)</p>
                          <p className="text-xs text-blue-400"><strong>Shows:</strong> Join date, roles, candy balance, owned keys, activity logs, whitelist status, last seen</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-blue-400 text-lg">/hwid</code>
                          <span className="text-xs text-gray-500">Staff Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Hardware ID management with view, set, and reset capabilities</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Subcommands:</strong></p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">view [user]:</span> Display current HWID for user</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">set [user] [hwid]:</span> Assign specific HWID to user</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">reset [user]:</span> Clear user's HWID assignment</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-blue-400 text-lg">/log</code>
                          <span className="text-xs text-gray-500">Staff Only</span>
                        </div>
                        <p className="text-gray-300 mb-3">Comprehensive user engagement tracking and leaderboard system</p>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400"><strong>Subcommands:</strong></p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">add [user] [amount]:</span> Add engagement logs to user</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">remove [user] [amount]:</span> Remove logs from user</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">view [user]:</span> Show user's log count</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">lb [page]:</span> Display ranked leaderboard</p>
                          <p className="text-xs text-gray-400">• <span className="text-cyan-400">clear [user]:</span> Reset user's log count</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-gradient-to-br from-yellow-900 to-orange-900 border-yellow-700">
                <CardContent className="p-6">
                  <h4 className="text-2xl font-bold text-yellow-300 mb-4">Candy Economy Commands</h4>
                  <div className="space-y-4 text-sm">
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/daily</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Claim daily candy reward with 24-hour cooldown system</p>
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400"><strong>Reward:</strong> 2,000 candies every 24 hours</p>
                        <p className="text-xs text-gray-400"><strong>Cooldown:</strong> Prevents multiple claims, tracks last claim timestamp</p>
                        <p className="text-xs text-gray-400"><strong>Database:</strong> Updates lastDaily field, adds to candy balance</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/balance</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Display comprehensive candy account information</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameter:</strong> user (optional, defaults to self)</p>
                        <p className="text-xs text-yellow-400"><strong>Shows:</strong> Wallet balance, bank balance, total candies, last activity</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/gamble</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Risk candies for potential rewards with realistic house edge</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameter:</strong> amount (candies to gamble)</p>
                        <p className="text-xs text-yellow-400"><strong>Odds:</strong> 47% win rate (house edge 6%)</p>
                        <p className="text-xs text-gray-400"><strong>Validation:</strong> Checks sufficient balance, prevents negative amounts</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/deposit</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Safely store candies in protected bank account</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameter:</strong> amount (candies to deposit)</p>
                        <p className="text-xs text-yellow-400"><strong>Function:</strong> Moves candies from wallet to bank, prevents theft</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/withdraw</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Retrieve candies from bank to wallet for spending</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameter:</strong> amount (candies to withdraw)</p>
                        <p className="text-xs text-yellow-400"><strong>Function:</strong> Moves candies from bank to wallet</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/pay</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Transfer candies between users with validation</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> user (recipient), amount (candies to send)</p>
                        <p className="text-xs text-yellow-400"><strong>Validation:</strong> Checks balance, prevents self-payments, logs transfers</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/beg</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Request random candy amounts with cooldown</p>
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400"><strong>Rewards:</strong> 50-500 candies (random)</p>
                        <p className="text-xs text-gray-400"><strong>Cooldown:</strong> 5-minute wait between begs</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/scam</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Credit card scam mini-game with risk/reward mechanics</p>
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400"><strong>Success Rate:</strong> 35% chance (high risk, high reward)</p>
                        <p className="text-xs text-gray-400"><strong>Rewards:</strong> 1,000-5,000 candies on success</p>
                        <p className="text-xs text-gray-400"><strong>Cooldown:</strong> 10-minute wait between attempts</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-yellow-400 text-lg">/candylb</code>
                        <span className="text-xs text-gray-500">Everyone</span>
                      </div>
                      <p className="text-gray-300 mb-3">Display ranked candy leaderboard with pagination</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameter:</strong> page (optional, defaults to 1)</p>
                        <p className="text-xs text-yellow-400"><strong>Shows:</strong> Top users by total candy wealth (wallet + bank)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-900 to-pink-900 border-red-700">
                <CardContent className="p-6">
                  <h4 className="text-2xl font-bold text-red-300 mb-4">Server Administration Commands</h4>
                  <div className="space-y-4 text-sm">
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/backup</code>
                        <span className="text-xs text-gray-500">Admin Only</span>
                      </div>
                      <p className="text-gray-300 mb-3">Comprehensive Discord server backup and restoration system</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Subcommands:</strong></p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">create [name]:</span> Full server backup (messages, users, roles, channels, settings)</p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">restore [backup_id]:</span> Restore server from backup</p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">list:</span> View all available backups</p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">integrity [backup_id]:</span> Verify backup completeness</p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">schedule [frequency]:</span> Automatic backup scheduling</p>
                        <p className="text-xs text-gray-400">• <span className="text-pink-400">export [backup_id]:</span> Download backup as file</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/purge</code>
                        <span className="text-xs text-gray-500">Moderator+</span>
                      </div>
                      <p className="text-gray-300 mb-3">Bulk message deletion with advanced filtering options</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> amount (1-100 messages), user (optional filter)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Deletes recent messages, logs action, respects Discord limits</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/timeout</code>
                        <span className="text-xs text-gray-500">Moderator+</span>
                      </div>
                      <p className="text-gray-300 mb-3">Temporarily restrict user permissions with automatic expiration</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> user (target), duration (1m-28d), reason (optional)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Applies Discord timeout, logs moderation action</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/announce</code>
                        <span className="text-xs text-gray-500">Admin Only</span>
                      </div>
                      <p className="text-gray-300 mb-3">Send formatted announcements to designated channels</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> message (announcement text), channel (optional target)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Creates professional embed, mentions @everyone, logs announcement</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/dm</code>
                        <span className="text-xs text-gray-500">Admin Only</span>
                      </div>
                      <p className="text-gray-300 mb-3">Send direct messages to users through the bot</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> user (recipient), message (DM content)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Sends private message, logs admin action, handles failures</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/nickname</code>
                        <span className="text-xs text-gray-500">Moderator+</span>
                      </div>
                      <p className="text-gray-300 mb-3">Change user nicknames with permission validation</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> user (target), nickname (new name or reset)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Updates Discord nickname, respects role hierarchy, logs changes</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-red-400 text-lg">/say</code>
                        <span className="text-xs text-gray-500">Admin Only</span>
                      </div>
                      <p className="text-gray-300 mb-3">Make the bot speak in any channel</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400"><strong>Parameters:</strong> message (bot response), channel (optional target)</p>
                        <p className="text-xs text-red-400"><strong>Function:</strong> Sends message as bot, deletes command, logs admin usage</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 8,
      content: (
        <div className="min-h-screen flex items-center justify-center px-8 py-16">
          <div className="max-w-6xl">
            <h3 className="text-4xl font-bold text-white mb-12 text-center">MacSploit Support System</h3>
            <div className="space-y-8">
              
              <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-700">
                <CardContent className="p-8">
                  <h4 className="text-3xl font-bold text-white mb-6 text-center">Instant Help Tags</h4>
                  <p className="text-gray-300 text-center mb-8">
                    Simply type any of these tags in chat for instant MacSploit support responses
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-purple-300">Installation & Setup</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-purple-400">.install</code>
                          <p className="text-gray-300">Complete installation guide</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-purple-400">.hwid</code>
                          <p className="text-gray-300">Hardware ID troubleshooting</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-purple-400">.elevated</code>
                          <p className="text-gray-300">Permission elevation help</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-blue-300">Technical Issues</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-blue-400">.crash</code>
                          <p className="text-gray-300">Crash fixes and solutions</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-blue-400">.uicrash</code>
                          <p className="text-gray-300">UI-specific crash help</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-blue-400">.badcpu</code>
                          <p className="text-gray-300">CPU compatibility issues</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-green-300">Scripts & Usage</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-green-400">.scripts</code>
                          <p className="text-gray-300">Script examples with syntax highlighting</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-green-400">.autoexe</code>
                          <p className="text-gray-300">Auto-execution setup</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-green-400">.multi-instance</code>
                          <p className="text-gray-300">Multiple instance guidance</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-yellow-300">Payment & Access</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-yellow-400">.paypal</code>
                          <p className="text-gray-300">PayPal payment instructions</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-yellow-400">.robux</code>
                          <p className="text-gray-300">Robux payment guide</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-yellow-400">.giftcard</code>
                          <p className="text-gray-300">Gift card payment help</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-red-300">Advanced Features</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-red-400">.anticheat</code>
                          <p className="text-gray-300">Anti-cheat bypass methods</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-red-400">.cookie</code>
                          <p className="text-gray-300">Cookie-related functionality</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-red-400">.offline</code>
                          <p className="text-gray-300">Offline mode instructions</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-cyan-300">System Information</h5>
                      <div className="space-y-2 text-sm">
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-cyan-400">.user</code>
                          <p className="text-gray-300">User account information</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-cyan-400">.iy</code>
                          <p className="text-gray-300">Infinite Yield compatibility</p>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <code className="text-cyan-400">.zsh</code>
                          <p className="text-gray-300">Shell environment setup</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-2xl font-bold text-white mb-4">Smart Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-lg font-bold text-blue-400 mb-3">Automatic Script Detection</h5>
                      <p className="text-gray-300 text-sm mb-2">
                        The <code className="bg-gray-800 px-2 py-1 rounded">.scripts</code> tag automatically detects script language:
                      </p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Bash scripts get bash syntax highlighting</li>
                        <li>• Lua scripts get lua syntax highlighting</li>
                        <li>• Detects common patterns and commands</li>
                        <li>• Provides appropriate code formatting</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-lg font-bold text-green-400 mb-3">Intelligent Responses</h5>
                      <p className="text-gray-300 text-sm mb-2">
                        All support tags provide contextual, detailed responses:
                      </p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Step-by-step troubleshooting guides</li>
                        <li>• Platform-specific instructions</li>
                        <li>• Common error solutions</li>
                        <li>• Links to additional resources</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 9,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-8xl font-bold text-white mb-8">The End.</h2>
            <p className="text-4xl text-gray-400">-Alex</p>
          </div>
        </div>
      )
    },
    {
      id: 10,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-8">Ready to explore the dashboard?</h3>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-xl"
              size="lg"
            >
              <ChevronRight className="w-6 h-6 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    if (!isAutoScrolling) return;

    const interval = setInterval(() => {
      setCurrentSection(prev => {
        if (prev >= sections.length - 1) {
          setIsAutoScrolling(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000); // 4 seconds per section

    return () => clearInterval(interval);
  }, [isAutoScrolling, sections.length]);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (!isAutoScrolling) {
        e.preventDefault();
        if (e.deltaY > 0 && currentSection < sections.length - 1) {
          setCurrentSection(prev => prev + 1);
        } else if (e.deltaY < 0 && currentSection > 0) {
          setCurrentSection(prev => prev - 1);
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        setIsAutoScrolling(false);
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentSection, isAutoScrolling, sections.length]);

  return (
    <div className="bg-black text-white font-sans overflow-hidden">
      {/* Fixed controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          {isAutoScrolling ? 'Pause' : 'Auto'}
        </Button>
        <div className="text-sm text-gray-400 flex items-center">
          {currentSection + 1} / {sections.length}
        </div>
      </div>

      {/* Content container with smooth transitions */}
      <div 
        className="transition-transform duration-1000 ease-in-out"
        style={{
          transform: `translateY(-${currentSection * 100}vh)`,
        }}
      >
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`w-full h-screen transition-opacity duration-500 ${
              index === currentSection ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {section.content}
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {sections.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentSection ? 'bg-white' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}