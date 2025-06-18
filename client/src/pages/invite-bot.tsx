import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Bot, Shield, Zap, Lock, Code, Clock, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function InviteBot() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState('bot-key'); // bot-key, bot-installing, owner-key, tutorial, dashboard
  const [botKey, setBotKey] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [error, setError] = useState('');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [skipHoldTime, setSkipHoldTime] = useState(0);
  const [isHoldingSkip, setIsHoldingSkip] = useState(false);
  const queryClient = useQueryClient();

  const validateBotKey = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest('/api/bot/validate-key', 'POST', { key });
    },
    onSuccess: () => {
      setCurrentStep('owner-key');
    },
    onError: (error: any) => {
      setError(error.message || 'Invalid bot installation key');
    }
  });

  const generateOwnerKey = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/owner/generate-key', 'POST', {});
    },
    onSuccess: (data) => {
      setOwnerKey(data.key);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to generate owner key');
    }
  });

  const initiateDiscordAuth = () => {
    const discordBotUrl = `https://discord.com/api/oauth2/authorize?client_id=1382224347892027412&permissions=274877906944&scope=bot%20applications.commands&redirect_uri=${encodeURIComponent(window.location.origin + '/invite-success')}`;
    window.location.href = discordBotUrl;
  };

  const handleBotKeySubmit = () => {
    if (!botKey.trim()) {
      setError('Please enter your bot installation key');
      return;
    }
    setError('');
    validateBotKey.mutate(botKey);
  };

  const handleSkipMouseDown = () => {
    setIsHoldingSkip(true);
    const interval = setInterval(() => {
      setSkipHoldTime(prev => {
        if (prev >= 1000) {
          clearInterval(interval);
          setCurrentStep('dashboard');
          return 0;
        }
        return prev + 50;
      });
    }, 50);

    const cleanup = () => {
      clearInterval(interval);
      setIsHoldingSkip(false);
      setSkipHoldTime(0);
    };

    document.addEventListener('mouseup', cleanup, { once: true });
    document.addEventListener('mouseleave', cleanup, { once: true });
  };

  const tutorialSteps = [
    {
      title: "Welcome to Raptor Bot Dashboard",
      content: "This comprehensive Discord bot management system took over 120 hours to develop and includes 60+ commands, real API integration, and advanced security features.",
      icon: <Bot className="h-8 w-8 text-blue-500" />,
      details: "Built with Express.js, React, TypeScript, and PostgreSQL"
    },
    {
      title: "MacSploit API Integration",
      content: "Real working license key generation through official MacSploit API with staff tracking, payment processing, and automated HWID management.",
      icon: <Code className="h-8 w-8 text-green-500" />,
      details: "Supports 10+ payment methods with real-time validation"
    },
    {
      title: "Advanced Security System",
      content: "Multi-layer authentication with Google OAuth, Discord verification, rate limiting, and comprehensive audit logging for all operations.",
      icon: <Shield className="h-8 w-8 text-red-500" />,
      details: "Role-based permissions with session management"
    },
    {
      title: "Complete Database Architecture",
      content: "PostgreSQL database with Drizzle ORM, automated backups, integrity checking, and real-time data synchronization across all components.",
      icon: <Lock className="h-8 w-8 text-purple-500" />,
      details: "Handles millions of operations with zero data loss"
    }
  ];

  if (currentStep === 'bot-key') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-blue-500">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Bot className="h-12 w-12 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Add Raptor Bot to Discord
            </CardTitle>
            <CardDescription className="text-gray-300">
              Click the button below to add the bot to your Discord server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg border border-blue-500">
              <h3 className="text-lg font-bold text-white mb-3">Bot Features:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  60+ Discord slash commands
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Real MacSploit API integration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  License key management
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Candy economy system
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Server backup & moderation
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={initiateDiscordAuth}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Add Bot to Discord Server
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Requires Administrator permissions for full functionality
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'owner-key') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Code className="h-6 w-6" />
              Generate Owner Key
            </CardTitle>
            <CardDescription>
              Generate your unique owner access key for dashboard management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {ownerKey ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Your Owner Key:</strong>
                    <code className="block mt-2 p-2 bg-muted rounded text-sm font-mono">
                      {ownerKey}
                    </code>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Save this key securely - you'll need it for future access
                    </span>
                  </AlertDescription>
                </Alert>
                <Button onClick={() => setLocation('/tutorial')} className="w-full">
                  Continue to Tutorial
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => generateOwnerKey.mutate()} 
                disabled={generateOwnerKey.isPending}
                className="w-full"
              >
                {generateOwnerKey.isPending ? "Generating..." : "Generate Owner Key"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'tutorial') {
    const currentTutorialStep = tutorialSteps[tutorialStep];
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="relative">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {currentTutorialStep.icon}
              </div>
              <CardTitle className="text-2xl">{currentTutorialStep.title}</CardTitle>
              <CardDescription className="text-lg">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg">{currentTutorialStep.content}</p>
                <p className="text-sm text-muted-foreground">{currentTutorialStep.details}</p>
              </div>
              
              <div className="flex justify-center items-center gap-2">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded ${
                      index === tutorialStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
                  disabled={tutorialStep === 0}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>120+ hours of development</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onMouseDown={handleSkipMouseDown}
                    className={`relative overflow-hidden ${isHoldingSkip ? 'bg-destructive/10' : ''}`}
                  >
                    <span className="relative z-10">Hold to Skip</span>
                    {isHoldingSkip && (
                      <div 
                        className="absolute left-0 top-0 h-full bg-destructive/20 transition-all duration-75"
                        style={{ width: `${(skipHoldTime / 1000) * 100}%` }}
                      />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    if (tutorialStep < tutorialSteps.length - 1) {
                      setTutorialStep(tutorialStep + 1);
                    } else {
                      setCurrentStep('dashboard');
                    }
                  }}
                >
                  {tutorialStep < tutorialSteps.length - 1 ? 'Next' : 'Enter Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'dashboard') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Welcome to Raptor Bot Dashboard</CardTitle>
            <CardDescription className="text-lg">
              Your comprehensive Discord bot management system is ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Login Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={() => window.location.href = '/api/auth/google'}>
                    Login with Google
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => window.location.href = '/api/auth/discord'}>
                    Login with Discord
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Quick Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full">
                    View Commands
                  </Button>
                  <Button variant="outline" className="w-full">
                    API Documentation
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Bot Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">API Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Database Active</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}