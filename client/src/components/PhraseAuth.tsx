import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Lock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PhraseAuthProps {
  children: React.ReactNode;
}

export default function PhraseAuth({ children }: PhraseAuthProps) {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");

  // Check if phrase is already entered
  const { data: phraseStatus, refetch } = useQuery({
    queryKey: ["/api/auth/phrase-status"],
    retry: false,
  });

  const validatePhrase = useMutation({
    mutationFn: async (phrase: string) => {
      return apiRequest("/api/auth/validate-phrase", {
        method: "POST",
        body: { phrase },
      });
    },
    onSuccess: () => {
      setError("");
      refetch();
    },
    onError: (error: any) => {
      setError("Invalid access phrase. Access denied.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phrase.trim()) {
      validatePhrase.mutate(phrase.trim());
    }
  };

  // If phrase is entered and valid, show the dashboard
  if (phraseStatus?.phraseEntered) {
    return <>{children}</>;
  }

  // Show the phrase entry form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Restricted
          </CardTitle>
          <p className="text-gray-600">
            This dashboard requires special authorization. Enter the access phrase to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter access phrase..."
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={!phrase.trim() || validatePhrase.isPending}
              className="w-full"
            >
              {validatePhrase.isPending ? "Verifying..." : "Authorize Access"}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">You must enter the correct phrase every time you access this dashboard, even if you're already logged in with Google.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}