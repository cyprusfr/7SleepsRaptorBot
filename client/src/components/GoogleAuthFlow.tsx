import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Shield, MessageCircle, CheckCircle, AlertCircle, User, Globe } from "lucide-react";

interface GoogleAuthFlowProps {
  onAuthenticated: () => void;
}

interface DiscordLinkData {
  discordUserId: string;
  discordUsername: string;
  verificationCode: string;
  isVerified: boolean;
}

interface DashboardKeyData {
  keyId: string;
  discordUsername: string;
  createdAt: string;
  isLinked: boolean;
}

export default function GoogleAuthFlow({ onAuthenticated }: GoogleAuthFlowProps) {
  const [step, setStep] = useState<'google' | 'discord' | 'verification' | 'confirm' | 'dashboard' | 'linking'>('google');
  const [discordId, setDiscordId] = useState("");
  const [dashboardKey, setDashboardKey] = useState("");
  const [discordLinkData, setDiscordLinkData] = useState<DiscordLinkData | null>(null);
  const [dashboardKeyData, setDashboardKeyData] = useState<DashboardKeyData | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [storeIP, setStoreIP] = useState(true);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is already authenticated with Google
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  useEffect(() => {
    if (user) {
      setUserInfo(user);
      setStep('discord');
    }
  }, [user]);

  const linkDiscordMutation = useMutation({
    mutationFn: async (discordUserId: string) => {
      return await apiRequest("/api/auth/link-discord", "POST", { discordUserId });
    },
    onSuccess: (data: any) => {
      setDiscordLinkData(data as DiscordLinkData);
      setStep('verification');
      toast({
        title: "Verification Code Sent",
        description: "Check your Discord DMs for a verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link Discord account",
        variant: "destructive",
      });
    },
  });

  const verifyDiscordMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/verify-discord", "POST", {});
    },
    onSuccess: (data: any) => {
      if (data.verified) {
        setDiscordLinkData(prev => prev ? { ...prev, isVerified: true } : null);
        setStep('confirm');
        toast({
          title: "Discord Link Complete",
          description: "Your Discord account has been successfully verified.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Discord verification failed",
        variant: "destructive",
      });
    },
  });

  const validateDashboardKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      return await apiRequest("/api/dashboard-keys/validate-flow", "POST", { keyId });
    },
    onSuccess: (data: any) => {
      setDashboardKeyData(data as DashboardKeyData);
      setShowLinkingDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Key",
        description: error.message || "The dashboard key is invalid or doesn't match your Discord account",
        variant: "destructive",
      });
    },
  });

  const finalLinkMutation = useMutation({
    mutationFn: async (linkData: { storeData: boolean }) => {
      return await apiRequest("/api/auth/complete-link", "POST", {
        keyId: dashboardKeyData?.keyId,
        storeIP: linkData.storeData
      });
    },
    onSuccess: () => {
      toast({
        title: "Setup Complete",
        description: "Your account has been fully configured and linked.",
      });
      onAuthenticated();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete account linking",
        variant: "destructive",
      });
    },
  });

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDiscordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Discord ID",
        variant: "destructive",
      });
      return;
    }
    linkDiscordMutation.mutate(discordId.trim());
  };

  const handleDashboardKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your dashboard key",
        variant: "destructive",
      });
      return;
    }
    validateDashboardKeyMutation.mutate(dashboardKey.trim());
  };

  const handleFinalLink = () => {
    setShowLinkingDialog(false);
    finalLinkMutation.mutate({ storeData: storeIP });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            {step === 'google' && <User className="w-6 h-6 text-white" />}
            {step === 'discord' && <MessageCircle className="w-6 h-6 text-white" />}
            {step === 'verification' && <Shield className="w-6 h-6 text-white" />}
            {step === 'confirm' && <CheckCircle className="w-6 h-6 text-white" />}
            {step === 'dashboard' && <Key className="w-6 h-6 text-white" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 'google' && "Welcome to Raptor"}
            {step === 'discord' && "Connect Discord"}
            {step === 'verification' && "Verify Discord"}
            {step === 'confirm' && "Confirm Account"}
            {step === 'dashboard' && "Dashboard Access"}
          </CardTitle>
          <CardDescription>
            {step === 'google' && "Sign in with Google to get started"}
            {step === 'discord' && "Enter your Discord ID to link your account"}
            {step === 'verification' && "Check your Discord DMs for verification"}
            {step === 'confirm' && "Confirm this is your Discord account"}
            {step === 'dashboard' && "Enter your dashboard key to access the bot"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Authentication Step */}
          {step === 'google' && (
            <div className="space-y-4">
              <Button onClick={handleGoogleLogin} className="w-full" size="lg">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              <p className="text-xs text-gray-500 text-center">
                We use Google authentication to secure your account
              </p>
            </div>
          )}

          {/* Discord ID Entry Step */}
          {step === 'discord' && userInfo && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Google Account Connected</span>
                </div>
                <p className="text-xs text-green-700">Welcome, {userInfo.email}</p>
              </div>

              <form onSubmit={handleDiscordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="discordId" className="text-sm font-medium">
                    Discord User ID
                  </label>
                  <Input
                    id="discordId"
                    type="text"
                    placeholder="Enter your Discord ID..."
                    value={discordId}
                    onChange={(e) => setDiscordId(e.target.value)}
                    className="font-mono"
                    disabled={linkDiscordMutation.isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Your unique Discord user ID (18-19 digit number)
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={linkDiscordMutation.isPending || !discordId.trim()}
                >
                  {linkDiscordMutation.isPending ? "Connecting..." : "Connect Discord"}
                </Button>
              </form>
            </div>
          )}

          {/* Discord Verification Step */}
          {step === 'verification' && discordLinkData && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Verification Code Sent</span>
                </div>
                <p className="text-xs text-blue-700">
                  Check your Discord DMs for a verification code from Raptor bot
                </p>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Waiting for you to respond to the verification message...
                </p>
                
                <Button 
                  onClick={() => verifyDiscordMutation.mutate()}
                  disabled={verifyDiscordMutation.isPending}
                  variant="outline"
                >
                  {verifyDiscordMutation.isPending ? "Checking..." : "Check Verification"}
                </Button>
              </div>
            </div>
          )}

          {/* Confirm Discord Account Step */}
          {step === 'confirm' && discordLinkData && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Discord Link Complete</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium mb-2">Is this your Discord account?</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Username:</strong> {discordLinkData.discordUsername}</p>
                  <p><strong>User ID:</strong> {discordLinkData.discordUserId}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep('dashboard')}
                  className="flex-1"
                >
                  Yes, Continue
                </Button>
                <Button 
                  onClick={() => setStep('discord')}
                  variant="outline"
                  className="flex-1"
                >
                  No, Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Dashboard Key Entry Step */}
          {step === 'dashboard' && (
            <div className="space-y-4">
              <form onSubmit={handleDashboardKeySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="dashboardKey" className="text-sm font-medium">
                    Dashboard Key
                  </label>
                  <Input
                    id="dashboardKey"
                    type="password"
                    placeholder="Enter your dashboard key..."
                    value={dashboardKey}
                    onChange={(e) => setDashboardKey(e.target.value)}
                    className="font-mono"
                    disabled={validateDashboardKeyMutation.isPending}
                  />
                  <p className="text-xs text-gray-500">
                    Dashboard keys start with "dash_" followed by 15 characters
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={validateDashboardKeyMutation.isPending || !dashboardKey.trim()}
                >
                  {validateDashboardKeyMutation.isPending ? "Validating..." : "Validate Key"}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linking Confirmation Dialog */}
      <Dialog open={showLinkingDialog} onOpenChange={setShowLinkingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Account & Data Storage</DialogTitle>
            <DialogDescription>
              <p className="mb-4">Your dashboard key is valid! Here's the information that will be linked:</p>
              
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div><strong>Email:</strong> {userInfo?.email}</div>
                <div><strong>Discord User:</strong> {discordLinkData?.discordUsername}</div>
                <div><strong>Discord ID:</strong> {discordLinkData?.discordUserId}</div>
                <div><strong>Dashboard Key:</strong> {dashboardKeyData?.keyId}</div>
                <div><strong>IP Address:</strong> <span className="font-mono text-xs">[Current IP]</span></div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="storeIP" 
                    checked={storeIP} 
                    onCheckedChange={(checked) => setStoreIP(checked as boolean)}
                  />
                  <label htmlFor="storeIP" className="text-sm">
                    Store my IP address for security tracking
                  </label>
                </div>
                <p className="text-xs text-gray-600">
                  {storeIP 
                    ? "Your IP will be stored for security monitoring and access logging."
                    : "Your IP will not be stored, but you may need to re-verify more frequently."
                  }
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowLinkingDialog(false)}
              disabled={finalLinkMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFinalLink}
              disabled={finalLinkMutation.isPending}
            >
              {finalLinkMutation.isPending ? "Linking..." : "Complete Setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}