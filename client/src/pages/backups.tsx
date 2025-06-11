import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Download, Upload, Trash2, Plus, RefreshCw, Server, Clock, User, AlertCircle, Shield } from "lucide-react";
import { format } from "date-fns";
import { BackupHealthScore } from "@/components/BackupHealthScore";

interface Backup {
  id: string;
  serverId: string;
  serverName: string;
  backupType: "full" | "channels" | "roles" | "settings";
  status: "completed" | "failed" | "in_progress";
  createdAt: string;
  createdBy: string;
  size?: number;
  metadata?: any;
}

interface Server {
  id: string;
  serverId: string;
  serverName: string;
  memberCount: number;
  isActive: boolean;
}

export default function Backups() {
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [selectedBackupType, setSelectedBackupType] = useState<string>("full");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["/api/backups"],
  });

  const { data: servers = [] } = useQuery({
    queryKey: ["/api/servers"],
  });

  const { mutate: createBackup, isPending: isCreating } = useMutation({
    mutationFn: async (data: { serverId: string; backupType: string }) => {
      return apiRequest("/api/backups", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Server backup has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      setIsCreateDialogOpen(false);
      setSelectedServer("");
      setSelectedBackupType("full");
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    },
  });

  const { mutate: restoreBackup, isPending: isRestoring } = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest(`/api/backups/${backupId}/restore`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Restore Started",
        description: "Backup restoration has been initiated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore backup",
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteBackup } = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest(`/api/backups/${backupId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "Backup has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getBackupTypeLabel = (type: string) => {
    switch (type) {
      case "full":
        return "Full Backup";
      case "channels":
        return "Channels Only";
      case "roles":
        return "Roles Only";
      case "settings":
        return "Settings Only";
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Server Backups</h1>
          <p className="text-muted-foreground">
            Create and manage server backups with full restore capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/backups"] })}
            disabled={backupsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${backupsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Server</label>
                  <Select value={selectedServer} onValueChange={setSelectedServer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a server" />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((server: Server) => (
                        <SelectItem key={server.serverId} value={server.serverId}>
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            {server.serverName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Backup Type</label>
                  <Select value={selectedBackupType} onValueChange={setSelectedBackupType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="channels">Channels Only</SelectItem>
                      <SelectItem value="roles">Roles Only</SelectItem>
                      <SelectItem value="settings">Settings Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createBackup({ serverId: selectedServer, backupType: selectedBackupType })}
                  disabled={!selectedServer || isCreating}
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Create Backup
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Backup Health Score Dashboard */}
      <BackupHealthScore />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Backups</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="health">Health Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {backupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Backups Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first server backup to get started with backup management.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {backups.map((backup: Backup) => (
                <Card key={backup.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <Server className="h-5 w-5" />
                          {backup.serverName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Archive className="h-4 w-4" />
                            {getBackupTypeLabel(backup.backupType)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(backup.createdAt), "MMM dd, yyyy HH:mm")}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {backup.createdBy}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(backup.status)}>
                          {backup.status === "in_progress" && (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          {backup.status === "failed" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {backup.status.replace("_", " ")}
                        </Badge>
                        {backup.size && (
                          <Badge variant="outline">
                            {formatFileSize(backup.size)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-end gap-2">
                      {backup.status === "completed" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreBackup(backup.id)}
                            disabled={isRestoring}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {isRestoring ? "Restoring..." : "Restore"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBackup(backup.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="grid gap-4">
            {backups.filter((backup: Backup) => backup.status === "completed").map((backup: Backup) => (
              <Card key={backup.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {backup.serverName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Archive className="h-4 w-4" />
                          {getBackupTypeLabel(backup.backupType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(backup.createdAt), "MMM dd, yyyy HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {backup.createdBy}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(backup.status)}>
                        {backup.status.replace("_", " ")}
                      </Badge>
                      {backup.size && (
                        <Badge variant="outline">
                          {formatFileSize(backup.size)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreBackup(backup.id)}
                      disabled={isRestoring}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isRestoring ? "Restoring..." : "Restore"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="failed">
          <div className="grid gap-4">
            {backups.filter((backup: Backup) => backup.status === "failed").map((backup: Backup) => (
              <Card key={backup.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {backup.serverName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Archive className="h-4 w-4" />
                          {getBackupTypeLabel(backup.backupType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(backup.createdAt), "MMM dd, yyyy HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {backup.createdBy}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(backup.status)}>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {backup.status.replace("_", " ")}
                      </Badge>
                      {backup.size && (
                        <Badge variant="outline">
                          {formatFileSize(backup.size)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Backup Health Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive integrity monitoring and health scores for all server backups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupHealthScore />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}