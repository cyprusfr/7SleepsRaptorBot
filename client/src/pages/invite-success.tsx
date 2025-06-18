import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Bot } from "lucide-react";

export default function InviteSuccess() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const guildName = urlParams.get('guild') || 'Unknown Server';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Bot Invitation Successful!</h1>
        <p className="text-lg text-muted-foreground">
          Raptor Bot has been successfully added to your Discord server.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Server Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Server Name:</span>
              <span className="text-muted-foreground">{guildName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Bot Status:</span>
              <span className="text-green-600">✅ Active</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Commands:</span>
              <span className="text-muted-foreground">60+ Available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Your bot is ready to use! Here's what you can do next:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">Test the Bot</p>
              <p className="text-sm text-muted-foreground">
                Try commands like <code>/ping</code>, <code>/help</code>, or <code>/verify</code> in your Discord server.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">Set Up Permissions</p>
              <p className="text-sm text-muted-foreground">
                Configure roles and permissions for bot commands in your server settings.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">Access Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Return to this dashboard to manage license keys and monitor bot activity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={() => setLocation('/')}
          className="w-full md:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Need help? Check the bot documentation or contact support through the dashboard.
        </p>
      </div>
    </div>
  );
}