import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion } from "motion/react";
import { 
  Play, RotateCcw, Check, Code2, Trophy, Terminal, Search,
  FolderGit2, FileCode, Eye, EyeOff, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { api } from "../utils/api";
import { toast } from "sonner";
import { useSessionTracker } from "../hooks/useSessionTracker";
import Editor from "@monaco-editor/react";
import { PROJECTS_DATA, Project } from "./ProjectShowcase";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  initial_code: string;
  solution_code?: string;
  language: string;
  isProject?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { id: 'c', label: 'C', monaco: 'c', note: 'Standard gcc runtime' },
  { id: 'cpp', label: 'C++', monaco: 'cpp', note: 'Standard g++ runtime' },
  { id: 'java', label: 'Java', monaco: 'java', note: 'Needs a "public class Main" entrypoint.' },
  { id: 'python', label: 'Python', monaco: 'python', note: 'Python 3.x interpreter' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', note: 'Node.js runtime' },
];

export function CodingArena() {
  useSessionTracker("coding_arena");
  const location = useLocation();
  const [workspaceMode, setWorkspaceMode] = useState<"challenges" | "projects">("challenges");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterLang, setFilterLang] = useState("All");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await api.code.getChallenges();
        const formattedList = list.map((c: Challenge) => ({
          ...c,
          solution_code: c.solution_code || c.initial_code
        }));
        setChallenges(formattedList);
        
        // If coming from ProjectShowcase with a project payload
        if (location.state?.project) {
          const proj: Project = location.state.project;
          setWorkspaceMode("projects");
          const projectChallenge: Challenge = {
            id: proj.id,
            title: `[Project] ${proj.title}`,
            description: proj.spec?.overview || proj.description,
            category: proj.category,
            difficulty: proj.difficulty,
            initial_code: "",
            solution_code: proj.solutionCode,
            language: proj.language || "javascript",
            isProject: true
          };
          setSelectedChallenge(projectChallenge);
          setSelectedLanguage(proj.language || "javascript");
          setCode("");
          setShowSolution(false);
          setOutput(`🛠️ Blank Project Workspace Initialized: "${proj.title}"\nTech Stack: ${proj.tech ? proj.tech.join(", ") : "General"}\n\nStart typing your project code in the editor below and click 'Run Code'!\n`);

          toast.success(`Blank Project Workspace "${proj.title}" ready!`);
        } else if (formattedList.length > 0) {
          selectChallenge(formattedList[0]);
        }

        const stats = await api.stats.getProgress();
        setXp(stats.points);
      } catch (err) {
        toast.error("Failed to load Coding Arena.");
      }
    }
    loadData();
  }, [location.state]);

  const selectChallenge = (challenge: Challenge) => {
    const sol = challenge.solution_code || challenge.initial_code || "";
    setSelectedChallenge({
      ...challenge,
      solution_code: sol
    });
    setSelectedLanguage(challenge.language || "javascript");
    setCode("");
    setShowSolution(false);
    setOutput(`🛠️ Blank Workspace Initialized: "${challenge.title}"\nLanguage: ${(challenge.language || "javascript").toUpperCase()}\n\nStart typing your code in the editor below and click 'Run Code'!\n`);
  };


  const selectProjectItem = (proj: Project) => {
    const projectChallenge: Challenge = {
      id: proj.id,
      title: `[Project] ${proj.title}`,
      description: proj.spec?.overview || proj.description,
      category: proj.category,
      difficulty: proj.difficulty,
      initial_code: "",
      solution_code: proj.solutionCode,
      language: proj.language || "javascript",
      isProject: true
    };
    setSelectedChallenge(projectChallenge);
    setSelectedLanguage(proj.language || "javascript");
    setCode("");
    setShowSolution(false);
    setOutput(`🛠️ Blank Project Workspace: "${proj.title}"\nTech Stack: ${proj.tech.join(", ")}\n\nStart typing your project code in the editor below and click 'Run Code'!\n`);
  };



  const handleRunCode = async () => {
    if (!code || code.trim() === "") {
      setOutput("⚠️ Code editor is empty. Type your project code in the editor before running.");
      toast.error("Editor is empty! Please write some code first.");
      return;
    }
    setIsExecuting(true);
    setOutput("🚀 Executing code in workspace...\n");
    try {
      const res = await api.code.executeCode(selectedLanguage, code);
      let out = "";
      if (res.stderr) out += `❌ Error:\n${res.stderr}\n\n`;
      if (res.stdout) out += `✅ Output:\n${res.stdout}`;
      if (!res.stdout && !res.stderr) out += "Program executed with no output.";
      setOutput(out);
    } catch (err: any) {
      setOutput(`❌ Runtime Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedChallenge) return;
    if (!code || code.trim() === "") {
      toast.error("Please write your project code before submitting.");
      return;
    }
    setIsLoading(true);
    setOutput("⚙️ Evaluating project submission...\n");
    try {
      if (selectedChallenge.isProject) {
        const res = await api.code.executeCode(selectedLanguage, code);
        let out = "🎯 Project Workspace Submission Summary:\n";
        if (res.stderr) out += `❌ Error:\n${res.stderr}\n\n`;
        if (res.stdout) out += `✅ Output:\n${res.stdout}\n\n`;
        out += "🎉 Project implementation submitted successfully! +150 XP awarded to your portfolio.";
        setOutput(out);
        toast.success("Project submitted successfully! +150 XP");
        const stats = await api.stats.getProgress();
        setXp(stats.points);
      } else {
        const res = await api.code.runCode(selectedChallenge.id, code, selectedLanguage);
        let out = "";
        if (res.testResults) {
          res.testResults.forEach((t: any, i: number) => {
            out += `Test Case ${i + 1}: ${t.passed ? "✓ Passed" : "✗ Failed"}\n`;
            if (!t.passed) {
              out += `  Expected: ${t.expected}\n  Actual: ${t.actual}\n`;
            }
          });
          out += `\n🎯 Score: ${res.passedCount}/${res.totalCount} passed.`;
        }
        setOutput(out);
        if (res.success) {
          toast.success("All tests passed! +100 XP");
          const stats = await api.stats.getProgress();
          setXp(stats.points);
        } else {
          toast.error("Some tests failed. Check console.");
        }
      }
    } catch (err: any) {
      setOutput(`❌ Validation Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchCat = selectedCategory === "All" || c.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchLang = filterLang === "All" || c.language?.toLowerCase() === filterLang.toLowerCase();
    const matchQuery = !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.category?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchLang && matchQuery;
  });

  const filteredProjects = PROJECTS_DATA.filter(p => {
    const matchQuery = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.tech.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchQuery;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Coding Arena & Project Workspaces</h1>
          <p className="text-muted-foreground font-medium">Build portfolio project workspaces from scratch & solve coding problems with live execution feedback</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2 bg-primary/10 border-primary/20">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs font-medium opacity-70">Experience</p>
                <p className="text-xl font-bold">{xp} XP</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left: Practice Questions & Projects Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3 space-y-3">
              {/* Mode Switcher Tabs */}
              <div className="flex bg-muted/50 p-1 rounded-xl border border-border/40">
                <button
                  onClick={() => setWorkspaceMode("challenges")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    workspaceMode === "challenges"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" /> Challenges
                </button>
                <button
                  onClick={() => setWorkspaceMode("projects")}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    workspaceMode === "projects"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FolderGit2 className="h-3.5 w-3.5" /> Workspaces ({PROJECTS_DATA.length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Input
                  placeholder={workspaceMode === "challenges" ? "Search LeetCode problems..." : "Search project workspaces..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background/60 border-border/40 text-xs rounded-xl py-3 pl-8 text-foreground"
                />
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              </div>

              {workspaceMode === "challenges" && (
                <>
                  {/* Language Selector Filter */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Language Filter</p>
                    <div className="flex flex-wrap gap-1">
                      {["All", "javascript", "python", "java", "cpp", "c"].map((l) => (
                        <button
                          key={l}
                          onClick={() => setFilterLang(l)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase transition-all cursor-pointer ${
                            filterLang === l
                              ? "bg-accent text-accent-foreground border-accent shadow-sm"
                              : "bg-muted/30 text-muted-foreground border-border/20 hover:bg-muted"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Topic Filter</p>
                    <div className="flex flex-wrap gap-1">
                      {["All", "Logic", "Arrays", "Strings", "Math", "Algorithms", "Recursion"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            selectedCategory === cat 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/40 text-muted-foreground border-border/30 hover:bg-muted"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {workspaceMode === "challenges" ? (
                filteredChallenges.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No questions match your filters.</p>
                ) : (
                  filteredChallenges.map((c) => {
                    const isSelected = selectedChallenge?.id === c.id;
                    const diffColor = 
                      c.difficulty === "Easy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      c.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                      "bg-rose-500/15 text-rose-400 border-rose-500/30";

                    return (
                      <button
                        key={c.id}
                        onClick={() => selectChallenge(c)}
                        className={`w-full p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                          isSelected 
                            ? "bg-primary/15 border-primary shadow-md shadow-primary/10" 
                            : "bg-muted/30 border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <h4 className="font-bold text-xs mb-1 text-foreground line-clamp-1">{c.title}</h4>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${diffColor}`}>
                            {c.difficulty}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                            <span>{c.category}</span>
                            <span>•</span>
                            <span className="uppercase text-primary font-bold">{c.language}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = selectedChallenge?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectProjectItem(p)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                        isSelected 
                          ? "bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-500/10" 
                          : "bg-muted/30 border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <h4 className="font-bold text-xs mb-1 text-foreground line-clamp-1 flex items-center justify-between">
                        <span>{p.title}</span>
                      </h4>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                          {p.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span className="uppercase text-emerald-400 font-bold">{p.language || "js"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Editor & Output */}
        <div className="lg:col-span-3 space-y-6">
          {selectedChallenge && (
            <>
              {/* Problem Description + Reference Solution side by side */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* LEFT — Problem Description */}
                <Card className="border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {selectedChallenge.isProject ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1 font-semibold">
                              <FolderGit2 className="h-3 w-3" /> Blank Project Workspace Canvas
                            </Badge>
                          ) : (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs flex items-center gap-1 font-semibold">
                              <Code2 className="h-3 w-3" /> Coding Problem
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl font-extrabold">{selectedChallenge.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">{selectedChallenge.category}</CardDescription>
                      </div>
                      <Badge className={selectedChallenge.difficulty === "Easy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                        {selectedChallenge.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedChallenge.description}
                    </p>
                  </CardContent>
                </Card>

                {/* RIGHT — Reference Solution (Optional & Hidden by Default) */}
                <Card className="border-amber-500/20 bg-card/80 backdrop-blur overflow-hidden flex flex-col justify-between">
                  <CardHeader className="py-3 border-b border-amber-500/20 bg-amber-500/5 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Reference Solution (Optional)
                      </span>
                    </div>
                    {selectedChallenge.solution_code && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSolution(!showSolution)}
                        className="h-7 text-xs font-semibold border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                      >
                        {showSolution ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide Solution
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Solution
                          </>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-center">
                    {!selectedChallenge.solution_code ? (
                      <div className="flex items-center justify-center h-[140px] text-xs text-muted-foreground">
                        No reference solution available for this problem.
                      </div>
                    ) : !showSolution ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[140px] space-y-3 bg-card/50">
                        <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Solution Hidden for Practice</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                            Try writing your solution first. Click below if you need to check the reference answer.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowSolution(true)}
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Reveal Reference Solution
                        </Button>
                      </div>
                    ) : (
                      <pre className="p-4 text-xs font-mono text-green-300 bg-[#0d1117] overflow-x-auto max-h-[240px] overflow-y-auto whitespace-pre leading-relaxed">
                        {selectedChallenge.solution_code}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Monaco Editor — always blank for student practice */}
              <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
                <CardHeader className="border-b border-border/50 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-sm">
                          {selectedChallenge.isProject ? "Blank Workspace Editor" : "Monaco Code Editor"}
                        </span>
                      </div>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-muted border-border/50 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary outline-none font-bold text-foreground"
                      >
                        {SUPPORTED_LANGUAGES.map(l => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">

                      <Button size="sm" variant="ghost" onClick={() => setCode("")} className="cursor-pointer">
                        <RotateCcw className="h-4 w-4 mr-2" /> Clear Code
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleRunCode} disabled={isExecuting} className="cursor-pointer">
                        <Play className="h-4 w-4 mr-2" /> {isExecuting ? "Running..." : "Run Code"}
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-primary to-accent cursor-pointer" onClick={handleSubmitCode} disabled={isLoading}>
                        <Check className="h-4 w-4 mr-2" /> {isLoading ? "Submitting..." : "Submit Project"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[420px] w-full bg-[#1e1e1e]">
                    <Editor
                      height="100%"
                      language={SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.monaco || "javascript"}
                      theme="vs-dark"
                      value={code}
                      onChange={(v) => setCode(v || "")}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Console Output */}
              <Card className="border-border/50 bg-black/90 backdrop-blur-xl">
                <CardHeader className="py-3 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-mono text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" /> WORKSPACE_CONSOLE_OUTPUT
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap max-h-[220px] overflow-auto">
                    {output || "> Workspace ready. Write your code in the editor above..."}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
