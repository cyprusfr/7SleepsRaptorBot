import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { HiddenAdminPanel } from "@/components/HiddenAdminPanel";
import DashboardKeyAuth from "@/components/DashboardKeyAuth";
import { GlobalSyncStatus } from "@/components/GlobalSyncStatus";
import Dashboard from "@/pages/dashboard";
import KeyManagement from "@/pages/key-management";
import Users from "@/pages/users";
import Servers from "@/pages/servers";
import ActivityLogs from "@/pages/activity-logs";
import Settings from "@/pages/settings";
import BackupsPage from "@/pages/backups";
import AdminPanel from "@/pages/admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, dashboardKeyRequired, hasDashboardKey } = useAuth();

  // Force show dashboard key auth if neither authenticated nor has dashboard key
  const shouldShowDashboardAuth = !isAuthenticated && !hasDashboardKey && !isLoading;

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

  if (shouldShowDashboardAuth) {
    return <DashboardKeyAuth onAuthenticated={() => window.location.reload()} />;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route component={Login} />
        </>
      ) : (
        <>
          <GlobalSyncStatus />
          <Route path="/" component={Dashboard} />
          <Route path="/keys" component={KeyManagement} />
          <Route path="/users" component={Users} />
          <Route path="/servers" component={Servers} />
          <Route path="/backups" component={BackupsPage} />
          <Route path="/activity" component={ActivityLogs} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPanel} />
          <Route component={NotFound} />
        </>
      )}
      <HiddenAdminPanel />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
