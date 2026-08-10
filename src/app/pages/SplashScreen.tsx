import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Sparkles, Brain, Rocket, WifiOff } from "lucide-react";
import { api } from "../utils/api";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export function SplashScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attemptedUrl, setAttemptedUrl] = useState<string>("");
  const [retrying, setRetrying] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [customIp, setCustomIp] = useState<string>(api.BASE_URL);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    async function checkConnection() {
      const maxRetries = 3;
      let lastErr: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (!isMounted) return;
        setAttemptCount(attempt);
        if (attempt > 1) setRetrying(true);

        try {
          console.log(`SplashScreen: Fast API health check (attempt ${attempt}/${maxRetries})...`);
          const health = await api.get("/api/health", { timeoutMs: 5000 });
          console.log("SplashScreen: API is UP!", health);

          if (!isMounted) return;
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 100);
          return;
        } catch (err: any) {
          lastErr = err;
          console.warn(`SplashScreen: Health check attempt ${attempt}/${maxRetries} failed`, err);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (!isMounted) return;
      console.error("SplashScreen: API connection failed after retries", lastErr);
      const baseUrl = api.BASE_URL;
      setAttemptedUrl(`${baseUrl}/api/health`);
      setError("Unable to connect to backend server at " + baseUrl);
      toast.error("Connection Error: " + (lastErr?.message || "Failed to reach server"));
    }

    checkConnection();

    return () => {
      isMounted = false;
    };
  }, [navigate, logout, retryTrigger]);

  const handleRetryWithIp = () => {
    if (customIp) {
      api.setBaseUrl(customIp);
    }
    setRetryTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-primary via-primary to-accent overflow-hidden relative flex items-center justify-center">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-foreground/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="mb-8 inline-block"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary-foreground/30 rounded-3xl blur-2xl" />
            <div className="relative bg-gradient-to-br from-primary-foreground/20 to-primary-foreground/10 backdrop-blur-xl p-8 rounded-3xl border border-primary-foreground/20">
              <Brain className="h-24 w-24 text-primary-foreground" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="h-8 w-8 text-accent" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-4">
            AI Digital Tutor
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Your Personal AI-Powered Learning Companion
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 text-primary-foreground/80"
        >
          {error ? (
            <div className="bg-destructive/20 border border-destructive/50 p-6 rounded-2xl backdrop-blur-md max-w-sm text-left">
              <div className="flex items-center gap-2 text-destructive-foreground mb-3 font-semibold justify-center">
                <WifiOff className="h-5 w-5" />
                Connectivity Issue
              </div>
              <p className="text-xs text-primary-foreground/90 mb-3 text-center">
                Ensure phone is on the <strong>same Wi-Fi network as PC</strong> (not 5G mobile data) and backend server is running.
              </p>
              
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-primary-foreground/80 block mb-1">
                  Server API Base URL (PC IP):
                </label>
                <input
                  type="text"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  placeholder="http://10.66.191.36:5000"
                  className="w-full bg-black/40 border border-white/20 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-accent text-center font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRetryWithIp}
                  className="flex-1 text-xs bg-primary-foreground text-primary px-3 py-2 rounded-full font-bold hover:bg-white transition-colors cursor-pointer"
                >
                  Save & Retry
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="flex-1 text-xs border border-white/30 text-white px-3 py-2 rounded-full font-bold hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Bypass (Offline)
                </button>
              </div>
            </div>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Rocket className="h-5 w-5" />
              </motion.div>
              <span className="text-sm">
                {retrying
                  ? `Connecting to server... (Attempt ${attemptCount}/5)`
                  : "Initializing your learning journey..."}
              </span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
