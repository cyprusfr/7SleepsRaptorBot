import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Bot, Shield, Code, Lock, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function InviteSuccess() {
  const [currentStep, setCurrentStep] = useState('success');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [skipHoldTime, setSkipHoldTime] = useState(0);
  const [isHoldingSkip, setIsHoldingSkip] = useState(false);
  const [, setLocation] = useLocation();

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const guildName = urlParams.get('guild') || 'your server';
  const showTutorial = urlParams.get('tutorial') === 'true';

  useEffect(() => {
    if (showTutorial) {
      const timer = setTimeout(() => {
        setCurrentStep('tutorial');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showTutorial]);

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

  const handleSkipMouseDown = () => {
    setIsHoldingSkip(true);
    const interval = setInterval(() => {
      setSkipHoldTime(prev => {
        if (prev >= 1000) {
          clearInterval(interval);
          setLocation('/');
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

  if (currentStep === 'success') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl text-green-600">Bot Installation Successful!</CardTitle>
            <CardDescription className="text-lg">
              Raptor Bot has been successfully added to {guildName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Installation Complete:</strong> The bot is now active in your Discord server with full permissions and slash command support.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">What's Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Try /help in Discord</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Access the dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Configure your settings</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Bot Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">60+ Commands</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    <span className="text-sm">License Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Real API Integration</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center space-y-4">
              {showTutorial && (
                <p className="text-sm text-muted-foreground">
                  Starting interactive tutorial in 3 seconds...
                </p>
              )}
              <div className="flex justify-center gap-4">
                <Button onClick={() => setLocation('/')}>
                  Go to Dashboard
                </Button>
                {showTutorial && (
                  <Button variant="outline" onClick={() => setCurrentStep('tutorial')}>
                    Start Tutorial Now
                  </Button>
                )}
              </div>
            </div>
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
                      setLocation('/');
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

  return null;
}