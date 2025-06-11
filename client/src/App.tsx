import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import KeyManagement from "@/pages/key-management";
import Users from "@/pages/users";
import Servers from "@/pages/servers";
import ActivityLogs from "@/pages/activity-logs";
import Settings from "@/pages/settings";
import BackupManagement from "@/pages/backup-management";
import BackupHistory from "@/pages/backup-history";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/keys" component={KeyManagement} />
      <Route path="/users" component={Users} />
      <Route path="/servers" component={Servers} />
      <Route path="/backups" component={BackupManagement} />
      <Route path="/backup-history" component={BackupHistory} />
      <Route path="/activity" component={ActivityLogs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
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
