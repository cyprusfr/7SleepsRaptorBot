import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  RefreshCw, 
  Play,
  Clock,
  Database,
  FileX,
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { format } from "date-fns";

interface BackupIntegrity {
  id: number;
  backupId: string;
  serverId: string;
  serverName: string;
  backupType: string;
  healthScore: number;
  integrityStatus: 'healthy' | 'warning' | 'critical' | 'corrupted';
  dataCompleteness: number;
  checksumValid: boolean;
  totalElements: number;
  validElements: number;
  corruptedElements: any[];
  missingElements: any[];
  validationErrors: any[];
  performanceMetrics: any;
  lastChecked: string;
  checkedBy: string;
  autoCheck: boolean;
}

interface HealthStats {
  averageHealthScore: number;
  healthyBackups: number;
  warningBackups: number;
  criticalBackups: number;
  corruptedBackups: number;
  totalChecks: number;
}

export function BackupHealthScore({ backupId }: { backupId?: string }) {
  const [selectedCheck, setSelectedCheck] = useState<BackupIntegrity | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrityChecks = [], isLoading: checksLoading } = useQuery({
    queryKey: ["/api/backup-integrity"],
  });

  const { data: healthStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/backup-integrity/stats"],
  });

  const { data: specificCheck } = useQuery({
    queryKey: ["/api/backup-integrity", backupId],
    enabled: !!backupId,
  });

  const { mutate: runIntegrityCheck, isPending: isRunningCheck } = useMutation({
    mutationFn: async (checkBackupId: string) => {
      return apiRequest(`/api/backup-integrity/${checkBackupId}/check`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Integrity Check Complete",
        description: "Backup integrity check has been completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/backup-integrity"] });
    },
    onError: (error: any) => {
      toast({
        title: "Check Failed",
        description: error.message || "Failed to run integrity check",
        variant: "destructive",
      });
    },
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "corrupted":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      case "corrupted":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  if (backupId && specificCheck) {
    // Single backup integrity display
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Backup Health Score
              </CardTitle>
              <CardDescription>
                Integrity status for backup {backupId}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getHealthScoreColor(specificCheck.healthScore)}`}>
                {specificCheck.healthScore}/100
              </div>
              <Badge variant={getStatusColor(specificCheck.integrityStatus)} className="mt-1">
                {getStatusIcon(specificCheck.integrityStatus)}
                <span className="ml-1 capitalize">{specificCheck.integrityStatus}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Data Completeness</label>
              <Progress value={specificCheck.dataCompleteness} className="mt-1" />
              <span className="text-xs text-muted-foreground">
                {formatPercentage(specificCheck.dataCompleteness)}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium">Element Validity</label>
              <Progress 
                value={(specificCheck.validElements / specificCheck.totalElements) * 100} 
                className="mt-1" 
              />
              <span className="text-xs text-muted-foreground">
                {specificCheck.validElements}/{specificCheck.totalElements} elements
              </span>
            </div>
          </div>

          {specificCheck.validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {specificCheck.validationErrors.length} validation error(s) detected.
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-2"
                  onClick={() => {
                    setSelectedCheck(specificCheck);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  View Details
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last checked: {format(new Date(specificCheck.lastChecked), "MMM dd, yyyy HH:mm")}
            </span>
            <span>by {specificCheck.checkedBy}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full dashboard view
  return (
    <div className="space-y-6">
      {/* Health Statistics Overview */}
      {healthStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                  <p className={`text-2xl font-bold ${getHealthScoreColor(healthStats.averageHealthScore)}`}>
                    {healthStats.averageHealthScore}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                  <p className="text-2xl font-bold text-green-600">{healthStats.healthyBackups}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold text-yellow-600">{healthStats.warningBackups}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-orange-600">{healthStats.criticalBackups}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Corrupted</p>
                  <p className="text-2xl font-bold text-red-600">{healthStats.corruptedBackups}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{healthStats.totalChecks}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrity Checks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backup Integrity Checks</CardTitle>
              <CardDescription>
                Health scores and integrity status for all server backups
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/backup-integrity"] })}
              disabled={checksLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checksLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {checksLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : integrityChecks.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Integrity Checks Found</h3>
              <p className="text-muted-foreground">
                Create some backups to see integrity checks here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrityChecks.map((check: BackupIntegrity) => (
                <div key={check.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{check.serverName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {check.backupType}
                        </Badge>
                        {!check.checksumValid && (
                          <Badge variant="destructive" className="text-xs">
                            Checksum Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Backup ID: {check.backupId}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(check.lastChecked), "MMM dd, HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {check.validElements}/{check.totalElements} elements
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getHealthScoreColor(check.healthScore)}`}>
                          {check.healthScore}
                        </div>
                        <Progress value={check.dataCompleteness} className="w-20 mt-1" />
                      </div>
                      
                      <Badge variant={getStatusColor(check.integrityStatus)}>
                        {getStatusIcon(check.integrityStatus)}
                        <span className="ml-1 capitalize">{check.integrityStatus}</span>
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runIntegrityCheck(check.backupId)}
                          disabled={isRunningCheck}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Recheck
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCheck(check);
                            setIsDetailsDialogOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {(check.corruptedElements.length > 0 || check.missingElements.length > 0) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        {check.corruptedElements.length > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <FileX className="h-3 w-3" />
                            {check.corruptedElements.length} corrupted
                          </span>
                        )}
                        {check.missingElements.length > 0 && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            {check.missingElements.length} missing
                          </span>
                        )}
                        {check.validationErrors.length > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {check.validationErrors.length} errors
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Backup Integrity Details</DialogTitle>
            <DialogDescription>
              Detailed integrity analysis for {selectedCheck?.serverName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCheck && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
                <TabsTrigger value="corrupted">Corrupted</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Health Score</h4>
                      <div className={`text-3xl font-bold ${getHealthScoreColor(selectedCheck.healthScore)}`}>
                        {selectedCheck.healthScore}/100
                      </div>
                      <Progress value={selectedCheck.healthScore} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Data Completeness</h4>
                      <div className="text-3xl font-bold">
                        {formatPercentage(selectedCheck.dataCompleteness)}
                      </div>
                      <Progress value={selectedCheck.dataCompleteness} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedCheck.validElements}</p>
                    <p className="text-sm text-muted-foreground">Valid Elements</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{selectedCheck.corruptedElements.length}</p>
                    <p className="text-sm text-muted-foreground">Corrupted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{selectedCheck.missingElements.length}</p>
                    <p className="text-sm text-muted-foreground">Missing</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="errors" className="space-y-2">
                {selectedCheck.validationErrors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No validation errors found</p>
                ) : (
                  selectedCheck.validationErrors.map((error: any, index: number) => (
                    <Alert key={index} variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{error.severity}:</strong> {error.message}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(error.timestamp), "HH:mm:ss")}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="corrupted" className="space-y-2">
                {selectedCheck.corruptedElements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No corrupted elements found</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCheck.corruptedElements.map((element: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="destructive">{element.type}</Badge>
                              <p className="text-sm mt-1">{element.reason}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">Index: {element.index}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                {selectedCheck.performanceMetrics && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Backup Size</h4>
                        <p className="text-2xl font-bold">
                          {Math.round(selectedCheck.performanceMetrics.backupSize / 1024)} KB
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Channel Count</h4>
                        <p className="text-2xl font-bold">
                          {selectedCheck.performanceMetrics.channelCount}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Role Count</h4>
                        <p className="text-2xl font-bold">
                          {selectedCheck.performanceMetrics.roleCount}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Member Count</h4>
                        <p className="text-2xl font-bold">
                          {selectedCheck.performanceMetrics.memberCount}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}