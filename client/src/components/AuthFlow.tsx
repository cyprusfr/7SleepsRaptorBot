import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Lock, Key, Shield } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthFlowProps {
  children: React.ReactNode;
}

type AuthStep = 'rate-limit' | 'dashboard-key' | 'google-auth' | 'authenticated';

export default function AuthFlow({ children }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('rate-limit');
  const [rateLimitPassword, setRateLimitPassword] = useState("");
  const [dashboardKey, setDashboardKey] = useState("");
  const [error, setError] = useState("");

  // Check if already authenticated
  const { data: authStatus } = useQuery<{ authenticated: boolean; keyId?: string }>({
    queryKey: ["/api/dashboard-keys/auth-status"],
    retry: false,
  });

  const validateRateLimitPassword = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch("/api/auth/validate-rate-limit-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Invalid password");
      return response.json();
    },
    onSuccess: () => {
      setError("");
      setCurrentStep('dashboard-key');
    },
    onError: () => {
      setError("Invalid rate limit bypass password");
    },
  });

  const validateDashboardKey = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch("/api/dashboard-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Invalid dashboard key");
      return response.json();
    },
    onSuccess: () => {
      setError("");
      setCurrentStep('authenticated');
    },
    onError: () => {
      setError("Invalid dashboard key");
    },
  });

  const handleRateLimitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitPassword.trim()) {
      validateRateLimitPassword.mutate(rateLimitPassword.trim());
    }
  };

  const handleDashboardKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dashboardKey.trim()) {
      validateDashboardKey.mutate(dashboardKey.trim());
    }
  };

  const skipToGoogleAuth = () => {
    setCurrentStep('google-auth');
  };

  const skipRateLimit = () => {
    setCurrentStep('dashboard-key');
  };

  // If already authenticated, show dashboard
  if (authStatus?.authenticated || currentStep === 'authenticated') {
    return <>{children}</>;
  }

  // Rate limit bypass step
  if (currentStep === 'rate-limit') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Rate Limit Bypass</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Do you have a rate limit bypass password?
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRateLimitSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter rate limit bypass password"
                  value={rateLimitPassword}
                  onChange={(e) => setRateLimitPassword(e.target.value)}
                  className="w-full"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={validateRateLimitPassword.isPending}
                >
                  {validateRateLimitPassword.isPending ? "Validating..." : "Submit Password"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={skipRateLimit}
                >
                  No, skip this step
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard key step
  if (currentStep === 'dashboard-key') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Key className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Dashboard Access</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your dashboard key to access the admin panel
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleDashboardKeySubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter dashboard key (dash_...)"
                  value={dashboardKey}
                  onChange={(e) => setDashboardKey(e.target.value)}
                  className="w-full"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={validateDashboardKey.isPending}
                >
                  {validateDashboardKey.isPending ? "Validating..." : "Access Dashboard"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={skipToGoogleAuth}
                >
                  No key, use Google login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Google OAuth step
  if (currentStep === 'google-auth') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Google Authentication</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in with your Google account to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign in with Google
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => setCurrentStep('dashboard-key')}
            >
              Back to dashboard key
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}