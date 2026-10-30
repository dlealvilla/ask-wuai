import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Check if there's an error in the URL (from OAuth provider)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");
        
        if (error) {
          console.error("OAuth provider error:", error, errorDescription);
          toast.error(`Authentication failed: ${errorDescription || error}. Please check your Google OAuth configuration.`);
          if (!cancelled) {
            navigate("/auth", { replace: true });
          }
          return;
        }
        
        const url = window.location.href;
        console.log("Auth callback - Current URL:", url);
        console.log("Auth callback - Origin:", window.location.origin);
        
        // Check if we have tokens in the hash fragment (direct OAuth response)
        const hash = window.location.hash;
        const hasAccessToken = hash.includes("access_token=");
        
        if (hasAccessToken) {
          // Tokens are already in the hash fragment - Supabase will handle this automatically
          // We just need to get the session
          console.log("Auth callback - Tokens found in hash fragment, getting session...");
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Auth callback - Session error:", sessionError);
            toast.error(`Sign in failed: ${sessionError.message || "Failed to get session"}`);
            if (!cancelled) {
              navigate("/auth", { replace: true });
            }
            return;
          }
          
          if (!cancelled) {
            if (session) {
              console.log("Auth callback - Session created successfully from hash");
              toast.success("Successfully signed in!");
              navigate("/app", { replace: true });
            } else {
              console.error("Auth callback - No session after hash tokens");
              toast.error("Sign in failed: No session created. Please try again.");
              navigate("/auth", { replace: true });
            }
          }
          return;
        }
        
        // For PKCE OAuth flows, the provider redirects back with a `code` query param or hash.
        // This call exchanges it for a session and persists it in localStorage.
        console.log("Auth callback - Attempting code exchange for PKCE flow...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
        
        if (exchangeError) {
          console.error("Auth callback error:", exchangeError);
          console.error("Error details:", {
            message: exchangeError.message,
            status: exchangeError.status,
            name: exchangeError.name
          });
          // Show more specific error to help debug
          toast.error(`Sign in failed: ${exchangeError.message || "Unknown error"}`);
          if (!cancelled) {
            navigate("/auth", { replace: true });
          }
          return;
        }

        if (!cancelled) {
          if (data?.session) {
            console.log("Auth callback - Session created successfully");
            toast.success("Successfully signed in!");
            navigate("/app", { replace: true });
          } else {
            // No session created, redirect to auth
            console.error("Auth callback - No session in response:", data);
            toast.error("Sign in failed: No session created. Please try again.");
            navigate("/auth", { replace: true });
          }
        }
      } catch (e: any) {
        console.error("Auth callback exception:", e);
        console.error("Exception details:", {
          message: e?.message,
          stack: e?.stack,
          name: e?.name
        });
        // Show more specific error
        const errorMessage = e?.message || "Unknown error occurred";
        toast.error(`Sign in failed: ${errorMessage}`);
        if (!cancelled) {
          navigate("/auth", { replace: true });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finishing sign in
      </div>
    </main>
  );
}
