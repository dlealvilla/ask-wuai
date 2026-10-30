import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { SquidMascot } from "@/components/SquidMascot";
import { WuaiLogo } from "@/components/WuaiLogo";
import { CANONICAL_SITE_URL } from "@/lib/canonical";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

// Always redirect OAuth back to a dedicated callback route on the canonical site.
const AUTH_REDIRECT_URL = `${CANONICAL_SITE_URL}/auth/callback`;

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // If someone opens /auth on a preview domain, bounce them to the canonical site
  useEffect(() => {
    if (window.location.origin !== CANONICAL_SITE_URL) {
      // Preserve intent to start OAuth from preview
      const qs = new URLSearchParams(window.location.search);
      const oauth = qs.get("oauth");
      const oauthParam = oauth ? `?oauth=${encodeURIComponent(oauth)}` : "";

      window.location.replace(`${CANONICAL_SITE_URL}/auth${oauthParam}${window.location.hash}`);
      return;
    }

    // Auto-trigger OAuth after we bounce to canonical domain
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    if (oauth === "google") {
      // Remove param immediately to avoid loops, then start OAuth
      params.delete("oauth");
      const next = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`);
      // Trigger sign-in
      void (async () => {
        try {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { 
              redirectTo: AUTH_REDIRECT_URL,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });
          
          if (error) {
            console.error("Google OAuth error:", error);
            toast.error(error.message || "Something went wrong with Google sign in");
          }
          // If successful, data.url will be set and user will be redirected
        } catch (err: any) {
          console.error("Google OAuth exception:", err);
          toast.error(err?.message || "Something went wrong with Google sign in");
        }
      })();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/app");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/app");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (): boolean => {
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        return false;
      }
    }

    if (!isLogin && !displayName.trim()) {
      toast.error("Please enter your name");
      return false;
    }

    return true;
  };

  const handleGoogleSignIn = async () => {
    // If user is in preview/editor, start OAuth on the canonical domain.
    if (window.location.origin !== CANONICAL_SITE_URL) {
      window.location.assign(`${CANONICAL_SITE_URL}/auth?oauth=google`);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error("Google OAuth error:", error);
        toast.error(error.message || "Failed to sign in with Google");
      }
      // If successful, data.url will be set and user will be redirected to Google
      // No need to set loading to false as page will redirect
    } catch (err: any) {
      console.error("Google OAuth exception:", err);
      toast.error(err?.message || "Something went wrong with Google sign in");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Welcome back!");
        navigate("/app");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Account created! You can now sign in.");
        navigate("/app");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-foreground hover:bg-primary/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <WuaiLogo />
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <WuaiLogo />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isLogin ? <><span className="text-accent">Welcome</span> back!</> : <><span className="text-accent">Create</span> Account</>}
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">
              {isLogin 
                ? "Sign in to access your family's learning journey" 
                : "Start your family's learning adventure"}
            </p>
          </div>

          {/* Google Sign In */}
          <Button 
            variant="outline" 
            className="w-full gap-3 h-12 border-accent/30 bg-card hover:bg-accent/10 hover:border-accent/50 transition-all font-semibold" 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-accent">Continue with Google</span>
          </Button>

          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
            <Separator className="flex-1 bg-border/50" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-semibold">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Parent or Guardian"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  className="h-12 bg-card border-border/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-card border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-card border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-accent hover:text-accent/80 transition-colors font-semibold"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Guest option */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground font-medium mb-3">
              Just want to try it out?
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/app")}
              className="border-accent/30 text-accent font-semibold hover:bg-accent/10 hover:border-accent/50"
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
