import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, Brain, Globe, Database, Terminal, Smartphone, Sparkles, 
  TrendingUp, DollarSign, Award, ChevronRight, Send, User, Bot, 
  MapPin, CheckCircle, RefreshCw, Layers, GraduationCap, Star
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

interface CareerStep {
  level: string;
  title: string;
  description: string;
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  demand: "High" | "Extremely High" | "Stable";
  salaryMin: number;
  salaryMax: number;
  tech: string[];
  color: string;
  icon: any;
  steps: CareerStep[];
}

const CAREER_PATHS: CareerPath[] = [
  {
    id: "fullstack",
    title: "Full Stack Web Engineer",
    description: "Design consumer-facing reactive frontends, backend REST services, and migrate production databases.",
    demand: "Extremely High",
    salaryMin: 85000,
    salaryMax: 145000,
    tech: ["React.js", "Node.js", "Express", "SQLite", "TypeScript", "Tailwind CSS"],
    color: "from-blue-500 to-cyan-500",
    icon: Globe,
    steps: [
      { level: "Foundations", title: "Semantic Layouts & Tailwind Grids", description: "Master document models, responsive Flexbox/Grid systems, and CSS variables." },
      { level: "Interactive Core", title: "Component Reactivity with React.js", description: "Understand dynamic state hooks (useState), side-effects (useEffect), and custom hooks." },
      { level: "Backend Services", title: "Node.js Server Architectures", description: "Design modular URL routes, body-parsing middlewares, and secure JWT verification protocols." },
      { level: "Deployments", title: "Persistent Datastores & Session Caching", description: "Run foreign key SQL migrations, manage SQLite indexes, and deploy containers offline." }
    ]
  },
  {
    id: "aiml",
    title: "AI & Machine Learning Specialist",
    description: "Train deep neural networks, evaluate data classification ratios, and scale model inference pipelines.",
    demand: "Extremely High",
    salaryMin: 110000,
    salaryMax: 185000,
    tech: ["Python", "NumPy", "PyTorch", "TensorFlow", "Scikit-Learn", "OpenCV"],
    color: "from-purple-500 to-pink-500",
    icon: Brain,
    steps: [
      { level: "Foundations", title: "Multidimensional Linear Algebra & Statistics", description: "Master tensor dot products, gradient calculations, probability densities, and loss theory." },
      { level: "Core Learning", title: "Supervised Classifiers & Preprocessing", description: "Feature-engineer raw data, perform TF-IDF vectorization, and compile Logistic/SVM models." },
      { level: "Neural Grids", title: "Deep Learning Backpropagation from Scratch", description: "Formulate backward passes, calculate ReLU gradients, and configure dense multi-layer networks." },
      { level: "Production", title: "CNN Webcam Classification & Model Exports", description: "Load ResNet structures, apply Transfer Learning, capture live frames, and expose predictions." }
    ]
  },
  {
    id: "uiux",
    title: "UI/UX Product Designer",
    description: "Create responsive interactive mockups, draft user journey wireframes, and compile design token libraries.",
    demand: "High",
    salaryMin: 75000,
    salaryMax: 130000,
    tech: ["Figma", "Auto Layout", "Variables", "Wireframing", "Prototyping"],
    color: "from-fuchsia-500 to-rose-500",
    icon: Layers,
    steps: [
      { level: "Foundations", title: "Grids, Spacing & Color Contrasts", description: "Learn typography hierarchies, WCAG contrast standards, and responsive column grids." },
      { level: "Design Tokens", title: "Figma Components & Auto Layout Scale", description: "Build scalable nested component systems using flex constraints and spacing parameters." },
      { level: "Reactivity", title: "Micro-Interactive Prototyping", description: "Animate hover triggers, construct mobile modal sheets, and specify component variants." },
      { level: "System Design", title: "Theme Variables & Developer Specifications", description: "Declare spacing tokens, organize dark/light theme options, and publish style guides." }
    ]
  },
  {
    id: "devops",
    title: "DevOps & Cloud Architect",
    description: "Orchestrate scaling container clusters, build automated CI/CD logs, and deploy global cloud servers.",
    demand: "Extremely High",
    salaryMin: 100000,
    salaryMax: 170000,
    tech: ["Docker", "Kubernetes", "AWS", "GitHub Actions", "Terraform", "Linux"],
    color: "from-emerald-500 to-teal-500",
    icon: Terminal,
    steps: [
      { level: "Foundations", title: "Linux Shell Scripting & Networks", description: "Master shell command routers, port forwarding processes, and trace network diagnostics." },
      { level: "Containers", title: "Docker Environment Isolation", description: "Compose custom Dockerfiles, optimize base layer files, and push to container registries." },
      { level: "Automation", title: "CI/CD Pipeline Configurations", description: "Design automated test sweeps, verify code checks on push, and compile cloud deployments." },
      { level: "Scale", title: "Kubernetes Orchestration & AWS Clusters", description: "Declare load-balancer configurations, deploy replicas, and structure Terraform variables." }
    ]
  },
  {
    id: "dataeng",
    title: "Big Data & Pipelines Engineer",
    description: "Design high-volume ETL data streams, tune SQL performance indexes, and scale warehouse storage.",
    demand: "High",
    salaryMin: 95000,
    salaryMax: 155000,
    tech: ["Python", "SQL", "Apache Spark", "Airflow", "PostgreSQL", "dbt"],
    color: "from-orange-500 to-amber-500",
    icon: Database,
    steps: [
      { level: "Foundations", title: "Relational Schemas & Index Optimizations", description: "Master complex table joins, compile target queries, and manage transactional schemas." },
      { level: "Pipelines", title: "ETL Streams & Script Cleaning", description: "Extract scattered inputs, write text validation scripts, and format database write routines." },
      { level: "Compute", title: "Apache Spark Parallel Compute Layers", description: "Configure distributed computing clusters, manage RDD states, and stream datasets." },
      { level: "Scheduling", title: "Airflow Task Streams & Warehouses", description: "Build DAG files, coordinate query pipelines, and audit compliance indices." }
    ]
  },
  {
    id: "mobile",
    title: "Mobile App Developer",
    description: "Write premium native or cross-platform apps targeting iOS and Android devices.",
    demand: "High",
    salaryMin: 90000,
    salaryMax: 150000,
    tech: ["Kotlin", "Swift", "Flutter", "Retrofit", "REST APIs", "Gradle"],
    color: "from-cyan-500 to-blue-500",
    icon: Smartphone,
    steps: [
      { level: "Foundations", title: "Screen Lifecycles & Material Grid Layouts", description: "Configure activities, map standard app routing, and support system designs." },
      { level: "Networking", title: "Retrofit API Clients & JSON Mapping", description: "Establish async network connections, serialize JSON data, and configure local storage." },
      { level: "Hardware", title: "Device Features & Background Threads", description: "Connect camera systems, log geographic locations, and spin off background tasks." },
      { level: "Bundling", title: "Production Compiling & Play Store Publishing", description: "Manage build Gradle variables, run device test sweeps, and export signed bundles." }
    ]
  }
];

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export function AICareerGuidance() {
  const [selectedPath, setSelectedPath] = useState<CareerPath>(CAREER_PATHS[0]);
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "ai", content: "Greetings! I am your AI Career Mentor. Ask me anything about tech roles, compensation trends, custom skill roadmaps, or target job matching parameters!" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt.trim();
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setPrompt("");
    setIsTyping(true);

    // Dynamic mock response logic based on input keywords
    setTimeout(() => {
      let reply = "";
      const lower = userMsg.toLowerCase();

      if (lower.includes("salary") || lower.includes("pay") || lower.includes("earn")) {
        reply = `Based on current market indices, a **${selectedPath.title}** commands a starting baseline of $${selectedPath.salaryMin.toLocaleString()} scaling up to $${selectedPath.salaryMax.toLocaleString()}+ at Senior levels. Core high-paying focus areas include mastering: ${selectedPath.tech.slice(0, 3).join(", ")}.`;
      } else if (lower.includes("learn") || lower.includes("skill") || lower.includes("roadmap") || lower.includes("start")) {
        reply = `To qualify as a **${selectedPath.title}**, I recommend starting with the following milestone: **${selectedPath.steps[0].title}** (${selectedPath.steps[0].description}). Once completed, transition sequentially into **${selectedPath.steps[1].title}**.`;
      } else if (lower.includes("job") || lower.includes("ats") || lower.includes("resume")) {
        reply = `To make your resume ATS-compliant for a **${selectedPath.title}** role, include specific technology matches in your text index: ${selectedPath.tech.join(", ")}. Building portfolio challenges like the capstone project will significantly increase recruiter response rates.`;
      } else {
        reply = `Excellent aspiration! The **${selectedPath.title}** pathway is an outstanding choice with a **${selectedPath.demand}** demand scale. Focus on completing **${selectedPath.steps[0].title}** and practicing core algorithm exercises. Do you have any specific background in ${selectedPath.tech.slice(0, 2).join(" or ")}?`;
      }

      setChatHistory(prev => [...prev, { role: "ai", content: reply }]);
      setIsTyping(false);
      toast.success("AI Mentor guidance updated.");
    }, 1000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
            AI Career Navigator
          </h1>
          <p className="text-muted-foreground text-sm">
            Discover tailored career roadmaps, real-time demand indices, and consult your personal AI career mentor.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Path Selector */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Available Tech Career Paths</h3>
          <div className="grid gap-3">
            {CAREER_PATHS.map((path) => {
              const Icon = path.icon;
              const isSelected = selectedPath.id === path.id;
              
              return (
                <motion.button
                  key={path.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPath(path)}
                  className={`p-4 rounded-3xl flex items-center gap-4 text-left cursor-pointer transition-all duration-300 relative border ${
                    isSelected 
                      ? "bg-gradient-to-br from-primary/20 to-accent/20 border-primary shadow-lg shadow-primary/10" 
                      : "bg-card/40 border-border/50 hover:bg-card/75"
                  }`}
                >
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${path.color} text-white shadow`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-black block truncate leading-snug">
                      {path.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block truncate max-w-full">
                      {path.tech.slice(0, 3).join(", ")}
                    </span>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground/60 transition-transform ${isSelected ? "translate-x-1 text-primary" : ""}`} />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Path Details & Mock AI Counselor */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPath.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Path Overview Card */}
              <Card className="border-border/50 bg-card/65 backdrop-blur-md overflow-hidden relative rounded-3xl">
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${selectedPath.color}`} />
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent text-xs py-0.5">
                      Demand: {selectedPath.demand}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> High-Growth
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    {selectedPath.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed pt-1 text-muted-foreground/95">
                    {selectedPath.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 border-t border-border/30 pt-6">
                  {/* Salary Visualizer */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-accent" /> Estimated Salary Range</span>
                      <span className="text-emerald-400 font-bold">${(selectedPath.salaryMin / 1000)}K - ${(selectedPath.salaryMax / 1000)}K+ / year</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-border/40 relative overflow-hidden flex">
                      <div className="h-full bg-muted-foreground/20 w-[20%]" />
                      <div className={`h-full bg-gradient-to-r ${selectedPath.color} w-[60%]`} />
                      <div className="h-full bg-muted-foreground/20 w-[20%]" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Entry Level</span>
                      <span>Mid Level Specialist</span>
                      <span>Senior Lead</span>
                    </div>
                  </div>

                  {/* Core Technologies Badges */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Key Tech Stack Focus</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPath.tech.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs px-2.5 py-0.5 rounded-xl font-bold border border-border/60">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-accent fill-current animate-pulse" /> Custom Learning Roadmap Timeline
                </h3>
                <div className="grid gap-4">
                  {selectedPath.steps.map((step, idx) => (
                    <Card key={idx} className="border-border/50 bg-card/45 backdrop-blur rounded-3xl relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 to-accent/30" />
                      <CardContent className="p-4 flex gap-4">
                        <span className="flex items-center justify-center h-8 w-8 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex-shrink-0">
                          L{idx + 1}
                        </span>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{step.level}</span>
                          <h4 className="text-sm font-bold leading-snug">{step.title}</h4>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed">{step.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* AI Career Mentor Chat Screen */}
              <Card className="border-border/50 bg-card/85 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col h-[400px]">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row justify-between items-center bg-background/30">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white animate-pulse">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-extrabold flex items-center gap-1">AI Career Advisor</CardTitle>
                      <CardDescription className="text-[10px]">Active consulting for {selectedPath.title}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/5 text-[10px] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Online
                  </Badge>
                </CardHeader>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/25">
                  {chatHistory.map((msg, index) => {
                    const isAi = msg.role === "ai";
                    return (
                      <div key={index} className={`flex items-start gap-2.5 ${isAi ? "" : "flex-row-reverse"}`}>
                        <div className={`p-2 rounded-xl text-white shadow ${isAi ? "bg-primary/20 border border-primary/20 text-primary-foreground" : "bg-gradient-to-r from-primary to-accent"}`}>
                          {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                          isAi 
                            ? "bg-card border border-border/40 text-foreground" 
                            : "bg-primary/10 border border-primary/20 text-foreground"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/20 border border-primary/20 text-primary-foreground text-white animate-bounce">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="p-3.5 bg-card border border-border/40 rounded-2xl flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                        <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Form */}
                <form onSubmit={handleSendPrompt} className="p-3 border-t border-border/40 bg-background/40 flex gap-2">
                  <Input
                    placeholder={`Ask about ${selectedPath.title} salary, resume, or start-guide...`}
                    className="rounded-2xl border-border/60 bg-background/90 text-sm py-5 flex-1 shadow-inner focus:border-primary/50"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    className="rounded-2xl px-5 bg-gradient-to-r from-primary to-accent text-white font-bold hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

