import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon,
  BookOpen,
  User,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  ExternalLink
} from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();

  const settingsSections = [
    {
      title: "Learning & Help",
      items: [
        {
          icon: <BookOpen className="w-5 h-5" />,
          title: "Tutorial",
          description: "Interactive guide covering all system features and architecture",
          action: "View Tutorial",
          onClick: () => setLocation("/tutorial")
        },
        {
          icon: <HelpCircle className="w-5 h-5" />,
          title: "Documentation",
          description: "Complete technical documentation and API reference",
          action: "View Docs",
          onClick: () => window.open("https://github.com/user/raptor-bot", "_blank")
        }
      ]
    },
    {
      title: "Account Settings",
      items: [
        {
          icon: <User className="w-5 h-5" />,
          title: "Profile",
          description: "Manage your account information and preferences",
          action: "Edit Profile",
          onClick: () => {}
        },
        {
          icon: <Shield className="w-5 h-5" />,
          title: "Security",
          description: "Authentication settings and security preferences",
          action: "Manage Security",
          onClick: () => {}
        }
      ]
    },
    {
      title: "Application Settings",
      items: [
        {
          icon: <Bell className="w-5 h-5" />,
          title: "Notifications",
          description: "Configure Discord and email notification preferences",
          action: "Configure",
          onClick: () => {}
        },
        {
          icon: <Palette className="w-5 h-5" />,
          title: "Appearance",
          description: "Theme and display customization options",
          action: "Customize",
          onClick: () => {}
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and application preferences
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
            <div className="grid gap-4">
              {section.items.map((item, itemIndex) => (
                <Card key={itemIndex} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={item.onClick}
                        className="shrink-0"
                      >
                        {item.action}
                        {item.title === "Documentation" && (
                          <ExternalLink className="w-4 h-4 ml-2" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {sectionIndex < settingsSections.length - 1 && (
              <Separator className="mt-8" />
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Quick Tutorial Access</CardTitle>
          <CardDescription>
            Need help getting started? Our interactive tutorial covers everything from basic setup to advanced features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={() => setLocation("/tutorial")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Start Tutorial
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}