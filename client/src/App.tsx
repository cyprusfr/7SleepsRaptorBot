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
import { useEffect, useState, Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ReactErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function RouterTest() {
  try {
    return (
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
        <p>✓ Router component loaded</p>
        <div style={{ marginTop: '10px' }}>
          <h4>Testing useAuth hook:</h4>
          <UseAuthTest />
        </div>
      </div>
    );
  } catch (error) {
    console.error('RouterTest error:', error);
    return <div>❌ Router failed: {String(error)}</div>;
  }
}

function UseAuthTest() {
  try {
    const { isAuthenticated, isLoading } = useAuth();
    return (
      <div style={{ padding: '10px', backgroundColor: '#e0e0e0' }}>
        <p>✓ useAuth hook loaded</p>
        <p>Loading: {isLoading ? 'true' : 'false'}</p>
        <p>Authenticated: {isAuthenticated ? 'true' : 'false'}</p>
        {!isLoading && !isAuthenticated && (
          <div style={{ marginTop: '10px' }}>
            <h5>Testing AuthFlow:</h5>
            <AuthFlowTest />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('UseAuthTest error:', error);
    return <div>❌ useAuth hook failed: {String(error)}</div>;
  }
}

function AuthFlowTest() {
  try {
    return (
      <div style={{ padding: '10px', backgroundColor: '#d0d0d0' }}>
        <p>✓ AuthFlow would load here</p>
        <p>This is where the authentication interface should appear</p>
      </div>
    );
  } catch (error) {
    console.error('AuthFlowTest error:', error);
    return <div>❌ AuthFlow failed: {String(error)}</div>;
  }
}

function SafeRouter() {
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

  // Simplified authenticated view to test components one by one
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Authenticated Dashboard</h1>
      <p>User is authenticated. Testing dashboard components...</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Component Tests:</h2>
        
        <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd' }}>
          <h3>1. Testing GlobalSyncStatus:</h3>
          <ComponentTest name="GlobalSyncStatus" component={<GlobalSyncStatus />} />
        </div>

        <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd' }}>
          <h3>2. Testing Dashboard Component:</h3>
          <ComponentTest name="Dashboard" component={<Dashboard />} />
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.reload()}>Reload Page</button>
        <button onClick={() => localStorage.clear()} style={{ marginLeft: '10px' }}>
          Clear Storage
        </button>
      </div>
    </div>
  );
}

function ComponentTest({ name, component }: { name: string; component: React.ReactNode }) {
  try {
    return (
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
        <p>✓ {name} component loading...</p>
        <div style={{ marginTop: '10px', border: '1px solid #ccc', padding: '10px' }}>
          {component}
        </div>
      </div>
    );
  } catch (error) {
    console.error(`${name} component error:`, error);
    return <div>❌ {name} failed: {String(error)}</div>;
  }
}

function MinimalAuthTest() {
  try {
    const { isAuthenticated, isLoading, user } = useAuth();
    
    return (
      <div style={{ padding: '10px', backgroundColor: '#e0e0e0' }}>
        <p>✓ useAuth hook working</p>
        <p>Loading: {isLoading ? 'true' : 'false'}</p>
        <p>Authenticated: {isAuthenticated ? 'true' : 'false'}</p>
        
        {!isLoading && (
          <div style={{ marginTop: '10px' }}>
            <h4>Step 3: Authentication Flow</h4>
            {!isAuthenticated ? (
              <div style={{ padding: '10px', backgroundColor: '#d0d0d0' }}>
                <p>User not authenticated - would show AuthFlow</p>
                <button 
                  onClick={() => window.location.href = '/api/login'}
                  style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Start Authentication
                </button>
              </div>
            ) : (
              <div style={{ padding: '10px', backgroundColor: '#d0d0d0' }}>
                <p>✓ User authenticated successfully</p>
                <p>Ready to show dashboard</p>
                <MinimalDashboardTest />
              </div>
            )}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('MinimalAuthTest error:', error);
    return <div>❌ Auth test failed: {String(error)}</div>;
  }
}

function MinimalDashboardTest() {
  try {
    return (
      <div style={{ padding: '10px', backgroundColor: '#c0c0c0', marginTop: '10px' }}>
        <h4>Step 4: Dashboard Test</h4>
        <p>✓ Dashboard area loaded</p>
        <p>This is where the main dashboard would appear</p>
        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', marginRight: '8px' }}
          >
            Reload App
          </button>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Clear Storage
          </button>
        </div>
      </div>
    );
  } catch (error) {
    console.error('MinimalDashboardTest error:', error);
    return <div>❌ Dashboard test failed: {String(error)}</div>;
  }
}

function WorkingRouter() {
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
    return (
      <ReactErrorBoundary fallback={<FallbackApp />}>
        <AuthFlow onComplete={() => window.location.reload()} />
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary fallback={<FallbackApp />}>
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
      </Switch>
    </ReactErrorBoundary>
  );
}

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
  const [hasGenericError, setHasGenericError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setErrorMessage(event.error?.message || 'Unknown error');
      
      if (event.error?.message?.includes('FILE_ERROR_NO_SPACE') || 
          event.error?.message?.includes('QuotaExceededError') ||
          event.error?.message?.includes('QUOTA_EXCEEDED')) {
        setHasStorageError(true);
      } else {
        setHasGenericError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setErrorMessage(event.reason?.message || 'Promise rejection');
      
      if (event.reason?.message?.includes('FILE_ERROR_NO_SPACE') ||
          event.reason?.message?.includes('QuotaExceededError') ||
          event.reason?.message?.includes('QUOTA_EXCEEDED')) {
        setHasStorageError(true);
      } else {
        setHasGenericError(true);
      }
    };

    // Check for immediate errors
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (error) {
      console.error('Storage test failed:', error);
      setHasStorageError(true);
    }

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

  if (hasGenericError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">💥</div>
          <h1 className="text-xl font-bold mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">
            Something went wrong loading the application.
          </p>
          {errorMessage && (
            <div className="bg-gray-100 p-3 rounded text-sm text-left mb-4">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
            <Button onClick={clearBrowserData} variant="outline" className="w-full">
              Clear Data & Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function FallbackApp() {
  const [showDebug, setShowDebug] = useState(false);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-xl font-bold mb-4">Application Loading</h1>
        <p className="text-gray-600 mb-4">
          If you see this screen, the app is having trouble loading.
        </p>
        <div className="space-y-3">
          <Button onClick={() => setShowDebug(!showDebug)} variant="outline" className="w-full">
            Toggle Debug Info
          </Button>
          {showDebug && (
            <div className="bg-gray-100 p-3 rounded text-sm text-left">
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>Location:</strong> {window.location.href}</p>
              <p><strong>Storage Test:</strong> {(() => {
                try {
                  localStorage.setItem('test', 'test');
                  localStorage.removeItem('test');
                  return 'PASS';
                } catch (e) {
                  return `FAIL: ${e.message}`;
                }
              })()}</p>
            </div>
          )}
          <Button onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }} className="w-full">
            Clear Storage & Reload
          </Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = () => setHasError(true);
    const handleRejection = () => setHasError(true);
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return <FallbackApp />;
  }

  return (
    <ReactErrorBoundary fallback={<FallbackApp />}>
      <StorageErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ReactErrorBoundary fallback={<FallbackApp />}>
              <Toaster />
              {(() => {
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
                  <div className="min-h-screen bg-gray-50">
                    <GlobalSyncStatus />
                    <div className="container mx-auto px-4 py-8">
                      <Dashboard />
                    </div>
                  </div>
                );
              })()}
            </ReactErrorBoundary>
          </TooltipProvider>
        </QueryClientProvider>
      </StorageErrorBoundary>
    </ReactErrorBoundary>
  );
}

function SimpleWorkingApp() {
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

  // Simple authenticated dashboard without complex routing
  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalSyncStatus />
      <div className="container mx-auto px-4 py-8">
        <Dashboard />
      </div>
    </div>
  );
}

export default App;
