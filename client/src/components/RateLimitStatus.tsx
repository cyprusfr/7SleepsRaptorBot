import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface RateLimitInfo {
  category: string;
  windowMs: number;
  maxRequests: number;
  currentUsage: number;
  remainingTime: number;
  status: "healthy" | "warning" | "critical";
}

export function RateLimitStatus() {
  const { data: rateLimits, isLoading } = useQuery({
    queryKey: ["/api/rate-limits/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const limits: RateLimitInfo[] = [
    {
      category: "Authentication",
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      currentUsage: rateLimits?.auth?.current || 0,
      remainingTime: rateLimits?.auth?.resetTime || 0,
      status: rateLimits?.auth?.current >= 4 ? "critical" : rateLimits?.auth?.current >= 2 ? "warning" : "healthy"
    },
    {
      category: "Dashboard Key Validation",
      windowMs: 5 * 60 * 1000,
      maxRequests: 10,
      currentUsage: rateLimits?.keyValidation?.current || 0,
      remainingTime: rateLimits?.keyValidation?.resetTime || 0,
      status: rateLimits?.keyValidation?.current >= 8 ? "critical" : rateLimits?.keyValidation?.current >= 5 ? "warning" : "healthy"
    },
    {
      category: "General API",
      windowMs: 1 * 60 * 1000,
      maxRequests: 60,
      currentUsage: rateLimits?.api?.current || 0,
      remainingTime: rateLimits?.api?.resetTime || 0,
      status: rateLimits?.api?.current >= 50 ? "critical" : rateLimits?.api?.current >= 30 ? "warning" : "healthy"
    },
    {
      category: "Backup Operations",
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
      currentUsage: rateLimits?.backups?.current || 0,
      remainingTime: rateLimits?.backups?.resetTime || 0,
      status: rateLimits?.backups?.current >= 4 ? "critical" : rateLimits?.backups?.current >= 2 ? "warning" : "healthy"
    },
    {
      category: "Admin Actions",
      windowMs: 5 * 60 * 1000,
      maxRequests: 20,
      currentUsage: rateLimits?.admin?.current || 0,
      remainingTime: rateLimits?.admin?.resetTime || 0,
      status: rateLimits?.admin?.current >= 16 ? "critical" : rateLimits?.admin?.current >= 10 ? "warning" : "healthy"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
    return `${Math.ceil(ms / 60000)}m`;
  };

  const formatWindow = (ms: number) => {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    return `${ms / 3600000}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Rate Limit Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.map((limit) => {
          const usagePercentage = (limit.currentUsage / limit.maxRequests) * 100;
          
          return (
            <div key={limit.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(limit.status)}
                  <span className="font-medium text-sm">{limit.category}</span>
                  <Badge variant="outline" className="text-xs">
                    {limit.currentUsage}/{limit.maxRequests}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {limit.remainingTime > 0 ? (
                    <span>Resets in {formatTime(limit.remainingTime)}</span>
                  ) : (
                    <span>Window: {formatWindow(limit.windowMs)}</span>
                  )}
                </div>
              </div>
              
              <Progress 
                value={usagePercentage} 
                className="h-2"
                style={{
                  "--progress-background": getStatusColor(limit.status)
                } as React.CSSProperties}
              />
              
              {limit.status === "critical" && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Rate limit nearly exceeded. Please slow down your requests.
                </div>
              )}
              
              {limit.status === "warning" && (
                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  Approaching rate limit. Consider reducing request frequency.
                </div>
              )}
            </div>
          );
        })}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <div className="font-medium mb-1">Rate Limiting Information:</div>
          <div className="space-y-1">
            <div>• Authentication: 5 attempts per 15 minutes</div>
            <div>• Key Validation: 10 attempts per 5 minutes</div>
            <div>• General API: 60 requests per minute</div>
            <div>• Backup Operations: 5 actions per 10 minutes</div>
            <div>• Admin Actions: 20 operations per 5 minutes</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}