import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Bot, Shield, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function InviteBot() {
  const [isLoading, setIsLoading] = useState(false);

  const { data: inviteData, isLoading: fetchingInvite } = useQuery({
    queryKey: ['/api/discord/invite'],
    enabled: false
  });

  const handleInviteBot = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/discord/invite');
      const data = await response.json();
      
      if (data.inviteUrl) {
        window.open(data.inviteUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get invite URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Invite Raptor Bot</h1>
        <p className="text-lg text-muted-foreground">
          Add the powerful Raptor Bot to your Discord server with comprehensive license management and administration tools.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>License Key Management</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Payment Processing (10+ methods)</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>User Administration</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>HWID Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>MacSploit Support Tags</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Candy Economy System</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              OAuth Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Secure OAuth Code Grant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Comprehensive Permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Server Management Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Slash Commands Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Activity Logging</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="text-center">
        <CardHeader>
          <CardTitle>Ready to Add Raptor Bot?</CardTitle>
          <CardDescription>
            Click the button below to invite the bot to your Discord server. 
            You'll be redirected to Discord's OAuth authorization page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleInviteBot}
            disabled={isLoading || fetchingInvite}
            size="lg"
            className="w-full md:w-auto"
          >
            {isLoading ? (
              "Getting Invite Link..."
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Invite Raptor Bot
              </>
            )}
          </Button>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>The bot will request the following permissions:</p>
            <p className="text-xs mt-1">
              Send Messages, Manage Messages, Kick Members, Ban Members, 
              Manage Roles, Manage Channels, Use Slash Commands, and more.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          After inviting the bot, return to this dashboard to configure your license keys and settings.
        </p>
      </div>
    </div>
  );
}