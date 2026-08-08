import { Capacitor } from "@capacitor/core";

/**
 * AI Digital Tutor global REST API client.
 * Connects frontend screens directly to Express backend endpoints.
 */

export const getBaseUrl = () => {
  if (typeof localStorage !== "undefined") {
    const customUrl = localStorage.getItem("custom_api_url");
    if (customUrl && customUrl.trim() !== "") {
      if (customUrl.includes("10.133.130.36")) {
        localStorage.removeItem("custom_api_url");
      } else {
        return customUrl.trim();
      }
    }
  }

  const isNative = typeof window !== "undefined" && (Capacitor.isNativePlatform() || !!(window as any).Capacitor?.isNativePlatform());

  if (isNative) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim() !== "" && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1") && !envUrl.includes("10.133.130.36")) {
      return envUrl.trim();
    }
    // Computer's current active Wi-Fi network IP
    return "http://10.66.191.36:5000";
  }

  // Web Browser fallback
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim() !== "") return envUrl.trim();
  }

  return "http://localhost:5000";
};

let currentBaseUrl = getBaseUrl();
console.log("API: Initialized with BASE_URL =", currentBaseUrl);

const getHeaders = () => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`API Error [${response.status}] ${response.url}:`, errorData);
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }
  return response.json();
}

const getFullUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${currentBaseUrl}${normalizedPath}`;
};

export const api = {
  get BASE_URL() {
    return currentBaseUrl;
  },
  setBaseUrl: (newUrl: string) => {
    if (newUrl) {
      const formatted = newUrl.startsWith("http") ? newUrl : `http://${newUrl}`;
      currentBaseUrl = formatted;
      localStorage.setItem("custom_api_url", formatted);
    }
  },
  get: async (url: string, options?: { timeoutMs?: number }) => {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || 4000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(getFullUrl(url), {
        method: "GET",
        headers: getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return handleResponse(res);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Connection timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  },

  post: async (url: string, body: any, options?: { timeoutMs?: number }) => {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(getFullUrl(url), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return handleResponse(res);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Connection timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  },

  put: async (url: string, body: any) => {
    const res = await fetch(getFullUrl(url), {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  delete: async (url: string) => {
    const res = await fetch(getFullUrl(url), {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // High-level endpoints mappings
  auth: {
    login: async (email: string, password: string) => {
      const data = await api.post("/api/auth/login", { email, password });
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data;
    },
    signup: async (email: string, password: string) => {
      const data = await api.post("/api/auth/signup", { email, password });
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data;
    },
    loginWithGoogle: async (googleUser: { email: string; displayName?: string; photoURL?: string; uid: string }) => {
      const data = await api.post("/api/auth/google", googleUser);
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data;
    },
    getMe: async () => {
      return api.get("/api/auth/me");
    },
    setupProfile: async (fullName: string, avatar: string, interests: string[]) => {
      return api.post("/api/auth/profile-setup", { full_name: fullName, avatar, interests });
    },
    completeAssessment: async (score: number, level: number) => {
      return api.post("/api/auth/assessment", { score, level });
    },
    logout: () => {
      localStorage.removeItem("token");
    }
  },

  courses: {
    getAll: async (filters?: { search?: string; category?: string; difficulty?: string; price_type?: string; language?: string }) => {
      let url = "/api/courses";
      if (filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
          if (val) params.append(key, val);
        });
        const qs = params.toString();
        if (qs) url += `?${qs}`;
      }
      return api.get(url);
    },
    getById: async (id: string) => {
      return api.get(`/api/course/${id}`);
    },
    getModuleById: async (id: string) => {
      return api.get(`/api/courses/modules/${id}`);
    },
    completeModule: async (id: string) => {
      return api.post(`/api/courses/modules/${id}/complete`, {});
    },
    bookmarkModule: async (id: string) => {
      return api.post(`/api/courses/modules/${id}/bookmark`, {});
    },
    saveModuleNotes: async (id: string, notes: string) => {
      return api.post(`/api/courses/modules/${id}/notes`, { notes });
    },
    updateProgress: async (lessonId: string, completed: boolean, watchedDuration: number) => {
      return api.post("/api/progress/update", { lessonId, completed, watchedDuration });
    },
    getRoadmap: async (skill: string) => {
      return api.get(`/api/roadmaps/${skill}`);
    },
    getCourseTopics: async (courseId: string) => {
      return api.get(`/api/courses/${courseId}/topics`);
    },
    enroll: async (courseId: string) => {
      return api.post(`/api/courses/${courseId}/enroll`, {});
    }
  },

  code: {
    getChallenges: async () => {
      return api.get("/api/code/challenges");
    },
    getLanguages: async () => {
      return api.get("/api/code/languages");
    },
    executeCode: async (language: string, code: string, stdin?: string) => {
      return api.post("/api/code/execute", { language, code, stdin });
    },
    runCode: async (challengeId: string, code: string, language: string) => {
      return api.post("/api/code/run", { challengeId, code, language });
    }
  },

  quizzes: {
    getAll: async () => {
      return api.get("/api/quizzes");
    },
    getByCourse: async (courseId: string) => {
      return api.get(`/api/quizzes/course/${courseId}`);
    },
    submit: async (quizId: number | string, answers: Record<number, string>, courseId?: string) => {
      return api.post(`/api/quizzes/${quizId}/submit`, { answers, courseId });
    },
    getHistory: async () => {
      return api.get("/api/quizzes/history");
    },
    generateAiQuiz: async (topic: string, skill?: string) => {
      return api.post("/api/quizzes/generate-ai", { topic, skill }, { timeoutMs: 60000 });
    }
  },

  ai: {
    chat: async (prompt: string, history: { role: string; content: string }[], skillContext?: string) => {
      return api.post("/api/ai/chat", { prompt, history, skillContext }, { timeoutMs: 60000 });
    },
    debug: async (code: string, error: string) => {
      return api.post("/api/ai/debug", { code, error }, { timeoutMs: 60000 });
    },
    notes: async (topic: string) => {
      return api.post("/api/ai/notes", { topic }, { timeoutMs: 60000 });
    },
    getSkillReferenceNotes: async (skill: string) => {
      return api.get(`/api/notes/reference/${encodeURIComponent(skill)}`);
    },
    interview: async (chatHistory: any[], nextTurnPrompt: string) => {
      return api.post("/api/ai/interview", { chatHistory, nextTurnPrompt }, { timeoutMs: 60000 });
    },
    getRecommendations: async () => {
      return api.get("/api/ai/recommendations");
    }
  },

  stats: {
    getProgress: async () => {
      return api.get("/api/stats/progress");
    },
    getWeeklyProgress: async () => {
      return api.get("/api/progress/weekly");
    },
    getSkillDistribution: async () => {
      return api.get("/api/progress/skill-distribution");
    },
    getEnrolledCourses: async () => {
      return api.get("/api/progress/enrolled-courses");
    },
    getDashboardStats: async () => {
      return api.get("/api/progress/dashboard-stats");
    },
    getGoals: async () => {
      return api.get("/api/goals");
    },
    addGoal: async (goalText: string, targetDate: string) => {
      return api.post("/api/goals", { goal_text: goalText, target_date: targetDate });
    },
    updateGoal: async (id: number, completed: boolean) => {
      return api.put(`/api/goals/${id}`, { completed });
    },
    deleteGoal: async (id: number) => {
      return api.delete(`/api/goals/${id}`);
    }
  },

  sessions: {
    start: async (feature: string, referenceId?: string | number) => {
      return api.post("/api/sessions/start", { feature, reference_id: referenceId });
    },
    end: async (sessionId: number) => {
      return api.post(`/api/sessions/${sessionId}/end`, {});
    }
  },

  projects: {
    getAll: async () => {
      return api.get("/api/projects");
    },
    create: async (title: string, content: string) => {
      return api.post("/api/projects", { title, content });
    }
  },

  admin: {
    createCourse: async (courseData: any) => {
      return api.post("/api/admin/courses", courseData);
    },
    deleteCourse: async (id: string) => {
      return api.delete(`/api/admin/courses/${id}`);
    },
    addModule: async (moduleData: any) => {
      return api.post("/api/admin/modules", moduleData);
    },
    updateModule: async (id: string, moduleData: any) => {
      return api.put(`/api/admin/modules/${id}`, moduleData);
    },
    deleteModule: async (id: string) => {
      return api.delete(`/api/admin/modules/${id}`);
    }
  }
};
