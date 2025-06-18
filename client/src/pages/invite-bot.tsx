import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function InviteBot() {
  const [, setLocation] = useLocation();
  const [botKey, setBotKey] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'key' | 'invite'>('key');

  const handleBotKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botKey.trim() === 'RaptorBot2025!SecureInstall#9847') {
      setStep('invite');
      setError('');
    } else {
      setError('Invalid bot key. Please contact an administrator.');
    }
  };

  const initiateDiscordAuth = () => {
    const discordBotUrl = `https://discord.com/api/oauth2/authorize?client_id=1382224347892027412&permissions=274877906944&scope=bot%20applications.commands&redirect_uri=${encodeURIComponent(window.location.origin + '/invite-success')}`;
    window.location.href = discordBotUrl;
  };

  if (step === 'invite') {
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
        
        <Card className="bg-white shadow-lg border-0 text-left">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Bot Installation Access
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your bot add key to continue
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
                Continue to Bot Installation
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