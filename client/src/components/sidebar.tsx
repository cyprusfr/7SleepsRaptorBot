import { Link, useLocation } from "wouter";
import { Bot, ChartLine, Key, Users, Server, ClipboardList, Settings, Database, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/UserProfile";

const navigation = [
  { name: "Overview", href: "/", icon: ChartLine },
  { name: "Key Management", href: "/keys", icon: Key },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Server Data", href: "/servers", icon: Server },
  { name: "Backup Management", href: "/backups", icon: Database },
  { name: "Backup History", href: "/backup-history", icon: Clock },
  { name: "Activity Logs", href: "/activity", icon: ClipboardList },
  { name: "Bot Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  botStatus: "online" | "offline";
  lastSync: string;
}

export default function Sidebar({ botStatus, lastSync }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-discord-primary rounded-lg flex items-center justify-center">
            <Bot className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Raptor Bot</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer",
                  isActive
                    ? "text-discord-primary bg-discord-primary/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bot Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              botStatus === "online"
                ? "bg-green-500 animate-pulse"
                : "bg-red-500"
            )}
          />
          <div>
            <p className="text-sm font-medium text-green-800">
              Bot {botStatus === "online" ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-green-600">
              Last sync: {lastSync}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
