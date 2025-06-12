import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Key, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface DashboardKeyAuthProps {
  onAuthenticated: () => void;
}

export default function DashboardKeyAuth({ onAuthenticated }: DashboardKeyAuthProps) {
  const [keyInput, setKeyInput] = useState("");
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [keyData, setKeyData] = useState<any>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest("/api/dashboard-keys/validate", "POST", { keyId: key });
    },
    onSuccess: (data) => {
      setIsKeyValid(true);
      setKeyData(data);
      setShowLinkDialog(true);
      toast({
        title: "Key Valid",
        description: "Dashboard key verified successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Key",
        description: error.message || "The dashboard key you entered is invalid or revoked.",
        variant: "destructive",
      });
      setIsKeyValid(false);
      setKeyData(null);
    },
  });

  const linkAccountMutation = useMutation({
    mutationFn: async (shouldLink: boolean) => {
      return await apiRequest("/api/dashboard-keys/link", "POST", { 
        keyId: keyInput, 
        linkToAccount: shouldLink 
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Authentication Complete",
        description: data.linked 
          ? "Key linked to your account successfully." 
          : "Temporary access granted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onAuthenticated();
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with dashboard key.",
        variant: "destructive",
      });
    },
  });

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid dashboard key.",
        variant: "destructive",
      });
      return;
    }
    validateKeyMutation.mutate(keyInput.trim());
  };

  const handleLinkAccount = (shouldLink: boolean) => {
    setShowLinkDialog(false);
    linkAccountMutation.mutate(shouldLink);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Dashboard Access</CardTitle>
          <CardDescription>
            Choose your authentication method to access the Raptor Bot management interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Google OAuth Login */}
            <div className="text-center">
              <Button 
                onClick={() => window.location.href = '/api/auth/google'}
                className="w-full"
                variant="outline"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or use dashboard key</span>
              </div>
            </div>

            {/* Dashboard Key Form */}
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="dashboardKey" className="text-sm font-medium">
                  Dashboard Key
                </label>
                <Input
                  id="dashboardKey"
                  type="password"
                  placeholder="Enter your dashboard key..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="font-mono"
                  disabled={validateKeyMutation.isPending}
                />
                <p className="text-xs text-gray-500">
                  Dashboard keys start with "dash_" followed by 15 characters
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={validateKeyMutation.isPending || !keyInput.trim()}
              >
                {validateKeyMutation.isPending ? "Validating..." : "Authenticate"}
              </Button>
            </form>

          {isKeyValid && keyData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Key Verified</span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <p>Created: {new Date(keyData.createdAt).toLocaleDateString()}</p>
                <p>Discord User: {keyData.discordUsername}</p>
                {keyData.isLinked && (
                  <Badge variant="secondary" className="mt-1">
                    <Shield className="w-3 h-3 mr-1" />
                    Already Linked
                  </Badge>
                )}
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Link Account to Key?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Would you like to link this dashboard key to your current account?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium text-blue-800 mb-1">If you choose "Yes":</p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4">
                  <li>• Key will be permanently linked to your account</li>
                  <li>• Only you can use this key</li>
                  <li>• Enhanced security and audit logging</li>
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-800 mb-1">If you choose "No":</p>
                <ul className="text-xs text-orange-700 space-y-1 ml-4">
                  <li>• Key remains shareable</li>
                  <li>• Other users can still access with this key</li>
                  <li>• Temporary session only</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleLinkAccount(false)}
              disabled={linkAccountMutation.isPending}
            >
              No, Keep Shareable
            </Button>
            <Button
              onClick={() => handleLinkAccount(true)}
              disabled={linkAccountMutation.isPending}
            >
              <Shield className="w-4 h-4 mr-2" />
              Yes, Link to Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}