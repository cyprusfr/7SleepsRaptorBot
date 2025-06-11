import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Plus, Users as UsersIcon, Download, Shield, Activity, Gamepad2, Database, RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import ActivityFeed from "@/components/activity-feed";
import KeyTable from "@/components/key-table";
import PhraseAuth from "@/components/PhraseAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Key, CheckCircle, Users, Server } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  totalUsers: number;
  connectedServers: number;
  botStatus: "online" | "offline";
  lastSync: string;
  totalCandy?: number;
  activeGames?: number;
  systemHealth?: "healthy" | "warning" | "critical";
  uptime?: number;
}

interface Server {
  id: number;
  serverId: string;
  serverName: string;
  memberCount: number;
  isActive: boolean;
  lastDataSync: string;
}

function DashboardContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/activity"],
  });

  const { data: keys = [], isLoading: keysLoading } = useQuery<any[]>({
    queryKey: ["/api/keys"],
  });

  const { data: servers = [], isLoading: serversLoading } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
  });

  const { data: candyStats } = useQuery<{ totalCandy: number; activeGames: number }>({
    queryKey: ["/api/candy/stats"],
  });

  // Backup mutation
  const createBackup = useMutation({
    mutationFn: async ({ serverId, backupType }: { serverId: string; backupType: string }) => {
      return apiRequest(`/api/servers/${serverId}/backup`, "POST", { backupType });
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Server backup has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh stats mutation
  const refreshStats = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/refresh-stats", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Stats Refreshed",
        description: "Dashboard statistics have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const handleGenerateKey = () => {
    // TODO: Open key generation modal
    console.log("Generate key");
  };

  const handleLookupUser = () => {
    // TODO: Open user lookup modal
    console.log("Lookup user");
  };

  const handleExportData = () => {
    // TODO: Export data
    const link = document.createElement("a");
    link.href = "/api/export?type=all";
    link.download = `raptor-export-${Date.now()}.json`;
    link.click();
  };

  if (statsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        botStatus={stats?.botStatus || "offline"}
        lastSync={stats?.lastSync ? formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true }) : "Never"}
      />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
              <p className="text-gray-600 mt-1">Monitor your Discord bot's activity and manage keys</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search users, keys..."
                  className="pl-10 pr-4 py-2 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-discord-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">Super Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <StatsCard
              title="Total Keys"
              value={stats?.totalKeys || 0}
              description="Keys Generated"
              icon={<Key className="w-6 h-6" />}
              trend={{ value: "+12%", isPositive: true }}
              color="primary"
            />
            <StatsCard
              title="Active Keys"
              value={stats?.activeKeys || 0}
              description="Active Whitelisted"
              icon={<CheckCircle className="w-6 h-6" />}
              trend={{ value: "+8%", isPositive: true }}
              color="green"
            />
            <StatsCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              description="Registered Users"
              icon={<Users className="w-6 h-6" />}
              trend={{ value: "+3%", isPositive: true }}
              color="blue"
            />
            <StatsCard
              title="Connected Servers"
              value={stats?.connectedServers || 0}
              description="Connected Servers"
              icon={<Server className="w-6 h-6" />}
              trend={{ value: "+2", isPositive: true }}
              color="purple"
            />
            <StatsCard
              title="Total Candy"
              value={candyStats?.totalCandy || 0}
              description="Currency in Circulation"
              icon={<Gamepad2 className="w-6 h-6" />}
              trend={{ value: "+25%", isPositive: true }}
              color="yellow"
            />
            <StatsCard
              title="System Health"
              value={stats?.systemHealth === "healthy" ? "Healthy" : stats?.systemHealth === "warning" ? "Warning" : "Critical"}
              description="Bot Performance"
              icon={<Activity className="w-6 h-6" />}
              trend={{ value: stats?.systemHealth === "healthy" ? "Good" : "Issues", isPositive: stats?.systemHealth === "healthy" }}
              color={stats?.systemHealth === "healthy" ? "green" : stats?.systemHealth === "warning" ? "yellow" : "red"}
            />
          </div>

          {/* Server Backup Panel */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Server Backup Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Create New Backup</h3>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                    >
                      <option value="">Select Server to Backup</option>
                      {servers.map((server) => (
                        <option key={server.serverId} value={server.serverId}>
                          {server.serverName} ({server.memberCount} members)
                        </option>
                      ))}
                    </select>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        onClick={() => selectedServer && createBackup.mutate({ serverId: selectedServer, backupType: 'full' })}
                        disabled={!selectedServer || createBackup.isPending}
                        className="w-full"
                        size="sm"
                      >
                        {createBackup.isPending ? 'Creating...' : 'Full Backup'}
                      </Button>
                      <Button 
                        onClick={() => selectedServer && createBackup.mutate({ serverId: selectedServer, backupType: 'channels' })}
                        disabled={!selectedServer || createBackup.isPending}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        Channels Only
                      </Button>
                      <Button 
                        onClick={() => selectedServer && createBackup.mutate({ serverId: selectedServer, backupType: 'roles' })}
                        disabled={!selectedServer || createBackup.isPending}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        Roles Only
                      </Button>
                    </div>
                    
                    {selectedServer && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-700">
                          <strong>Selected:</strong> {servers.find(s => s.serverId === selectedServer)?.serverName}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Full backup includes channels, roles, permissions, and server settings
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Server Status</h3>
                    <div className="space-y-2">
                      {servers.slice(0, 3).map((server) => (
                        <div key={server.serverId} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${server.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="font-medium text-sm">{server.serverName}</p>
                              <p className="text-xs text-gray-500">{server.memberCount} members</p>
                            </div>
                          </div>
                          <Badge variant={server.isActive ? "default" : "secondary"}>
                            {server.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <ActivityFeed activities={activities.slice(0, 10)} />

            {/* Quick Actions & Server Status */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleGenerateKey}
                    className="w-full bg-discord-primary hover:bg-discord-secondary text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate New Key
                  </Button>
                  <Button
                    onClick={handleLookupUser}
                    variant="outline"
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Lookup User
                  </Button>
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </CardContent>
              </Card>

              {/* Server Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Server Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serversLoading ? (
                      <div className="animate-pulse space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    ) : servers.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No servers connected</p>
                      </div>
                    ) : (
                      servers.slice(0, 3).map((server) => (
                        <div
                          key={server.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-discord-primary/10 rounded-lg flex items-center justify-center">
                              <Server className="w-4 h-4 text-discord-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {server.serverName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {server.memberCount.toLocaleString()} members
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                server.isActive ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium ${
                                server.isActive
                                  ? "text-green-600 bg-green-100"
                                  : "text-red-600 bg-red-100"
                              }`}
                            >
                              {server.isActive ? "Online" : "Offline"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Key Management Table */}
          <KeyTable
            keys={keys.slice(0, 10)}
            onViewKey={(keyId) => console.log("View key:", keyId)}
            onRevokeKey={(keyId) => console.log("Revoke key:", keyId)}
            onRestoreKey={(keyId) => console.log("Restore key:", keyId)}
            onFilterChange={(filter) => console.log("Filter change:", filter)}
          />
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
