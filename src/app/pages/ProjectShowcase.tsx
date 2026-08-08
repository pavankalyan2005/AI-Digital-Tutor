import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Code, Brain, Database, MessageSquare, Target, Briefcase, Palette, 
  HelpCircle, Search, Sparkles, Clock, FolderGit2, Star, CheckCircle, 
  ExternalLink, Play, X, ArrowRight, BookOpen, Layers, Terminal
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export interface ProjectSpec {
  overview: string;
  milestones: string[];
  recommendedResources: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Intermediate" | "Hard";
  duration: string;
  tech: string[];
  xp: number;
  language?: string;
  starterCode?: string;
  solutionCode?: string;
  spec: ProjectSpec;
}

const CATEGORIES_INFO = [
  { name: "Programming", icon: Code, color: "from-blue-500 to-cyan-500", desc: "Logic & syntax" },
  { name: "AI/ML", icon: Brain, color: "from-purple-500 to-pink-500", desc: "Neural networks" },
  { name: "Web Development", icon: Database, color: "from-emerald-500 to-teal-500", desc: "Fullstack apps" },
  { name: "Communication", icon: MessageSquare, color: "from-orange-500 to-amber-500", desc: "Public speaking" },
  { name: "Aptitude", icon: Target, color: "from-pink-500 to-rose-500", desc: "Logical reasoning" },
  { name: "Interview Preparation", icon: Briefcase, color: "from-indigo-500 to-violet-500", desc: "Technical paths" },
  { name: "UI/UX", icon: Palette, color: "from-fuchsia-500 to-pink-500", desc: "Figma design" },
  { name: "Career Guidance", icon: HelpCircle, color: "from-cyan-500 to-blue-500", desc: "Portfolios & CVs" }
];

export const PROJECTS_DATA: Project[] = [
  // Programming
  {
    id: "cli-tracker",
    title: "Interactive CLI Task Tracker",
    description: "Build a modular command-line task manager with persistent storage and dynamic priority sorting.",
    category: "Programming",
    difficulty: "Easy",
    duration: "3 hours",
    tech: ["Python", "JSON", "sys/argparse"],
    xp: 150,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Interactive CLI Task Tracker

tasks = [
    {"id": 1, "title": "Design Database Schema", "priority": "High", "completed": False},
    {"id": 2, "title": "Implement CLI Argument Parser", "priority": "Medium", "completed": True}
]

def list_tasks(task_list):
    print("--- Current Task List ---")
    for t in task_list:
        status = "✓" if t["completed"] else "✗"
        print(f"[{status}] #{t['id']}: {t['title']} (Priority: {t['priority']})")

def add_task(task_list, title, priority="Medium"):
    new_id = len(task_list) + 1
    new_task = {"id": new_id, "title": title, "priority": priority, "completed": False}
    task_list.append(new_task)
    print(f"Added Task #{new_id}: '{title}'")

def complete_task(task_list, task_id):
    for t in task_list:
        if t["id"] == task_id:
            t["completed"] = True
            print(f"Completed Task #{task_id}: '{t['title']}'")

def main():
    print("Initializing Task Tracker Workspace...")
    list_tasks(tasks)
    
    add_task(tasks, "Build Compiler Integration", "High")
    complete_task(tasks, 1)
    
    print("\\nUpdated Task List:")
    list_tasks(tasks)

if __name__ == "__main__":
    main()
`,
    spec: {
      overview: "Develop a terminal command interface allowing users to add, update, search, delete, and list prioritized tasks. Data must persist between execution loops in structured JSON files.",
      milestones: [
        "Create command router supporting arguments like --add, --list, --complete, --delete.",
        "Implement persistent file reader and writer functions using standard JSON serialization.",
        "Apply console formatting using ANSI escape color matrices for status tagging.",
        "Include filter and sorting actions by priority weights and target dates."
      ],
      recommendedResources: [
        "Python standard argparse documentation",
        "JSON file handling in Python systems",
        "ANSI Terminal Escape Codes formatting guide"
      ]
    }
  },
  {
    id: "ast-calc",
    title: "Abstract Syntax Tree (AST) Calculator",
    description: "Write a mathematical calculator parsing strings into arithmetic node trees and resolving calculations.",
    category: "Programming",
    difficulty: "Intermediate",
    duration: "8 hours",
    tech: ["JavaScript", "Parser", "Data Structures"],
    xp: 350,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Abstract Syntax Tree (AST) Calculator

class ASTNode {
  constructor(type, value, left = null, right = null) {
    this.type = type;
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

function evaluateAST(node) {
  if (!node) return 0;
  if (node.type === 'NUMBER') return parseFloat(node.value);
  
  const leftVal = evaluateAST(node.left);
  const rightVal = evaluateAST(node.right);
  
  switch (node.value) {
    case '+': return leftVal + rightVal;
    case '-': return leftVal - rightVal;
    case '*': return leftVal * rightVal;
    case '/': return leftVal / rightVal;
    default: throw new Error("Unknown operator " + node.value);
  }
}

const astRoot = new ASTNode(
  'OPERATOR', '*',
  new ASTNode('OPERATOR', '+', new ASTNode('NUMBER', 3), new ASTNode('NUMBER', 5)),
  new ASTNode('NUMBER', 4)
);

console.log("Evaluating AST Expression: (3 + 5) * 4");
const result = evaluateAST(astRoot);
console.log("Computed AST Result:", result);
`,
    spec: {
      overview: "Design a lexical scanner and compiler parser that scans formulas, compiles structured arithmetic hierarchies, handles priority order rules, and evaluates outputs.",
      milestones: [
        "Write lexical scanner parsing formula string into token structures.",
        "Develop standard recursive descent compiler mapping operators into tree structures.",
        "Implement tree evaluator evaluating complex branches and isolating NaN states.",
        "Provide informative console error logging pointing exactly to compile failures."
      ],
      recommendedResources: [
        "Recursive Descent Parsing algorithms overview",
        "Abstract Syntax Trees data structural designs",
        "Lexer and compiler scanner guidelines"
      ]
    }
  },

  // AI/ML
  {
    id: "sentiment-engine",
    title: "Vader Sentiment Predictor Model",
    description: "Construct an NLP model classifying text sequences into Positive, Neutral, or Negative sentiment scores.",
    category: "AI/ML",
    difficulty: "Intermediate",
    duration: "10 hours",
    tech: ["Python", "NLP", "Scikit-Learn"],
    xp: 400,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Vader Sentiment Predictor Model

POSITIVE_WORDS = {"great", "awesome", "excellent", "good", "love", "fantastic", "wonderful"}
NEGATIVE_WORDS = {"bad", "terrible", "poor", "hate", "awful", "horrible", "disappointing"}

def analyze_sentiment(text):
    words = text.lower().split()
    pos_score = sum(1 for word in words if word in POSITIVE_WORDS)
    neg_score = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    total = pos_score + neg_score
    if total == 0:
        sentiment = "Neutral"
        confidence = 0.5
    elif pos_score > neg_score:
        sentiment = "Positive"
        confidence = round(pos_score / total, 2)
    elif neg_score > pos_score:
        sentiment = "Negative"
        confidence = round(neg_score / total, 2)
    else:
        sentiment = "Neutral"
        confidence = 0.5
        
    return {
        "text": text,
        "sentiment": sentiment,
        "confidence": confidence
    }

test_reviews = [
    "This AI Digital Tutor platform is fantastic and awesome!",
    "The initial execution had bad and awful bugs.",
    "The weather today is cloudy and normal."
]

for review in test_reviews:
    result = analyze_sentiment(review)
    print(f"Text: '{review}' -> Result: {result}")
`,
    spec: {
      overview: "Train an ML model to analyze input review text. Build preprocessing pipelines, evaluate accuracy using confusion matrices, and wrap the predictor in an API endpoint.",
      milestones: [
        "Acquire and clean public dataset (e.g. IMDb or Twitter dataset).",
        "Perform text tokenization, stopwords isolation, and TF-IDF feature mapping.",
        "Train Logistic Regression and Neural Dense classifiers comparing validation accuracy.",
        "Generate detailed classification reports highlighting Precision, Recall, and F1-Scores."
      ],
      recommendedResources: [
        "Natural Language Toolkit (NLTK) documentation",
        "Scikit-Learn TF-IDF vectorizer parameters",
        "Evaluating classification metrics with Scikit-Learn"
      ]
    }
  },
  {
    id: "image-classifier",
    title: "CNN Feature Map Filter Matrix",
    description: "Implement 2D Convolution operations extracting edge features from 2D image matrices.",
    category: "AI/ML",
    difficulty: "Hard",
    duration: "18 hours",
    tech: ["Python", "CNN", "Algorithms"],
    xp: 600,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: CNN Feature Map Convolution Matrix

def simulate_convolution_2d(input_matrix, kernel):
    k_size = len(kernel)
    rows = len(input_matrix)
    cols = len(input_matrix[0])
    out_rows = rows - k_size + 1
    out_cols = cols - k_size + 1
    
    output = [[0] * out_cols for _ in range(out_rows)]
    
    for r in range(out_rows):
        for c in range(out_cols):
            val = 0
            for kr in range(k_size):
                for kc in range(k_size):
                    val += input_matrix[r + kr][c + kc] * kernel[kr][kc]
            output[r][c] = max(0, val)
    return output

image_frame = [
    [10, 20, 10, 0],
    [0,  30, 20, 10],
    [10, 10, 40, 30],
    [0,  20, 10, 50]
]

edge_kernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
]

output = simulate_convolution_2d(image_frame, edge_kernel)
print("Extracted Feature Map Output:")
for r in output:
    print(r)
`,
    spec: {
      overview: "Implement computer vision classifiers. Utilize Transfer Learning on top of pre-trained ResNet layouts, process live webcam streams using OpenCV, and draw real-time classification overlays.",
      milestones: [
        "Assemble designated category sample collections and configure PyTorch image dataset loaders.",
        "Load ResNet18 structure, freeze convolutional foundations, and replace final linear layers.",
        "Train model using CrossEntropyLoss and Adam optimizers logging test curves.",
        "Implement frame rendering pipeline capturing camera inputs and overlaying top predictions."
      ],
      recommendedResources: [
        "PyTorch Transfer Learning standard tutorial",
        "OpenCV webcam streaming functions",
        "Convolutional Neural Network feature mapping theory"
      ]
    }
  },

  // Web Development
  {
    id: "tutor-dashboard",
    title: "AI Digital Tutor Client Hub Data Engine",
    description: "Processes student stats, streak meters, and course completion percentages.",
    category: "Web Development",
    difficulty: "Hard",
    duration: "25 hours",
    tech: ["JavaScript", "Node.js", "React"],
    xp: 750,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: AI Digital Tutor Client Hub Data Engine

const studentData = {
  name: "Alex Dev",
  xp: 1450,
  streakDays: 7,
  courses: [
    { title: "Python Fundamentals", completedModules: 8, totalModules: 10 },
    { title: "Data Structures & Algorithms", completedModules: 5, totalModules: 12 },
    { title: "React Fullstack App", completedModules: 3, totalModules: 8 }
  ]
};

function calculateProgress(student) {
  console.log("Student Summary:", student.name);
  let totalComp = 0;
  let totalMod = 0;
  
  student.courses.forEach((c) => {
    const pct = Math.round((c.completedModules / c.totalModules) * 100);
    console.log(\`Course: \${c.title} -> \${pct}% (\${c.completedModules}/\${c.totalModules})\`);
    totalComp += c.completedModules;
    totalMod += c.totalModules;
  });
  
  const overall = Math.round((totalComp / totalMod) * 100);
  console.log("\\nOverall Completion:", overall + "%");
}

calculateProgress(studentData);
`,
    spec: {
      overview: "Implement full interactive frontends. Structure stats visualizer grids, design glassmorphic prompt boxes, render progress tracking curves, and hook states to backend Express REST servers.",
      milestones: [
        "Create responsive page templates with left-docked desktop menus and mobile bottom navbars.",
        "Build dynamic analytics sheets using Area and progress meter widgets.",
        "Develop interactive message bubbles, typing animations, and prompt presets.",
        "Coordinate local JWT session storage and build protected route wrappers."
      ],
      recommendedResources: [
        "Tailwind CSS responsive design structures",
        "Recharts API reference documentation",
        "React Router protected layouts guide"
      ]
    }
  },
  {
    id: "retro-board",
    title: "Collaborative Realtime Canvas Sync Engine",
    description: "Develop a shared whiteboarding screen allowing team coordinates and vector drawings to sync.",
    category: "Web Development",
    difficulty: "Intermediate",
    duration: "12 hours",
    tech: ["JavaScript", "Node.js", "Canvas"],
    xp: 450,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Realtime Canvas Sync Engine

class CanvasSyncManager {
  constructor() {
    this.drawEvents = [];
    this.users = new Map();
  }

  registerUser(userId, color) {
    this.users.set(userId, { color, x: 0, y: 0 });
  }

  addStroke(userId, points) {
    this.drawEvents.push({ userId, points, timestamp: Date.now() });
  }

  getSnapshot() {
    return {
      activeUsers: Array.from(this.users.entries()),
      totalStrokes: this.drawEvents.length
    };
  }
}

const manager = new CanvasSyncManager();
manager.registerUser("user_1", "#3B82F6");
manager.addStroke("user_1", [{x: 10, y: 20}, {x: 30, y: 40}]);
console.log("Snapshot:", manager.getSnapshot());
`,
    spec: {
      overview: "Create a web canvas where changes update in real-time. Use WebSockets to sync cursor coordinates, shape placements, and stroke paths across all active browser windows.",
      milestones: [
        "Set up vector rendering context catching pointer events and drafting lines.",
        "Build Express Socket.io server broadcasting pointer events and coordinates.",
        "Support multi-user color states drawing distinct custom indicators.",
        "Add functional controls to clear local boards, download PNG snapshots, or zoom."
      ],
      recommendedResources: [
        "HTML5 Canvas API developer tutorial",
        "Socket.io client and server configuration guidelines",
        "Drawing state interpolation methods"
      ]
    }
  },

  // UI/UX
  {
    id: "figma-system",
    title: "Glassmorphism UI Token Exporter",
    description: "Generates CSS root design variables and color matrices from component definitions.",
    category: "UI/UX",
    difficulty: "Easy",
    duration: "4 hours",
    tech: ["JavaScript", "Design Tokens", "CSS"],
    xp: 120,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Glassmorphic UI Design Token Exporter

const designTokens = {
  colors: {
    primary: "hsl(217, 91%, 60%)",
    accent: "hsl(262, 83%, 58%)",
    background: "hsl(222, 47%, 11%)"
  }
};

function generateCssTokens(tokens) {
  let css = ":root {\\n";
  for (const [cat, vals] of Object.entries(tokens)) {
    for (const [k, v] of Object.entries(vals)) {
      css += \`  --\${cat}-\${k}: \${v};\\n\`;
    }
  }
  css += "}\\n";
  return css;
}

console.log(generateCssTokens(designTokens));
`,
    spec: {
      overview: "Create a beautiful modular system in Figma. Define custom color properties, design glassmorphic cards, declare nested button structures, and export complete design guidelines.",
      milestones: [
        "Set up HSL color palettes with primary, accent, and background values.",
        "Design translucent overlay styles using backdrop blur and stroke borders.",
        "Build button variants supporting Default, Hover, Active, and Disabled properties.",
        "Organize assets into accessible design documentation boards ready for developers."
      ],
      recommendedResources: [
        "Figma Auto Layout comprehensive manual",
        "Glassmorphism styling fundamentals guide",
        "Design systems component structure layout"
      ]
    }
  },

  // Communication
  {
    id: "speech-prompter",
    title: "Pitch Timer & Vocal Prompter Analyzer",
    description: "Calculates Words-Per-Minute (WPM) and pacing accuracy metrics from transcripts.",
    category: "Communication",
    difficulty: "Easy",
    duration: "4 hours",
    tech: ["JavaScript", "Web Speech API"],
    xp: 180,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Pitch Timer & Vocal Prompter Speed Analyzer

function analyzeSpeechPace(transcript, elapsedSeconds) {
  const words = transcript.trim().split(/\\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const minutes = elapsedSeconds / 60;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
  
  let rating = "Optimal";
  if (wpm < 110) rating = "Too Slow";
  else if (wpm > 160) rating = "Too Fast";
  
  return { wordCount, wpm, rating };
}

const sampleSpeech = "Welcome to the AI Digital Tutor platform. Today we build our interactive project workspace.";
console.log(analyzeSpeechPace(sampleSpeech, 6.5));
`,
    spec: {
      overview: "Develop an app to assist speech training. Include voice transcription services, calculate Words-Per-Minute pacing metrics, and highlight target speech milestones.",
      milestones: [
        "Configure Web Speech Recognition hooks listening to microphone inputs.",
        "Build real-time timer systems computing speed counts dynamically.",
        "Create auto-scrolling prompt blocks matching actual spoken words.",
        "Provide summary stats sheets reporting pacing, pause indices, and scores."
      ],
      recommendedResources: [
        "MDN Web Speech API reference documents",
        "Calculating real-time speech analytics formulas",
        "Auto-scrolling viewport elements in React"
      ]
    }
  },

  // Aptitude
  {
    id: "fractal-gen",
    title: "Fibonacci Sequence & Mandelbrot Recursion",
    description: "Computes coordinate escape counts for Mandelbrot sets and Fibonacci spirals.",
    category: "Aptitude",
    difficulty: "Intermediate",
    duration: "6 hours",
    tech: ["Python", "Recursion", "Math"],
    xp: 220,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Fibonacci & Mandelbrot Recursion

def fibonacci_sequence(n):
    seq = [0, 1]
    for i in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

def mandelbrot_escape(c, max_iter=20):
    z = 0
    for i in range(max_iter):
        z = z*z + c
        if abs(z) > 2.0:
            return i
    return max_iter

print("Fibonacci(10):", fibonacci_sequence(10))
print("Mandelbrot Escape for 0.5+0.5j:", mandelbrot_escape(complex(0.5, 0.5)))
`,
    spec: {
      overview: "Bridge visual graphics and logical equations. Write recursive equations rendering gorgeous fractal structures, include drag-to-zoom coordinates, and optimize rendering loops.",
      milestones: [
        "Create standard HTML5 Canvas viewports adjusting sizes to browser screens.",
        "Implement Mandelbrot or Julia recursive mathematical loops.",
        "Configure custom color mappings based on recursion exit indexes.",
        "Build zoom triggers allowing navigation inside coordinate frameworks."
      ],
      recommendedResources: [
        "Mandelbrot Fractal algorithms explanation",
        "Optimizing 2D canvas rendering operations",
        "Recursive algorithms in visual creations"
      ]
    }
  },

  // Interview Prep
  {
    id: "dsa-sandbox",
    title: "FAANG Tree Traversal Sandbox",
    description: "Implements Binary Search Tree with BFS and DFS (Pre/In/Post Order) traversals.",
    category: "Interview Preparation",
    difficulty: "Intermediate",
    duration: "9 hours",
    tech: ["Python", "Data Structures", "Trees"],
    xp: 380,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: FAANG Tree Traversal Sandbox

class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, val):
        if not self.root:
            self.root = TreeNode(val)
            return
        curr = self.root
        while True:
            if val < curr.val:
                if not curr.left:
                    curr.left = TreeNode(val)
                    break
                curr = curr.left
            else:
                if not curr.right:
                    curr.right = TreeNode(val)
                    break
                curr = curr.right

    def in_order(self, node, res):
        if node:
            self.in_order(node.left, res)
            res.append(node.val)
            self.in_order(node.right, res)
        return res

    def bfs(self):
        if not self.root:
            return []
        res, queue = [], [self.root]
        while queue:
            node = queue.pop(0)
            res.append(node.val)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        return res

bst = BinarySearchTree()
for num in [50, 30, 70, 20, 40]:
    bst.insert(num)

print("In-Order Traversal:", bst.in_order(bst.root, []))
print("BFS Traversal:", bst.bfs())
`,
    spec: {
      overview: "Develop an educational tool illustrating tree structures. Draw node nodes, support insertions/deletions, animate traversal sweeps, and output detailed call-stack explanations.",
      milestones: [
        "Design visual node configurations representing data values and child branches.",
        "Code standard BFS and DFS (Pre, In, Post order) stack execution logs.",
        "Animate node traversals highlighting active operations.",
        "Create a code console display listing real-time stack operations."
      ],
      recommendedResources: [
        "Data structures visualization layouts",
        "Tree node traversal algorithms guides",
        "Animating DOM elements in React"
      ]
    }
  },

  // Career Guidance
  {
    id: "resume-auditor",
    title: "ATS Resume Quality Auditor",
    description: "Build an automated review engine grading resume text files and parsing keywords.",
    category: "Career Guidance",
    difficulty: "Intermediate",
    duration: "10 hours",
    tech: ["JavaScript", "Node.js", "NLP"],
    xp: 400,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: ATS Resume Quality Auditor Engine

const targetJobKeywords = ["javascript", "react", "node.js", "python", "typescript", "sql", "git"];

function auditResume(resumeText) {
  const words = resumeText.toLowerCase().split(/[^a-z0-9.#]+/);
  const foundKeywords = [];
  const missingKeywords = [];

  targetJobKeywords.forEach(kw => {
    if (words.includes(kw)) {
      foundKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const score = Math.round((foundKeywords.length / targetJobKeywords.length) * 100);
  return { foundKeywords, missingKeywords, score };
}

const sampleResume = "Experienced developer proficient in JavaScript, React, Python, and SQL with Git experience.";
console.log(auditResume(sampleResume));
`,
    spec: {
      overview: "Construct a scanner analyzing developer resumes. Check for keyword matches against job posts, flag layout columns, compile audit feedback reports, and compute ATS compliance grades.",
      milestones: [
        "Set up file upload routers receiving PDF resume drafts.",
        "Read document text and run simple parsing isolating skill keywords.",
        "Match skills against selected job post dictionaries calculating target indices.",
        "Compile structured grade cards listing alerts, warnings, and missing skills."
      ],
      recommendedResources: [
        "Understanding ATS parsing structures",
        "Extracting PDF text structures in Node.js",
        "Simple keyword analysis algorithms"
      ]
    }
  },
  {
    id: "dp-visualizer",
    title: "Dynamic Programming Matrix Solver",
    description: "Computes optimal value grid for 0/1 Knapsack subproblems.",
    category: "Interview Preparation",
    difficulty: "Hard",
    duration: "14 hours",
    tech: ["Python", "Dynamic Programming", "Algorithms"],
    xp: 500,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Dynamic Programming 0/1 Knapsack Matrix Solver

def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(values[i-1] + dp[i-1][w - weights[i-1]], dp[i-1][w])
            else:
                dp[i][w] = dp[i-1][w]

    return dp[n][capacity]

weights = [2, 3, 4, 5]
values = [3, 4, 5, 6]
capacity = 5

print("Maximum Value:", knapsack(weights, values, capacity))
`,
    spec: {
      overview: "Create an educational interface illustrating dynamic programming mechanics. Animate matrix cells filling up, highlight lookup indices (dp[i-1][j]), and display subproblem calculations.",
      milestones: [
        "Initialize dynamic grids displaying lookup indices, item weights, or path counts.",
        "Animate algorithm sweeps cell-by-cell at variable speed intervals.",
        "Highlight overlapping states during calculation sweeps using color scales.",
        "Construct a detailed side log explaining the formula (e.g. dp[i][j] = dp[i-1][j] + dp[i][j-c]) cell-by-cell."
      ],
      recommendedResources: [
        "Dynamic Programming: Knapsack problem matrices theory",
        "Animate React elements inside coordinate matrices",
        "Designing algorithm visualizations guides"
      ]
    }
  },

  // ── Programming ──────────────────────────────────────────────────────────
  {
    id: "regex-engine",
    title: "Regex Pattern Matching Engine",
    description: "Build a lightweight regular expression engine supporting *, +, ?, ^ and $ operators from scratch.",
    category: "Programming",
    difficulty: "Hard",
    duration: "16 hours",
    tech: ["Python", "Automata Theory", "Recursion"],
    xp: 580,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Minimal Regex Engine

def match(pattern, text):
    if not pattern:
        return not text
    first_match = bool(text) and pattern[0] in (text[0], '.')
    if len(pattern) >= 2 and pattern[1] == '*':
        return (match(pattern[2:], text) or
                first_match and match(pattern, text[1:]))
    else:
        return first_match and match(pattern[1:], text[1:])

cases = [
    ("a*b", "aaab", True),
    ("^hello", "hello world", True),
    ("wor.d$", "hello world", True),
    ("z+", "zzzz", True),
    ("x+", "abc", False),
]

for pat, txt, expected in cases:
    result = match(pat, txt)
    status = "PASS" if result == expected else "FAIL"
    print(f"[{status}] match('{pat}', '{txt}') = {result}")
`,
    spec: {
      overview: "Implement a recursive NFA-based regular expression engine. Handle special meta-characters, greedy quantifiers, anchors, and provide informative match reports with match groups.",
      milestones: [
        "Implement base character and dot (.) wildcard matching.",
        "Add support for * and + quantifiers with greedy backtracking.",
        "Handle ^ (start) and $ (end) anchor operators.",
        "Write a test harness running 20+ pattern/text combinations."
      ],
      recommendedResources: [
        "NFA and DFA automata theory fundamentals",
        "Recursive backtracking in Python",
        "Building interpreters from scratch — Crafting Interpreters book"
      ]
    }
  },
  {
    id: "event-loop-sim",
    title: "JavaScript Event Loop Simulator",
    description: "Visualise the call stack, task queue, and microtask queue of a JS runtime in a terminal animation.",
    category: "Programming",
    difficulty: "Intermediate",
    duration: "7 hours",
    tech: ["JavaScript", "Node.js", "Async"],
    xp: 320,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: JS Event Loop Simulator

const callStack = [];
const taskQueue = [];
const microtaskQueue = [];

function log(label, item) {
  console.log(\`[\${label}] \${item}\`);
}

function pushToStack(fn) {
  callStack.push(fn.name || fn.toString().slice(0, 30));
  log("CALL STACK +", callStack.at(-1));
}

function popFromStack() {
  const fn = callStack.pop();
  log("CALL STACK -", fn);
}

function scheduleTask(name) {
  taskQueue.push(name);
  log("TASK QUEUE +", name);
}

function scheduleMicrotask(name) {
  microtaskQueue.push(name);
  log("MICROTASK +", name);
}

function runEventLoop() {
  console.log("\\n--- Running Event Loop ---");
  while (microtaskQueue.length) {
    const m = microtaskQueue.shift();
    log("MICROTASK RUN", m);
  }
  if (taskQueue.length) {
    const t = taskQueue.shift();
    log("TASK RUN", t);
  }
}

pushToStack(function main() {});
scheduleTask("setTimeout callback");
scheduleMicrotask("Promise.resolve handler");
scheduleMicrotask("queueMicrotask handler");
popFromStack();
runEventLoop();
`,
    spec: {
      overview: "Build an animated terminal tool that accepts a JS snippet and traces how tasks, microtasks, promises, and setTimeout callbacks flow through the event loop tick by tick.",
      milestones: [
        "Parse synchronous function calls and push/pop from a visual call stack.",
        "Schedule macro tasks (setTimeout, setInterval) into the task queue.",
        "Schedule micro tasks (Promise callbacks, queueMicrotask) correctly.",
        "Animate each tick with colour-coded console output and timing delays."
      ],
      recommendedResources: [
        "JavaScript Event Loop — MDN Documentation",
        "Philip Roberts: 'What the heck is the event loop?' (JSConf EU)",
        "Node.js libuv event loop phases"
      ]
    }
  },

  // ── AI/ML ─────────────────────────────────────────────────────────────────
  {
    id: "recommendation-engine",
    title: "Collaborative Filtering Recommender",
    description: "Build a user-based collaborative filtering engine that recommends courses from rating matrices.",
    category: "AI/ML",
    difficulty: "Intermediate",
    duration: "12 hours",
    tech: ["Python", "NumPy", "Cosine Similarity"],
    xp: 450,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Collaborative Filtering Recommender

import math

ratings = {
    "Alice": {"Python": 5, "React": 3, "DSA": 4},
    "Bob":   {"Python": 4, "React": 5, "DSA": 2},
    "Carol": {"Python": 2, "React": 4, "DSA": 5},
    "Dave":  {"Python": 5, "React": 2, "DSA": 4},
}

def cosine_similarity(u1, u2):
    common = set(ratings[u1]) & set(ratings[u2])
    if not common:
        return 0.0
    dot   = sum(ratings[u1][c] * ratings[u2][c] for c in common)
    mag1  = math.sqrt(sum(ratings[u1][c]**2 for c in common))
    mag2  = math.sqrt(sum(ratings[u2][c]**2 for c in common))
    return dot / (mag1 * mag2) if mag1 and mag2 else 0.0

def recommend(target_user, top_n=2):
    similarities = {u: cosine_similarity(target_user, u)
                    for u in ratings if u != target_user}
    ranked = sorted(similarities.items(), key=lambda x: -x[1])
    print(f"Recommendations for {target_user}:")
    for user, sim in ranked[:top_n]:
        print(f"  Similar to {user} (sim={sim:.2f}): {list(ratings[user].keys())}")

recommend("Alice")
`,
    spec: {
      overview: "Implement a course recommendation system using user-based collaborative filtering. Compute cosine similarity between users, aggregate weighted ratings, and surface personalised top-N course recommendations.",
      milestones: [
        "Build a rating matrix from simulated user–course interaction logs.",
        "Implement cosine similarity between user rating vectors.",
        "Generate weighted recommendation scores for unseen items.",
        "Evaluate recommendations using Precision@K and Recall@K metrics."
      ],
      recommendedResources: [
        "Collaborative Filtering — surprise library documentation",
        "Cosine similarity explained — Towards Data Science",
        "Building recommender systems with Python"
      ]
    }
  },
  {
    id: "llm-tokenizer",
    title: "BPE Tokenizer from Scratch",
    description: "Implement Byte-Pair Encoding (BPE) tokenization used inside GPT and BERT models.",
    category: "AI/ML",
    difficulty: "Hard",
    duration: "20 hours",
    tech: ["Python", "NLP", "BPE"],
    xp: 700,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: BPE Tokenizer

from collections import defaultdict

def get_vocab(corpus):
    vocab = defaultdict(int)
    for word in corpus:
        vocab[" ".join(list(word)) + " </w>"] += 1
    return vocab

def get_pairs(vocab):
    pairs = defaultdict(int)
    for word, freq in vocab.items():
        symbols = word.split()
        for i in range(len(symbols) - 1):
            pairs[(symbols[i], symbols[i+1])] += freq
    return pairs

def merge_vocab(pair, vocab):
    new_vocab = {}
    bigram = " ".join(pair)
    replacement = "".join(pair)
    for word in vocab:
        new_word = word.replace(bigram, replacement)
        new_vocab[new_word] = vocab[word]
    return new_vocab

corpus = ["low", "lower", "newest", "widest", "low"]
vocab = get_vocab(corpus)

print("Initial vocab:", dict(vocab))
for _ in range(5):
    pairs = get_pairs(vocab)
    if not pairs:
        break
    best = max(pairs, key=pairs.get)
    vocab = merge_vocab(best, vocab)
    print(f"Merged: {best} -> {''.join(best)}")

print("Final vocab:", dict(vocab))
`,
    spec: {
      overview: "Replicate the BPE tokenization algorithm from first principles. Train on a custom corpus, build a merge table, encode and decode arbitrary strings, and compare token counts against the tiktoken library.",
      milestones: [
        "Compute initial character-level vocabulary with end-of-word symbols.",
        "Iteratively merge the most frequent adjacent byte pairs.",
        "Build an encoder that maps strings to integer token IDs.",
        "Build a decoder and verify lossless round-trips on test sentences."
      ],
      recommendedResources: [
        "Sennrich et al. 2016 BPE paper (arXiv:1508.07909)",
        "Andrej Karpathy — minBPE implementation walkthrough",
        "OpenAI tiktoken library source code"
      ]
    }
  },

  // ── Web Development ───────────────────────────────────────────────────────
  {
    id: "graphql-api",
    title: "GraphQL API with Real-time Subscriptions",
    description: "Build a GraphQL server with queries, mutations, and WebSocket subscriptions for live notifications.",
    category: "Web Development",
    difficulty: "Hard",
    duration: "22 hours",
    tech: ["Node.js", "GraphQL", "WebSockets"],
    xp: 720,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Minimal GraphQL + Subscription Server (Apollo)

const { ApolloServer, gql, PubSub } = require('apollo-server');
const pubsub = new PubSub();
const MESSAGE_ADDED = 'MESSAGE_ADDED';

const messages = [];

const typeDefs = gql\`
  type Message { id: ID! content: String! author: String! }
  type Query    { messages: [Message!]! }
  type Mutation { addMessage(content: String!, author: String!): Message! }
  type Subscription { messageAdded: Message! }
\`;

const resolvers = {
  Query: {
    messages: () => messages,
  },
  Mutation: {
    addMessage: (_, { content, author }) => {
      const msg = { id: Date.now().toString(), content, author };
      messages.push(msg);
      pubsub.publish(MESSAGE_ADDED, { messageAdded: msg });
      return msg;
    },
  },
  Subscription: {
    messageAdded: { subscribe: () => pubsub.asyncIterator([MESSAGE_ADDED]) },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => console.log('GraphQL server at', url));
`,
    spec: {
      overview: "Create a production-grade GraphQL API layer. Define a schema with nested types, implement DataLoader for N+1 query resolution, add JWT-based context authentication, and expose real-time subscriptions over WebSockets.",
      milestones: [
        "Define a SDL schema with User, Post, and Comment types.",
        "Implement resolvers with DataLoader to batch database queries.",
        "Add JWT authentication middleware in the ApolloServer context.",
        "Set up PubSub subscriptions broadcasting live events to clients."
      ],
      recommendedResources: [
        "Apollo Server 4 documentation",
        "GraphQL DataLoader pattern — GitHub",
        "Subscriptions with WebSockets in Apollo"
      ]
    }
  },
  {
    id: "pwa-offline",
    title: "Progressive Web App with Offline Mode",
    description: "Convert a React app into a fully installable PWA with service workers, caching, and offline fallback pages.",
    category: "Web Development",
    difficulty: "Intermediate",
    duration: "10 hours",
    tech: ["React", "Service Workers", "IndexedDB"],
    xp: 420,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Service Worker with Cache-First Strategy

const CACHE_NAME = 'app-cache-v1';
const ASSETS = ['/', '/index.html', '/offline.html', '/static/main.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('/offline.html'));
    })
  );
});

console.log('Service Worker registered successfully.');
`,
    spec: {
      overview: "Build a fully installable PWA from an existing React SPA. Implement cache-first and network-first strategies per route, queue failed API mutations in IndexedDB and replay them when connectivity is restored.",
      milestones: [
        "Register a service worker and pre-cache critical assets during install.",
        "Implement stale-while-revalidate caching for API responses.",
        "Store failed mutations in IndexedDB and sync on reconnect.",
        "Add a web app manifest for home-screen installation and splash screens."
      ],
      recommendedResources: [
        "Workbox — Google's service worker toolkit",
        "MDN Progressive Web Apps guide",
        "IndexedDB API documentation"
      ]
    }
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "debate-coach",
    title: "AI Debate Coach & Argument Analyzer",
    description: "Build an app that scores debate arguments on logic, evidence, and rebuttal strength using NLP.",
    category: "Communication",
    difficulty: "Intermediate",
    duration: "8 hours",
    tech: ["JavaScript", "NLP", "Web Speech API"],
    xp: 340,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Argument Strength Scorer

const LOGIC_KEYWORDS   = ["therefore", "because", "since", "thus", "consequently"];
const EVIDENCE_KEYWORDS = ["study shows", "according to", "research", "data", "statistics"];
const REBUTTAL_KEYWORDS = ["however", "on the contrary", "nevertheless", "despite", "although"];

function scoreArgument(text) {
  const lower = text.toLowerCase();
  const logicScore    = LOGIC_KEYWORDS.filter(k => lower.includes(k)).length;
  const evidenceScore = EVIDENCE_KEYWORDS.filter(k => lower.includes(k)).length;
  const rebuttalScore = REBUTTAL_KEYWORDS.filter(k => lower.includes(k)).length;
  const total = Math.min(100, (logicScore * 20) + (evidenceScore * 25) + (rebuttalScore * 15));
  return { logicScore, evidenceScore, rebuttalScore, total };
}

const sample = "Research shows that renewable energy is cost-effective. However, critics argue grid stability is a challenge. Therefore, we must invest in battery storage.";
console.log("Argument Analysis:", scoreArgument(sample));
`,
    spec: {
      overview: "Create an app that listens to spoken debate arguments, transcribes them, and provides a real-time score dashboard covering logical coherence, use of evidence, and rebuttal quality.",
      milestones: [
        "Use the Web Speech API to transcribe spoken arguments in real time.",
        "Detect logical connectives, evidence citations, and counter-argument markers.",
        "Display a live scoring dashboard with bar charts per dimension.",
        "Generate a post-debate PDF summary highlighting strengths and weaknesses."
      ],
      recommendedResources: [
        "Web Speech API — MDN documentation",
        "Argument mining research overview",
        "Chart.js for real-time score visualisation"
      ]
    }
  },
  {
    id: "presentation-timer",
    title: "Smart Presentation Slide Timer",
    description: "Build a Pomodoro-style timer that allocates time per slide and alerts speakers with audio cues.",
    category: "Communication",
    difficulty: "Easy",
    duration: "3 hours",
    tech: ["JavaScript", "Web Audio API", "CSS"],
    xp: 150,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Slide Timer with Audio Cues

class SlideTimer {
  constructor(slides, totalSeconds) {
    this.slides = slides;
    this.timePerSlide = Math.floor(totalSeconds / slides);
    this.currentSlide = 1;
    this.remaining = this.timePerSlide;
  }

  tick() {
    this.remaining--;
    if (this.remaining <= 0 && this.currentSlide < this.slides) {
      this.currentSlide++;
      this.remaining = this.timePerSlide;
      this.playBeep();
    }
    return { slide: this.currentSlide, remaining: this.remaining };
  }

  playBeep() {
    // In browser: use AudioContext to generate a 440Hz tone
    console.log("🔔 Beep! Move to next slide.");
  }

  getProgress() {
    return Math.round(((this.currentSlide - 1) / this.slides) * 100);
  }
}

const timer = new SlideTimer(10, 600); // 10 slides, 10 minutes
for (let i = 0; i < 65; i++) timer.tick();
console.log(timer.tick()); // Should be on slide 2
`,
    spec: {
      overview: "Develop a presentation timing tool that auto-divides a session across N slides, provides visual progress rings per slide, plays escalating audio alerts at 50%, 80%, and 100% of each slide's budget.",
      milestones: [
        "Accept total presentation duration and slide count as inputs.",
        "Render a circular countdown clock per slide using SVG stroke-dashoffset.",
        "Play a soft beep at 50% and a louder alert at 100% using the Web Audio API.",
        "Provide a pause/resume toggle and a skip-slide button."
      ],
      recommendedResources: [
        "Web Audio API — MDN documentation",
        "SVG circle animations for countdown timers",
        "JavaScript setInterval and clearInterval patterns"
      ]
    }
  },

  // ── Aptitude ──────────────────────────────────────────────────────────────
  {
    id: "graph-pathfinder",
    title: "Dijkstra & A* Pathfinder Visualizer",
    description: "Implement shortest-path algorithms on weighted grids with step-by-step visual traversal.",
    category: "Aptitude",
    difficulty: "Hard",
    duration: "15 hours",
    tech: ["JavaScript", "Algorithms", "Canvas"],
    xp: 560,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Dijkstra's Algorithm

class PriorityQueue {
  constructor() { this.data = []; }
  enqueue(node, priority) {
    this.data.push({ node, priority });
    this.data.sort((a, b) => a.priority - b.priority);
  }
  dequeue() { return this.data.shift(); }
  isEmpty() { return this.data.length === 0; }
}

function dijkstra(graph, start) {
  const dist = {};
  const pq = new PriorityQueue();
  for (const node in graph) dist[node] = Infinity;
  dist[start] = 0;
  pq.enqueue(start, 0);

  while (!pq.isEmpty()) {
    const { node } = pq.dequeue();
    for (const [neighbor, weight] of graph[node]) {
      const newDist = dist[node] + weight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        pq.enqueue(neighbor, newDist);
      }
    }
  }
  return dist;
}

const graph = {
  A: [["B", 4], ["C", 2]],
  B: [["D", 3], ["C", 1]],
  C: [["B", 1], ["D", 5]],
  D: []
};

console.log("Shortest distances from A:", dijkstra(graph, "A"));
`,
    spec: {
      overview: "Build an interactive grid-based visualizer where users can draw walls, set start/end nodes, and watch Dijkstra's and A* algorithms animate the discovery of shortest paths in real time.",
      milestones: [
        "Render an NxN grid where cells can be toggled as walls via click/drag.",
        "Implement Dijkstra's algorithm with a min-priority queue.",
        "Implement A* with the Manhattan distance heuristic.",
        "Animate visited cells and the final shortest path with colour transitions."
      ],
      recommendedResources: [
        "Dijkstra's Algorithm — Visualgo.net",
        "A* Search Algorithm — Red Blob Games",
        "Priority queue implementation in JavaScript"
      ]
    }
  },
  {
    id: "number-theory",
    title: "Prime Sieve & Modular Exponentiation",
    description: "Implement the Sieve of Eratosthenes and fast modular exponentiation used in RSA cryptography.",
    category: "Aptitude",
    difficulty: "Intermediate",
    duration: "5 hours",
    tech: ["Python", "Math", "Cryptography"],
    xp: 240,
    language: "python",
    starterCode: "",
    solutionCode: `# REFERENCE SOLUTION: Sieve of Eratosthenes + Fast Modular Exponentiation

def sieve_of_eratosthenes(limit):
    is_prime = [True] * (limit + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(limit**0.5) + 1):
        if is_prime[i]:
            for j in range(i*i, limit + 1, i):
                is_prime[j] = False
    return [i for i in range(2, limit + 1) if is_prime[i]]

def fast_pow(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp % 2 == 1:
            result = (result * base) % mod
        exp //= 2
        base = (base * base) % mod
    return result

primes = sieve_of_eratosthenes(100)
print("Primes up to 100:", primes)
print("7^321 mod 1000000007 =", fast_pow(7, 321, 1000000007))
`,
    spec: {
      overview: "Solve competitive programming number theory problems. Implement the Sieve, Euler's Totient function, modular inverse, and use them together to solve 10 typical ICPC/Codeforces-style problems.",
      milestones: [
        "Implement the linear Sieve of Eratosthenes for primes up to 10^7.",
        "Code fast modular exponentiation using the square-and-multiply method.",
        "Implement modular inverse using Fermat's little theorem.",
        "Solve 10 practice problems from Codeforces difficulty 1400–1800."
      ],
      recommendedResources: [
        "Number Theory for Competitive Programming — CP-Algorithms",
        "Euler's Totient Function explained",
        "Codeforces number theory tag problems"
      ]
    }
  },

  // ── Interview Preparation ─────────────────────────────────────────────────
  {
    id: "system-design-chat",
    title: "System Design: Scalable Chat App",
    description: "Design and prototype the backend architecture for a WhatsApp-scale messaging system.",
    category: "Interview Preparation",
    difficulty: "Hard",
    duration: "20 hours",
    tech: ["Node.js", "Redis", "WebSockets"],
    xp: 650,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Simplified Chat Server Architecture

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();   // roomId -> Set<WebSocket>
const userSockets = new Map(); // userId -> WebSocket

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === 'JOIN') {
      if (!rooms.has(msg.room)) rooms.set(msg.room, new Set());
      rooms.get(msg.room).add(ws);
      userSockets.set(msg.userId, ws);
      ws.meta = { userId: msg.userId, room: msg.room };
      console.log(\`[\${msg.userId}] joined room [\${msg.room}]\`);
    }

    if (msg.type === 'SEND') {
      const room = rooms.get(msg.room);
      if (!room) return;
      room.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ from: msg.userId, text: msg.text }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.meta) {
      const room = rooms.get(ws.meta.room);
      if (room) room.delete(ws);
    }
  });
});

console.log('Chat server listening on ws://localhost:8080');
`,
    spec: {
      overview: "Prototype the key backend components of a scalable chat application. Implement room-based WebSocket fanout, add Redis pub/sub for multi-server coordination, design the database schema for message persistence, and estimate capacity at 1M concurrent users.",
      milestones: [
        "Build a WebSocket server supporting JOIN and SEND message types.",
        "Add Redis pub/sub to broadcast messages across multiple server instances.",
        "Design a PostgreSQL schema for users, rooms, and message history.",
        "Write a capacity estimation document covering connections, storage, and bandwidth."
      ],
      recommendedResources: [
        "System Design Interview — Alex Xu (Vol. 1, Chapter 12)",
        "Redis pub/sub documentation",
        "WebSocket scalability patterns"
      ]
    }
  },
  {
    id: "lru-cache",
    title: "LRU Cache with O(1) Operations",
    description: "Implement an LRU Cache using a doubly linked list + hashmap achieving O(1) get and put.",
    category: "Interview Preparation",
    difficulty: "Intermediate",
    duration: "6 hours",
    tech: ["JavaScript", "Data Structures", "Hash Map"],
    xp: 360,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: LRU Cache — O(1) Get & Put

class Node {
  constructor(key, val) {
    this.key = key; this.val = val;
    this.prev = this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(0, 0); // dummy head
    this.tail = new Node(0, 0); // dummy tail
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _insertAtFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._insertAtFront(node);
    return node.val;
  }

  put(key, val) {
    if (this.map.has(key)) this._remove(this.map.get(key));
    const node = new Node(key, val);
    this._insertAtFront(node);
    this.map.set(key, node);
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }
}

const cache = new LRUCache(3);
cache.put(1, 10); cache.put(2, 20); cache.put(3, 30);
console.log(cache.get(1)); // 10 — moves 1 to front
cache.put(4, 40);           // evicts key 2
console.log(cache.get(2)); // -1 (evicted)
`,
    spec: {
      overview: "Implement LRU Cache from scratch — one of the most frequently asked coding questions at Google, Meta, and Amazon. Achieve O(1) time complexity for both get and put using a doubly linked list synchronized with a hashmap.",
      milestones: [
        "Define a doubly linked list node with key, value, prev, next pointers.",
        "Implement O(1) node insertion at the head and O(1) removal.",
        "Wire the linked list to a HashMap for O(1) key lookup.",
        "Verify correctness against LeetCode problem 146 test cases."
      ],
      recommendedResources: [
        "LeetCode 146 — LRU Cache",
        "Hash map + doubly linked list pattern explained",
        "Neetcode.io LRU Cache video walkthrough"
      ]
    }
  },

  // ── UI/UX ─────────────────────────────────────────────────────────────────
  {
    id: "dark-mode-system",
    title: "Multi-Theme Design System Builder",
    description: "Build a theme engine that lets users toggle between Dark, Light, and High-Contrast accessibility modes.",
    category: "UI/UX",
    difficulty: "Intermediate",
    duration: "8 hours",
    tech: ["React", "CSS Variables", "Figma"],
    xp: 300,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: CSS Variable Theme Engine

const themes = {
  dark: {
    "--bg-primary":   "#0f172a",
    "--bg-secondary": "#1e293b",
    "--text-primary": "#f8fafc",
    "--accent":       "#6366f1",
  },
  light: {
    "--bg-primary":   "#f8fafc",
    "--bg-secondary": "#e2e8f0",
    "--text-primary": "#0f172a",
    "--accent":       "#4f46e5",
  },
  contrast: {
    "--bg-primary":   "#000000",
    "--bg-secondary": "#1a1a1a",
    "--text-primary": "#ffffff",
    "--accent":       "#ffff00",
  }
};

function applyTheme(themeName) {
  const theme = themes[themeName];
  const root = document.documentElement;
  for (const [prop, val] of Object.entries(theme)) {
    root.style.setProperty(prop, val);
  }
  localStorage.setItem("theme", themeName);
  console.log(\`Applied theme: \${themeName}\`);
}

// Restore saved theme on load
const saved = localStorage.getItem("theme") || "dark";
applyTheme(saved);
`,
    spec: {
      overview: "Design and implement a fully accessible multi-theme system. Define semantic color tokens in CSS custom properties, provide instant theme switching with localStorage persistence, and validate all themes against WCAG 2.1 AA contrast ratios.",
      milestones: [
        "Define Dark, Light, and High-Contrast themes using CSS custom properties.",
        "Build a ThemeContext in React that persists the selection to localStorage.",
        "Animate theme transitions with a CSS var() cross-fade using transitions.",
        "Audit all colour combinations with the axe-core accessibility checker."
      ],
      recommendedResources: [
        "CSS Custom Properties for Theming — MDN",
        "WCAG 2.1 Colour Contrast requirements",
        "React Context API for global state"
      ]
    }
  },
  {
    id: "micro-interaction-kit",
    title: "Micro-Interaction Animation Library",
    description: "Create a reusable set of delightful button, toggle, and loader micro-animations using CSS and Framer Motion.",
    category: "UI/UX",
    difficulty: "Easy",
    duration: "5 hours",
    tech: ["React", "Framer Motion", "CSS"],
    xp: 200,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: Micro-Interaction Components

import { motion } from 'framer-motion';

// Bouncy button
export function BounceButton({ label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      style={{ padding: "12px 24px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer" }}
    >
      {label}
    </motion.button>
  );
}

// Toggle switch
export function AnimatedToggle({ checked, onChange }) {
  return (
    <motion.div
      onClick={() => onChange(!checked)}
      style={{ width: 48, height: 26, borderRadius: 13, background: checked ? "#6366f1" : "#475569", display: "flex", alignItems: "center", padding: 3, cursor: "pointer" }}
      animate={{ background: checked ? "#6366f1" : "#475569" }}
    >
      <motion.div
        style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }}
        animate={{ x: checked ? 22 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </motion.div>
  );
}

console.log("Micro-interaction components ready.");
`,
    spec: {
      overview: "Build a documented component library of micro-interactions. Include bounce buttons, animated toggles, skeleton loaders, success checkmarks, ripple effects, and number counters — all as reusable React components with configurable props.",
      milestones: [
        "Build an animated toggle switch with spring physics transitions.",
        "Create a ripple-on-click effect using CSS clip-path animation.",
        "Implement a skeleton loader that shimmers while content loads.",
        "Assemble a Storybook page showcasing each component with usage docs."
      ],
      recommendedResources: [
        "Framer Motion animation library docs",
        "UI Inspiration — Awwwards and Dribbble",
        "Storybook.js for component documentation"
      ]
    }
  },

  // ── Career Guidance ───────────────────────────────────────────────────────
  {
    id: "portfolio-analyzer",
    title: "GitHub Portfolio Strength Analyzer",
    description: "Fetch a GitHub profile via the API and generate a recruiter-facing score card covering activity, languages, and project quality.",
    category: "Career Guidance",
    difficulty: "Intermediate",
    duration: "9 hours",
    tech: ["JavaScript", "GitHub API", "Node.js"],
    xp: 380,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: GitHub Portfolio Analyzer

async function analyzeGitHubProfile(username) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  const [userRes, reposRes] = await Promise.all([
    fetch(\`https://api.github.com/users/\${username}\`, { headers }),
    fetch(\`https://api.github.com/users/\${username}/repos?per_page=100&sort=updated\`, { headers })
  ]);

  const user = await userRes.json();
  const repos = await reposRes.json();

  if (!Array.isArray(repos)) throw new Error("Invalid profile");

  const langCount = {};
  repos.forEach(r => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  const score = Math.min(100,
    (user.public_repos >= 10 ? 30 : user.public_repos * 3) +
    (totalStars >= 50 ? 30 : totalStars * 0.6) +
    (user.followers >= 20 ? 20 : user.followers) +
    (user.bio ? 10 : 0) +
    (user.blog ? 10 : 0)
  );

  return { username, public_repos: user.public_repos, totalStars, topLang, followers: user.followers, score: Math.round(score) };
}

analyzeGitHubProfile("torvalds").then(console.log).catch(console.error);
`,
    spec: {
      overview: "Build a CLI + web tool that pulls a GitHub profile, analyses repositories for stars, commit frequency, language diversity, README quality, and pinned projects, then outputs a recruiter-friendly score card with actionable improvement tips.",
      milestones: [
        "Authenticate with the GitHub REST API using a personal access token.",
        "Calculate a composite score from repos count, stars, commit activity, and bio completeness.",
        "Detect missing README files, missing descriptions, and forked-only repos.",
        "Generate a shareable HTML report card with badge-style metrics."
      ],
      recommendedResources: [
        "GitHub REST API v3 documentation",
        "Octokit.js GitHub SDK",
        "How recruiters evaluate developer GitHub profiles"
      ]
    }
  },
  {
    id: "cover-letter-gen",
    title: "AI-Powered Cover Letter Generator",
    description: "Build a tool that takes a job description and resume text, then generates a tailored cover letter using the Gemini API.",
    category: "Career Guidance",
    difficulty: "Easy",
    duration: "4 hours",
    tech: ["JavaScript", "Gemini API", "Node.js"],
    xp: 180,
    language: "javascript",
    starterCode: "",
    solutionCode: `// REFERENCE SOLUTION: AI Cover Letter Generator

async function generateCoverLetter(jobDescription, resumeSummary, userName) {
  const prompt = \`
You are a professional career coach. Write a compelling, concise cover letter (3 paragraphs, max 250 words) for the following:

Applicant Name: \${userName}
Resume Summary: \${resumeSummary}
Job Description: \${jobDescription}

The letter should:
1. Open with a strong hook matching a key requirement.
2. Highlight 2-3 specific skills from the resume that match the job.
3. Close with a confident call to action.
\`;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating letter.";
}

generateCoverLetter(
  "Senior Frontend Engineer — React, TypeScript, GraphQL",
  "3 years React, 2 years TypeScript, open source contributor",
  "Alex Developer"
).then(console.log);
`,
    spec: {
      overview: "Create a web app where users paste a job description and upload their resume. The Gemini API generates a tailored cover letter, which can then be edited in-place and exported as a DOCX or PDF file.",
      milestones: [
        "Build a two-panel input form for job description and resume text.",
        "Construct a well-engineered prompt and call the Gemini API.",
        "Display the generated letter in a rich-text editor (Quill or TipTap).",
        "Add a one-click export to DOCX using the docx library."
      ],
      recommendedResources: [
        "Google Gemini API — text generation guide",
        "TipTap rich text editor documentation",
        "docx npm package for Word document generation"
      ]
    }
  }
];


export function ProjectShowcase() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [activeSpecProject, setActiveSpecProject] = useState<Project | null>(null);
  const [joinedProjects, setJoinedProjects] = useState<Set<string>>(new Set());

  const handleOpenInCompiler = (project: Project) => {
    toast.success(`Opening "${project.title}" Workspace...`);
    navigate("/app/code", { state: { project } });
  };

  const handleJoinChallenge = (projectId: string, title: string) => {
    if (joinedProjects.has(projectId)) {
      toast.info(`Already tracking your progress for "${title}"!`);
      return;
    }
    const updated = new Set(joinedProjects);
    updated.add(projectId);
    setJoinedProjects(updated);
    toast.success(`Started "${title}" challenge!`);
  };

  const filteredProjects = PROJECTS_DATA.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          p.tech.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory ? p.category === selectedCategory : true;
    const matchesDifficulty = selectedDifficulty ? p.difficulty === selectedDifficulty : true;
    return matchesSearch && matchesCat && matchesDifficulty;
  });

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedDifficulty("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-background p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <FolderGit2 className="h-3.5 w-3.5" />
              Industry Clean Workspaces
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Portfolio & Domain Projects
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clean, interactive project workspaces. Open a blank editor canvas in the Compiler, check the project specifications, and build your own project solution from scratch!
            </p>
          </div>

          <div className="flex gap-3">
            <Card className="px-4 py-3 bg-card/60 border-border/50 backdrop-blur text-center min-w-[110px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Available</p>
              <p className="text-2xl font-black text-primary">{PROJECTS_DATA.length}</p>
            </Card>
            <Card className="px-4 py-3 bg-card/60 border-border/50 backdrop-blur text-center min-w-[110px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Active</p>
              <p className="text-2xl font-black text-emerald-500">{joinedProjects.size}</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-card/40 p-4 rounded-2xl border border-border/50 backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search portfolio projects, tech stacks, or specifications..." 
            className="pl-10 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary text-sm"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Difficulty:</span>
          <div className="flex gap-1">
            {["All", "Easy", "Intermediate", "Hard"].map((diff) => {
              const value = diff === "All" ? "" : diff;
              const isSelected = selectedDifficulty === value;
              return (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(value)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-background/40 border-border/50 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>

          {(search || selectedCategory || selectedDifficulty) && (
            <Button 
              onClick={clearFilters}
              variant="ghost" 
              className="text-xs text-rose-500 hover:text-rose-400 font-semibold cursor-pointer"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Category Icons Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES_INFO.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.name;
          return (
            <motion.button
              key={cat.name}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative border ${
                isSelected 
                  ? "bg-gradient-to-br from-primary/20 to-accent/20 border-primary shadow-lg shadow-primary/10" 
                  : "bg-card/40 border-border/50 hover:bg-card/75"
              }`}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-accent rounded-full animate-ping" />
              )}
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} text-white mb-2 shadow`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold block truncate max-w-full leading-snug">
                {cat.name}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 block truncate max-w-full">
                {cat.desc}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Projects Grid */}
      <AnimatePresence mode="wait">
        {filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 border border-dashed border-border/60 rounded-3xl bg-card/20 space-y-3"
          >
            <FolderGit2 className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="text-lg font-bold">No Projects Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              We couldn't find any portfolio projects matching your search parameters or category filter.
            </p>
            <Button onClick={clearFilters} variant="outline" className="rounded-xl text-xs mt-2">
              Clear All Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project) => {
              const matchedCat = CATEGORIES_INFO.find(c => c.name === project.category) || CATEGORIES_INFO[0];
              const Icon = matchedCat.icon;
              const hasJoined = joinedProjects.has(project.id);

              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="h-full flex"
                >
                  <Card className="border-border/50 bg-card/65 backdrop-blur-md hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden flex flex-col justify-between rounded-3xl w-full group relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    
                    <CardHeader className="relative pb-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-3 rounded-2xl bg-gradient-to-r ${matchedCat.color} text-white shadow group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px]">
                            {project.category}
                          </Badge>
                          {hasJoined && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 fill-current" /> Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-extrabold group-hover:text-primary transition-colors leading-tight flex items-center justify-between">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-xs leading-relaxed mt-2 text-muted-foreground/80">
                        {project.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 border-t border-border/30 pt-4 mt-auto">
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-accent animate-pulse" />
                          {project.duration}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-emerald-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          +{project.xp} XP
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {project.tech.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-lg font-bold">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center gap-1.5 pt-2">
                        <Badge variant="outline" className={`text-[10px] py-0.5 rounded-lg border-primary/25 bg-background ${
                          project.difficulty === "Easy" ? "text-cyan-400 border-cyan-400/20 bg-cyan-400/5" :
                          project.difficulty === "Intermediate" ? "text-amber-400 border-amber-400/20 bg-amber-400/5" :
                          "text-rose-400 border-rose-400/20 bg-rose-400/5"
                        }`}>
                          {project.difficulty}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button 
                          onClick={() => setActiveSpecProject(project)}
                          variant="outline"
                          className="w-full text-xs font-semibold rounded-2xl py-5 border-border/60 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4 mr-1.5" />
                          View Spec
                        </Button>
                        <Button 
                          onClick={() => handleOpenInCompiler(project)}
                          className="w-full text-xs font-bold rounded-2xl py-5 transition-all text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Terminal className="h-4 w-4" />
                          Open Workspace
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Specification Modal */}
      <AnimatePresence>
        {activeSpecProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden border border-border/80 bg-card rounded-3xl shadow-2xl p-6 space-y-6"
            >
              {/* Top Blur Elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl pointer-events-none" />
              
              {/* Close Button */}
              <button 
                onClick={() => setActiveSpecProject(null)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-border/60 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title & Metadata */}
              <div className="space-y-1.5 pr-8">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
                    {activeSpecProject.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {activeSpecProject.difficulty}
                  </Badge>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent flex items-center gap-2">
                  {activeSpecProject.title}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-4">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-accent" /> {activeSpecProject.duration}</span>
                  <span className="flex items-center gap-1 text-emerald-500"><Star className="h-3.5 w-3.5 fill-current" /> +{activeSpecProject.xp} XP</span>
                </p>
              </div>

              {/* Specs Body */}
              <div className="space-y-4 border-t border-border/40 pt-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Project Overview
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground/90">
                    {activeSpecProject.spec.overview}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-accent flex items-center gap-1.5">
                    <Layers className="h-4 w-4" /> Implementation Milestones & TODOs
                  </h4>
                  <ul className="space-y-2.5">
                    {activeSpecProject.spec.milestones.map((m, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-sm">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] mt-0.5 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-muted-foreground/90 leading-snug">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-secondary flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4" /> Recommended Resources
                  </h4>
                  <div className="grid gap-2">
                    {activeSpecProject.spec.recommendedResources.map((res, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-colors">
                        <span className="text-xs font-semibold text-muted-foreground/90">{res}</span>
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/40">
                <Button 
                  onClick={() => setActiveSpecProject(null)}
                  variant="outline" 
                  className="flex-1 rounded-2xl py-6 cursor-pointer"
                >
                  Close Spec
                </Button>
                <Button 
                  onClick={() => {
                    const proj = activeSpecProject;
                    setActiveSpecProject(null);
                    if (proj) handleOpenInCompiler(proj);
                  }}
                  className="flex-1 rounded-2xl py-6 bg-gradient-to-r from-emerald-600 via-primary to-accent hover:shadow-lg hover:shadow-primary/25 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Terminal className="h-4 w-4" />
                  Open Blank Workspace
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
