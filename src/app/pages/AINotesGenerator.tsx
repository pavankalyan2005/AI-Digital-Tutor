import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Sparkles, Copy, Check, Save, FileText, Search, 
  ExternalLink, Code2, Brain, Loader2, ArrowRight, Lightbulb, Bookmark
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../utils/api";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { toast } from "sonner";

export function AINotesGenerator() {
  useSessionTracker("notes");

  const [activeSkill, setActiveSkill] = useState("Python");
  const [customTopic, setCustomTopic] = useState("");
  const [notesContent, setNotesContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedNotesList, setSavedNotesList] = useState<{ topic: string; content: string; date: string }[]>(() => {
    try {
      const stored = localStorage.getItem("saved_ai_study_notes");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const skillsList = [
    { name: "Python", icon: "🐍", color: "from-blue-500/20 to-yellow-500/20" },
    { name: "Java", icon: "☕", color: "from-red-500/20 to-orange-500/20" },
    { name: "React", icon: "⚛️", color: "from-cyan-500/20 to-blue-500/20" },
    { name: "JavaScript", icon: "🟨", color: "from-yellow-500/20 to-amber-500/20" },
    { name: "TypeScript", icon: "🔷", color: "from-blue-600/20 to-cyan-600/20" },
    { name: "SQL & Databases", icon: "🗄️", color: "from-emerald-500/20 to-teal-500/20" },
    { name: "Docker & DevOps", icon: "🐳", color: "from-blue-500/20 to-indigo-500/20" },
    { name: "Machine Learning", icon: "🤖", color: "from-purple-500/20 to-pink-500/20" },
    { name: "HTML & CSS", icon: "🎨", color: "from-orange-500/20 to-red-500/20" },
    { name: "C++", icon: "⚡", color: "from-indigo-500/20 to-blue-500/20" },
    { name: "Node.js", icon: "🟢", color: "from-green-500/20 to-emerald-500/20" },
    { name: "Git & GitHub", icon: "🌿", color: "from-orange-600/20 to-red-600/20" },
    { name: "Flutter", icon: "📱", color: "from-sky-500/20 to-blue-500/20" },
    { name: "Cybersecurity", icon: "🛡️", color: "from-rose-500/20 to-pink-500/20" },
  ];

  // Auto load initial Python study notes on mount
  useEffect(() => {
    loadSkillNotes("Python");
  }, []);

  const loadSkillNotes = async (skillName: string) => {
    setActiveSkill(skillName);
    setLoading(true);
    try {
      const res = await api.ai.getSkillReferenceNotes(skillName);
      setNotesContent(res.notes);
    } catch (err: any) {
      toast.error("Failed to fetch reference notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomNotes = async () => {
    if (!customTopic.trim()) {
      toast.error("Please enter a topic to generate study notes.");
      return;
    }
    setLoading(true);
    setActiveSkill(customTopic);
    try {
      toast.info(`Compiling detailed study notes for "${customTopic}"...`);
      const res = await api.ai.notes(customTopic);
      setNotesContent(res.notes);
      toast.success(`Notes compiled for ${customTopic}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!notesContent) return;
    navigator.clipboard.writeText(notesContent);
    setCopied(true);
    toast.success("Notes copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToVault = () => {
    if (!notesContent) return;
    const newItem = {
      topic: activeSkill,
      content: notesContent,
      date: new Date().toLocaleDateString()
    };
    const updated = [newItem, ...savedNotesList.filter(s => s.topic !== activeSkill)];
    setSavedNotesList(updated);
    localStorage.setItem("saved_ai_study_notes", JSON.stringify(updated));
    toast.success(`Saved "${activeSkill}" notes to your personal vault!`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── HEADER BANNER ────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-card/75 to-background backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 via-accent/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground font-bold px-3 py-1">
              AI Study Notes & Reference Hub 📝
            </Badge>
            <Badge variant="outline" className="text-xs">
              Curated Documentation & Cheat Sheets
            </Badge>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
            Curated Skill Notes & AI Study Assistant
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Select any skill below to load official study notes, syntax cheat sheets, code snippets, best practices, and direct links to official documentation (docs.python.org, react.dev, developer.mozilla.org, etc.).
          </p>
        </div>
      </motion.div>

      {/* ── AI CUSTOM TOPIC GENERATOR BAR ──────────────────────────────────────── */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-card/60 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              Generate AI Custom Study Notes
              <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] uppercase">Instant Cheat Sheet</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Type any specific topic (e.g., "React Server Components vs Client Components", "Python Generators", "SQL Indexing") to compile custom formatted study notes!
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Input 
            placeholder="Type any skill or topic e.g. Python Asyncio, Docker Multi-stage builds, React Hooks..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateCustomNotes()}
            className="bg-background/60 border-border/50 text-sm rounded-xl py-5 text-foreground"
          />
          <Button 
            onClick={handleGenerateCustomNotes}
            disabled={loading || !customTopic.trim()}
            className="rounded-xl px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shrink-0 cursor-pointer shadow-md"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Compile Notes
          </Button>
        </div>
      </Card>

      {/* ── MAIN SKILLS & NOTES VIEWER GRID ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Skill Selector List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Curated Skill Pathways
            </h3>
            <Badge variant="outline" className="text-[10px]">{skillsList.length} Skills</Badge>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {skillsList.map((item) => {
              const isSelected = activeSkill.toLowerCase() === item.name.toLowerCase();
              return (
                <button
                  key={item.name}
                  onClick={() => loadSkillNotes(item.name)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-primary/15 via-accent/10 to-transparent border-primary text-primary font-bold shadow-lg shadow-primary/10"
                      : "bg-card/60 border-border/40 hover:bg-background/80 hover:border-border/70 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-bold">{item.name}</span>
                  </div>
                  <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? "text-primary translate-x-1" : "text-muted-foreground/40"}`} />
                </button>
              );
            })}
          </div>

          {/* Saved Vault Card */}
          {savedNotesList.length > 0 && (
            <Card className="border-border/50 bg-card/60 p-4 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs flex items-center gap-2 text-foreground">
                <Bookmark className="h-4 w-4 text-accent" /> Saved Notes Vault ({savedNotesList.length})
              </h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {savedNotesList.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveSkill(item.topic);
                      setNotesContent(item.content);
                    }}
                    className="w-full text-left p-2 rounded-xl border border-border/30 hover:bg-background/60 text-[11px] font-medium flex justify-between items-center"
                  >
                    <span className="truncate">{item.topic}</span>
                    <span className="text-[9px] text-muted-foreground">{item.date}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Interactive Markdown Notes Viewer */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/70 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
            {/* Header */}
            <CardHeader className="border-b border-border/40 bg-card/90 px-6 py-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold">
                    {activeSkill} Reference
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Official Documentation Included
                  </Badge>
                </div>
                <CardTitle className="text-xl font-black text-foreground">
                  Study Notes & Cheat Sheet: {activeSkill}
                </CardTitle>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="rounded-xl text-xs cursor-pointer border-border/60"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copied ? "Copied!" : "Copy Notes"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveToVault}
                  className="rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer shadow"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save Note
                </Button>
              </div>
            </CardHeader>

            {/* Content Body */}
            <CardContent className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-24 text-center space-y-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Compiling curated study notes, code examples, and official documentation links...
                  </p>
                </div>
              ) : notesContent ? (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-4 font-sans whitespace-pre-wrap">
                  {notesContent}
                </div>
              ) : (
                <div className="py-24 text-center text-muted-foreground text-xs space-y-3">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/60" />
                  <p>Select any skill on the left or type a custom topic above to load study notes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
