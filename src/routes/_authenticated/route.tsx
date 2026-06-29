import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return { user: null as any };

    // getSession reads from localStorage — instant, no network roundtrip
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Try refreshing once (e.g., token expired but refresh token valid)
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (!refreshData.session) {
        throw redirect({ to: "/auth" });
      }
      return { user: refreshData.session.user };
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});
