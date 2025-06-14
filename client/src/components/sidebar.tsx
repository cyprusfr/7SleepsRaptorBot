import { Link, useLocation } from "wouter";
import { Bot, ChartLine, Key, Users, Server, ClipboardList, Settings, Database, Clock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/UserProfile";

const navigation = [
  { name: "Overview", href: "/", icon: ChartLine },
  { name: "Key Management", href: "/keys", icon: Key },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Server Data", href: "/servers", icon: Server },
  { name: "Server Backups", href: "/backups", icon: Database },
  { name: "Activity Logs", href: "/activity", icon: ClipboardList },
  { name: "User Settings", href: "/settings", icon: Settings },
  { name: "Bot Settings", href: "/bot-settings", icon: Wrench },
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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Signed in as</div>
          <UserProfile />
        </div>
      </div>

      {/* Bot Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Bot Online
              </p>
              <p className="text-xs text-green-600">
                Last sync: {lastSync}
              </p>
            </div>
          </div>
          <button className="p-1 hover:bg-green-100 rounded transition-colors">
            <svg className="w-4 h-4 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
