import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, BookOpen, Clock, ChevronRight, Sparkles, AlertTriangle, 
  Star, Bookmark, FileText, Send, Bot, CheckCircle, Save, Loader2,
  Tv, Compass, HelpCircle, ExternalLink, RefreshCw, Volume2, ShieldCheck, Search
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { api } from "../utils/api";
import { toast } from "sonner";

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  youtubeUrl: string;
  videoId: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  order: number;
  completed: number;
  watchedDuration: number;
  bookmarked?: number;
  custom_note?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  skill: string;
  thumbnail: string;
  lessons?: Lesson[];
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

// React ErrorBoundary Component (Task 1 & 8)
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center max-w-lg mx-auto space-y-4 min-h-[400px] flex flex-col justify-center items-center">
          <AlertTriangle className="h-16 w-16 text-rose-500 animate-pulse" />
          <h3 className="text-xl font-bold text-rose-500 uppercase tracking-wider">Something went wrong</h3>
          <p className="text-muted-foreground text-sm">
            Failed to load the course video stream correctly. Please try reloading the page.
          </p>
          <Button onClick={() => window.location.reload()} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Robust YouTube Video ID Extraction Helper (Task 5)
export const extractVideoId = (url: string) => {
  if (!url) return null;

  const regex =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;

  const match = url.match(regex);

  return match ? match[1] : null;
};

// Beautiful Futuristic Loading Skeleton (Task 7)
function CourseSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Skill Banner Skeleton */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-card/40 p-6 h-48 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
          <div className="h-8 w-2/3 bg-muted rounded-xl" />
          <div className="h-4 w-1/2 bg-muted rounded-lg" />
        </div>
        <div className="space-y-2 max-w-md pt-2">
          <div className="h-3 w-1/4 bg-muted rounded" />
          <div className="h-2 w-full bg-muted rounded-full" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video w-full bg-muted rounded-3xl border border-border/30" />
          <div className="h-24 bg-card/40 border border-border/30 rounded-2xl" />
          <div className="h-40 bg-card/40 border border-border/30 rounded-2xl" />
        </div>

        {/* Right Column Skeleton */}
        <div className="space-y-6">
          <div className="h-[300px] bg-card/40 border border-border/30 rounded-3xl" />
          <div className="h-64 bg-card/40 border border-border/30 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function CourseDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);

  // Task 10 & 11: Ensure lessons array exists with working dummy data fallback
  const rawLessons = course?.lessons || course?.modules || [];
  const dummyLessons = [
    {
      id: 1,
      title: "Introduction to AI",
      youtubeUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    },
    {
      id: 2,
      title: "Machine Learning Basics",
      youtubeUrl: "https://www.youtube.com/watch?v=GwIo3gDZCVQ",
    },
  ];

  const baseLessons = rawLessons.length > 0 ? rawLessons : dummyLessons;

  // Task 6: Validate all lesson data before rendering and map video IDs
  const lessons = baseLessons.map((lesson) => {
    const videoUrl = (lesson as any).video_url || (lesson as any).youtubeUrl || "";
    const videoId = extractVideoId(videoUrl) || (lesson as any).videoId || "";

    return {
      id: String(lesson.id),
      courseId: (lesson as any).courseId || id || "",
      title: lesson.title || "Untitled Lesson",
      youtubeUrl: videoUrl,
      videoId: videoId,
      duration: (lesson as any).duration || (lesson as any).video_duration || "12 mins",
      level: ((lesson as any).level || "Beginner") as "Beginner" | "Intermediate" | "Advanced",
      order: Number((lesson as any).order) || 1,
      completed: Number((lesson as any).completed) || 0,
      watchedDuration: Number((lesson as any).watchedDuration) || 0,
      bookmarked: Number((lesson as any).bookmarked) || 0,
      custom_note: (lesson as any).custom_note || "",
    };
  });

  // Task 3: Ensure default lesson exists
  const defaultLesson = lessons?.[0] || null;

  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [activeLevel, setActiveLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const [watchedSec, setWatchedSec] = useState<number>(0);
  const [showResumeBadge, setShowResumeBadge] = useState<boolean>(false);

  // Sync selectedLesson with lessons once data is loaded
  useEffect(() => {
    if (!loading && !selectedLesson && lessons.length > 0) {
      const lastIncomplete = lessons.find((l: any) => l.completed === 0) || lessons[0];
      setSelectedLesson(lastIncomplete);
      setActiveLevel(lastIncomplete.level);
      setUserNotes(lastIncomplete.custom_note || "");
      const savedSec = Number(lastIncomplete.watchedDuration) || 0;
      setWatchedSec(savedSec);
      if (savedSec > 5) setShowResumeBadge(true);
    }
  }, [loading, lessons, selectedLesson]);

  // Load YouTube IFrame API and auto-save / resume video progress
  useEffect(() => {
    if (!selectedLesson || !selectedLesson.videoId) return;

    const savedSec = Number(selectedLesson.watchedDuration) || 0;
    setWatchedSec(savedSec);
    if (savedSec > 5) setShowResumeBadge(true);

    const saveProgress = async (currTime: number, duration: number) => {
      if (!selectedLesson || currTime <= 0) return;
      try {
        const isDone = duration > 0 && currTime / duration >= 0.9;
        await api.courses.updateProgress(selectedLesson.id, isDone, Math.floor(currTime), Math.floor(duration));
      } catch (e) {
        console.warn("Failed to auto-save course video progress:", e);
      }
    };

    const initPlayer = () => {
      if (!iframeContainerRef.current) return;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(iframeContainerRef.current, {
        videoId: selectedLesson.videoId,
        playerVars: {
          autoplay: selectedTimestamp !== null ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          start: selectedTimestamp !== null ? selectedTimestamp : 0
        },
        events: {
          onReady: (event: any) => {
            if (selectedTimestamp !== null) {
              event.target.seekTo(selectedTimestamp, true);
            } else if (savedSec > 5) {
              event.target.seekTo(savedSec, true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) { // PLAYING
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                  const curr = playerRef.current.getCurrentTime() || 0;
                  const dur = playerRef.current.getDuration() || 0;
                  setWatchedSec(Math.floor(curr));
                  saveProgress(curr, dur);
                }
              }, 5000);
            } else { // PAUSED / ENDED
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const curr = playerRef.current.getCurrentTime() || 0;
                const dur = playerRef.current.getDuration() || 0;
                setWatchedSec(Math.floor(curr));
                saveProgress(curr, dur);
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    const handleBeforeUnload = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const curr = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        if (curr > 0) {
          saveProgress(curr, dur);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [selectedLesson?.id, selectedLesson?.videoId]);

  // Custom Notes State
  const [userNotes, setUserNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Autoplay next lesson configuration
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    const saved = localStorage.getItem("autoplay_lessons_switch");
    return saved ? saved === "true" : true;
  });

  // Watch duration simulation state
  const [watchProgress, setWatchProgress] = useState(0);
  const [isWatching, setIsWatching] = useState(false);

  // Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);

  // Load Course Quiz
  const handleOpenQuiz = async () => {
    if (!id) return;
    setIsQuizOpen(true);
    setLoadingQuiz(true);
    setQuizResult(null);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    try {
      const data = await api.quizzes.getByCourse(id);
      setQuizData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load course quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizData?.quiz?.id) return;
    setSubmittingQuiz(true);
    try {
      const res = await api.quizzes.submit(quizData.quiz.id, userAnswers, id);
      setQuizResult(res);
      if (res.passed) {
        toast.success(`🏆 Quiz Passed! Score: ${res.percentage}% | +${res.pointsAwarded} XP`);
      } else {
        toast.info(`Quiz Completed: Score ${res.percentage}%. Passing target is ${res.passScore}%. Try again!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Skill Reference Notes State
  const [referenceNotes, setReferenceNotes] = useState<string>("");
  const [loadingRefNotes, setLoadingRefNotes] = useState<boolean>(false);
  const [activeNotesTab, setActiveNotesTab] = useState<"topics" | "personal" | "reference">("topics");

  const loadSkillReferenceNotes = async () => {
    const targetSkill = course?.skill || course?.title || "programming";
    setLoadingRefNotes(true);
    try {
      const res = await api.ai.getSkillReferenceNotes(targetSkill);
      setReferenceNotes(res.notes);
      setActiveNotesTab("reference");
      toast.success(`Loaded official study notes & reference docs for ${targetSkill}!`);
    } catch (err: any) {
      toast.error("Failed to load reference study notes.");
    } finally {
      setLoadingRefNotes(false);
    }
  };

  const copyRefNotesToPersonal = () => {
    if (!referenceNotes) return;
    setUserNotes(prev => prev ? `${prev}\n\n---\n${referenceNotes}` : referenceNotes);
    setActiveNotesTab("personal");
    toast.success("Copied reference notes into your study notepad!");
  };

  // Course Topics Breakdown State
  const [courseTopics, setCourseTopics] = useState<any[]>([]);
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>("");
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);

  const handleJumpToTimestamp = (seconds: number) => {
    setSelectedTimestamp(seconds);
    toast.info(`▶ Seeking video to timestamp ${Math.floor(seconds / 60)}m ${seconds % 60}s`);
  };

  // AI Tutor Chat State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hello! I am your AI Skill Tutor. Ask me any conceptual question or write a code snippet related to this skill, and I will help you master it!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load course details & topics from database
  useEffect(() => {
    async function loadCourseDetails() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [data, topicsData] = await Promise.all([
          api.courses.getById(id),
          api.courses.getCourseTopics(id).catch(() => [])
        ]);
        setCourse(data);
        setCourseTopics(topicsData);
        if (topicsData && topicsData.length > 0) {
          setExpandedTopicId(topicsData[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load learning curriculum.");
        toast.error("Failed to load curated course pathways.");
      } finally {
        setLoading(false);
      }
    }
    loadCourseDetails();
  }, [id]);

  // ── Auto session tracking: start on mount, end on unmount ─────────────────
  useEffect(() => {
    if (!id) return;
    let sessionId: number | null = null;
    api.sessions.start("course", id)
      .then((res: any) => { sessionId = res.sessionId; })
      .catch(() => {}); // silently ignore if not logged in

    return () => {
      if (sessionId) {
        api.sessions.end(sessionId).catch(() => {});
      }
    };
  }, [id]);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const data = await api.ai.getRecommendations();
        setRecommendations(data.filter((r: any) => r.courseId !== id));
      } catch (err) {}
    }
    loadRecommendations();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Mark lesson as completed ───────────────────────────────────────────────
  const triggerCompletion = async (lesson: any) => {
    if (!lesson || lesson.completed === 1) return;
    try {
      const res = await api.courses.updateProgress(lesson.id, true, 100);
      toast.success(`🎉 Module Completed! +${res?.pointsAwarded ?? 100} XP`);
      setSelectedLesson((prev: any) => prev ? { ...prev, completed: 1 } : prev);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as complete.");
    }
  };

  // ── Toggle bookmark ────────────────────────────────────────────────────────
  const toggleBookmark = async (lesson: any) => {
    if (!lesson) return;
    try {
      await api.courses.bookmarkModule(lesson.id);
      const newVal = lesson.bookmarked === 1 ? 0 : 1;
      setSelectedLesson((prev: any) => prev ? { ...prev, bookmarked: newVal } : prev);
      toast.success(newVal === 1 ? "📌 Bookmarked!" : "Bookmark removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle bookmark.");
    }
  };

  // ── Save user study notes ──────────────────────────────────────────────────
  const saveNotes = async () => {
    if (!selectedLesson) return;
    setIsSavingNotes(true);
    try {
      await api.courses.saveModuleNotes(selectedLesson.id, userNotes);
      toast.success("✅ Notes saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ── Send AI chat message ───────────────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isAiLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsAiLoading(true);
    try {
      const skillCtx = selectedLesson?.title || course?.title || "programming";
      const res = await api.ai.chat(userMsg, chatMessages, skillCtx);
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply || res.message || "I'm here to help!" }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "ai", content: "Sorry, I couldn't reach the AI right now. Please try again." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Simulate watch duration updates when playing video
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatching && selectedLesson && selectedLesson.completed === 0) {
      interval = setInterval(() => {
        setWatchProgress(prev => {
          const next = Math.min(100, prev + 5);
          if (next >= 100) {
            setIsWatching(false);
            triggerCompletion(selectedLesson);
          } else if (next % 20 === 0) {
            api.courses.updateProgress(selectedLesson.id, false, next).catch(() => {});
          }
          return next;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWatching, selectedLesson]);

  // Loading state fallback (Task 7)
  if (loading) {
    return <CourseSkeleton />;
  }

  // Error fallback card UI (Task 8)
  if (error || !course) {
    return (
      <div className="p-6 text-center max-w-lg mx-auto space-y-6 min-h-[400px] flex flex-col justify-center items-center">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-full animate-bounce">
          <AlertTriangle className="h-12 w-12 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-rose-500 uppercase tracking-wide">System Malfunction</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {error || "The requested digital learning pathway was not found in our database system."}
          </p>
        </div>
        <div className="flex gap-4 w-full justify-center">
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl border-border/60 hover:bg-muted/10 text-foreground">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry Sync
          </Button>
          <Link to="/app/skills">
            <Button className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground">
              Back to Skills Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allLessons = lessons;
  const totalCompleted = allLessons.filter(l => l.completed === 1).length;
  const progressPercent = allLessons.length > 0 ? (totalCompleted / allLessons.length) * 100 : 0;

  const selectLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setUserNotes(lesson.custom_note || "");
    setWatchProgress(lesson.watchedDuration || 0);
    setIsWatching(false);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const parseDurationToSeconds = (dur: string) => {
    if (!dur) return 0;
    const parts = dur.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseInt(dur) || 0;
  };

  const totalSec = parseDurationToSeconds(selectedLesson?.duration);
  const currentProgressPercent = totalSec > 0 ? (watchedSec / totalSec) * 100 : watchProgress;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Skill Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/50 bg-gradient-to-r from-card to-card/60 backdrop-blur p-4 sm:p-6 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/15 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 sm:space-y-4 max-w-4xl">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge className="bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground text-xs">{course?.skill}</Badge>
            <Badge variant="secondary" className="bg-background/80 text-xs">{course?.level}</Badge>
            <Badge variant="outline" className="flex items-center gap-1 bg-background/40 uppercase text-[9px] sm:text-[10px]">
              <Compass className="h-3 w-3 text-accent" />
              One Shot Full Course
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text break-words">
            {course?.title}
          </h1>

          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base leading-relaxed break-words">
            {course?.description}
          </p>

          {/* Progress Bar */}
          <div className="space-y-2 max-w-md pt-1 sm:pt-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px] sm:text-xs">Overall Progress</span>
              <span className="text-primary font-extrabold text-[11px] sm:text-xs">{Math.round(currentProgressPercent)}% Complete</span>
            </div>
            <Progress value={currentProgressPercent} className="h-2 rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        
        {/* Left Column: Secure Streaming IFrame Player */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          
          <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl flex flex-col relative w-full">
            <div className="bg-gradient-to-r from-primary/20 via-accent/15 to-transparent px-3 sm:px-4 py-2 border-b border-border/30 flex flex-wrap items-center justify-between text-xs gap-1.5">
              <span className="font-semibold flex items-center gap-1.5 text-foreground/85 text-[11px] sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-accent animate-pulse shrink-0" />
                University Grade Educational Stream
              </span>
              {selectedLesson && <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">ID: {selectedLesson?.videoId}</span>}
            </div>

            {/* Saved Video Progress Resume Banner */}
            {showResumeBadge && watchedSec > 5 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="m-3 bg-primary/15 border border-primary/40 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary">
                  <Play className="h-4 w-4 fill-current animate-pulse shrink-0" />
                  <span>Saved Progress Found: Resuming from {Math.floor(watchedSec / 60)}m {Math.floor(watchedSec % 60)}s</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                      playerRef.current.seekTo(watchedSec, true);
                      playerRef.current.playVideo();
                      setShowResumeBadge(false);
                    }
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold px-3 py-1 cursor-pointer"
                >
                  ▶ Resume Playback
                </Button>
              </motion.div>
            )}

            {/* YouTube Embed Rendering */}
            <div className="aspect-video w-full relative bg-black shadow-inner overflow-hidden">
              {selectedLesson?.videoId ? (
                <div ref={iframeContainerRef} className="w-full h-full absolute inset-0" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                  No video available
                </div>
              )}
            </div>

            {/* Direct Study Link Notice */}
            {selectedLesson && (
              <div className="p-3 bg-primary/5 border-b border-border/30 flex items-start gap-2 text-[10px] text-muted-foreground break-words overflow-hidden">
                <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
                <div className="break-words max-w-full">
                  <span className="font-bold">Pro Tip: </span>
                  For the best experience, you can also
                  <a 
                    href={`https://youtube.com/watch?v=${selectedLesson?.videoId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline mx-1 inline-block break-all"
                  >
                    watch this course directly on YouTube
                  </a>. All progress made here is automatically saved to your profile.
                </div>
              </div>
            )}

            {/* Metadata Card Info */}
            {selectedLesson && (
              <CardHeader className="pb-4 border-b border-border/30 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 w-full">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl font-bold leading-tight break-words">{selectedLesson.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs">
                      <span className="font-semibold text-foreground/80 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duration: {selectedLesson.duration}
                      </span>
                      <span className="text-muted-foreground font-medium italic">
                        Tutorial by freeCodeCamp.org
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={handleOpenQuiz}
                      className="rounded-xl text-xs font-bold cursor-pointer border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 shadow-sm flex items-center gap-1.5 flex-1 sm:flex-none"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Take Course Quiz
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleBookmark(selectedLesson)}
                      className={`rounded-xl border-border/60 cursor-pointer shrink-0 ${
                        selectedLesson.bookmarked === 1 ? "bg-accent/20 text-accent border-accent animate-pulse" : "hover:bg-accent/10"
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => triggerCompletion(selectedLesson)}
                      disabled={selectedLesson.completed === 1}
                      className={`rounded-xl text-xs font-bold cursor-pointer flex-1 sm:flex-none ${
                        selectedLesson.completed === 1 
                          ? "bg-green-500/20 text-green-500 border-green-500 hover:bg-green-500/20" 
                          : "border-green-500/30 text-green-500 hover:bg-green-500/10"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      {selectedLesson.completed === 1 ? "Finished" : "Mark as Completed (+100 XP)"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            )}

            {/* Smart Notepad & Course Topics Panel */}
            {selectedLesson && (
              <CardContent className="pt-4 bg-background/30 space-y-4 border-t border-border/30 p-3 sm:p-6">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-border/30 pb-3 w-full">
                  <Button
                    variant={activeNotesTab === "topics" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveNotesTab("topics")}
                    className="rounded-xl text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    Topics ({(Array.isArray(courseTopics) ? courseTopics : []).length})
                  </Button>
                  <Button
                    variant={activeNotesTab === "personal" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveNotesTab("personal")}
                    className="rounded-xl text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    My Notes
                  </Button>
                  <Button
                    variant={activeNotesTab === "reference" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (!referenceNotes) loadSkillReferenceNotes();
                      else setActiveNotesTab("reference");
                    }}
                    className="rounded-xl text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 cursor-pointer text-accent hover:text-accent"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    📚 Quick Reference
                  </Button>
                </div>

                {/* TAB 1: COURSE TOPICS BREAKDOWN WITH TIMESTAMP JUMP */}
                {activeNotesTab === "topics" && (
                  <div className="space-y-4">
                    {/* Search / Filter Box */}
                    <div className="relative">
                      <Input
                        placeholder="Search topics within this course..."
                        value={topicSearchQuery}
                        onChange={(e) => setTopicSearchQuery(e.target.value)}
                        className="bg-card/70 border-border/40 text-xs rounded-xl py-4 pl-9 text-foreground"
                      />
                      <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground" />
                    </div>

                    {/* Topics List / Accordion */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {(!Array.isArray(courseTopics) || courseTopics.length === 0) ? (
                        <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p>Detailed topic notes for this course are being compiled.</p>
                        </div>
                      ) : (
                        courseTopics
                          .filter(t => t && (!topicSearchQuery || (t.title || "").toLowerCase().includes(topicSearchQuery.toLowerCase()) || (t.notes_content || "").toLowerCase().includes(topicSearchQuery.toLowerCase())))
                          .map((topic) => {
                            const isExpanded = expandedTopicId === topic.id;
                            const hasTimestamp = topic.video_timestamp_seconds !== null && topic.video_timestamp_seconds !== undefined;
                            const mins = hasTimestamp ? Math.floor(topic.video_timestamp_seconds / 60) : 0;
                            const secs = hasTimestamp ? topic.video_timestamp_seconds % 60 : 0;
                            const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                            return (
                              <div
                                key={topic.id}
                                className={`border rounded-2xl transition-all overflow-hidden ${
                                  isExpanded 
                                    ? "bg-card/85 border-primary/40 shadow-md" 
                                    : "bg-card/50 border-border/30 hover:border-border/70"
                                }`}
                              >
                                {/* Topic Header Bar */}
                                <div className="p-3.5 flex flex-wrap items-center justify-between gap-2">
                                  <button
                                    onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                    className="flex-1 text-left flex items-center gap-2.5 cursor-pointer font-bold text-xs text-foreground"
                                  >
                                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                                      #{topic.order_index}
                                    </Badge>
                                    <span className="leading-snug">{topic.title}</span>
                                  </button>

                                  <div className="flex items-center gap-2">
                                    {hasTimestamp && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleJumpToTimestamp(topic.video_timestamp_seconds)}
                                        className="rounded-xl text-[10px] font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer py-1 h-7"
                                      >
                                        <Play className="h-3 w-3 mr-1 fill-current" />
                                        Jump to {timeFormatted}
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                      className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                      {isExpanded ? "Collapse" : "Read Notes"}
                                    </Button>
                                  </div>
                                </div>

                                {/* Expanded Notes Body */}
                                {isExpanded && (
                                  <div className="p-4 border-t border-border/30 bg-background/50 text-xs leading-relaxed space-y-3 font-sans whitespace-pre-wrap text-foreground">
                                    {topic.notes_content}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PERSONAL STUDY NOTES */}
                {activeNotesTab === "personal" && (
                  <div className="relative">
                    <Textarea
                      placeholder={`Capture key concepts, algorithms, and code snippets for ${course?.skill} here. Notes are saved securely.`}
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      className="min-h-[140px] bg-card/65 rounded-xl border-border/40 focus:border-primary/40 focus:ring-0 text-sm py-3 text-foreground font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={saveNotes}
                      disabled={isSavingNotes}
                      className="absolute bottom-3 right-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-4 py-1 cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Notes
                    </Button>
                  </div>
                )}

                {/* TAB 3: QUICK SKILL CHEAT SHEET & DOCS */}
                {activeNotesTab === "reference" && (
                  <div className="p-4 bg-card/80 border border-border/50 rounded-xl space-y-3 max-h-[350px] overflow-y-auto">
                    {loadingRefNotes ? (
                      <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                        Loading official reference documentation & study notes...
                      </div>
                    ) : referenceNotes ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-border/30">
                          <span className="text-xs font-bold text-accent uppercase">
                            Official {course?.skill} Reference Cheat Sheet & Documentation Links
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyRefNotesToPersonal}
                            className="text-[10px] rounded-lg h-7 cursor-pointer"
                          >
                            Copy to My Notes 📋
                          </Button>
                        </div>
                        <div className="text-xs text-foreground font-sans whitespace-pre-wrap leading-relaxed space-y-2">
                          {referenceNotes}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        Click "Load Official Study Notes" to view curated cheat sheets & official documentation links.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column: AI Tutor & Recommendations */}
        <div className="space-y-6">
          
          {/* Simplified Playlist Sidebar (Just one entry) */}
          <Card className="border-border/50 bg-card/65 backdrop-blur-md p-4 shadow-lg rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-primary" />
                Active Module
              </h4>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5 uppercase">
                Complete Lecture
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="w-full text-left p-4 rounded-2xl border border-primary bg-gradient-to-r from-primary/10 to-accent/5 shadow shadow-primary/20">
                <div className="flex items-start gap-3">
                  <Play className="h-4 w-4 text-primary fill-primary mt-1 shrink-0" />
                  <div>
                    <h5 className="font-bold text-sm leading-snug">{selectedLesson?.title}</h5>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                      Full Duration: {selectedLesson?.duration}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Ask AI Tutor Box */}
          <Card className="border-border/50 bg-card/65 backdrop-blur-md flex flex-col h-[380px] shadow-lg rounded-3xl">
            <CardHeader className="border-b border-border/30 pb-3 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shadow">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  Ask AI Tutor
                  <Badge variant="outline" className="text-[8px] border-primary/20 bg-primary/5 text-primary">Live Context</Badge>
                </CardTitle>
                <CardDescription className="text-[10px] leading-tight mt-0.5">Pre-contextualized to active lesson</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-tr-none shadow font-medium" 
                      : "bg-background/80 border border-border/50 text-foreground rounded-tl-none font-medium"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-background/85 border border-border/50 text-foreground rounded-tl-none flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-[10px] text-muted-foreground animate-pulse">Tutor is analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>
            
            <div className="p-3 border-t border-border/30 bg-background/25 flex gap-2">
              <Input
                placeholder="Ask a question about this video..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                className="bg-card/75 border-border/40 text-xs rounded-xl focus:border-primary/40 focus:ring-0 py-4 text-foreground animate-none"
              />
              <Button 
                onClick={sendChatMessage}
                size="icon"
                className="rounded-xl shrink-0 cursor-pointer bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Recommendations Panel */}
          <Card className="border-border/50 bg-card/65 backdrop-blur-md p-4 shadow-lg rounded-3xl space-y-4">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              Next AI Recommendations
            </h4>
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Complete more lessons to get recommendations.</p>
              ) : (
                recommendations.map((rec) => (
                  <Link key={rec.id} to={`/app/course/${rec.courseId}`} className="block">
                    <div className="p-2.5 rounded-xl border border-border/40 hover:border-accent/40 bg-background/40 hover:bg-background/70 transition-all flex gap-3 group">
                      <div className="h-10 w-16 rounded bg-cover bg-center shrink-0 border border-border/20" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3)` }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-accent uppercase">{rec.skill}</span>
                        <h5 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1 mt-0.5">
                          {rec.title}
                        </h5>
                        <p className="text-[9px] text-muted-foreground block truncate mt-0.5">
                          {rec.level} Pathway
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 align-middle my-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── COURSE QUIZ MODAL OVERLAY ────────────────────────────────────────── */}
      <AnimatePresence>
        {isQuizOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-card border border-border/80 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden my-8"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-purple-500" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px]">
                      {course?.skill} Knowledge Check
                    </Badge>
                    {quizData?.quiz?.pass_score && (
                      <Badge variant="outline" className="text-[10px]">
                        Pass Target: {quizData.quiz.pass_score}%
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-foreground">
                    {quizData?.quiz?.title || `${course?.title} Quiz`}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuizOpen(false)}
                  className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>

              {/* Body */}
              {loadingQuiz ? (
                <div className="py-16 text-center space-y-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Preparing course quiz questions and assessment module...
                  </p>
                </div>
              ) : quizResult ? (
                /* ── QUIZ RESULT SUMMARY ── */
                <div className="space-y-6">
                  <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                    quizResult.passed 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}>
                    <div className="text-4xl font-black">
                      {quizResult.passed ? "🏆 Quiz Passed!" : "💪 Keep Practicing!"}
                    </div>
                    <div className="text-2xl font-bold">
                      Score: {quizResult.score} / {quizResult.totalQuestions} ({quizResult.percentage}%)
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {quizResult.passed 
                        ? `Congratulations! You earned +${quizResult.pointsAwarded} XP towards your ${course?.skill} skill progress.`
                        : `You scored ${quizResult.percentage}%. Target pass rate is ${quizResult.passScore}%. Review the explanations below and try again!`
                      }
                    </p>
                  </div>

                  {/* Question Detailed Breakdown */}
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Detailed Answer Analysis</h4>
                    {quizResult.questionResults?.map((res: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border space-y-2 text-xs ${
                          res.isCorrect 
                            ? "bg-emerald-500/5 border-emerald-500/20" 
                            : "bg-rose-500/5 border-rose-500/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 font-semibold">
                          <span>Q{idx + 1}: {res.question}</span>
                          <Badge className={res.isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}>
                            {res.isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className={res.selectedOption === res.correctOption ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            Your Pick: Option {res.selectedOption} ({res.options[res.selectedOption] || "N/A"})
                          </div>
                          <div className="text-emerald-400 font-bold">
                            Correct: Option {res.correctOption} ({res.options[res.correctOption]})
                          </div>
                        </div>
                        {res.explanation && (
                          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30 italic">
                            💡 {res.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => {
                        setQuizResult(null);
                        setCurrentQuestionIdx(0);
                        setUserAnswers({});
                      }} 
                      variant="outline"
                      className="flex-1 rounded-xl"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Retake Quiz
                    </Button>
                    <Button 
                      onClick={() => setIsQuizOpen(false)} 
                      className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold"
                    >
                      Done & Close
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── QUIZ QUESTION RUNNER ── */
                <div className="space-y-6">
                  {/* Progress Header */}
                  {quizData?.questions && quizData.questions.length > 0 ? (
                    (() => {
                      const q = quizData.questions[currentQuestionIdx];
                      const totalQ = quizData.questions.length;
                      const selectedOpt = userAnswers[q.id];

                      return (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                              <span>Question {currentQuestionIdx + 1} of {totalQ}</span>
                              <Badge variant="outline" className="text-[10px]">{q.difficulty || "Medium"}</Badge>
                            </div>
                            <Progress value={((currentQuestionIdx + 1) / totalQ) * 100} className="h-1.5" />
                          </div>

                          <div className="p-4 bg-background/50 border border-border/40 rounded-2xl">
                            <h4 className="text-base font-bold text-foreground leading-relaxed">
                              {q.question}
                            </h4>
                          </div>

                          {/* Options Grid */}
                          <div className="grid gap-3">
                            {["A", "B", "C", "D"].map((key) => {
                              const optionText = q[`option_${key.toLowerCase()}`];
                              if (!optionText) return null;
                              const isSelected = selectedOpt === key;

                              return (
                                <button
                                  key={key}
                                  onClick={() => handleSelectOption(q.id, key)}
                                  className={`w-full text-left p-4 rounded-xl border text-xs font-medium transition-all flex items-center gap-3 cursor-pointer ${
                                    isSelected
                                      ? "bg-primary/20 border-primary text-primary font-bold shadow-md shadow-primary/10"
                                      : "bg-card/60 border-border/40 hover:bg-background/80 hover:border-border/80 text-foreground"
                                  }`}
                                >
                                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}>
                                    {key}
                                  </span>
                                  <span className="flex-1 leading-snug">{optionText}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Controls */}
                          <div className="flex justify-between items-center pt-4 border-t border-border/40">
                            <Button
                              variant="outline"
                              disabled={currentQuestionIdx === 0}
                              onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                              className="rounded-xl text-xs"
                            >
                              Previous
                            </Button>

                            {currentQuestionIdx < totalQ - 1 ? (
                              <Button
                                disabled={!selectedOpt}
                                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                                className="rounded-xl text-xs bg-primary text-primary-foreground font-bold px-6"
                              >
                                Next Question
                              </Button>
                            ) : (
                              <Button
                                disabled={submittingQuiz || Object.keys(userAnswers).length === 0}
                                onClick={handleSubmitQuiz}
                                className="rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black px-6 shadow-lg shadow-emerald-500/20"
                              >
                                {submittingQuiz ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Submit Quiz & See Results
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      No questions found for this quiz.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Exporting wrapped in ErrorBoundary to prevent React runtime crashes
export function CourseDetails() {
  return (
    <ErrorBoundary>
      <CourseDetailsContent />
    </ErrorBoundary>
  );
}
