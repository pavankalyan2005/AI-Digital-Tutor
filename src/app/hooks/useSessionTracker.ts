import { useEffect, useRef } from "react";
import { api } from "../utils/api";

export function useSessionTracker(feature: string, referenceId?: string | number) {
  const sessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function startSession() {
      try {
        const res = await api.sessions.start(feature, referenceId);
        if (active) {
          sessionIdRef.current = res.sessionId;
        }
      } catch (err) {
        console.error("Failed to start session:", err);
      }
    }

    async function endSession() {
      if (sessionIdRef.current) {
        const id = sessionIdRef.current;
        sessionIdRef.current = null;
        try {
          // Use fetch directly with keepalive for better reliability during unload
          // However, our api helper doesn't support keepalive yet, so we'll just call it
          await api.sessions.end(id);
        } catch (err) {
          console.error("Failed to end session:", err);
        }
      }
    }

    startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        endSession();
      } else if (document.visibilityState === "visible") {
        startSession();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", endSession);

    return () => {
      active = false;
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", endSession);
      endSession();
    };
  }, [feature, referenceId]);
}
