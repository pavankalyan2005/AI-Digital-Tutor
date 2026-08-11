import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Mic, MicOff, Paperclip, Sparkles, Code, BookOpen, Lightbulb, 
  Copy, ThumbsUp, ThumbsDown, Volume2, VolumeX, Square, Radio, 
  Check, Settings, Gauge, AlertTriangle, RotateCcw
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

export function AITutorChat() {
  useSessionTracker("ai_chat");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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

  const isFallbackResponse = (content: string) => {
    if (!content) return false;
    return (
      content.startsWith("###") ||
      content.includes("I am configured and running inside") ||
      content.includes("I'm currently offline") ||
      content.includes("check your GEMINI_API_KEY") ||
      content.includes("Check your GEMINI_API_KEY")
    );
  };

  useEffect(() => {
    api.get("/api/health")
      .then((res: any) => {
        if (res && res.gemini === false) {
          setIsGeminiOffline(true);
        } else {
          setIsGeminiOffline(false);
        }
      })
      .catch(() => {
        setIsGeminiOffline(true);
      });
  }, []);

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

    setMessages((prev) => [...prev, userMessage]);
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

      setMessages((prev) => [...prev, aiResponse]);

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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-md opacity-50" />
            <div className="relative bg-gradient-to-r from-primary to-accent p-2.5 rounded-full">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold">AI Digital Tutor</h2>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Voice Enabled • AI Mentor</span>
            </div>
          </div>
        </div>

        {/* Voice Controls Bar */}
        <div className="flex items-center gap-3">
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
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-semibold ${
              autoRead
                ? "bg-primary/15 border-primary text-primary shadow-sm"
                : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted"
            }`}
            aria-label="Toggle auto-read responses aloud"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Auto-read</span>
            {autoRead && <Check className="h-3 w-3 ml-0.5" />}
          </button>

          {/* Settings Trigger for Speed */}
          <div className="relative flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
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

      {/* Persistent Gemini Offline Warning Banner */}
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

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-6">
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
                  <Avatar className={`h-10 w-10 ${message.type === "ai" ? "ring-2 ring-primary/20" : ""}`}>
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

                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

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
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
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
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-6 py-2 border-t border-border/50 bg-card/50 backdrop-blur">
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
      <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-xl">
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
            className="flex gap-3"
          >
            <Button type="button" size="icon" variant="outline" className="rounded-2xl cursor-pointer" aria-label="Attach file">
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening... Speak or edit your question..." : "Ask me anything about learning, coding, careers..."}
              className={`flex-1 rounded-2xl transition-all ${
                isListening ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""
              }`}
            />

            {/* Microphone Button */}
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              onClick={handleStartListening}
              className={`rounded-2xl transition-all cursor-pointer ${
                isListening ? "animate-pulse shadow-lg shadow-rose-500/25" : "hover:border-primary/50"
              }`}
              aria-label={isListening ? "Stop voice recording" : "Ask question with voice"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              type="submit"
              size="icon"
              className="rounded-2xl bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 cursor-pointer"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
