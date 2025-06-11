import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Shield, Key, Server } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-discord-primary rounded-full flex items-center justify-center mb-4">
            <Bot className="text-white text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Raptor Bot</h1>
          <p className="text-gray-600 mt-2">Admin Dashboard Access</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Access the admin dashboard with your Google account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Button 
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Secure Authentication</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Manage Discord keys and permissions</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Server className="w-4 h-4 text-green-600" />
                <span>Monitor server backups and data</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Access activity logs and analytics</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>By signing in, you agree to our terms of service</p>
          <p className="mt-1">Raptor Bot Admin Dashboard v1.0</p>
        </div>
      </div>
    </div>
  );
}