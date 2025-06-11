import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Eye, Download, Calendar, Key } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscordUser {
  id: number;
  discordId: string;
  username: string;
  discriminator?: string;
  avatarUrl?: string;
  joinedAt: string;
  lastSeen: string;
  roles?: string[];
  metadata?: any;
}

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: users = [], isLoading } = useQuery<DiscordUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: keys = [] } = useQuery({
    queryKey: ["/api/keys"],
  });

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.discordId.includes(query)
    );
  });

  const getUserKeyCount = (userId: string) => {
    return keys.filter((key: any) => key.userId === userId).length;
  };

  const getUserActiveKeyCount = (userId: string) => {
    return keys.filter((key: any) => key.userId === userId && key.status === "active").length;
  };

  const handleViewUser = (userId: string) => {
    console.log("View user:", userId);
  };

  const handleExportUsers = () => {
    const link = document.createElement("a");
    link.href = "/api/export?type=users";
    link.download = `raptor-users-${Date.now()}.json`;
    link.click();
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
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <p className="text-gray-600 mt-1">View and manage Discord users</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleExportUsers}
                variant="outline"
                className="text-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {users.length}
                </div>
                <p className="text-gray-600 text-sm">Total Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => {
                    const lastSeen = new Date(u.lastSeen);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return lastSeen > dayAgo;
                  }).length}
                </div>
                <p className="text-gray-600 text-sm">Active (24h)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => getUserKeyCount(u.discordId) > 0).length}
                </div>
                <p className="text-gray-600 text-sm">With Keys</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by username or Discord ID..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Discord Users</CardTitle>
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
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-discord-primary/10 rounded-full flex items-center justify-center">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.username}
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <span className="text-discord-primary font-medium">
                                {user.username[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {user.username}
                              {user.discriminator && user.discriminator !== "0" && (
                                <span className="text-gray-500">#{user.discriminator}</span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {user.discordId}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Joined {formatDistanceToNow(new Date(user.joinedAt), { addSuffix: true })}
                              </span>
                              <span className="text-xs text-gray-500">
                                Last seen {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {getUserKeyCount(user.discordId)} keys
                            </div>
                            <div className="text-xs text-green-600">
                              {getUserActiveKeyCount(user.discordId)} active
                            </div>
                          </div>
                          {user.roles && user.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {user.roles.slice(0, 2).map((role, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                              {user.roles.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{user.roles.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user.discordId)}
                            className="text-discord-primary hover:text-discord-secondary"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
