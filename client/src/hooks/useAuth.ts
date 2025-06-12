import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: dashboardAuth, isLoading: isDashboardAuthLoading } = useQuery({
    queryKey: ["/api/dashboard-keys/auth-status"],
    retry: false,
  });

  const isAuthenticated = !!user;
  const hasDashboardKey = !!(dashboardAuth as any)?.authenticated;
  const hasLinkedKey = !!(dashboardAuth as any)?.isLinked;
  const loadingComplete = !isLoading && !isDashboardAuthLoading;

  // Authentication flow logic:
  // 1. If user has Google auth AND linked valid dashboard key -> fully authenticated
  // 2. If user has Google auth but no linked key -> show dashboard key entry
  // 3. If user has no Google auth -> show Google login
  const shouldShowGoogleLogin = !isAuthenticated && !hasDashboardKey && loadingComplete;
  const shouldShowDashboardKeyEntry = isAuthenticated && !hasLinkedKey && loadingComplete;

  return {
    user,
    isLoading: isLoading || isDashboardAuthLoading,
    isAuthenticated,
    hasDashboardKey,
    hasLinkedKey,
    shouldShowGoogleLogin,
    shouldShowDashboardKeyEntry,
    dashboardKeyRequired: !isAuthenticated && !hasDashboardKey && loadingComplete,
  };
}