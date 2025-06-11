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
            Enter your dashboard key to access the Raptor Bot management interface
          </CardDescription>
        </CardHeader>
        <CardContent>
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