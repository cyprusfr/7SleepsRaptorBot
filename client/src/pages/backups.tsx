import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Trash2, Plus, HardDrive, Users, Hash, MessageSquare, Calendar, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Backup {
  id: string;
  serverName: string;
  backupType: string;
  timestamp: string;
  size: number;
  channels: number;
  members: number;
  roles: number;
  messages: number;
  createdBy: string;
}

interface Server {
  id: number;
  serverId: string;
  serverName: string;
  isActive: boolean;
}

export default function BackupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedBackupType, setSelectedBackupType] = useState<string>("full");

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ["/api/backups"],
  });

  const { data: servers } = useQuery({
    queryKey: ["/api/servers"],
  });

  const createBackupMutation = useMutation({
    mutationFn: async ({ serverId, backupType }: { serverId: string; backupType: string }) => {
      return apiRequest(`/api/backups/${serverId}`, {
        method: "POST",
        body: JSON.stringify({ backupType }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Server backup has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      setCreateDialogOpen(false);
      setSelectedServerId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (serverId: string) => {
      return apiRequest(`/api/backups/${serverId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "Server backup has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      setSelectedBackup(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = () => {
    if (!selectedServerId) {
      toast({
        title: "No Server Selected",
        description: "Please select a server to backup.",
        variant: "destructive",
      });
      return;
    }

    createBackupMutation.mutate({ serverId: selectedServerId, backupType: selectedBackupType });
  };

  const handleDeleteBackup = (backup: Backup) => {
    if (window.confirm(`Are you sure you want to delete the backup for ${backup.serverName}? This action cannot be undone.`)) {
      deleteBackupMutation.mutate(backup.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (sizeKB: number) => {
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  if (backupsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Server Backups</h1>
          <p className="text-muted-foreground">Loading backup data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Server Backups</h1>
          <p className="text-muted-foreground">
            Manage Discord server backups and restoration
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Backup
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Server Backup</DialogTitle>
              <DialogDescription>
                Select a server and backup type to create a new backup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Server</label>
                <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a server" />
                  </SelectTrigger>
                  <SelectContent>
                    {(servers as Server[] || []).filter(server => server.isActive).map((server) => (
                      <SelectItem key={server.serverId} value={server.serverId}>
                        {server.serverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Backup Type</label>
                <Select value={selectedBackupType} onValueChange={setSelectedBackupType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Backup</SelectItem>
                    <SelectItem value="channels">Channels Only</SelectItem>
                    <SelectItem value="members">Members Only</SelectItem>
                    <SelectItem value="roles">Roles Only</SelectItem>
                    <SelectItem value="messages">Messages Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleCreateBackup} 
                disabled={createBackupMutation.isPending}
                className="w-full"
              >
                {createBackupMutation.isPending ? "Creating..." : "Create Backup"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!backups || (backups as Backup[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Backups Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first server backup to get started with backup management.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Backup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(backups as Backup[]).map((backup) => (
            <Card key={backup.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{backup.serverName}</CardTitle>
                  <Badge variant={backup.backupType === 'full' ? 'default' : 'secondary'}>
                    {backup.backupType}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(backup.timestamp)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>{backup.channels} channels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{backup.members} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{backup.roles} roles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{backup.messages} messages</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Size: {formatSize(backup.size)}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBackup(backup)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBackup(backup)}
                    disabled={deleteBackupMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedBackup && (
        <Dialog open={!!selectedBackup} onOpenChange={() => setSelectedBackup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Backup Details - {selectedBackup.serverName}</DialogTitle>
              <DialogDescription>
                Created {formatDate(selectedBackup.timestamp)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Backup Type</h4>
                  <Badge variant={selectedBackup.backupType === 'full' ? 'default' : 'secondary'}>
                    {selectedBackup.backupType}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">File Size</h4>
                  <p className="text-sm text-muted-foreground">{formatSize(selectedBackup.size)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedBackup.channels}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedBackup.members}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedBackup.roles}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedBackup.messages}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedBackup(null)} className="flex-1">
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteBackup(selectedBackup)}
                  disabled={deleteBackupMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Backup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}