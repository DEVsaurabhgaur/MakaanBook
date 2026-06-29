import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing in… — MakaanBook" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      try {
        // Get code from URL query params (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // Check if session is already active
        const { data: initialSession } = await supabase.auth.getSession();
        if (initialSession.session) {
          window.location.replace("/app");
          return;
        }

        if (error) {
          console.error("OAuth error:", error, errorDescription);
          window.location.replace("/auth?error=" + encodeURIComponent(error));
          return;
        }

        if (code) {
          // Exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Session exchange error:", exchangeError);
            window.location.replace("/auth");
            return;
          }
        }

        // Verify we have a session now
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.replace("/app");
        } else {
          window.location.replace("/auth");
        }
      } catch (err) {
        console.error("Callback error:", err);
        window.location.replace("/auth");
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
