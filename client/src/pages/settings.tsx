import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Settings as SettingsIcon, Bot, Shield, Users, Key, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BotSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

export default function Settings() {
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: settings = [], isLoading } = useQuery<BotSetting[]>({
    queryKey: ["/api/settings"],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("POST", "/api/settings", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Bot settings have been saved successfully.",
      });
      setUnsavedChanges({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getSettingValue = (key: string, defaultValue: string = "") => {
    if (unsavedChanges[key] !== undefined) {
      return unsavedChanges[key];
    }
    const setting = settings.find(s => s.key === key);
    return setting?.value || defaultValue;
  };

  const handleSettingChange = (key: string, value: string) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    for (const [key, value] of Object.entries(unsavedChanges)) {
      await updateSettingMutation.mutateAsync({ key, value });
    }
  };

  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  // Default settings structure
  const botSettings = {
    general: [
      { key: "bot_name", label: "Bot Name", description: "The display name for the bot", defaultValue: "Raptor Bot" },
      { key: "bot_prefix", label: "Command Prefix", description: "Prefix for text commands (if used)", defaultValue: "!" },
      { key: "activity_message", label: "Activity Message", description: "Bot status/activity message", defaultValue: "Managing Keys | /help" },
    ],
    permissions: [
      { key: "required_role", label: "Required Role", description: "Role required to use bot commands", defaultValue: "Raptor Admin" },
      { key: "key_system_role", label: "Key System Role", description: "Role required for key management commands", defaultValue: "Key System" },
      { key: "admin_only_commands", label: "Admin Only Commands", description: "Comma-separated list of admin-only commands", defaultValue: "whitelist,dewhitelist" },
    ],
    security: [
      { key: "rate_limit_commands", label: "Command Rate Limit", description: "Max commands per minute per user", defaultValue: "5" },
      { key: "rate_limit_window", label: "Rate Limit Window", description: "Rate limit window in seconds", defaultValue: "60" },
      { key: "log_all_commands", label: "Log All Commands", description: "Log every command usage", defaultValue: "true" },
    ],
    keys: [
      { key: "key_prefix", label: "Key Prefix", description: "Prefix for generated keys", defaultValue: "RAP_" },
      { key: "key_length", label: "Key Length", description: "Length of the random part of keys", defaultValue: "8" },
      { key: "auto_expire_keys", label: "Auto Expire Keys", description: "Automatically expire keys after period", defaultValue: "false" },
      { key: "key_expiry_days", label: "Key Expiry Days", description: "Days until keys expire (if enabled)", defaultValue: "30" },
    ]
  };

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
              <h2 className="text-2xl font-bold text-gray-900">Bot Settings</h2>
              <p className="text-gray-600 mt-1">Configure bot behavior and permissions</p>
            </div>
            <div className="flex items-center space-x-4">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              <Button
                onClick={handleSaveSettings}
                disabled={!hasUnsavedChanges || updateSettingMutation.isPending}
                className="bg-discord-primary hover:bg-discord-secondary text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Bot Status Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                Bot Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${stats?.botStatus === "online" ? "bg-green-500" : "bg-red-500"}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Status: {stats?.botStatus === "online" ? "Online" : "Offline"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stats?.lastSync ? formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true }) : "Never synced"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Connected Servers: {stats?.connectedServers || 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    Active guilds
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Total Users: {stats?.totalUsers || 0}
                  </div>
                  <div className="text-xs text-gray-500">
                    Registered users
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                      <div className="space-y-3">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <SettingsIcon className="w-5 h-5 mr-2" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {botSettings.general.map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label htmlFor={setting.key}>{setting.label}</Label>
                      <Input
                        id={setting.key}
                        value={getSettingValue(setting.key, setting.defaultValue)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        placeholder={setting.defaultValue}
                      />
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Permission Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Permission Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {botSettings.permissions.map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label htmlFor={setting.key}>{setting.label}</Label>
                      <Input
                        id={setting.key}
                        value={getSettingValue(setting.key, setting.defaultValue)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        placeholder={setting.defaultValue}
                      />
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {botSettings.security.map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label htmlFor={setting.key}>{setting.label}</Label>
                      {setting.key === "log_all_commands" ? (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={setting.key}
                            checked={getSettingValue(setting.key, setting.defaultValue) === "true"}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked.toString())}
                          />
                          <Label htmlFor={setting.key} className="text-sm">
                            {getSettingValue(setting.key, setting.defaultValue) === "true" ? "Enabled" : "Disabled"}
                          </Label>
                        </div>
                      ) : (
                        <Input
                          id={setting.key}
                          type={setting.key.includes("limit") ? "number" : "text"}
                          value={getSettingValue(setting.key, setting.defaultValue)}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                          placeholder={setting.defaultValue}
                        />
                      )}
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Key Management Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    Key Management Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {botSettings.keys.map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <Label htmlFor={setting.key}>{setting.label}</Label>
                      {setting.key === "auto_expire_keys" ? (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={setting.key}
                            checked={getSettingValue(setting.key, setting.defaultValue) === "true"}
                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked.toString())}
                          />
                          <Label htmlFor={setting.key} className="text-sm">
                            {getSettingValue(setting.key, setting.defaultValue) === "true" ? "Enabled" : "Disabled"}
                          </Label>
                        </div>
                      ) : (
                        <Input
                          id={setting.key}
                          type={setting.key.includes("length") || setting.key.includes("days") ? "number" : "text"}
                          value={getSettingValue(setting.key, setting.defaultValue)}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                          placeholder={setting.defaultValue}
                        />
                      )}
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Environment Variables Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Required Environment Variables</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><code>DISCORD_TOKEN</code> - Bot token from Discord Developer Portal</p>
                      <p><code>DISCORD_CLIENT_ID</code> - Application ID from Discord Developer Portal</p>
                      <p><code>REQUIRED_ROLE</code> - Role name for basic bot access (optional, defaults to "Raptor Admin")</p>
                      <p><code>KEY_SYSTEM_ROLE</code> - Role name for key management (optional, defaults to "Key System")</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
