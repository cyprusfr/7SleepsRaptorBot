import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Download, Trash2, Eye, Calendar, HardDrive, Users, MessageSquare, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BackupData {
  serverId: string;
  serverName: string;
  backupType: string;
  timestamp: string;
  createdBy: string;
  channels?: any[];
  members?: any[];
  roles?: any[];
  messages?: any[];
  serverInfo?: any;
}

interface Server {
  id: number;
  serverId: string;
  serverName: string;
  permissions?: {
    backupData?: BackupData;
    lastBackup?: string;
    backupSize?: number;
  };
}

export default function BackupManagement() {
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [selectedBackupType, setSelectedBackupType] = useState<string>("full");
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading } = useQuery<Server[]>({
    queryKey: ['/api/servers'],
  });

  const { data: stats = { totalKeys: 0, activeKeys: 0, totalUsers: 0, connectedServers: 0 } } = useQuery<{
    totalKeys: number;
    activeKeys: number;
    totalUsers: number;
    connectedServers: number;
  }>({
    queryKey: ['/api/stats'],
  });

  const createBackupMutation = useMutation({
    mutationFn: async ({ serverId, type }: { serverId: string; type: string }) => {
      const response = await fetch(`/api/servers/${serverId}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (!response.ok) throw new Error('Failed to create backup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const response = await fetch(`/api/servers/${serverId}/backup`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete backup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    }
  });

  const serversWithBackups = (servers as Server[]).filter((server: Server) => 
    server.permissions?.backupData
  );

  const totalBackupSize = serversWithBackups.reduce((total: number, server: Server) => 
    total + (server.permissions?.backupSize || 0), 0
  );

  const handleCreateBackup = () => {
    if (selectedServer && selectedBackupType) {
      createBackupMutation.mutate({
        serverId: selectedServer,
        type: selectedBackupType
      });
    }
  };

  const handleDeleteBackup = (serverId: string) => {
    deleteBackupMutation.mutate(serverId);
  };

  const renderBackupDetails = (backup: BackupData) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Backup Type</p>
          <p className="text-lg font-bold text-blue-600 capitalize">{backup.backupType}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-900">Created</p>
          <p className="text-lg font-bold text-green-600">
            {formatDistanceToNow(new Date(backup.timestamp))} ago
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {backup.channels && (
          <div className="text-center p-3 bg-blue-50 rounded-lg border">
            <Database className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-xl font-bold text-blue-600">{backup.channels.length}</p>
            <p className="text-sm text-blue-600">Channels</p>
          </div>
        )}
        {backup.members && (
          <div className="text-center p-3 bg-green-50 rounded-lg border">
            <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-xl font-bold text-green-600">{backup.members.length}</p>
            <p className="text-sm text-green-600">Members</p>
          </div>
        )}
        {backup.roles && (
          <div className="text-center p-3 bg-purple-50 rounded-lg border">
            <Shield className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-xl font-bold text-purple-600">{backup.roles.length}</p>
            <p className="text-sm text-purple-600">Roles</p>
          </div>
        )}
        {backup.messages && (
          <div className="text-center p-3 bg-orange-50 rounded-lg border">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <p className="text-xl font-bold text-orange-600">{backup.messages.length}</p>
            <p className="text-sm text-orange-600">Messages</p>
          </div>
        )}
      </div>

      {backup.serverInfo && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-3">Server Information</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Owner ID:</span>
              <span className="text-gray-600">{backup.serverInfo.ownerId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created:</span>
              <span className="text-gray-600">
                {backup.serverInfo.createdAt ? 
                  formatDistanceToNow(new Date(backup.serverInfo.createdAt)) + ' ago' : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Premium Tier:</span>
              <span className="text-gray-600">{backup.serverInfo.premiumTier || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Features:</span>
              <span className="text-gray-600">{backup.serverInfo.features?.length || 0} features</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar botStatus="offline" lastSync="Never" />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
              <p className="text-gray-600">Create, view, and manage server backups</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-4">
                  {serversWithBackups.length}
                </div>
                <p className="text-gray-600 text-sm">Total Backups</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600 mt-4">
                  {Math.round(totalBackupSize / 1024)} KB
                </div>
                <p className="text-gray-600 text-sm">Storage Used</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-4">
                  {serversWithBackups.length > 0 ? 
                    formatDistanceToNow(new Date(Math.max(...serversWithBackups.map((s: Server) => 
                      new Date(s.permissions?.lastBackup || 0).getTime())))) + ' ago'
                    : 'Never'
                  }
                </div>
                <p className="text-gray-600 text-sm">Last Backup</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-4">
                  {servers.length}
                </div>
                <p className="text-gray-600 text-sm">Connected Servers</p>
              </CardContent>
            </Card>
          </div>

          {/* Create Backup Section */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Server</label>
                  <Select value={selectedServer} onValueChange={setSelectedServer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a server" />
                    </SelectTrigger>
                    <SelectContent>
                      {(servers as Server[]).map((server: Server) => (
                        <SelectItem key={server.serverId} value={server.serverId}>
                          {server.serverName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Backup Type</label>
                  <Select value={selectedBackupType} onValueChange={setSelectedBackupType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="members">Members Only</SelectItem>
                      <SelectItem value="channels">Channels Only</SelectItem>
                      <SelectItem value="roles">Roles Only</SelectItem>
                      <SelectItem value="messages">Messages Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleCreateBackup}
                    disabled={!selectedServer || createBackupMutation.isPending}
                    className="w-full"
                  >
                    {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Backups */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Backups</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : serversWithBackups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No backups found</p>
                  <p className="text-sm">Create your first backup above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {serversWithBackups.map((server: Server) => {
                    const backup = server.permissions?.backupData!;
                    return (
                      <div key={server.serverId} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-discord-primary/10 rounded-lg flex items-center justify-center">
                              <Database className="w-6 h-6 text-discord-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{server.serverName}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Type: {backup.backupType}</span>
                                <span>Created: {formatDistanceToNow(new Date(backup.timestamp))} ago</span>
                                <span>Size: {Math.round((server.permissions?.backupSize || 0) / 1024)} KB</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {backup.backupType.toUpperCase()}
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Backup Details - {server.serverName}</DialogTitle>
                                </DialogHeader>
                                {renderBackupDetails(backup)}
                              </DialogContent>
                            </Dialog>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteBackup(server.serverId)}
                              disabled={deleteBackupMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}