import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function GlobalSyncStatus() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Check for sync errors or access issues
  const hasSyncError = (stats as any)?.syncError || (stats as any)?.lastSyncError;
  const isAccessDenied = hasSyncError?.includes("Access not approved") || 
                        hasSyncError?.includes("not approved") ||
                        (stats as any)?.syncStatus === "access_denied";

  // Don't show if dismissed or no error
  if (isDismissed || !hasSyncError) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mx-4 mt-4 mb-0 border-red-500 bg-red-50 dark:bg-red-950">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <span className="font-medium">Sync Failed</span>
          <div className="text-sm mt-1">
            {isAccessDenied ? "403: Access not approved" : hasSyncError}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="h-auto p-1 hover:bg-red-100 dark:hover:bg-red-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}