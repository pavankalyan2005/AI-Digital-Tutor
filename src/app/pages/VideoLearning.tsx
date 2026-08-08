import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Sparkles, CheckCircle, ChevronLeft, BrainCircuit, Notebook, FileText, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { api } from "../utils/api";
import { toast } from "sonner";
import { useSessionTracker } from "../hooks/useSessionTracker";

interface ModuleData {
  id: string;
  course_id: string;
  title: string;
  duration: string;
  video_url: string;
  video_duration: string;
  completed: number;
}

export function VideoLearning() {
  const { moduleId } = useParams<{ moduleId: string }>();
  useSessionTracker("lesson", moduleId);
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiNotes, setAiNotes] = useState("");
  const [isNotesGenerating, setIsNotesGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    async function loadModuleDetails() {
      if (!moduleId) return;
      setIsLoading(true);
      try {
        const data = await api.courses.getModuleById(moduleId);
        setModuleData(data);
      } catch (err: any) {
        toast.error("Failed to load module video details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadModuleDetails();
  }, [moduleId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="p-6 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
        <h3 className="text-xl font-bold">Tutorial Not Found</h3>
        <p className="text-muted-foreground">The requested tutorial module could not be found in the database.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary rounded-lg text-white cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  const handleGenerateNotes = async () => {
    setIsNotesGenerating(true);
    setAiNotes("");
    try {
      const res = await api.ai.notes(`${moduleData.title} study cheat sheet and core technical concepts`);
      setAiNotes(res.notes);
      toast.success("AI notes compiled successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI notes.");
    } finally {
      setIsNotesGenerating(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!moduleId) return;
    setIsCompleting(true);
    try {
      // For one-shot videos, we could pass totalDuration if we wanted auto-completion based on time,
      // but for manual clicks, we just mark it done.
      const res = await api.courses.updateProgress(moduleId, true, 100);
      toast.success(`Module Completed! +${res.pointsAwarded} XP! 🔥`);
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to record module completion.");
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const parseDurationToSeconds = (dur: string) => {
    const parts = dur.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const totalSec = parseDurationToSeconds(moduleData.video_duration);
  const watchedSec = moduleData.watchedDuration || 0;
  const progressPercent = totalSec > 0 ? (watchedSec / totalSec) * 100 : 0;

  // Convert embed URL back to watch URL for the fallback link
  const getYouTubeWatchUrl = (embedUrl: string) => {
    const videoId = embedUrl.split('/').pop()?.split('?')[0];
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Course Curriculum
        </button>
        <Badge className="bg-gradient-to-r from-primary to-accent border-0 uppercase">{moduleData.id.split('-').pop() === 'full' ? 'One Shot Course' : 'Module Lesson'}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side - Video Player & Meta */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-black overflow-hidden rounded-3xl shadow-2xl relative">
            <div className="aspect-video w-full">
              <iframe
                src={moduleData.video_url}
                title={moduleData.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
            <div className="bg-black/80 px-4 py-3 text-[10px] text-white/50 flex justify-between items-center border-t border-white/5">
              <div className="flex items-center gap-4">
                <span>Tutorial by freeCodeCamp.org / Educational Partners</span>
                <a
                  href={getYouTubeWatchUrl(moduleData.video_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors uppercase font-bold"
                >
                  Watch on YouTube <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <span className="flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Digital Tutor Premium Content
              </span>
            </div>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-2xl leading-tight">{moduleData.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    Complete One-Shot Tutorial • Duration: {moduleData.video_duration}
                  </CardDescription>
                </div>
                {moduleData.completed === 1 && (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium">{formatDuration(watchedSec)} / {formatDuration(totalSec)}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <p className="text-muted-foreground leading-relaxed text-sm italic">
                "This is a comprehensive one-shot tutorial. Take your time, use the AI Smart Notebook for summaries, and master the entire subject in one sitting."
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleGenerateNotes}
                  className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
                  disabled={isNotesGenerating}
                >
                  <BrainCircuit className="h-5 w-5 mr-2" />
                  {isNotesGenerating ? "Compiling AI Notes..." : "Generate AI Study Notes"}
                </Button>

                {moduleData.completed !== 1 && (
                  <Button
                    onClick={handleCompleteLesson}
                    variant="outline"
                    className="border-green-500/35 hover:bg-green-500/10 text-green-500 cursor-pointer ml-auto"
                    disabled={isCompleting}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {isCompleting ? "Recording..." : "Mark as Completed (+50 XP)"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - AI Study Notes Panel */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl h-full flex flex-col min-h-[500px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Notebook className="h-5 w-5 text-primary" />
                AI Smart Notebook
              </CardTitle>
              <CardDescription>Generated summaries & key syntax cheat sheets</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence mode="wait">
                {isNotesGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-4"
                  >
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Analyzing tutorial transcript and generating beautiful markdown summaries...
                    </p>
                  </motion.div>
                )}

                {!isNotesGenerating && aiNotes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-sm dark:prose-invert whitespace-pre-wrap text-foreground font-sans leading-relaxed"
                  >
                    {aiNotes}
                  </motion.div>
                )}

                {!isNotesGenerating && !aiNotes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4"
                  >
                    <FileText className="h-12 w-12 text-muted-foreground/40" />
                    <h4 className="font-medium text-sm">No Active Notes</h4>
                    <p className="text-xs text-muted-foreground">
                      Click the "Generate AI Study Notes" button on the left to compile a personalized markdown summary cheat sheet for this specific YouTube tutorial.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
