import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, Sparkles, Chrome } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { api } from "../utils/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { signInWithGoogle } from "../utils/firebase";

export function LoginScreen() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await login(email, password);
      toast.success(`Successfully logged in as ${res.user.full_name}!`);
      if (res.user.role === "admin") {
        navigate("/app/admin");
      } else if (res.user.onboarding_completed) {
        navigate("/app");
      } else {
        navigate("/profile-setup");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to log in. Check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    toast.info("Opening Firebase Google Authentication...", { duration: 1500 });
    try {
      const gUser = await signInWithGoogle();
      const res = await loginWithGoogle(gUser);
      toast.success(`Welcome ${res.user.full_name || 'Learner'}! Logged in via Google 🔥`);
      if (res.user.role === "admin") {
        navigate("/app/admin");
      } else {
        navigate("/app");
      }
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.error("Google Sign-In popup was closed before completion.");
      } else if (
        err.code === "auth/network-request-failed" ||
        err.code === "auth/invalid-api-key" ||
        err.message?.includes("network-request-failed")
      ) {
        toast.error(
          "Firebase Web API Key missing or invalid in .env! Please add VITE_FIREBASE_API_KEY from Firebase Console.",
          { duration: 5000 }
        );
      } else {
        toast.error(err.message || "Firebase Google Authentication failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl">
          {/* Header Branding */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-2xl">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold leading-tight">AI Digital Tutor</h1>
              <p className="text-xs text-muted-foreground">Learn Smarter, Grow Faster</p>
            </div>
          </div>

          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold mb-1">Sign In</h3>
            <p className="text-muted-foreground text-sm">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="my-6">
            <Separator className="my-4" />
            <p className="text-center text-sm text-muted-foreground -mt-7">
              <span className="bg-card px-3">Or continue with</span>
            </p>
          </div>

          <Button 
            type="button"
            variant="outline" 
            className="w-full cursor-pointer hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/25 transition-colors flex items-center justify-center gap-2 py-5 font-semibold text-sm" 
            onClick={handleGoogleSignIn} 
            disabled={isLoading}
          >
            <Chrome className="h-5 w-5 text-red-500" />
            <span>Sign in with Google</span>
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
