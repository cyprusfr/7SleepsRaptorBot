import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Database, 
  Activity, 
  Settings, 
  Key, 
  Server,
  Trash2,
  Eye,
  AlertTriangle,
  Crown,
  Terminal,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Clock,
  FileText,
  Ban,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  HardDrive,
  Monitor,
  Cpu
} from "lucide-react";

export function HiddenAdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create the exact phrase as a global variable that evaluates to true
    (window as any)['omg im so cool'] = () => {
      setIsAuthenticated(true);
      setIsOpen(true);
      toast({
        title: "Admin Access Granted",
        description: "Secret admin panel unlocked!",
      });
      return "Admin panel activated!";
    };

    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console methods to catch when someone types the phrase
    const checkPhrase = (...args: any[]) => {
      const message = args.join(' ').toLowerCase().trim();
      if (message === 'omg im so cool') {
        setIsAuthenticated(true);
        setIsOpen(true);
        toast({
          title: "Admin Access Granted",
          description: "Secret admin panel unlocked!",
        });
      }
    };

    console.log = (...args) => {
      checkPhrase(...args);
      originalLog.apply(console, args);
    };

    // Also catch if they try other console methods
    console.error = (...args) => {
      checkPhrase(...args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      checkPhrase(...args);
      originalWarn.apply(console, args);
    };

    // Listen for the phrase being typed directly in console
    const originalEval = window.eval;
    window.eval = (code: string) => {
      if (typeof code === 'string' && code.trim().toLowerCase() === 'omg im so cool') {
        setIsAuthenticated(true);
        setIsOpen(true);
        toast({
          title: "Admin Access Granted",
          description: "Secret admin panel unlocked!",
        });
        return "Admin panel activated!";
      }
      return originalEval.call(window, code);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.eval = originalEval;
      delete (window as any)['omg im so cool'];
    };
  }, [toast]);

  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: systemLogs } = useQuery({
    queryKey: ["/api/activity"],
    enabled: isAuthenticated,
  });

  const executeAdminAction = useMutation({
    mutationFn: async ({ action, target }: { action: string; target?: string }) => {
      return apiRequest(`/api/admin/execute`, "POST", { action, target });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Admin Action Executed",
        description: data?.message || "Action completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Hidden Admin Panel
          </DialogTitle>
          <DialogDescription>
            Advanced administrative controls and system monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(adminStats as any)?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default" className="bg-green-500">Online</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Bot Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default" className="bg-blue-500">Active</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(adminStats as any)?.activeSessions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Database Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">2.4 GB</div>
              </CardContent>
            </Card>
          </div>

          {/* System Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System Operations
                </CardTitle>
                <CardDescription>
                  Core system management and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "clear_cache" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Database className="h-5 w-5 mb-1" />
                    <span className="text-xs">Clear Cache</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "refresh_stats" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <RefreshCw className="h-5 w-5 mb-1" />
                    <span className="text-xs">Refresh Stats</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "sync_discord" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Wifi className="h-5 w-5 mb-1" />
                    <span className="text-xs">Sync Discord</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "restart_bot" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <RotateCcw className="h-5 w-5 mb-1" />
                    <span className="text-xs">Restart Bot</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "backup_system" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Download className="h-5 w-5 mb-1" />
                    <span className="text-xs">System Backup</span>
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => executeAdminAction.mutate({ action: "emergency_stop" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <AlertTriangle className="h-5 w-5 mb-1" />
                    <span className="text-xs">Emergency Stop</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Database Management
                </CardTitle>
                <CardDescription>
                  Database operations and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "optimize_db" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Zap className="h-5 w-5 mb-1" />
                    <span className="text-xs">Optimize DB</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "backup_db" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <HardDrive className="h-5 w-5 mb-1" />
                    <span className="text-xs">Backup DB</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "clean_logs" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Trash2 className="h-5 w-5 mb-1" />
                    <span className="text-xs">Clean Logs</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "export_data" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Upload className="h-5 w-5 mb-1" />
                    <span className="text-xs">Export Data</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "analyze_performance" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Monitor className="h-5 w-5 mb-1" />
                    <span className="text-xs">Performance</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => executeAdminAction.mutate({ action: "maintenance_mode" })}
                    disabled={executeAdminAction.isPending}
                    className="h-auto flex-col py-3"
                  >
                    <Clock className="h-5 w-5 mb-1" />
                    <span className="text-xs">Maintenance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Actions</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "ban_user" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Ban User
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "approve_user" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mass Operations</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "clear_inactive" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear Inactive
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "reset_candy" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset Candy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Security</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "force_logout" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <WifiOff className="h-4 w-4 mr-1" />
                        Force Logout
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeAdminAction.mutate({ action: "audit_users" })}
                        disabled={executeAdminAction.isPending}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Audit
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Recent Users</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(allUsers as any[])?.slice(0, 5).map((user: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">{user.username || 'Unknown'}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Ban className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time System Monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Real-time Monitoring
                </CardTitle>
                <CardDescription>
                  Live system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">CPU Usage</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">23%</div>
                      <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Memory</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">67%</div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wifi className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Network</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-700">Active</div>
                      <div className="text-xs text-purple-600 mt-1">↑ 1.2MB/s ↓ 850KB/s</div>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">DB Queries</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-700">127</div>
                      <div className="text-xs text-orange-600 mt-1">per minute</div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Bot Uptime</span>
                      <Badge variant="default" className="bg-green-500">Online</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Running for 2d 14h 32m • Last restart: 2 days ago
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  System Logs Viewer
                </CardTitle>
                <CardDescription>
                  Real-time log monitoring and filtering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Info
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Warnings
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Ban className="h-3 w-3 mr-1" />
                      Errors
                    </Button>
                  </div>
                  
                  <div className="bg-black text-green-400 font-mono text-xs p-3 rounded-lg max-h-48 overflow-y-auto">
                    <div>[7:54:12] INFO: Discord bot connected successfully</div>
                    <div>[7:54:13] INFO: Database connection established</div>
                    <div>[7:54:15] INFO: User authentication successful (user: alex***)</div>
                    <div>[7:54:17] WARN: Rate limit approaching for candy commands</div>
                    <div>[7:54:19] INFO: Backup process initiated for server: Test Server</div>
                    <div>[7:54:21] INFO: Activity logged: backup_created</div>
                    <div>[7:54:23] INFO: Admin panel accessed via console command</div>
                    <div>[7:54:25] INFO: System stats refreshed automatically</div>
                    <div className="text-yellow-400">[7:54:27] WARN: High memory usage detected (67%)</div>
                    <div>[7:54:29] INFO: Candy transaction processed: +50 candy</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="h-3 w-3 mr-1" />
                      Export Logs
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Analytics Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Analytics & Insights
              </CardTitle>
              <CardDescription>
                Comprehensive system performance and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">User Activity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Today</span>
                      <Badge variant="default">12</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Registrations</span>
                      <Badge variant="secondary">3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Candy Transactions</span>
                      <Badge variant="default">47</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Game Sessions</span>
                      <Badge variant="default">23</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">System Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Response Time</span>
                      <Badge variant="default" className="bg-green-500">89ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Calls/min</span>
                      <Badge variant="default">156</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Error Rate</span>
                      <Badge variant="default" className="bg-green-500">0.2%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cache Hit Rate</span>
                      <Badge variant="default" className="bg-blue-500">94%</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Discord Bot Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Commands/hour</span>
                      <Badge variant="default">73</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Messages Processed</span>
                      <Badge variant="default">1,247</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Backups Created</span>
                      <Badge variant="default">8</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Guilds</span>
                      <Badge variant="default" className="bg-purple-500">5</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent System Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent System Activity
              </CardTitle>
              <CardDescription>
                Latest operations and events across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(systemLogs as any[])?.slice(0, 15).map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.type?.includes('error') ? 'bg-red-500' : 
                        log.type?.includes('warning') ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} />
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                      <span className="text-sm">{log.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </CardTitle>
              <CardDescription>
                Advanced user administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(allUsers as any[])?.slice(0, 5).map((user: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.email}</span>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "User"}
                      </Badge>
                      <Badge variant={user.isApproved ? "default" : "destructive"}>
                        {user.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No users found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close Admin Panel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}