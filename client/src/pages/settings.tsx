import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Database, Bot, Activity, Key, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";

interface UserSettings {
  id: string;
  dataConnection: {
    useRealData: boolean;
    syncDiscordServers: boolean;
    trackActivity: boolean;
    showBotStats: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  dashboard: {
    showSystemHealth: boolean;
    showCandyStats: boolean;
    showKeyManagement: boolean;
    showUserActivity: boolean;
  };
  notifications: {
    keyValidations: boolean;
    serverEvents: boolean;
    botStatus: boolean;
    backupAlerts: boolean;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      return await apiRequest("/api/user/settings", "POST", newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncData = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/sync", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Discord server data has been synchronized.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (section: keyof UserSettings, key: string, value: any) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    };

    updateSettings.mutate(newSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <SettingsIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        botStatus="online"
        lastSync="3 minutes ago"
      />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-3xl font-bold">User Settings</h1>
          </div>

          {/* Data Connection Settings */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="real-data">Use Real Discord Data</Label>
              <p className="text-sm text-muted-foreground">
                Connect to actual Discord servers and display live information
              </p>
            </div>
            <Switch
              id="real-data"
              checked={settings.dataConnection.useRealData}
              onCheckedChange={(checked) => 
                handleSettingChange('dataConnection', 'useRealData', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sync-servers">Sync Discord Servers</Label>
              <p className="text-sm text-muted-foreground">
                Automatically synchronize server data and member counts
              </p>
            </div>
            <Switch
              id="sync-servers"
              checked={settings.dataConnection.syncDiscordServers}
              onCheckedChange={(checked) => 
                handleSettingChange('dataConnection', 'syncDiscordServers', checked)
              }
              disabled={!settings.dataConnection.useRealData}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="track-activity">Track Bot Activity</Label>
              <p className="text-sm text-muted-foreground">
                Log and display real-time bot operations and events
              </p>
            </div>
            <Switch
              id="track-activity"
              checked={settings.dataConnection.trackActivity}
              onCheckedChange={(checked) => 
                handleSettingChange('dataConnection', 'trackActivity', checked)
              }
              disabled={!settings.dataConnection.useRealData}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bot-stats">Show Bot Statistics</Label>
              <p className="text-sm text-muted-foreground">
                Display live bot uptime, guild count, and status
              </p>
            </div>
            <Switch
              id="bot-stats"
              checked={settings.dataConnection.showBotStats}
              onCheckedChange={(checked) => 
                handleSettingChange('dataConnection', 'showBotStats', checked)
              }
              disabled={!settings.dataConnection.useRealData}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-refresh">Auto Refresh Data</Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh dashboard data every few minutes
              </p>
            </div>
            <Switch
              id="auto-refresh"
              checked={settings.dataConnection.autoRefresh}
              onCheckedChange={(checked) => 
                handleSettingChange('dataConnection', 'autoRefresh', checked)
              }
            />
          </div>

          {settings.dataConnection.useRealData && (
            <div className="pt-4">
              <Button 
                onClick={() => syncData.mutate()}
                disabled={syncData.isPending}
                className="w-full"
              >
                <Bot className="w-4 h-4 mr-2" />
                {syncData.isPending ? "Syncing..." : "Sync Discord Data Now"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Dashboard Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="system-health">System Health Indicators</Label>
              <p className="text-sm text-muted-foreground">
                Show bot status and system health metrics
              </p>
            </div>
            <Switch
              id="system-health"
              checked={settings.dashboard.showSystemHealth}
              onCheckedChange={(checked) => 
                handleSettingChange('dashboard', 'showSystemHealth', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="candy-stats">Candy Game Statistics</Label>
              <p className="text-sm text-muted-foreground">
                Display candy balance and gaming activity
              </p>
            </div>
            <Switch
              id="candy-stats"
              checked={settings.dashboard.showCandyStats}
              onCheckedChange={(checked) => 
                handleSettingChange('dashboard', 'showCandyStats', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="key-management">Key Management Panel</Label>
              <p className="text-sm text-muted-foreground">
                Show dashboard key creation and management tools
              </p>
            </div>
            <Switch
              id="key-management"
              checked={settings.dashboard.showKeyManagement}
              onCheckedChange={(checked) => 
                handleSettingChange('dashboard', 'showKeyManagement', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="user-activity">User Activity Feed</Label>
              <p className="text-sm text-muted-foreground">
                Display recent user actions and system events
              </p>
            </div>
            <Switch
              id="user-activity"
              checked={settings.dashboard.showUserActivity}
              onCheckedChange={(checked) => 
                handleSettingChange('dashboard', 'showUserActivity', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="key-notifications">Key Validation Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when dashboard keys are used or validated
              </p>
            </div>
            <Switch
              id="key-notifications"
              checked={settings.notifications.keyValidations}
              onCheckedChange={(checked) => 
                handleSettingChange('notifications', 'keyValidations', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="server-notifications">Server Events</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts for server joins, leaves, and major events
              </p>
            </div>
            <Switch
              id="server-notifications"
              checked={settings.notifications.serverEvents}
              onCheckedChange={(checked) => 
                handleSettingChange('notifications', 'serverEvents', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bot-notifications">Bot Status Changes</Label>
              <p className="text-sm text-muted-foreground">
                Get alerted when the bot goes online or offline
              </p>
            </div>
            <Switch
              id="bot-notifications"
              checked={settings.notifications.botStatus}
              onCheckedChange={(checked) => 
                handleSettingChange('notifications', 'botStatus', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="backup-notifications">Backup Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for backup creation and restoration
              </p>
            </div>
            <Switch
              id="backup-notifications"
              checked={settings.notifications.backupAlerts}
              onCheckedChange={(checked) => 
                handleSettingChange('notifications', 'backupAlerts', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}