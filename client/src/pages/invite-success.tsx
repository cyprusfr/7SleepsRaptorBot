import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Bot } from "lucide-react";
import { useLocation } from "wouter";

export default function InviteSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/tutorial');
    }, 2000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-lg border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Bot className="h-16 w-16 text-green-400" />
              <CheckCircle className="h-6 w-6 text-green-400 absolute -top-1 -right-1 bg-gray-900 rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Bot Added Successfully!
          </CardTitle>
          <CardDescription className="text-gray-300">
            Raptor Bot has been added to your server
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-400 mb-4">
            Redirecting to tutorial in 2 seconds...
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-green-400 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}