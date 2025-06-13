import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, MessageSquare, Key, Shield, CheckCircle, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AuthStep = 'google' | 'discord' | 'verification' | 'dashboard' | 'consent' | 'complete';

interface VerificationData {
  discordUserId: string;
  discordUsername: string;
  verificationCode: string;
  sessionId: string;
}

interface DashboardKeyData {
  keyId: string;
  discordUsername: string;
  isLinked: boolean;
}

interface ConsentData {
  storeEmail: boolean;
  storeIP: boolean;
  storeDiscordId: boolean;
  storeDashboardKey: boolean;
}

interface AuthFlowProps {
  onComplete: () => void;
}

export default function AuthFlow({ onComplete }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('google');
  const [discordId, setDiscordId] = useState('');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [linkClicked, setLinkClicked] = useState(false);
  const [dashboardKey, setDashboardKey] = useState('');
  const [botResponseCode, setBotResponseCode] = useState('');
  const [dashboardKeyData, setDashboardKeyData] = useState<DashboardKeyData | null>(null);
  const [consentData, setConsentData] = useState<ConsentData>({
    storeEmail: false,
    storeIP: false,
    storeDiscordId: false,
    storeDashboardKey: false,
  });

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Copy verification code to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Verification code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Auto-advance to Discord step if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && user && step === 'google') {
      setStep('discord');
    }
  }, [isAuthenticated, user, step]);

  // Verification polling effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (step === 'verification' && verificationData && !linkClicked) {
      console.log('Starting verification polling for Discord ID:', verificationData.discordUserId);
      
      pollInterval = setInterval(async () => {
        try {
          console.log('Polling verification status for:', verificationData.discordUserId);
          const data = await apiRequest('/api/auth/check-verification', 'POST', {
            discordUserId: verificationData.discordUserId
          });
          console.log('Verification poll response:', data);
          
          if (data.verified) {
            console.log('Discord verification detected - bot sent response code');
            setLinkClicked(true);
            clearInterval(pollInterval);
            toast({
              title: "Bot Response Received!",
              description: "The bot has sent you a verification code. Enter it below to continue.",
            });
          }
        } catch (error) {
          console.error('Verification polling error:', error);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, verificationData, linkClicked, toast]);

  // Handle Google login redirect
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  // Link Discord account
  const linkDiscordMutation = useMutation({
    mutationFn: async (discordUserId: string) => {
      return await apiRequest("/api/verify-discord", "POST", { discordUserId });
    },
    onSuccess: (data: any) => {
      setVerificationData({
        discordUserId: discordId,
        discordUsername: 'Unknown',
        verificationCode: data.verificationCode,
        sessionId: data.sessionId
      });
      setStep('verification');
      toast({
        title: "Verification Started",
        description: "Send the code to the bot via DM",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Discord Link Failed",
        description: error.message || "Failed to start verification",
        variant: "destructive",
      });
    }
  });

  // Handle Discord link
  const handleDiscordLink = () => {
    if (!discordId.trim()) {
      toast({
        title: "Discord ID Required",
        description: "Please enter your Discord ID",
        variant: "destructive",
      });
      return;
    }
    linkDiscordMutation.mutate(discordId.trim());
  };

  // Confirm Discord verification with bot response code
  const confirmVerificationMutation = useMutation({
    mutationFn: async (botResponseCode: string) => {
      return await apiRequest("/api/verify-discord/complete", "POST", {
        sessionId: verificationData?.sessionId,
        botResponseCode
      });
    },
    onSuccess: () => {
      setStep('dashboard');
      toast({
        title: "Verification Complete",
        description: "Now enter your dashboard key",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to complete verification",
        variant: "destructive",
      });
    }
  });

  // Verify dashboard key
  const verifyKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest("/api/dashboard-keys/verify", "POST", { 
        keyId: key,
        discordUserId: verificationData?.discordUserId 
      });
    },
    onSuccess: (data: any) => {
      setDashboardKeyData(data as DashboardKeyData);
      setStep('consent');
      toast({
        title: "Dashboard Key Verified",
        description: "Please review and accept the consent terms",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Dashboard Key",
        description: error.message || "The dashboard key is invalid or expired",
        variant: "destructive",
      });
    }
  });

  // Handle dashboard key verification
  const handleDashboardKeyVerification = () => {
    if (!dashboardKey.trim()) {
      toast({
        title: "Dashboard Key Required",
        description: "Please enter your dashboard key",
        variant: "destructive",
      });
      return;
    }
    verifyKeyMutation.mutate(dashboardKey.trim());
  };

  // Complete authentication
  const completeAuthMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/complete", "POST", {
        consentData,
        dashboardKeyId: dashboardKey,
        discordUserId: verificationData?.discordUserId
      });
    },
    onSuccess: () => {
      setStep('complete');
      toast({
        title: "Authentication Complete",
        description: "Welcome to the Raptor Dashboard!",
      });
      setTimeout(() => {
        onComplete();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to complete authentication",
        variant: "destructive",
      });
    }
  });

  // Handle final completion
  const handleComplete = () => {
    completeAuthMutation.mutate();
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 'google':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Mail className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Raptor Bot Dashboard</CardTitle>
              <CardDescription>
                Sign in with your account to begin the authentication process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGoogleLogin}
                className="w-full"
                size="lg"
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        );

      case 'discord':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Link Discord Account</CardTitle>
              <CardDescription>
                {user ? `Signed in as ${user.email}` : 'Enter your Discord User ID to receive a verification code'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discordId">Discord User ID</Label>
                <Input
                  id="discordId"
                  type="text"
                  placeholder="e.g., 123456789012345678"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Right-click your profile in Discord and select "Copy User ID"
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleDiscordLink}
                disabled={linkDiscordMutation.isPending}
                className="w-full"
              >
                {linkDiscordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending verification...
                  </>
                ) : (
                  "Proceed"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'verification':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Discord Verification</CardTitle>
              <CardDescription>
                Complete the two-way verification process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-2">Step 1: Send this code to the bot</h4>
                  <div className="bg-white p-2 rounded border flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-blue-600 flex-1 text-center">
                      {verificationData?.verificationCode || 'Loading...'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(verificationData?.verificationCode || '')}
                      disabled={!verificationData?.verificationCode}
                      className="ml-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    DM this code to the Raptor bot on Discord
                  </p>
                </div>
                
                {!linkClicked && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      Waiting for you to send the code to the bot...
                    </p>
                  </div>
                )}
                
                {linkClicked && (
                  <div className="bg-green-50 p-4 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2">Step 2: Enter bot's response</h4>
                    <Input
                      type="text"
                      placeholder="Enter bot response code"
                      value={botResponseCode}
                      onChange={(e) => setBotResponseCode(e.target.value.toUpperCase())}
                      className="text-center font-mono"
                      maxLength={6}
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      The bot will reply with a 6-character code
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {!linkClicked ? (
                <Button 
                  disabled
                  className="w-full"
                  variant="outline"
                >
                  Waiting for bot response...
                </Button>
              ) : (
                <Button 
                  onClick={() => confirmVerificationMutation.mutate(botResponseCode)}
                  disabled={!botResponseCode || botResponseCode.length !== 6 || confirmVerificationMutation.isPending}
                  className="w-full"
                >
                  {confirmVerificationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Verification
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        );

      case 'dashboard':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Key className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Enter Dashboard Key</CardTitle>
              <CardDescription>
                Enter your dashboard key to access the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboardKey">Dashboard Key</Label>
                <Input
                  id="dashboardKey"
                  type="text"
                  placeholder="Enter your dashboard key"
                  value={dashboardKey}
                  onChange={(e) => setDashboardKey(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleDashboardKeyVerification}
                disabled={verifyKeyMutation.isPending}
                className="w-full"
              >
                {verifyKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Dashboard Key"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'consent':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Shield className="mx-auto h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Data Storage Consent</CardTitle>
              <CardDescription>
                Please review and accept the data storage permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="storeEmail"
                    checked={consentData.storeEmail}
                    onCheckedChange={(checked) => 
                      setConsentData(prev => ({ ...prev, storeEmail: !!checked }))
                    }
                  />
                  <Label htmlFor="storeEmail" className="text-sm">
                    Store email address for account management
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="storeIP"
                    checked={consentData.storeIP}
                    onCheckedChange={(checked) => 
                      setConsentData(prev => ({ ...prev, storeIP: !!checked }))
                    }
                  />
                  <Label htmlFor="storeIP" className="text-sm">
                    Store IP address for security monitoring
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="storeDiscordId"
                    checked={consentData.storeDiscordId}
                    onCheckedChange={(checked) => 
                      setConsentData(prev => ({ ...prev, storeDiscordId: !!checked }))
                    }
                  />
                  <Label htmlFor="storeDiscordId" className="text-sm">
                    Store Discord ID for bot integration
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="storeDashboardKey"
                    checked={consentData.storeDashboardKey}
                    onCheckedChange={(checked) => 
                      setConsentData(prev => ({ ...prev, storeDashboardKey: !!checked }))
                    }
                  />
                  <Label htmlFor="storeDashboardKey" className="text-sm">
                    Store dashboard key for session management
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleComplete}
                disabled={completeAuthMutation.isPending || !Object.values(consentData).some(Boolean)}
                className="w-full"
              >
                {completeAuthMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Accept & Complete Setup"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'complete':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Authentication Complete!</CardTitle>
              <CardDescription>
                Welcome to the Raptor Dashboard. Redirecting...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-600" />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {renderStep()}
    </div>
  );
}