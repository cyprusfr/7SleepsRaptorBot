import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function InviteBot() {
  const [, setLocation] = useLocation();
  const [botKey, setBotKey] = useState('');
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [botAdded, setBotAdded] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('added') === 'true') {
      setBotAdded(true);
    }
  }, []);

  const handleBotKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botKey.trim() === 'RaptorBot2025!SecureInstall#9847') {
      if (botAdded) {
        // Bot was already added, redirect to tutorial
        setLocation('/story-tutorial');
      } else {
        setShowInvite(true);
      }
      setError('');
    } else {
      setError('Invalid bot key. Please contact an administrator.');
    }
  };

  const initiateDiscordAuth = () => {
    const discordBotUrl = `https://discord.com/api/oauth2/authorize?client_id=1382224347892027412&permissions=274877906944&scope=bot%20applications.commands&redirect_uri=${encodeURIComponent(window.location.origin + '/api/discord/callback')}`;
    window.location.href = discordBotUrl;
  };

  // Show the invitation page after bot key is validated
  if (showInvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Raptor Bot Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              MacSploit license management and Discord bot control panel
            </p>
          </div>
          
          <Button 
            onClick={initiateDiscordAuth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg rounded-lg font-medium"
          >
            Add Raptor Bot to Discord
          </Button>
          
          <p className="text-gray-500 text-sm">
            Access requires Google authentication and a valid dashboard key from Discord
          </p>
        </div>
      </div>
    );
  }

  // Show the bot key entry page first
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Raptor Bot Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            MacSploit license management and Discord bot control panel
          </p>
        </div>

        {botAdded && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Bot successfully added to your Discord server! Enter your bot key below to continue to the tutorial.
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="bg-white shadow-lg border-0 text-left">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {botAdded ? 'Tutorial Access' : 'Bot Installation Access'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {botAdded ? 'Enter your bot add key to access the tutorial' : 'Enter your bot add key to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBotKeySubmit} className="space-y-4">
              <div>
                <Label htmlFor="botKey" className="text-gray-700 font-medium">Bot Add Key</Label>
                <Input
                  id="botKey"
                  type="password"
                  value={botKey}
                  onChange={(e) => setBotKey(e.target.value)}
                  placeholder="Enter bot add key"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium"
              >
                {botAdded ? 'Continue to Tutorial' : 'Continue to Bot Installation'}
              </Button>
            </form>

            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        <p className="text-gray-500 text-sm">
          Access requires Google authentication and a valid dashboard key from Discord
        </p>
      </div>
    </div>
  );
}