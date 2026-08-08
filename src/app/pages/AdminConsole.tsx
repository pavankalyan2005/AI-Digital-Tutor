import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, Edit3, Youtube, BookOpen, Layers, Check, 
  HelpCircle, Settings, ChevronDown, ListPlus, Loader2, Sparkles 
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { api } from "../utils/api";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  modules_count: number;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  duration: string;
  video_url: string;
  video_duration: string;
  channel_name: string;
  rating: number;
  level: string;
  price_type: string;
  language: string;
}

const CATEGORIES = [
  "Programming",
  "AI & Machine Learning",
  "Web Development",
  "Data Science",
  "Mobile Development",
  "UI/UX Design",
  "Cybersecurity"
];

export default function AdminConsole() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"courses" | "videos">("courses");
  const [isLoading, setIsLoading] = useState(true);

  // Course Form State
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseCat, setNewCourseCat] = useState("Programming");
  const [newCourseDiff, setNewCourseDiff] = useState("Beginner to Advanced");
  const [newCourseDur, setNewCourseDur] = useState("10 hours");
  const [newCourseVideoUrl, setNewCourseVideoUrl] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Video Form State
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLvl, setVideoLvl] = useState("Beginner");
  const [videoChan, setVideoChan] = useState("");
  const [videoDur, setVideoDur] = useState("2 hours");
  const [videoVidDur, setVideoVidDur] = useState("10:00");
  const [videoRating, setVideoRating] = useState("4.8");
  const [videoPrice, setVideoPrice] = useState("Free");
  const [videoLang, setVideoLang] = useState("English");
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);

  // Edit Video State
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const coursesData = await api.courses.getAll();
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
        loadModulesForCourse(coursesData[0].id);
      }
    } catch (err: any) {
      toast.error("Failed to load administration data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadModulesForCourse = async (courseId: string) => {
    try {
      const courseDetails = await api.courses.getById(courseId);
      setModules(courseDetails.modules || []);
    } catch (err) {}
  };

  const selectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    loadModulesForCourse(courseId);
  };

  // Helper to parse standard watch YouTube links into embed links
  const parseYoutubeEmbed = (url: string) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseId.trim() || !newCourseTitle.trim()) {
      toast.error("Please fill in course ID and title.");
      return;
    }
    setIsCreatingCourse(true);
    try {
      await api.admin.createCourse({
        id: newCourseId.trim().toLowerCase(),
        title: newCourseTitle.trim(),
        description: newCourseDesc.trim(),
        category: newCourseCat,
        difficulty: newCourseDiff,
        duration: newCourseDur
      });

      // If a video URL is provided, automatically add it as the first one-shot module
      if (newCourseVideoUrl.trim()) {
        const parsedEmbedUrl = parseYoutubeEmbed(newCourseVideoUrl.trim());
        await api.admin.addModule({
          course_id: newCourseId.trim().toLowerCase(),
          title: "Full Tutorial: " + newCourseTitle.trim(),
          duration: newCourseDur,
          video_url: parsedEmbedUrl,
          video_duration: newCourseDur,
          channel_name: "Curated by Admin",
          rating: 4.8,
          level: "All Levels",
          price_type: "Free",
          language: "English"
        });
      }

      toast.success("Skill learning path and video added successfully!");
      // Reset form
      setNewCourseId("");
      setNewCourseTitle("");
      setNewCourseDesc("");
      setNewCourseVideoUrl("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create course.");
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course and all associated lessons?")) return;
    try {
      await api.admin.deleteCourse(courseId);
      toast.success("Course and associated video paths deleted.");
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete course.");
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim() || !selectedCourseId) {
      toast.error("Please fill in title, video link, and select a course.");
      return;
    }
    
    setIsCreatingVideo(true);
    const parsedEmbedUrl = parseYoutubeEmbed(videoUrl.trim());
    
    try {
      if (editingVideoId) {
        // Edit video
        await api.admin.updateModule(editingVideoId, {
          title: videoTitle.trim(),
          duration: videoDur,
          video_url: parsedEmbedUrl,
          video_duration: videoVidDur,
          channel_name: videoChan || "Self Taught",
          rating: parseFloat(videoRating) || 4.7,
          level: videoLvl,
          price_type: videoPrice,
          language: videoLang
        });
        toast.success("Video lesson updated successfully!");
        setEditingVideoId(null);
      } else {
        // Create video
        await api.admin.addModule({
          course_id: selectedCourseId,
          title: videoTitle.trim(),
          duration: videoDur,
          video_url: parsedEmbedUrl,
          video_duration: videoVidDur,
          channel_name: videoChan || "Self Taught",
          rating: parseFloat(videoRating) || 4.7,
          level: videoLvl,
          price_type: videoPrice,
          language: videoLang
        });
        toast.success("Curated YouTube video added to database!");
      }
      
      // Reset Form
      setVideoTitle("");
      setVideoUrl("");
      setVideoChan("");
      
      loadModulesForCourse(selectedCourseId);
    } catch (err: any) {
      toast.error("Failed to save video lesson.");
    } finally {
      setIsCreatingVideo(false);
    }
  };

  const startEditVideo = (video: Module) => {
    setEditingVideoId(video.id);
    setVideoTitle(video.title);
    setVideoUrl(video.video_url);
    setVideoLvl(video.level);
    setVideoChan(video.channel_name);
    setVideoDur(video.duration);
    setVideoVidDur(video.video_duration);
    setVideoRating(video.rating.toString());
    setVideoPrice(video.price_type);
    setVideoLang(video.language);
    toast.info(`Editing lesson: ${video.title}`);
  };

  const cancelEditVideo = () => {
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoUrl("");
    setVideoChan("");
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this YouTube lesson?")) return;
    try {
      await api.admin.deleteModule(videoId);
      toast.success("YouTube video lesson removed from path.");
      loadModulesForCourse(selectedCourseId);
    } catch (err: any) {
      toast.error("Failed to delete lesson.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="p-3 bg-gradient-to-r from-primary to-accent rounded-2xl text-primary-foreground relative shadow">
          <Settings className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-ping" />
        </div>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text">
            Admin Management Console
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure learning categories, pathways, and paste live YouTube video lessons.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/30 pb-1">
        <button
          onClick={() => setActiveTab("courses")}
          className={`pb-2.5 px-1 font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "courses" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Manage Skills & Courses
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`pb-2.5 px-1 font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "videos" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Youtube className="h-4 w-4" />
          Curated YouTube Videos
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {activeTab === "courses" ? (
          <>
            {/* Left: Create Course Form */}
            <Card className="border-border/50 bg-card/65 backdrop-blur-md shadow-lg rounded-3xl h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListPlus className="h-5 w-5 text-primary" />
                  Add Skill Course
                </CardTitle>
                <CardDescription>Configure a new dynamic learning directory.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course ID (No Spaces)</label>
                    <Input 
                      placeholder="e.g. data-science, python-core"
                      value={newCourseId}
                      onChange={(e) => setNewCourseId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                    <Input 
                      placeholder="e.g. Python Programming Masterclass"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                    <Textarea 
                      placeholder="Describe what the student will learn through this level pathway..."
                      value={newCourseDesc}
                      onChange={(e) => setNewCourseDesc(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                      <select
                        className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-xs focus:outline-none"
                        value={newCourseCat}
                        onChange={(e) => setNewCourseCat(e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Duration</label>
                      <Input 
                        placeholder="e.g. 15 hours"
                        value={newCourseDur}
                        onChange={(e) => setNewCourseDur(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Difficulty</label>
                    <Input 
                      placeholder="e.g. Beginner to Intermediate"
                      value={newCourseDiff}
                      onChange={(e) => setNewCourseDiff(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-accent flex items-center gap-1">
                      <Youtube className="h-3 w-3" />
                      Main Tutorial Video Link (Optional)
                    </label>
                    <Input
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={newCourseVideoUrl}
                      onChange={(e) => setNewCourseVideoUrl(e.target.value)}
                      className="border-accent/30 focus:border-accent"
                    />
                    <p className="text-[9px] text-muted-foreground italic">Pasting a link here will automatically create the first lesson.</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent font-bold mt-2"
                    disabled={isCreatingCourse}
                  >
                    {isCreatingCourse ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Create Skill Path
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Right: Existing Courses Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-1.5">
                <Layers className="h-5 w-5 text-accent" />
                Active Skill Curriculums ({courses.length})
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <Card key={course.id} className="border-border/50 bg-card/45 backdrop-blur-sm p-5 rounded-2xl flex flex-col justify-between group relative overflow-hidden">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="text-[9px]">{course.category}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <h4 className="font-extrabold text-base leading-tight truncate group-hover:text-primary transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/30 pt-3 mt-4">
                      <span>⏱️ {course.duration}</span>
                      <span className="font-semibold text-primary">{course.modules_count} lessons</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left: Add Video Form */}
            <Card className="border-border/50 bg-card/65 backdrop-blur-md shadow-lg rounded-3xl h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Youtube className="h-5 w-5 text-accent" />
                  {editingVideoId ? "Edit Video Lesson" : "Paste YouTube Video"}
                </CardTitle>
                <CardDescription>Curate level-based lessons directly from YouTube URLs.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateVideo} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Course</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-xs focus:outline-none"
                      value={selectedCourseId}
                      onChange={(e) => selectCourse(e.target.value)}
                      disabled={!!editingVideoId}
                    >
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lesson Title</label>
                    <Input 
                      placeholder="e.g. Master Scope & Event Loops"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">YouTube Watch or Share Link</label>
                    <Input 
                      placeholder="e.g. https://www.youtube.com/watch?v=hdI2bqOjy3c"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">We parse watch parameters into embed formats automatically.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pathway Level</label>
                      <select
                        className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-xs focus:outline-none"
                        value={videoLvl}
                        onChange={(e) => setVideoLvl(e.target.value)}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Channel Name</label>
                      <Input 
                        placeholder="e.g. Fireship"
                        value={videoChan}
                        onChange={(e) => setVideoChan(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Language</label>
                      <Input value={videoLang} onChange={(e) => setVideoLang(e.target.value)} className="text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tier</label>
                      <select
                        className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-xs focus:outline-none"
                        value={videoPrice}
                        onChange={(e) => setVideoPrice(e.target.value)}
                      >
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rating</label>
                      <Input value={videoRating} onChange={(e) => setVideoRating(e.target.value)} className="text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Duration</label>
                      <Input value={videoDur} onChange={(e) => setVideoDur(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Video Duration</label>
                      <Input value={videoVidDur} onChange={(e) => setVideoVidDur(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingVideoId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={cancelEditVideo}
                        className="flex-1 rounded-2xl text-rose-500 font-bold border border-rose-500/25 hover:bg-rose-500/10 shrink-0"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent font-bold"
                      disabled={isCreatingVideo}
                    >
                      {isCreatingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {editingVideoId ? "Save Edit" : "Add Lesson"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right: Existing Videos List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-1.5">
                  <Youtube className="h-5 w-5 text-accent animate-pulse" />
                  Curated Lessons in Selected Course ({modules.length})
                </h3>
                <select
                  className="p-2 rounded-xl border border-border/50 bg-background text-xs focus:outline-none"
                  value={selectedCourseId}
                  onChange={(e) => selectCourse(e.target.value)}
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {modules.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm bg-card/10 border border-dashed border-border/40 rounded-2xl">
                    No dynamic YouTube lessons added to this course pathway yet.
                  </div>
                ) : (
                  modules.map((video) => (
                    <Card key={video.id} className="border-border/50 bg-card/45 backdrop-blur-sm p-4 rounded-xl flex justify-between items-center group">
                      <div className="flex gap-4 items-center min-w-0">
                        <div className="h-10 w-10 bg-primary/10 text-primary flex items-center justify-center rounded-xl font-bold shrink-0">
                          {video.level ? video.level[0] : 'B'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {video.channel_name} • {video.video_duration} • {video.price_type} • {video.language}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditVideo(video)}
                          className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary/20 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
