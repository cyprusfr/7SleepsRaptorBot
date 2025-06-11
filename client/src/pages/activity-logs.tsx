import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Key, UserPlus, UserMinus, Info, Circle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ActivityLog {
  id: number;
  type: string;
  userId?: string;
  targetId?: string;
  description: string;
  metadata?: any;
  timestamp: string;
}

const activityIcons = {
  key_generated: Key,
  user_linked: UserPlus,
  key_revoked: UserMinus,
  user_info: Info,
  hwid_info: Info,
  default: Circle,
};

const activityColors = {
  key_generated: "bg-green-100 text-green-600",
  user_linked: "bg-blue-100 text-blue-600",
  key_revoked: "bg-red-100 text-red-600",
  user_info: "bg-purple-100 text-purple-600",
  hwid_info: "bg-purple-100 text-purple-600",
  default: "bg-gray-100 text-gray-600",
};

const activityBadges = {
  key_generated: { label: "KEY", color: "bg-green-100 text-green-600" },
  user_linked: { label: "LINK", color: "bg-blue-100 text-blue-600" },
  key_revoked: { label: "REVOKE", color: "bg-red-100 text-red-600" },
  user_info: { label: "INFO", color: "bg-purple-100 text-purple-600" },
  hwid_info: { label: "INFO", color: "bg-purple-100 text-purple-600" },
  default: { label: "ACTIVITY", color: "bg-gray-100 text-gray-600" },
};

export default function ActivityLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity", typeFilter],
    queryFn: async () => {
      const url = typeFilter === "all" 
        ? "/api/activity?limit=1000" 
        : `/api/activity?type=${typeFilter}&limit=1000`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
  });

  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.description.toLowerCase().includes(query) ||
      activity.userId?.toLowerCase().includes(query) ||
      activity.targetId?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

  const handleExportLogs = () => {
    const link = document.createElement("a");
    link.href = "/api/export?type=activity";
    link.download = `raptor-activity-${Date.now()}.json`;
    link.click();
  };

  const getActivityStats = () => {
    const stats = {
      total: activities.length,
      key_generated: activities.filter(a => a.type === "key_generated").length,
      key_revoked: activities.filter(a => a.type === "key_revoked").length,
      user_linked: activities.filter(a => a.type === "user_linked").length,
      user_info: activities.filter(a => a.type === "user_info").length,
    };
    return stats;
  };

  const activityStats = getActivityStats();

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
              <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
              <p className="text-gray-600 mt-1">Monitor bot activities and user interactions</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleExportLogs}
                variant="outline"
                className="text-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {activityStats.total}
                </div>
                <p className="text-gray-600 text-sm">Total Activities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {activityStats.key_generated}
                </div>
                <p className="text-gray-600 text-sm">Keys Generated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-red-600">
                  {activityStats.key_revoked}
                </div>
                <p className="text-gray-600 text-sm">Keys Revoked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">
                  {activityStats.user_linked}
                </div>
                <p className="text-gray-600 text-sm">Users Linked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-purple-600">
                  {activityStats.user_info}
                </div>
                <p className="text-gray-600 text-sm">Info Requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search activities, users, or targets..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="key_generated">Key Generated</SelectItem>
                    <SelectItem value="key_revoked">Key Revoked</SelectItem>
                    <SelectItem value="user_linked">User Linked</SelectItem>
                    <SelectItem value="user_info">User Info</SelectItem>
                    <SelectItem value="hwid_info">HWID Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : paginatedActivities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {paginatedActivities.map((activity) => {
                    const IconComponent = activityIcons[activity.type as keyof typeof activityIcons] || activityIcons.default;
                    const iconColor = activityColors[activity.type as keyof typeof activityColors] || activityColors.default;
                    const badge = activityBadges[activity.type as keyof typeof activityBadges] || activityBadges.default;

                    return (
                      <div key={activity.id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <Badge variant="secondary" className={`text-xs font-medium ${badge.color}`}>
                                  {badge.label}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(activity.timestamp), "MMM dd, yyyy 'at' HH:mm")}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{activity.description}</p>
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-2">
                                <details>
                                  <summary className="cursor-pointer font-medium">Metadata</summary>
                                  <pre className="mt-1 text-xs whitespace-pre-wrap">
                                    {JSON.stringify(activity.metadata, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                            {activity.userId && (
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>User ID: {activity.userId}</span>
                                {activity.targetId && <span>Target: {activity.targetId}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(startIndex + itemsPerPage, filteredActivities.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredActivities.length}</span> results
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
