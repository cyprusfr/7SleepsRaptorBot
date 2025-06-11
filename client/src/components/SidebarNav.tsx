import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Key, 
  Users, 
  Database, 
  Archive, 
  FileText, 
  Settings,
  RefreshCw,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions } = useQuery({
    queryKey: ["/api/user/permissions"],
    enabled: !!user,
  });

  const { mutate: syncData, isPending: isSyncing } = useMutation({
    mutationFn: () => apiRequest("/api/sync", "POST"),
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "All data has been synchronized successfully.",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const navItems = [
    {
      title: "Overview",
      href: "/",
      icon: BarChart3,
      permission: "dashboard"
    },
    {
      title: "Key Management",
      href: "/keys",
      icon: Key,
      permission: "keys"
    },
    {
      title: "User Management",
      href: "/users",
      icon: Users,
      permission: "users"
    },
    {
      title: "Server Data",
      href: "/servers",
      icon: Database,
      permission: "servers"
    },
    {
      title: "Server Backups",
      href: "/backups",
      icon: Archive,
      permission: "backups"
    },
    {
      title: "Activity Logs",
      href: "/logs",
      icon: FileText,
      permission: "logs"
    },
    {
      title: "Bot Settings",
      href: "/settings",
      icon: Settings,
      permission: "settings"
    },
  ];

  const filteredNavItems = navItems.filter(item => {
    const perms = permissions as any;
    return perms?.[item.permission] || perms?.all;
  });

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Raptor Bot
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncData()}
              disabled={isSyncing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Admin Dashboard
        </p>
      </div>
      <div className="space-y-1 px-3">
        {filteredNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={location === item.href ? "secondary" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          </Link>
        ))}
      </div>

      <div className="mt-auto px-3 py-2 border-t">
        {user && (
          <div className="flex items-center gap-2 p-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
              {(user as any).name?.[0] || (user as any).email?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                Signed in as
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {(user as any).email}
                </span>
                {permissions && (permissions as any)?.canAccessAdmin && (
                  <Shield className="h-3 w-3 text-orange-500" />
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Bot Online
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            Last sync: 3 minutes ago
          </p>
        </div>
      </div>
    </div>
  );
}