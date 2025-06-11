import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Server, Users, Calendar, Activity, Database, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscordServer {
  id: number;
  serverId: string;
  serverName: string;
  memberCount: number;
  botJoinedAt: string;
  lastDataSync: string;
  permissions?: any;
  isActive: boolean;
}

export default function Servers() {
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: servers = [], isLoading } = useQuery<DiscordServer[]>({
    queryKey: ["/api/servers"],
  });

  const activeServers = servers.filter(s => s.isActive);
  const totalMembers = servers.reduce((sum, s) => sum + s.memberCount, 0);

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
              <h2 className="text-2xl font-bold text-gray-900">Server Data</h2>
              <p className="text-gray-600 mt-1">Monitor connected Discord servers</p>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Server className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {servers.length}
                </div>
                <p className="text-gray-600 text-sm">Total Servers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {activeServers.length}
                </div>
                <p className="text-gray-600 text-sm">Active Servers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalMembers.toLocaleString()}
                </div>
                <p className="text-gray-600 text-sm">Total Members</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {activeServers.length > 0 ? Math.round(totalMembers / activeServers.length) : 0}
                </div>
                <p className="text-gray-600 text-sm">Avg Members</p>
              </CardContent>
            </Card>
          </div>

          {/* Servers List */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Servers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : servers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No servers connected</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {servers.map((server) => (
                    <div key={server.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-discord-primary/10 rounded-lg flex items-center justify-center">
                            <Server className="w-6 h-6 text-discord-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {server.serverName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {server.serverId}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Joined {formatDistanceToNow(new Date(server.botJoinedAt), { addSuffix: true })}
                              </span>
                              <span className="text-xs text-gray-500">
                                Last sync {formatDistanceToNow(new Date(server.lastDataSync), { addSuffix: true })}
                              </span>
                              {server.permissions?.lastBackup && (
                                <span className="text-xs text-orange-600 flex items-center">
                                  <Database className="w-3 h-3 mr-1" />
                                  Backup {formatDistanceToNow(new Date(server.permissions.lastBackup), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {server.memberCount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">members</div>
                          </div>
                          {server.permissions?.lastBackup && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Backup
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>Backup Details - {server.serverName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <p className="text-sm font-medium text-blue-900">Backup Type</p>
                                      <p className="text-lg font-bold text-blue-600 capitalize">
                                        {server.permissions.backupType || 'Full'}
                                      </p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                      <p className="text-sm font-medium text-green-900">Data Size</p>
                                      <p className="text-lg font-bold text-green-600">
                                        {server.permissions.backupSize 
                                          ? `${Math.round(server.permissions.backupSize / 1024)} KB`
                                          : 'Unknown'
                                        }
                                      </p>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-lg">
                                      <p className="text-sm font-medium text-orange-900">Created</p>
                                      <p className="text-lg font-bold text-orange-600">
                                        {formatDistanceToNow(new Date(server.permissions.lastBackup))} ago
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {server.permissions.backupData && (
                                    <div className="space-y-4">
                                      <h4 className="font-medium text-lg">Backup Contents</h4>
                                      <div className="grid grid-cols-3 gap-4">
                                        {server.permissions.backupData.channels && (
                                          <div className="text-center p-4 bg-blue-50 rounded-lg border">
                                            <p className="text-3xl font-bold text-blue-600">
                                              {server.permissions.backupData.channels.length}
                                            </p>
                                            <p className="text-sm font-medium text-blue-600">Channels</p>
                                          </div>
                                        )}
                                        {server.permissions.backupData.members && (
                                          <div className="text-center p-4 bg-green-50 rounded-lg border">
                                            <p className="text-3xl font-bold text-green-600">
                                              {server.permissions.backupData.members.length}
                                            </p>
                                            <p className="text-sm font-medium text-green-600">Members</p>
                                          </div>
                                        )}
                                        {server.permissions.backupData.roles && (
                                          <div className="text-center p-4 bg-purple-50 rounded-lg border">
                                            <p className="text-3xl font-bold text-purple-600">
                                              {server.permissions.backupData.roles.length}
                                            </p>
                                            <p className="text-sm font-medium text-purple-600">Roles</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {server.permissions.backupData.serverInfo && (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                          <p className="text-sm font-medium mb-3">Server Information</p>
                                          <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex justify-between">
                                              <span className="font-medium">Owner ID:</span> 
                                              <span className="text-gray-600">{server.permissions.backupData.serverInfo.ownerId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-medium">Created:</span> 
                                              <span className="text-gray-600">
                                                {server.permissions.backupData.serverInfo.createdAt ? 
                                                  formatDistanceToNow(new Date(server.permissions.backupData.serverInfo.createdAt)) + ' ago' : 'Unknown'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-medium">Premium Tier:</span> 
                                              <span className="text-gray-600">{server.permissions.backupData.serverInfo.premiumTier || 'None'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-medium">Features:</span> 
                                              <span className="text-gray-600">{server.permissions.backupData.serverInfo.features?.length || 0} features</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-medium">Verification Level:</span> 
                                              <span className="text-gray-600">{server.permissions.backupData.serverInfo.verificationLevel || 'None'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="font-medium">MFA Level:</span> 
                                              <span className="text-gray-600">{server.permissions.backupData.serverInfo.mfaLevel || 'None'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
