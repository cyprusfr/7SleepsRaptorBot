import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { HiddenAdminPanel } from "@/components/HiddenAdminPanel";
import AuthFlow from "@/components/AuthFlow";
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
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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

  if (!isAuthenticated) {
    return <AuthFlow onComplete={() => window.location.reload()} />;
  }

  return (
    <Switch>
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
      <HiddenAdminPanel />
    </Switch>
  );
}

function StorageErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasStorageError, setHasStorageError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('FILE_ERROR_NO_SPACE') || 
          event.error?.message?.includes('QuotaExceededError') ||
          event.error?.message?.includes('QUOTA_EXCEEDED')) {
        setHasStorageError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('FILE_ERROR_NO_SPACE') ||
          event.reason?.message?.includes('QuotaExceededError') ||
          event.reason?.message?.includes('QUOTA_EXCEEDED')) {
        setHasStorageError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const clearBrowserData = () => {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing browser data:', error);
      // Force reload even if clearing fails
      window.location.reload();
    }
  };

  if (hasStorageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-4">Storage Quota Exceeded</h1>
          <p className="text-gray-600 mb-6">
            Your browser storage is full. Clear browser data to continue.
          </p>
          <div className="space-y-3">
            <Button onClick={clearBrowserData} className="w-full">
              Clear Data & Reload
            </Button>
            <p className="text-xs text-gray-500">
              This will clear all browser storage and reload the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <StorageErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </StorageErrorBoundary>
  );
}

export default App;
