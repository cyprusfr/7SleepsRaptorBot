import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { Clock, Database, Download, Trash2, Server, Users, MessageSquare, Shield, MoreVertical, FileDown, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BackupItem {
  id: string;
  serverId: string;
  serverName: string;
  type: string;
  size: number;
  createdAt: string;
  metadata: {
    memberCount?: number;
    channelCount?: number;
    messageCount?: number;
    roleCount?: number;
  };
}

export default function BackupHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: backups = [], isLoading } = useQuery<BackupItem[]>({
    queryKey: ['/api/backups/history'],
  });

  const createBackupMutation = useMutation({
    mutationFn: async ({ serverId, type }: { serverId: string; type: string }) => {
      return apiRequest(`/api/servers/${serverId}/backup`, 'POST', { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backups/history'] });
      toast({
        title: "Backup Created",
        description: "Server backup has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Backup Failed", 
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest(`/api/backups/${backupId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backups/history'] });
      toast({
        title: "Backup Deleted",
        description: "Backup has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = (serverId: string, type: string) => {
    createBackupMutation.mutate({ serverId, type });
  };

  const handleDeleteBackup = (backupId: string) => {
    deleteBackupMutation.mutate(backupId);
  };

  const handleDownloadBackup = async (backup: BackupItem) => {
    try {
      const response = await fetch(`/api/backups/${backup.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.serverName}_${backup.type}_${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Backup file download has started.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download backup file.",
        variant: "destructive",
      });
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'full': return <Database className="h-4 w-4" />;
      case 'members': return <Users className="h-4 w-4" />;
      case 'channels': return <MessageSquare className="h-4 w-4" />;
      case 'roles': return <Shield className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-blue-500';
      case 'members': return 'bg-green-500';
      case 'channels': return 'bg-purple-500';
      case 'roles': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Backup History</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Backup History</h1>
        </div>
        <Badge variant="outline">
          {backups.length} Total Backups
        </Badge>
      </div>

      {backups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Backups Found</h3>
            <p className="text-gray-600">
              Server backups will appear here once created through the Discord bot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {backups.map((backup) => (
            <Card key={backup.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full text-white ${getTypeColor(backup.type)}`}>
                      {getTypeIcon(backup.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{backup.serverName}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Created {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {backup.type}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Size</p>
                    <p className="font-semibold">{formatSize(backup.size)}</p>
                  </div>
                  
                  {backup.metadata.memberCount && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Members</p>
                      <p className="font-semibold">{backup.metadata.memberCount.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {backup.metadata.channelCount && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Channels</p>
                      <p className="font-semibold">{backup.metadata.channelCount}</p>
                    </div>
                  )}
                  
                  {backup.metadata.roleCount && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Roles</p>
                      <p className="font-semibold">{backup.metadata.roleCount}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-xs text-gray-500 font-mono">
                    ID: {backup.id}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCreateBackup(backup.serverId, 'full')}
                      disabled={createBackupMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <Database className="h-3 w-3" />
                      Backup
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <MoreVertical className="h-3 w-3" />
                          Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadBackup(backup)}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(backup.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy ID
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this backup? This action cannot be undone.
                                <br /><br />
                                <strong>Backup:</strong> {backup.serverName} ({backup.type})
                                <br />
                                <strong>Created:</strong> {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteBackup(backup.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Backup
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}