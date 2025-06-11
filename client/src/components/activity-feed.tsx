import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, UserPlus, UserMinus, Info, Circle, Database, Trash, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: number;
  type: string;
  userId?: string;
  targetId?: string;
  description: string;
  metadata?: any;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  onViewAll?: () => void;
}

const activityIcons = {
  key_generated: Key,
  user_linked: UserPlus,
  key_revoked: UserMinus,
  user_info: Info,
  hwid_info: Info,
  server_backup: Database,
  restore_attempt: RotateCcw,
  backup_deleted: Trash,
  default: Circle,
};

const activityColors = {
  key_generated: "bg-green-100 text-green-600",
  user_linked: "bg-blue-100 text-blue-600",
  key_revoked: "bg-red-100 text-red-600",
  user_info: "bg-purple-100 text-purple-600",
  hwid_info: "bg-purple-100 text-purple-600",
  server_backup: "bg-orange-100 text-orange-600",
  restore_attempt: "bg-cyan-100 text-cyan-600",
  backup_deleted: "bg-red-100 text-red-600",
  default: "bg-gray-100 text-gray-600",
};

const activityBadges = {
  key_generated: { label: "KEY", color: "bg-green-100 text-green-600" },
  user_linked: { label: "LINK", color: "bg-blue-100 text-blue-600" },
  key_revoked: { label: "REVOKE", color: "bg-red-100 text-red-600" },
  user_info: { label: "INFO", color: "bg-purple-100 text-purple-600" },
  hwid_info: { label: "INFO", color: "bg-purple-100 text-purple-600" },
  server_backup: { label: "BACKUP", color: "bg-orange-100 text-orange-600" },
  restore_attempt: { label: "RESTORE", color: "bg-cyan-100 text-cyan-600" },
  backup_deleted: { label: "DELETE", color: "bg-red-100 text-red-600" },
  default: { label: "ACTIVITY", color: "bg-gray-100 text-gray-600" },
};

export default function ActivityFeed({ activities, onViewAll }: ActivityFeedProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Activity
          </CardTitle>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-discord-primary hover:text-discord-secondary text-sm font-medium"
            >
              View All
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => {
              const IconComponent = activityIcons[activity.type as keyof typeof activityIcons] || activityIcons.default;
              const iconColor = activityColors[activity.type as keyof typeof activityColors] || activityColors.default;
              const badge = activityBadges[activity.type as keyof typeof activityBadges] || activityBadges.default;

              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
