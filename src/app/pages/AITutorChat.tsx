import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Mic, MicOff, Paperclip, Sparkles, Code, BookOpen, Lightbulb, 
  Copy, ThumbsUp, ThumbsDown, Volume2, VolumeX, Square, Radio, 
  Check, Settings, Gauge, AlertTriangle, RotateCcw,
  MessageSquare, Plus, Trash2, Clock, PanelLeft, ChevronLeft, Search, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { api } from "../utils/api";
import { toast } from "sonner";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { voiceService, PlaybackRate } from "../utils/voiceService";

interface Message {
  id: number;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

const initialMessages: Message[] = [
  {
    id: 1,
    type: "ai",
    content: "👋 Hello! I'm your AI Digital Tutor. I'm here to help you learn, grow, and achieve your goals. What would you like to learn today?",
    timestamp: new Date(),
    suggestions: [
      "Explain Machine Learning basics",
      "Help me with Python coding",
      "Create a learning roadmap for Full Stack",
      "What are the trending tech skills?",
    ],
  },
];

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-default-1",
    title: "Machine Learning Basics",
    timestamp: "Just now",
    messages: initialMessages,
  },
  {
    id: "session-default-2",
    title: "CodeX Status 503 Error",
    timestamp: "2h ago",
    messages: [
      { id: 1, type: "user", content: "How to resolve CodeX Status 503 Service Unavailable Error?", timestamp: new Date(Date.now() - 7200000) },
      { id: 2, type: "ai", content: "A 503 Service Unavailable error means the CodeX API server is temporarily overloaded or undergoing maintenance.\n\n### Recommended Fixes:\n1. Check backend endpoint health at `/api/health`.\n2. Verify API gateway rate limits.\n3. Retry request with exponential backoff strategy.", timestamp: new Date(Date.now() - 7100000) }
    ]
  },
  {
    id: "session-default-3",
    title: "1G AMPS System Analysis",
    timestamp: "5h ago",
    messages: [
      { id: 1, type: "user", content: "Explain 1G AMPS System Analysis & Architecture", timestamp: new Date(Date.now() - 18000000) },
      { id: 2, type: "ai", content: "1G AMPS (Advanced Mobile Phone System) uses analog FM signals over 800 MHz frequency band with FDMA (Frequency Division Multiple Access) technology for voice communications.", timestamp: new Date(Date.now() - 17900000) }
    ]
  },
  {
    id: "session-default-4",
    title: "1G AMPS System Answers",
    timestamp: "1d ago",
    messages: [
      { id: 1, type: "user", content: "Give short answers for 1G AMPS system exam questions", timestamp: new Date(Date.now() - 86400000) },
      { id: 2, type: "ai", content: "Key exam points for AMPS:\n- Bandwidth per channel: 30 kHz\n- Modulation: Frequency Modulation (FM)\n- Core Access Method: FDMA", timestamp: new Date(Date.now() - 86300000) }
    ]
  },
  {
    id: "session-default-5",
    title: "GitHub Code Not Showing",
    timestamp: "2d ago",
    messages: [
      { id: 1, type: "user", content: "Why is my GitHub code not showing after push?", timestamp: new Date(Date.now() - 172800000) },
      { id: 2, type: "ai", content: "Check these common causes:\n1. Pushed to a non-default branch (check branch dropdown on GitHub).\n2. Uncommitted local files (`git status`).\n3. Authentication issues with git credential manager.", timestamp: new Date(Date.now() - 172700000) }
    ]
  },
  {
    id: "session-default-6",
    title: "ECE Student Resume Summary",
    timestamp: "3d ago",
    messages: [
      { id: 1, type: "user", content: "Draft an impressive resume summary for an ECE Engineering student", timestamp: new Date(Date.now() - 259200000) },
      { id: 2, type: "ai", content: "### Professional Summary:\nAnalytical and detail-oriented Electronics & Communication Engineering (ECE) student proficient in C/C++, Embedded Systems, Signal Processing, and IoT applications. Passionate about leveraging AI and hardware-software integration to build intelligent systems.", timestamp: new Date(Date.now() - 259100000) }
    ]
  },
  {
    id: "session-default-7",
    title: "Image Enhancement Techniques",
    timestamp: "4d ago",
    messages: [
      { id: 1, type: "user", content: "What are the top Digital Image Enhancement Techniques?", timestamp: new Date(Date.now() - 345600000) },
      { id: 2, type: "ai", content: "Primary Image Enhancement Methods:\n1. **Spatial Domain**: Histogram Equalization, Contrast Stretching, Unsharp Masking.\n2. **Frequency Domain**: High-pass & Low-pass Butterworth/Gaussian filters.\n3. **Color Processing**: HSV color space adjustments.", timestamp: new Date(Date.now() - 345500000) }
    ]
  }
];

export function AITutorChat() {
  useSessionTracker("ai_chat");

  // Sessions state management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem("ai_tutor_sessions_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to load sessions from localStorage:", e);
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "session-default-1";
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || initialMessages;

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Voice States
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [autoRead, setAutoRead] = useState<boolean>(() => {
    return localStorage.getItem("ai_auto_read_tts") === "true";
  });
  const [speechRate, setSpeechRate] = useState<PlaybackRate>(() => {
    const saved = localStorage.getItem("ai_speech_rate");
    return saved ? (parseFloat(saved) as PlaybackRate) : 1.0;
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isGeminiOffline, setIsGeminiOffline] = useState<boolean>(false);

  const isFallbackResponse = (_content: string) => false;

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ai_tutor_sessions_v3", JSON.stringify(sessions));
    } catch (err) {
      console.warn("Failed to save sessions to localStorage:", err);
    }
  }, [sessions]);

  // Health check
  useEffect(() => {
    api.get("/api/health")
      .then((res: any) => {
        if (res && (res.aiAvailable === true || res.openrouter === true || res.gemini === true)) {
          setIsGeminiOffline(false);
        } else {
          setIsGeminiOffline(true);
        }
      })
      .catch(() => {
        setIsGeminiOffline(true);
      });
  }, []);

  // Restore persistent backend chat history into active session
  useEffect(() => {
    async function loadSavedChatHistory() {
      try {
        const res = await api.ai.getChatHistory();
        if (res && Array.isArray(res.history) && res.history.length > 0) {
          const loaded: Message[] = res.history.map((item: any, idx: number) => ({
            id: idx + 1,
            type: item.role === "user" ? "user" : "ai",
            content: item.content,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          }));
          
          setSessions((prev) => {
            if (prev.length === 0) return prev;
            return prev.map((s, idx) => idx === 0 ? { ...s, messages: loaded } : s);
          });
        }
      } catch (err) {
        console.warn("Failed to load saved AI chat history:", err);
      }
    }
    loadSavedChatHistory();
  }, []);

  const handleStartNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      timestamp: "Just now",
      messages: initialMessages,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    toast.success("Started a new chat session!");
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (sessions.length <= 1) {
      toast.info("Keeping at least one conversation session.");
      return;
    }
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (activeSessionId === id && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
    toast.success("Chat deleted from recents.");
  };

  const handleClearAllChats = async () => {
    try {
      await api.ai.clearChatHistory();
      setSessions(DEFAULT_SESSIONS);
      setActiveSessionId(DEFAULT_SESSIONS[0].id);
      toast.success("Reset all conversations!");
    } catch (err: any) {
      toast.error("Failed to clear conversation history.");
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    voiceService.setRate(speechRate);
    localStorage.setItem("ai_speech_rate", speechRate.toString());
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem("ai_auto_read_tts", autoRead.toString());
  }, [autoRead]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
      voiceService.stopListening();
    };
  }, []);

  const handleSpeakMessage = async (messageId: number, text: string) => {
    if (playingMessageId === messageId) {
      await voiceService.stopSpeaking();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(messageId);
    await voiceService.speak(
      messageId,
      text,
      () => setPlayingMessageId(messageId),
      () => setPlayingMessageId(null),
      (err) => {
        setPlayingMessageId(null);
        toast.error("Speech playback error: " + (err.message || err));
      }
    );
  };

  const handleStopSpeaking = async () => {
    await voiceService.stopSpeaking();
    setPlayingMessageId(null);
  };

  const handleStartListening = async () => {
    if (isListening) {
      await handleStopListening();
      return;
    }

    setIsListening(true);
    toast.info("Listening... Speak your question now.");

    await voiceService.startListening(
      (partialText) => {
        setInput(partialText);
      },
      (finalText) => {
        if (finalText) setInput(finalText);
        setIsListening(false);
      },
      (err) => {
        setIsListening(false);
        toast.error(err);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleStopListening = async () => {
    await voiceService.stopListening();
    setIsListening(false);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    if (isListening) {
      await handleStopListening();
    }

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: messageText,
      timestamp: new Date(),
    };

    // Update active session messages
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const newTitle =
            s.title === "New Conversation" || s.title === "Machine Learning Basics"
              ? messageText.length > 26
                ? messageText.slice(0, 26) + "..."
                : messageText
              : s.title;

          return {
            ...s,
            title: newTitle,
            timestamp: "Just now",
            messages: [...s.messages, userMessage],
          };
        }
        return s;
      })
    );

    setInput("");
    setIsTyping(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.type === "ai" ? "ai" : "user",
        content: m.content,
      }));

      const res = await api.ai.chat(messageText, historyPayload);

      const newId = messages.length + 2;
      const aiResponse: Message = {
        id: newId,
        type: "ai",
        content: res.reply,
        timestamp: new Date(),
        suggestions: getRelatedSuggestions(messageText),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, aiResponse] }
            : s
        )
      );

      // If autoRead setting is enabled, speak newly arrived response
      if (autoRead) {
        setTimeout(() => {
          handleSpeakMessage(newId, res.reply);
        }, 400);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI Tutor response.");
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getRelatedSuggestions = (input: string): string[] => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes("machine learning")) {
      return [
        "Show me ML project ideas",
        "What math do I need for ML?",
        "Best ML courses for beginners",
      ];
    } else if (lowerInput.includes("python")) {
      return [
        "Python project ideas for portfolio",
        "Common Python interview questions",
        "Best Python libraries to learn",
      ];
    }

    return [
      "Show me a learning roadmap",
      "Recommend beginner projects",
      "Latest industry trends",
    ];
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Recents Left Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-r border-border/50 bg-card/60 backdrop-blur-xl flex flex-col shrink-0 h-full overflow-hidden shadow-lg z-10"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">AI Mentor</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Conversations</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <Button
                onClick={handleStartNewChat}
                className="w-full justify-start gap-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-xs shadow-md hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </Button>
            </div>

            {/* Search Input for Recents */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recent topics..."
                  className="pl-8 h-8 text-xs bg-muted/40 border-border/40 rounded-xl focus-visible:ring-primary/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Recents Section Header */}
            <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground/90 font-bold">Recents</span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold bg-muted">
                {filteredSessions.length}
              </Badge>
            </div>

            {/* Recents List Container */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-1">
              <div className="space-y-1">
                {filteredSessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                    No recent conversations found.
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = activeSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/30 font-semibold shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <MessageSquare className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary fill-primary/20" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <div className="flex flex-col truncate">
                            <span className="truncate leading-tight font-medium text-foreground/90 group-hover:text-foreground">
                              {session.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 font-normal">
                              {session.timestamp}
                            </span>
                          </div>
                        </div>

                        {sessions.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 text-muted-foreground transition-opacity shrink-0 rounded-md hover:bg-rose-500/10"
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer with Reset */}
            <div className="p-3 border-t border-border/50 bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllChats}
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 justify-center gap-1.5 rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear All Recents
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsSidebarOpen(true)}
                className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted/50 cursor-pointer shrink-0"
                title="Open Recents Sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-md opacity-50" />
              <div className="relative bg-gradient-to-r from-primary to-accent p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {activeSession?.title || "AI Digital Tutor"}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground truncate">Voice Enabled • AI Mentor</span>
              </div>
            </div>
          </div>

          {/* Voice & History Controls Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartNewChat}
              className="h-8 text-xs font-bold rounded-xl border-border/60 hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors hidden sm:flex"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Chat
            </Button>

            {playingMessageId !== null && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStopSpeaking}
                className="h-8 text-xs font-bold rounded-xl animate-pulse cursor-pointer"
                aria-label="Stop playback"
              >
                <Square className="h-3.5 w-3.5 mr-1 fill-current" />
                Stop Speech
              </Button>
            )}

            {/* Auto-read toggle */}
            <button
              onClick={() => {
                const next = !autoRead;
                setAutoRead(next);
                toast.info(next ? "Auto-read enabled for new AI responses" : "Auto-read disabled");
              }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-semibold ${
                autoRead
                  ? "bg-primary/15 border-primary text-primary shadow-sm"
                  : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted"
              }`}
              aria-label="Toggle auto-read responses aloud"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auto-read</span>
              {autoRead && <Check className="h-3 w-3 ml-0.5" />}
            </button>

            {/* Speed selection */}
            <div className="relative flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground ml-1.5 hidden sm:block" />
              {([0.75, 1.0, 1.25] as PlaybackRate[]).map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSpeechRate(rate)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    speechRate === rate
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`Set speech speed to ${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Offline Warning Banner */}
        {isGeminiOffline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-500 font-semibold shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />
              <span>AI is in offline mode — check backend Gemini API key</span>
            </div>
            <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px] bg-amber-500/10">
              Offline Mode
            </Badge>
          </div>
        )}

        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map((message) => {
                const isFallback = message.type === "ai" && isFallbackResponse(message.content);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-4 ${message.type === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <Avatar className={`h-10 w-10 shrink-0 ${message.type === "ai" ? "ring-2 ring-primary/20" : ""}`}>
                      <AvatarFallback className={message.type === "ai" ? (isFallback ? "bg-amber-500/20 text-amber-500 border border-amber-500/40" : "bg-gradient-to-r from-primary to-accent text-primary-foreground") : ""}>
                        {message.type === "ai" ? (isFallback ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />) : "You"}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex-1 max-w-2xl ${message.type === "user" ? "flex justify-end" : ""}`}>
                      <Card
                        className={`p-4 ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-md"
                            : isFallback
                            ? "bg-amber-500/10 border-amber-500/40 shadow-sm backdrop-blur"
                            : "bg-card/80 backdrop-blur border-border/50 shadow-sm"
                        }`}
                      >
                        {isFallback && (
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/30">
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold gap-1 text-[11px]">
                              <AlertTriangle className="h-3.5 w-3.5 fill-current text-amber-500" />
                              Offline Fallback Response
                            </Badge>
                            <span className="text-[11px] text-amber-500/80 font-medium">Live Gemini API unavailable</span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{message.content}</div>

                        {message.type === "ai" && (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1.5">
                              {/* TTS Speaker Read Aloud Button */}
                              <Button
                                size="sm"
                                variant={playingMessageId === message.id ? "default" : "secondary"}
                                className={`h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                  playingMessageId === message.id
                                    ? "bg-primary text-primary-foreground animate-pulse shadow-md"
                                    : "hover:bg-primary/10 hover:text-primary"
                                }`}
                                onClick={() => handleSpeakMessage(message.id, message.content)}
                                aria-label={playingMessageId === message.id ? "Stop reading message" : "Read response aloud"}
                              >
                                {playingMessageId === message.id ? (
                                  <>
                                    <VolumeX className="h-3.5 w-3.5 mr-1.5" />
                                    Stop Reading
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                                    Read Aloud
                                  </>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => copyToClipboard(message.content)}
                                aria-label="Copy response text"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </Button>

                              {/* Retry Button for Fallback Responses */}
                              {isFallback && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-bold rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer"
                                  onClick={() => {
                                    const msgIndex = messages.findIndex((m) => m.id === message.id);
                                    const prevUserMsg = messages
                                      .slice(0, msgIndex)
                                      .reverse()
                                      .find((m) => m.type === "user");
                                    if (prevUserMsg) {
                                      sendMessage(prevUserMsg.content);
                                    } else {
                                      toast.info("Resending query...");
                                      sendMessage();
                                    }
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Retry
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-emerald-500 cursor-pointer" aria-label="Mark helpful">
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-rose-500 cursor-pointer" aria-label="Mark not helpful">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Suggested questions:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => sendMessage(suggestion)}
                                className="text-xs rounded-xl hover:bg-primary/10 hover:border-primary/40 cursor-pointer"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] text-muted-foreground mt-1.5 block">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 shrink-0">
                  <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-4 bg-card/80 backdrop-blur border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>AI Mentor is thinking...</span>
                  </div>
                </Card>
              </motion.div>
            )}

            <div ref={scrollRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-6 py-2 border-t border-border/50 bg-card/50 backdrop-blur">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-1">
            <Badge 
              variant="outline" 
              onClick={() => sendMessage("Help me debug my code")}
              className="cursor-pointer hover:bg-primary/10 transition-colors whitespace-nowrap text-xs py-1"
            >
              <Code className="h-3 w-3 mr-1" />
              Code Help
            </Badge>
            <Badge 
              variant="outline" 
              onClick={() => sendMessage("Explain Machine Learning in simple terms")}
              className="cursor-pointer hover:bg-primary/10 transition-colors whitespace-nowrap text-xs py-1"
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Explain Concept
            </Badge>
            <Badge 
              variant="outline" 
              onClick={() => sendMessage("Give me 3 portfolio project ideas")}
              className="cursor-pointer hover:bg-primary/10 transition-colors whitespace-nowrap text-xs py-1"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Project Ideas
            </Badge>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t border-border/50 bg-card/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Listening Active Banner */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse text-rose-500" />
                  <span>Listening to your speech... Speak clearly. Text appears in input box for editing.</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStopListening}
                  className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl"
                >
                  Stop Recording
                </Button>
              </motion.div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2 sm:gap-3"
            >
              <Button type="button" size="icon" variant="outline" className="rounded-2xl cursor-pointer shrink-0" aria-label="Attach file">
                <Paperclip className="h-5 w-5" />
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening... Speak or edit your question..." : "Ask me anything about learning, coding, careers..."}
                className={`flex-1 rounded-2xl transition-all text-sm ${
                  isListening ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""
                }`}
              />

              {/* Microphone Button */}
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                onClick={handleStartListening}
                className={`rounded-2xl transition-all cursor-pointer shrink-0 ${
                  isListening ? "animate-pulse shadow-lg shadow-rose-500/25" : "hover:border-primary/50"
                }`}
                aria-label={isListening ? "Stop voice recording" : "Ask question with voice"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button
                type="submit"
                size="icon"
                className="rounded-2xl bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 cursor-pointer shrink-0"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
