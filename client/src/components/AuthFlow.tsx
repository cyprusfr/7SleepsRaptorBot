import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, MessageSquare, Key, Shield, CheckCircle } from "lucide-react";

type AuthStep = 'google' | 'discord' | 'verification' | 'dashboard' | 'consent' | 'complete';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface VerificationData {
  discordUserId: string;
  discordUsername: string;
  verificationLink: string;
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
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [discordId, setDiscordId] = useState('');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [linkClicked, setLinkClicked] = useState(false);
  const [dashboardKey, setDashboardKey] = useState('');
  const [dashboardKeyData, setDashboardKeyData] = useState<DashboardKeyData | null>(null);
  const [consent, setConsent] = useState<ConsentData>({
    storeEmail: true,
    storeIP: false,
    storeDiscordId: true,
    storeDashboardKey: true
  });

  const { toast } = useToast();

  // Listen for verification link clicks and poll for verification status
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_VERIFIED') {
        setLinkClicked(true);
        toast({
          title: "Discord Verified!",
          description: "You can now confirm your Discord account",
        });
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for verification status if we're on the verification step
    let pollInterval: NodeJS.Timeout;
    if (step === 'verification' && verificationData && !linkClicked) {
      console.log('Starting verification polling for Discord ID:', verificationData.discordUserId);
      pollInterval = setInterval(async () => {
        try {
          console.log('Polling verification status for:', verificationData.discordUserId);
          const response = await apiRequest('/api/auth/check-verification', 'POST', {
            discordUserId: verificationData.discordUserId
          });
          const data = await response.json() as { verified: boolean; discordUserId: string };
          console.log('Verification poll response:', data);
          if (data.verified) {
            console.log('Discord verification detected - enabling button');
            setLinkClicked(true);
            clearInterval(pollInterval);
            toast({
              title: "Discord Verified!",
              description: "You can now confirm your Discord account",
            });
          }
        } catch (error) {
          console.error('Verification polling error:', error);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [toast, step, verificationData, linkClicked]);

  // Google OAuth login
  const handleGoogleLogin = () => {
    // Redirect to Replit OAuth
    window.location.href = '/api/login';
  };

  // Link Discord account
  const linkDiscordMutation = useMutation({
    mutationFn: async (discordUserId: string) => {
      return await apiRequest("/api/auth/link-discord", "POST", { discordUserId });
    },
    onSuccess: (data: any) => {
      setVerificationData(data as VerificationData);
      setLinkClicked(false); // Reset link clicked state
      setStep('verification');
      toast({
        title: "Verification Link Sent",
        description: "Check your Discord DMs for the verification link",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Discord Link Failed",
        description: error.message || "Failed to link Discord account",
        variant: "destructive",
      });
    }
  });

  // Verify Discord account
  const verifyDiscordMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/verify-discord", "POST", {});
    },
    onSuccess: () => {
      setStep('dashboard');
      toast({
        title: "Discord Verified",
        description: "Please enter your dashboard key",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Discord verification failed",
        variant: "destructive",
      });
    }
  });

  // Validate dashboard key
  const validateKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      return await apiRequest("/api/dashboard-keys/validate", "POST", { keyId });
    },
    onSuccess: (data: any) => {
      setDashboardKeyData(data as DashboardKeyData);
      setStep('consent');
      toast({
        title: "Dashboard Key Valid",
        description: "Please review data storage consent",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Key",
        description: error.message || "Dashboard key is invalid",
        variant: "destructive",
      });
    }
  });

  // Complete authentication
  const completeAuthMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/complete", "POST", { consent });
    },
    onSuccess: () => {
      setStep('complete');
      toast({
        title: "Authentication Complete",
        description: "Welcome to the dashboard!",
      });
      setTimeout(() => onComplete(), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to complete authentication",
        variant: "destructive",
      });
    }
  });



  const handleDiscordLink = () => {
    if (!discordId.trim()) {
      toast({
        title: "Discord ID Required",
        description: "Please enter your Discord ID",
        variant: "destructive",
      });
      return;
    }
    linkDiscordMutation.mutate(discordId);
  };

  const handleVerifyDiscord = () => {
    verifyDiscordMutation.mutate();
  };

  const handleValidateKey = () => {
    if (!dashboardKey.trim()) {
      toast({
        title: "Dashboard Key Required",
        description: "Please enter your dashboard key",
        variant: "destructive",
      });
      return;
    }
    validateKeyMutation.mutate(dashboardKey);
  };

  const handleCompleteAuth = () => {
    completeAuthMutation.mutate();
  };

  const renderStep = () => {
    switch (step) {
      case 'google':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Mail className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Welcome to Raptor Dashboard</CardTitle>
              <CardDescription>
                Sign in with your Google account to begin the authentication process
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
                Enter your Discord User ID to receive a verification code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {googleUser && (
                <div className="text-sm text-muted-foreground text-center">
                  Signed in as: {googleUser.email}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="discord-id">Discord User ID</Label>
                <Input
                  id="discord-id"
                  placeholder="Enter your Discord ID (e.g., 123456789012345678)"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                />
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
                    Linking...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'verification':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Shield className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Verify Discord Account</CardTitle>
              <CardDescription>
                Check your Discord DMs for a verification code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationData && (
                <div className="text-sm text-center space-y-4">
                  <p><strong>Discord:</strong> {verificationData.discordUsername}</p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
                    <p className="font-medium mb-2">Verification Link Sent!</p>
                    <p className="text-muted-foreground">
                      Check your Discord DMs and click the verification link to continue.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The "Confirm Discord Account" button will be enabled after you click the verification link.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleVerifyDiscord}
                disabled={verifyDiscordMutation.isPending || !linkClicked}
                className="w-full"
              >
                {verifyDiscordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Confirm Discord Account"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'dashboard':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Key className="mx-auto h-12 w-12 text-amber-600 mb-4" />
              <CardTitle>Dashboard Key</CardTitle>
              <CardDescription>
                Enter your dashboard access key to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-key">Dashboard Key</Label>
                <Input
                  id="dashboard-key"
                  placeholder="Enter your dashboard key"
                  value={dashboardKey}
                  onChange={(e) => setDashboardKey(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleValidateKey}
                disabled={validateKeyMutation.isPending}
                className="w-full"
              >
                {validateKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate Key"
                )}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'consent':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Data Storage Consent</CardTitle>
              <CardDescription>
                Please review what data we will store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardKeyData && (
                <div className="text-sm text-center mb-4">
                  <p><strong>Key:</strong> {dashboardKeyData.keyId}</p>
                  <p><strong>Discord:</strong> {dashboardKeyData.discordUsername}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="store-email"
                    checked={consent.storeEmail}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, storeEmail: checked as boolean }))
                    }
                  />
                  <Label htmlFor="store-email" className="text-sm">
                    Store email address (required for account recovery)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="store-ip"
                    checked={consent.storeIP}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, storeIP: checked as boolean }))
                    }
                  />
                  <Label htmlFor="store-ip" className="text-sm">
                    Store IP address (optional, for security monitoring)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="store-discord"
                    checked={consent.storeDiscordId}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, storeDiscordId: checked as boolean }))
                    }
                  />
                  <Label htmlFor="store-discord" className="text-sm">
                    Store Discord ID (required for bot functionality)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="store-key"
                    checked={consent.storeDashboardKey}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, storeDashboardKey: checked as boolean }))
                    }
                  />
                  <Label htmlFor="store-key" className="text-sm">
                    Store dashboard key (required for access)
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCompleteAuth}
                disabled={completeAuthMutation.isPending || !consent.storeEmail || !consent.storeDiscordId || !consent.storeDashboardKey}
                className="w-full"
              >
                {completeAuthMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Authentication"
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
                Welcome to the Raptor Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
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