import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Settings, Bot, Shield, Clock, MessageSquare, Candy, Wrench, AlertTriangle } from "lucide-react";

interface BotSettings {
  prefix: string;
  rateLimitEnabled: boolean;
  maxCommandsPerMinute: number;
  autoDeleteTime: number;
  logChannelId: string;
  moderationEnabled: boolean;
  candySystemEnabled: boolean;
  welcomeMessage: string;
  welcomeMessageEnabled: boolean;
  maintenanceMode: boolean;
  botStatus: 'online' | 'idle' | 'dnd' | 'invisible';
  activityType: 'playing' | 'watching' | 'listening' | 'competing';
  activityText: string;
}

export default function BotSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<BotSettings>({
    queryKey: ["/api/bot/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<BotSettings>) => {
      return await apiRequest("/api/bot/settings", "POST", newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Bot Settings Updated",
        description: "Discord bot settings have been applied successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/settings"] });
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

  const handleSettingChange = (key: keyof BotSettings, value: any) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      [key]: value,
    };

    updateSettings.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Settings className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading bot settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Failed to load bot settings</p>
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
            <Bot className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Bot Settings</h1>
          </div>

          {/* Core Bot Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Core Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Command Prefix</Label>
                  <Input
                    id="prefix"
                    value={settings.prefix}
                    onChange={(e) => handleSettingChange('prefix', e.target.value)}
                    placeholder="/"
                    maxLength={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    Character(s) that trigger bot commands
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome">Welcome Message</Label>
                  <Input
                    id="welcome"
                    value={settings.welcomeMessage}
                    onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                    placeholder="Welcome to the server!"
                    disabled={!settings.welcomeMessageEnabled}
                  />
                  <p className="text-sm text-muted-foreground">
                    Message sent to new server members
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="welcome-enabled">Enable Welcome Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Send welcome messages to new server members
                  </p>
                </div>
                <Switch
                  id="welcome-enabled"
                  checked={settings.welcomeMessageEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingChange('welcomeMessageEnabled', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Bot Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Bot Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bot-status">Bot Status</Label>
                  <Select
                    value={settings.botStatus}
                    onValueChange={(value) => handleSettingChange('botStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">🟢 Online</SelectItem>
                      <SelectItem value="idle">🟡 Idle</SelectItem>
                      <SelectItem value="dnd">🔴 Do Not Disturb</SelectItem>
                      <SelectItem value="invisible">⚫ Invisible</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Bot's Discord status indicator
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-type">Activity Type</Label>
                  <Select
                    value={settings.activityType}
                    onValueChange={(value) => handleSettingChange('activityType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="playing">🎮 Playing</SelectItem>
                      <SelectItem value="watching">👀 Watching</SelectItem>
                      <SelectItem value="listening">🎵 Listening to</SelectItem>
                      <SelectItem value="competing">🏆 Competing in</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Type of activity to display
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity-text">Activity Text</Label>
                  <Input
                    id="activity-text"
                    value={settings.activityText}
                    onChange={(e) => handleSettingChange('activityText', e.target.value)}
                    placeholder="MacSploit Support"
                    maxLength={50}
                  />
                  <p className="text-sm text-muted-foreground">
                    Text shown in bot's activity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limiting & Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Rate Limiting & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="rate-limit">Enable Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent command spam and improve bot stability
                  </p>
                </div>
                <Switch
                  id="rate-limit"
                  checked={settings.rateLimitEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingChange('rateLimitEnabled', checked)
                  }
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max-commands">Max Commands Per Minute</Label>
                  <Input
                    id="max-commands"
                    type="number"
                    value={settings.maxCommandsPerMinute}
                    onChange={(e) => handleSettingChange('maxCommandsPerMinute', parseInt(e.target.value))}
                    min={1}
                    max={60}
                    disabled={!settings.rateLimitEnabled}
                  />
                  <p className="text-sm text-muted-foreground">
                    Commands allowed per user per minute
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-delete">Auto-delete Time (seconds)</Label>
                  <Input
                    id="auto-delete"
                    type="number"
                    value={settings.autoDeleteTime}
                    onChange={(e) => handleSettingChange('autoDeleteTime', parseInt(e.target.value))}
                    min={0}
                    max={60}
                  />
                  <p className="text-sm text-muted-foreground">
                    Auto-delete bot responses after this time (0 = disabled)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Feature Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="moderation">Moderation Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable timeout, purge, and other moderation commands
                  </p>
                </div>
                <Switch
                  id="moderation"
                  checked={settings.moderationEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingChange('moderationEnabled', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="candy-system">Candy System</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable candy balance, gambling, and economy features
                  </p>
                </div>
                <Switch
                  id="candy-system"
                  checked={settings.candySystemEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingChange('candySystemEnabled', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Logging & Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Logging & Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="log-channel">Log Channel ID</Label>
                <Input
                  id="log-channel"
                  value={settings.logChannelId}
                  onChange={(e) => handleSettingChange('logChannelId', e.target.value)}
                  placeholder="Channel ID for bot logs"
                />
                <p className="text-sm text-muted-foreground">
                  Discord channel ID where bot activity will be logged
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="maintenance" className="text-orange-800">
                    Enable Maintenance Mode
                  </Label>
                  <p className="text-sm text-orange-600">
                    Disable all bot commands except for administrators
                  </p>
                </div>
                <Switch
                  id="maintenance"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    handleSettingChange('maintenanceMode', checked)
                  }
                />
              </div>
              
              {settings.maintenanceMode && (
                <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800 font-medium">
                    ⚠️ Maintenance mode is currently ACTIVE
                  </p>
                  <p className="text-sm text-orange-700">
                    Only administrators can use bot commands while this is enabled.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save All Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => updateSettings.mutate(settings)}
              disabled={updateSettings.isPending}
              size="lg"
            >
              <Bot className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? "Applying Settings..." : "Apply All Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}