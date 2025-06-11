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
  Crown
} from "lucide-react";

export function HiddenAdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Override console.log to detect the secret phrase
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ').toLowerCase();
      if (message === 'omg im so cool') {
        setIsAuthenticated(true);
        setIsOpen(true);
        toast({
          title: "Admin Access Granted",
          description: "Secret admin panel unlocked!",
        });
      } else if (isOpen && !isAuthenticated) {
        toast({
          title: "Not Authorized",
          description: "Access denied to admin panel.",
          variant: "destructive",
        });
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.log = originalLog;
    };
  }, [isOpen, isAuthenticated, toast]);

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Database className="h-4 w-4" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Operational</Badge>
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
                  <Server className="h-4 w-4" />
                  Bot Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Online</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin Actions
              </CardTitle>
              <CardDescription>
                Execute system-level operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  onClick={() => executeAdminAction.mutate({ action: "clear_cache" })}
                  disabled={executeAdminAction.isPending}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => executeAdminAction.mutate({ action: "refresh_stats" })}
                  disabled={executeAdminAction.isPending}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh Stats
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => executeAdminAction.mutate({ action: "sync_discord" })}
                  disabled={executeAdminAction.isPending}
                >
                  <Server className="h-4 w-4 mr-2" />
                  Sync Discord
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => executeAdminAction.mutate({ action: "emergency_stop" })}
                  disabled={executeAdminAction.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent System Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Activity Log
              </CardTitle>
              <CardDescription>
                Recent system operations and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(systemLogs as any[])?.slice(0, 10).map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
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