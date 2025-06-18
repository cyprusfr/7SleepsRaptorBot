import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import AuthFlow from "@/components/AuthFlow";
import Dashboard from "@/pages/dashboard";
import KeyManagement from "@/pages/key-management";
import Users from "@/pages/users";
import Servers from "@/pages/servers";
import ActivityLogs from "@/pages/activity-logs";
import Settings from "@/pages/settings";
import BotSettings from "@/pages/bot-settings";
import BackupsPage from "@/pages/backups";
import AdminPanel from "@/pages/admin";
import InviteBot from "@/pages/invite-bot";
import InviteSuccess from "@/pages/invite-success";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [dashboardKeyAuthenticated, setDashboardKeyAuthenticated] = useState(false);
  const [authFlowComplete, setAuthFlowComplete] = useState(false);

  // Check dashboard key status
  const { data: keyStatus } = useQuery({
    queryKey: ["/api/dashboard-keys/auth-status"],
    enabled: !!user,
  });

  useEffect(() => {
    if (keyStatus && typeof keyStatus === 'object' && 'authenticated' in keyStatus && keyStatus.authenticated) {
      setDashboardKeyAuthenticated(true);
      setAuthFlowComplete(true);
    }
  }, [keyStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication failed, show landing page with login option
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Raptor Bot Dashboard</h1>
          <p className="text-gray-600 mb-8">MacSploit license management and Discord bot control panel</p>
          <div className="space-y-4">
            <a 
              href="/api/auth/google"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Sign in with Google
            </a>
            <p className="text-sm text-gray-500">
              Access requires Google authentication and a valid dashboard key from Discord
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated with Google, or not completed auth flow
  if (!isAuthenticated || (!authFlowComplete && !dashboardKeyAuthenticated)) {
    return (
      <AuthFlow 
        onComplete={() => {
          setAuthFlowComplete(true);
          setDashboardKeyAuthenticated(true);
        }} 
      />
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/keys" component={KeyManagement} />
      <Route path="/users" component={Users} />
      <Route path="/servers" component={Servers} />
      <Route path="/backups" component={BackupsPage} />
      <Route path="/activity" component={ActivityLogs} />
      <Route path="/settings" component={Settings} />
      <Route path="/bot-settings" component={BotSettings} />
      <Route path="/invite-bot" component={InviteBot} />
      <Route path="/invite-success" component={InviteSuccess} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;