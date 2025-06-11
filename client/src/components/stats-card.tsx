import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: "primary" | "green" | "blue" | "purple" | "yellow" | "red";
}

const colorClasses = {
  primary: "bg-discord-primary/10 text-discord-primary",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
};

const trendClasses = {
  positive: "text-green-600 bg-green-100",
  negative: "text-red-600 bg-red-100",
  neutral: "text-gray-500 bg-gray-100",
};

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  color = "primary",
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                trend.isPositive ? trendClasses.positive : trendClasses.negative
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
