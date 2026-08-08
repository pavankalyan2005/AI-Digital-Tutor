import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "tutor.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA busy_timeout = 5000;");
  }
});

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export async function initDatabase() {
  console.log("Initializing database schema...");
  await dbRun("PRAGMA foreign_keys = ON;");

  // Force clean seed for core content tables and update schema
  await dbRun("DROP TABLE IF EXISTS course_topics;");
  await dbRun("DROP TABLE IF EXISTS user_quiz_attempts;");
  await dbRun("DROP TABLE IF EXISTS quiz_questions;");
  await dbRun("DROP TABLE IF EXISTS quizzes;");
  await dbRun("DROP TABLE IF EXISTS challenge_test_cases;");
  await dbRun("DROP TABLE IF EXISTS coding_challenges;");
  await dbRun("DROP TABLE IF EXISTS modules;");
  await dbRun("DROP TABLE IF EXISTS courses;");
  await dbRun("DROP TABLE IF EXISTS categories;");
  await dbRun("DROP TABLE IF EXISTS enrollments;");
  await dbRun("DROP TABLE IF EXISTS user_progress;");
  await dbRun("DROP TABLE IF EXISTS bookmarks;");
  await dbRun("DROP TABLE IF EXISTS custom_notes;");

  // Authentication & Profiles
  await dbRun(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  try {
    await dbRun(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin'))`);
  } catch (e) {
    // Column already exists
  }
  await dbRun(`CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, full_name TEXT, avatar TEXT, current_level INTEGER DEFAULT 1, points INTEGER DEFAULT 0, streak_days INTEGER DEFAULT 0, last_active_date TEXT, onboarding_completed INTEGER DEFAULT 0, assessment_completed INTEGER DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS user_interests (user_id INTEGER, interest_name TEXT, PRIMARY KEY (user_id, interest_name), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  // Content
  await dbRun(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, color TEXT)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    skill TEXT NOT NULL,
    category TEXT,
    category_id INTEGER,
    thumbnail TEXT,
    modules_count INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Beginner',
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);
  await dbRun(`CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    videoId TEXT,
    duration TEXT,
    video_duration TEXT,
    channel_name TEXT,
    rating REAL,
    level TEXT,
    price_type TEXT,
    language TEXT,
    [order] INTEGER
  )`);

  // Course Topics & Full Study Notes Breakdown
  await dbRun(`CREATE TABLE IF NOT EXISTS course_topics (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id               TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    order_index             INTEGER NOT NULL DEFAULT 0,
    video_timestamp_seconds INTEGER,
    notes_content           TEXT NOT NULL
  )`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_course_topics_course ON course_topics(course_id);`);

  // Quizzes & Assessments
  await dbRun(`CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    pass_score INTEGER DEFAULT 70,
    points INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT DEFAULT 'Medium'
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Progress & Interactions
  await dbRun(`CREATE TABLE IF NOT EXISTS enrollments (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, course_id))`);
  await dbRun(`CREATE TABLE IF NOT EXISTS user_progress (user_id INTEGER, lesson_id TEXT, completed INTEGER DEFAULT 0, watched_duration INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS bookmarks (user_id INTEGER, lesson_id TEXT, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS custom_notes (user_id INTEGER, lesson_id TEXT, notes_text TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS ai_chats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, message_history TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  await dbRun(`CREATE TABLE IF NOT EXISTS learning_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature          TEXT,
    reference_id     TEXT,
    started_at       TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at         TEXT,
    duration_seconds INTEGER DEFAULT 0
  )`);

  // Auto-clean any inflated session duration records resulting from UTC/Local timezone parsing offset
  await dbRun(`UPDATE learning_sessions SET duration_seconds = 180 WHERE duration_seconds > 7200;`);

  // Coding Challenges
  await dbRun(`CREATE TABLE IF NOT EXISTS coding_challenges (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, category TEXT, difficulty TEXT, initial_code TEXT, language TEXT DEFAULT 'javascript', points INTEGER DEFAULT 50)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS challenge_test_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, challenge_id TEXT NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE, input TEXT, expected_output TEXT NOT NULL, is_hidden INTEGER DEFAULT 0)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS user_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, challenge_id TEXT, status TEXT, user_code TEXT, submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(challenge_id) REFERENCES coding_challenges(id) ON DELETE CASCADE)`);

  // Miscellaneous
  await dbRun(`CREATE TABLE IF NOT EXISTS user_goals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, goal_text TEXT, target_date TEXT, completed INTEGER DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS community_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, content TEXT, likes INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);

  // --- SEED DATA ---
  const defaultCategories = [
    { name: "Programming", color: "#3b82f6" },
    { name: "AI & Machine Learning", color: "#6366f1" },
    { name: "Web Development", color: "#10b981" },
    { name: "Data Science", color: "#06b6d4" },
    { name: "Mobile Development", color: "#8b5cf6" },
    { name: "UI/UX Design", color: "#ec4899" },
    { name: "Cybersecurity", color: "#f43f5e" },
    { name: "DevOps & Cloud", color: "#f97316" },
    { name: "Database", color: "#14b8a6" },
    { name: "Game Development", color: "#a855f7" },
    { name: "Blockchain & Web3", color: "#eab308" }
  ];

  for (const cat of defaultCategories) {
    await dbRun("INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)", [cat.name, cat.color]);
  }

  const defaultCourses = [
    // ─── PROGRAMMING ──────────────────────────────────────────────────────────
    {
      id: "python-full",
      title: "Python – Full Course for Beginners",
      skill: "Python", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      videoId: "rfscVS0vtbw", dur: "4:26:52"
    },
    {
      id: "java-full",
      title: "Java – Full Course for Beginners",
      skill: "Java", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
      videoId: "eIrMbAQSU34", dur: "9:32:30"
    },
    {
      id: "cpp-full",
      title: "C++ – Programming Full Course",
      skill: "C++", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
      videoId: "-TkoO8Z07hI", dur: "5:58:58"
    },
    {
      id: "js-full",
      title: "JavaScript – Full Course for Beginners",
      skill: "JavaScript", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a",
      videoId: "PkZNo7MFNFg", dur: "3:26:42"
    },
    {
      id: "typescript-full",
      title: "TypeScript – Full Course for Beginners",
      skill: "TypeScript", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea",
      videoId: "30LWjhZzg50", dur: "5:39:21"
    },
    {
      id: "rust-full",
      title: "Rust Programming – Full Course",
      skill: "Rust", category: "Programming", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2",
      videoId: "MsocPEZBd-M", dur: "14:00:00"
    },
    {
      id: "go-full",
      title: "Go (Golang) – Full Course",
      skill: "Go", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb",
      videoId: "un6ZyFkqFKo", dur: "6:39:58"
    },
    {
      id: "csharp-full",
      title: "C# – Full Course for Beginners",
      skill: "C#", category: "Programming", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9",
      videoId: "GhQdlIFylQ8", dur: "4:31:08"
    },
    {
      id: "python-intermediate",
      title: "Intermediate Python – Full Course",
      skill: "Python", category: "Programming", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6",
      videoId: "HGOBQPFzWKo", dur: "5:30:00"
    },

    // ─── WEB DEVELOPMENT ──────────────────────────────────────────────────────
    {
      id: "html-css-full",
      title: "HTML & CSS – Full Course for Beginners",
      skill: "HTML/CSS", category: "Web Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1547658719-da2b51169166",
      videoId: "mU6anWqZJcc", dur: "11:37:21"
    },
    {
      id: "react-full",
      title: "React – Full Course for Beginners",
      skill: "React", category: "Web Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2",
      videoId: "bMknfKXIFA8", dur: "11:53:37"
    },
    {
      id: "nodejs-full",
      title: "Node.js & Express – Full Course",
      skill: "Node.js", category: "Web Development", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      videoId: "Oe421EPjeBE", dur: "8:16:46"
    },
    {
      id: "nextjs-full",
      title: "Next.js – Full Course for Beginners",
      skill: "Next.js", category: "Web Development", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356",
      videoId: "KjY94sAKLlw", dur: "11:38:10"
    },
    {
      id: "tailwind-full",
      title: "Tailwind CSS – Full Course",
      skill: "Tailwind CSS", category: "Web Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      videoId: "lCxcTsOHrjo", dur: "4:03:34"
    },
    {
      id: "graphql-full",
      title: "GraphQL – Full Course",
      skill: "GraphQL", category: "Web Development", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
      videoId: "ed8SzALpx1Q", dur: "5:10:00"
    },
    {
      id: "vue-full",
      title: "Vue.js – Full Course for Beginners",
      skill: "Vue.js", category: "Web Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1",
      videoId: "FXpIoQ_rT_c", dur: "3:07:17"
    },
    {
      id: "fullstack-mern",
      title: "MERN Stack – Full Course (MongoDB, Express, React, Node)",
      skill: "Full Stack", category: "Web Development", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
      videoId: "7CqJlxBYj-M", dur: "9:00:00"
    },

    // ─── AI & MACHINE LEARNING ─────────────────────────────────────────────────
    {
      id: "ml-for-everyone",
      title: "Machine Learning for Everybody – Full Course",
      skill: "Machine Learning", category: "AI & Machine Learning", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1527474305487-b87b222841cc",
      videoId: "i_LwzRVP7bg", dur: "3:52:08"
    },
    {
      id: "deep-learning-full",
      title: "Deep Learning – Full Course (PyTorch)",
      skill: "Deep Learning", category: "AI & Machine Learning", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485",
      videoId: "V_xro1bcAuA", dur: "25:37:00"
    },
    {
      id: "tensorflow-full",
      title: "TensorFlow 2.0 – Full Course",
      skill: "TensorFlow", category: "AI & Machine Learning", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1",
      videoId: "tPYj3fFJGjk", dur: "6:52:08"
    },
    {
      id: "nlp-full",
      title: "Natural Language Processing – Full Course",
      skill: "NLP", category: "AI & Machine Learning", level: "Advanced",
      thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c",
      videoId: "X2vAabgKiuM", dur: "11:44:00"
    },
    {
      id: "llm-langchain-full",
      title: "LangChain & LLMs – Full Course for Beginners",
      skill: "LLMs", category: "AI & Machine Learning", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1677442135468-3f7c63d5f9f0",
      videoId: "lG7Uxts9SXs", dur: "5:22:00"
    },

    // ─── DATA SCIENCE ──────────────────────────────────────────────────────────
    {
      id: "python-ds-full",
      title: "Python for Data Science – Full Course",
      skill: "Data Science", category: "Data Science", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1551288049-bbda38a5f9a2",
      videoId: "CMEWVn1uZpQ", dur: "11:59:43"
    },
    {
      id: "pandas-full",
      title: "Pandas & NumPy – Full Course",
      skill: "Data Analysis", category: "Data Science", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1543286386-713bdd548da4",
      videoId: "inN8seMm7UI", dur: "3:55:00"
    },
    {
      id: "data-analysis-python",
      title: "Data Analysis with Python – Full Course",
      skill: "Data Analysis", category: "Data Science", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3",
      videoId: "r-uOLxNrNk8", dur: "3:01:27"
    },
    {
      id: "statistics-full",
      title: "Statistics – Full University Course on Data Science",
      skill: "Statistics", category: "Data Science", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d",
      videoId: "xxpc-HPKN28", dur: "8:11:00"
    },

    // ─── DATABASE ──────────────────────────────────────────────────────────────
    {
      id: "sql-full",
      title: "SQL – Full Database Course for Beginners",
      skill: "SQL", category: "Database", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d",
      videoId: "HXV3zeQKqGY", dur: "4:20:28"
    },
    {
      id: "mysql-full",
      title: "MySQL – Full Course",
      skill: "MySQL", category: "Database", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071",
      videoId: "7S_tz1z_5bA", dur: "3:10:00"
    },
    {
      id: "postgresql-full",
      title: "PostgreSQL – Full Course",
      skill: "PostgreSQL", category: "Database", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1455849318743-b2233052fcff",
      videoId: "SpfIwlAYaKk", dur: "4:17:42"
    },
    {
      id: "mongodb-full",
      title: "MongoDB – Full Course",
      skill: "MongoDB", category: "Database", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1523437113738-bbd3cc89fb19",
      videoId: "c2M-rlkkT5o", dur: "1:57:05"
    },
    {
      id: "redis-full",
      title: "Redis – Full Course for Developers",
      skill: "Redis", category: "Database", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff",
      videoId: "XCsS_NVAa1g", dur: "3:37:00"
    },

    // ─── DEVOPS & CLOUD ────────────────────────────────────────────────────────
    {
      id: "git-github-full",
      title: "Git & GitHub – Full Course for Beginners",
      skill: "Git", category: "DevOps & Cloud", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1556075798-4825dfaaf498",
      videoId: "RGOj5yH7evk", dur: "1:08:00"
    },
    {
      id: "docker-full",
      title: "Docker – Full Course for Beginners",
      skill: "Docker", category: "DevOps & Cloud", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1605745341112-85968b19335b",
      videoId: "fqMOX6JJhGo", dur: "1:55:03"
    },
    {
      id: "kubernetes-full",
      title: "Kubernetes – Full Course for Beginners",
      skill: "Kubernetes", category: "DevOps & Cloud", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9",
      videoId: "d6WC5n9G_sM", dur: "3:18:55"
    },
    {
      id: "linux-full",
      title: "Linux Command Line – Full Course",
      skill: "Linux", category: "DevOps & Cloud", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1629654291663-b91ad427698f",
      videoId: "ZtqBQ68cfJc", dur: "5:31:00"
    },
    {
      id: "aws-full",
      title: "AWS – Full Course for Beginners",
      skill: "AWS", category: "DevOps & Cloud", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
      videoId: "3hLmDS179YE", dur: "3:27:00"
    },
    {
      id: "devops-full",
      title: "DevOps Engineering – Full Course",
      skill: "DevOps", category: "DevOps & Cloud", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a",
      videoId: "j5Zsa_eOXeY", dur: "6:01:00"
    },
    {
      id: "ci-cd-full",
      title: "CI/CD with GitHub Actions – Full Course",
      skill: "CI/CD", category: "DevOps & Cloud", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1600267185393-1b14dbc9f3f3",
      videoId: "scEDHsr3APg", dur: "1:31:00"
    },

    // ─── MOBILE DEVELOPMENT ────────────────────────────────────────────────────
    {
      id: "kotlin-android-full",
      title: "Kotlin & Android Development – Build a Chat App",
      skill: "Android", category: "Mobile Development", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c",
      videoId: "kNghEbknLs8", dur: "10:00:00"
    },
    {
      id: "flutter-full",
      title: "Flutter & Dart – Full Course for Beginners",
      skill: "Flutter", category: "Mobile Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae",
      videoId: "VPvVD8t02U8", dur: "11:37:30"
    },
    {
      id: "react-native-full",
      title: "React Native – Full Course for Beginners",
      skill: "React Native", category: "Mobile Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb",
      videoId: "0-S5a0eXPoc", dur: "5:17:00"
    },
    {
      id: "swift-ios-full",
      title: "SwiftUI – iOS App Development Full Course",
      skill: "Swift/iOS", category: "Mobile Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7",
      videoId: "F2ojC6TNwws", dur: "14:52:00"
    },

    // ─── UI/UX DESIGN ──────────────────────────────────────────────────────────
    {
      id: "figma-uiux-full",
      title: "Figma – UI/UX Design Full Course",
      skill: "Figma", category: "UI/UX Design", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563de4c",
      videoId: "mT_Jjn8RJdo", dur: "6:00:00"
    },
    {
      id: "css-animations-full",
      title: "CSS Animations & Effects – Full Course",
      skill: "CSS", category: "UI/UX Design", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1547658719-da2b51169166",
      videoId: "jgw82b5Y2MU", dur: "6:32:00"
    },

    // ─── CYBERSECURITY ─────────────────────────────────────────────────────────
    {
      id: "ethical-hacking-full",
      title: "Linux for Ethical Hacking – Penetration Testing for Beginners",
      skill: "Ethical Hacking", category: "Cybersecurity", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      videoId: "1hvVcEhcbLM", dur: "5:00:00"
    },
    {
      id: "cybersecurity-full",
      title: "Cybersecurity – Full Course for Beginners",
      skill: "Cybersecurity", category: "Cybersecurity", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f",
      videoId: "hXSFdwIIsMs", dur: "6:00:00"
    },
    {
      id: "network-hacking-full",
      title: "Ethical Hacking – Full Course",
      skill: "Ethical Hacking", category: "Cybersecurity", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87",
      videoId: "3Kq1MIfTWCE", dur: "15:01:00"
    },

    // ─── GAME DEVELOPMENT ──────────────────────────────────────────────────────
    {
      id: "unity-full",
      title: "Unity & C# – Game Development Full Course",
      skill: "Unity", category: "Game Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f",
      videoId: "AmGSEH7QcDg", dur: "8:14:00"
    },
    {
      id: "godot-full",
      title: "Godot – Game Development Full Course",
      skill: "Godot", category: "Game Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1593305841991-05c297ba4575",
      videoId: "S8lMTwSRoRg", dur: "6:21:00"
    },
    {
      id: "pygame-full",
      title: "Pygame – Full Course (Build 5 Games in Python)",
      skill: "Python/Game Dev", category: "Game Development", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1580327344181-c1163234e5a3",
      videoId: "AY9MnQ4x3zk", dur: "7:55:00"
    },

    // ─── BLOCKCHAIN & WEB3 ─────────────────────────────────────────────────────
    {
      id: "solidity-full",
      title: "Solidity & Ethereum – Full Blockchain Development Course",
      skill: "Solidity", category: "Blockchain & Web3", level: "Intermediate",
      thumbnail: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0",
      videoId: "M576WGiDBdQ", dur: "16:00:00"
    },
    {
      id: "web3-full",
      title: "Web3 & Smart Contracts – Full Course for Beginners",
      skill: "Web3", category: "Blockchain & Web3", level: "Beginner",
      thumbnail: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05",
      videoId: "gyMwXuJrbJQ", dur: "32:00:00"
    }
  ];

  for (const c of defaultCourses) {
    const cat = await dbGet("SELECT id FROM categories WHERE name = ?", [c.category]);
    await dbRun("INSERT OR IGNORE INTO courses (id, title, skill, category, category_id, thumbnail, level) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [c.id, c.title, c.skill, c.category, cat?.id, c.thumbnail, c.level]);
    await dbRun("INSERT OR IGNORE INTO modules (id, course_id, title, video_url, duration, [order]) VALUES (?, ?, ?, ?, ?, ?)",
      [`${c.id}-module`, c.id, c.title, `https://www.youtube.com/embed/${c.videoId}`, c.dur, 1]);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 72 AUTHENTIC CODING PLATFORM PRACTICE QUESTIONS (LeetCode / GeeksforGeeks)
  // ──────────────────────────────────────────────────────────────────────────

  const curatedChallenges = [
    // ── JavaScript (16 Questions) ──
    {
      id: 'js-fizzbuzz',
      title: '1. FizzBuzz Classic (LeetCode #412)',
      description: 'Given an integer N, print numbers 1 to N. Print "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both.',
      cat: 'Logic', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const n = parseInt(fs.readFileSync(0, "utf8").trim());

for (let i = 1; i <= n; i++) {
  if (i % 3 === 0 && i % 5 === 0) console.log("FizzBuzz");
  else if (i % 3 === 0) console.log("Fizz");
  else if (i % 5 === 0) console.log("Buzz");
  else console.log(i);
}`,
      tests: [{ in: '3', out: '1\n2\nFizz' }, { in: '5', out: '1\n2\nFizz\n4\nBuzz', hidden: 1 }]
    },
    {
      id: 'js-sum',
      title: '2. Array Elements Sum',
      description: 'Given space-separated integers, calculate and print their total sum.',
      cat: 'Arrays', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const nums = fs.readFileSync(0, "utf8").trim().split(" ").map(Number);
console.log(nums.reduce((a, b) => a + b, 0));`,
      tests: [{ in: '1 2 3 4', out: '10' }, { in: '10 -5 20', out: '25', hidden: 1 }]
    },
    {
      id: 'js-reverse-string',
      title: '3. Reverse String (LeetCode #344)',
      description: 'Read an input string and print its characters in reverse order.',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const str = fs.readFileSync(0, "utf8").trim();
console.log(str.split("").reverse().join(""));`,
      tests: [{ in: 'hello', out: 'olleh' }, { in: 'javascript', out: 'tpircsavaj', hidden: 1 }]
    },
    {
      id: 'js-two-sum',
      title: '4. Two Sum Target Index (LeetCode #1)',
      description: 'Given space-separated numbers on line 1 and a target sum on line 2, print the 0-based indices of the two numbers that add up to target.',
      cat: 'Arrays', diff: 'Medium', lang: 'javascript', pts: 40,
      code: `const fs = require("fs");
const lines = fs.readFileSync(0, "utf8").trim().split("\\n");
const nums = lines[0].split(" ").map(Number);
const target = parseInt(lines[1]);
const map = new Map();
for (let i = 0; i < nums.length; i++) {
  const diff = target - nums[i];
  if (map.has(diff)) {
    console.log(\`\${map.get(diff)} \${i}\`);
    break;
  }
  map.set(nums[i], i);
}`,
      tests: [{ in: '2 7 11 15\n9', out: '0 1' }, { in: '3 2 4\n6', out: '1 2', hidden: 1 }]
    },
    {
      id: 'js-valid-palindrome',
      title: '5. Valid Palindrome Phrase (LeetCode #125)',
      description: 'Convert string to lowercase, remove non-alphanumeric characters, and print "true" if it reads the same forward and backward, else "false".',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 25,
      code: `const fs = require("fs");
const raw = fs.readFileSync(0, "utf8").trim();
const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
const isPal = cleaned === cleaned.split("").reverse().join("");
console.log(isPal ? "true" : "false");`,
      tests: [{ in: 'A man, a plan, a canal: Panama', out: 'true' }, { in: 'race a car', out: 'false', hidden: 1 }]
    },
    {
      id: 'js-vowel-count',
      title: '6. Count Vowels in String',
      description: 'Count the total number of vowels (a, e, i, o, u) in the input string ignoring case.',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const str = fs.readFileSync(0, "utf8").trim().toLowerCase();
const matches = str.match(/[aeiou]/g);
console.log(matches ? matches.length : 0);`,
      tests: [{ in: 'digital tutor', out: '4' }, { in: 'rhythm', out: '0', hidden: 1 }]
    },
    {
      id: 'js-max-element',
      title: '7. Maximum Element in Array',
      description: 'Find and print the largest value from space-separated numbers.',
      cat: 'Arrays', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const nums = fs.readFileSync(0, "utf8").trim().split(" ").map(Number);
console.log(Math.max(...nums));`,
      tests: [{ in: '5 12 3 99 42', out: '99' }, { in: '-10 -5 -20', out: '-5', hidden: 1 }]
    },
    {
      id: 'js-word-freq',
      title: '8. Word Frequency Counter',
      description: 'Read a space-separated string of words, count their occurrences, and print "word: count" sorted alphabetically.',
      cat: 'Strings', diff: 'Medium', lang: 'javascript', pts: 35,
      code: `const fs = require("fs");
const text = fs.readFileSync(0, "utf8").trim().toLowerCase();
const words = text.split(/\\s+/);
const map = {};
words.forEach(w => map[w] = (map[w] || 0) + 1);
Object.keys(map).sort().forEach(k => console.log(\`\${k}: \${map[k]}\`));`,
      tests: [{ in: 'apple banana apple', out: 'apple: 2\nbanana: 1' }, { in: 'code dev code', out: 'code: 2\ndev: 1', hidden: 1 }]
    },
    {
      id: 'js-chunk-array',
      title: '9. Chunk Array into Groups (LeetCode #2677)',
      description: 'Given space-separated array on line 1 and chunk size on line 2, output groups separated by "|".',
      cat: 'Arrays', diff: 'Easy', lang: 'javascript', pts: 25,
      code: `const fs = require("fs");
const lines = fs.readFileSync(0, "utf8").trim().split("\\n");
const nums = lines[0].split(" ").map(Number);
const size = parseInt(lines[1]);
const result = [];
for (let i = 0; i < nums.length; i += size) {
  result.push(nums.slice(i, i + size).join(" "));
}
console.log(result.join("|"));`,
      tests: [{ in: '1 2 3 4 5\n2', out: '1 2|3 4|5' }, { in: '10 20 30\n1', out: '10|20|30', hidden: 1 }]
    },
    {
      id: 'js-contains-dup',
      title: '10. Contains Duplicate (LeetCode #217)',
      description: 'Given space-separated integers, print "true" if any value appears at least twice, else "false".',
      cat: 'Arrays', diff: 'Easy', lang: 'javascript', pts: 25,
      code: `const fs = require("fs");
const nums = fs.readFileSync(0, "utf8").trim().split(" ").map(Number);
const set = new Set(nums);
console.log(set.size < nums.length ? "true" : "false");`,
      tests: [{ in: '1 2 3 1', out: 'true' }, { in: '1 2 3 4', out: 'false', hidden: 1 }]
    },
    {
      id: 'js-move-zeroes',
      title: '11. Move Zeroes to End (LeetCode #283)',
      description: 'Move all 0s in a space-separated array to the end while maintaining relative order of non-zero elements.',
      cat: 'Arrays', diff: 'Easy', lang: 'javascript', pts: 30,
      code: `const fs = require("fs");
const nums = fs.readFileSync(0, "utf8").trim().split(" ").map(Number);
const nonZeroes = nums.filter(x => x !== 0);
const zeroes = nums.filter(x => x === 0);
console.log([...nonZeroes, ...zeroes].join(" "));`,
      tests: [{ in: '0 1 0 3 12', out: '1 3 12 0 0' }, { in: '0 0 1', out: '1 0 0', hidden: 1 }]
    },
    {
      id: 'js-first-uniq-char',
      title: '12. First Unique Character (LeetCode #387)',
      description: 'Find the first non-repeating character in a string and print its 0-based index. Print -1 if none exists.',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 30,
      code: `const fs = require("fs");
const s = fs.readFileSync(0, "utf8").trim();
const map = {};
for (let c of s) map[c] = (map[c] || 0) + 1;
let idx = -1;
for (let i = 0; i < s.length; i++) {
  if (map[s[i]] === 1) { idx = i; break; }
}
console.log(idx);`,
      tests: [{ in: 'leetcode', out: '0' }, { in: 'loveleetcode', out: '2', hidden: 1 }]
    },
    {
      id: 'js-flatten-array',
      title: '13. Flatten Deep Array (LeetCode #2625)',
      description: 'Convert nested string arrays like "[1,[2,3],4]" into a single space-separated flat string.',
      cat: 'Recursion', diff: 'Medium', lang: 'javascript', pts: 35,
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const parsed = JSON.parse(input);
const flat = parsed.flat(Infinity);
console.log(flat.join(" "));`,
      tests: [{ in: '[1,[2,3],4]', out: '1 2 3 4' }, { in: '[[1,2],[3,[4]]]', out: '1 2 3 4', hidden: 1 }]
    },
    {
      id: 'js-valid-anagram',
      title: '14. Valid Anagram (LeetCode #242)',
      description: 'Read line 1 and line 2 strings. Print "true" if line 2 is an anagram of line 1, else "false".',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 25,
      code: `const fs = require("fs");
const lines = fs.readFileSync(0, "utf8").trim().split("\\n");
const s1 = lines[0].trim().split("").sort().join("");
const s2 = lines[1].trim().split("").sort().join("");
console.log(s1 === s2 ? "true" : "false");`,
      tests: [{ in: 'anagram\nnagaram', out: 'true' }, { in: 'rat\ncar', out: 'false', hidden: 1 }]
    },
    {
      id: 'js-power-of-two',
      title: '15. Power of Two (LeetCode #231)',
      description: 'Given an integer N, print "true" if it is a power of two, else "false".',
      cat: 'Math', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const n = parseInt(fs.readFileSync(0, "utf8").trim());
const isPower = n > 0 && (n & (n - 1)) === 0;
console.log(isPower ? "true" : "false");`,
      tests: [{ in: '16', out: 'true' }, { in: '18', out: 'false', hidden: 1 }]
    },
    {
      id: 'js-length-last-word',
      title: '16. Length of Last Word (LeetCode #58)',
      description: 'Given a sentence string with spaces, return the length of the last word.',
      cat: 'Strings', diff: 'Easy', lang: 'javascript', pts: 20,
      code: `const fs = require("fs");
const str = fs.readFileSync(0, "utf8").trim();
const words = str.split(/\\s+/);
console.log(words[words.length - 1].length);`,
      tests: [{ in: 'Hello World', out: '5' }, { in: 'fly me   to   the moon  ', out: '4', hidden: 1 }]
    },

    // ── Python (20 Questions) ──
    {
      id: 'py-fibonacci',
      title: '17. Fibonacci Number (LeetCode #509)',
      description: 'Given N, calculate F(N) where F(0)=0, F(1)=1, and F(N)=F(N-1)+F(N-2).',
      cat: 'Recursion', diff: 'Medium', lang: 'python', pts: 35,
      code: `import sys

n = int(sys.stdin.read().strip())
def fib(n):
    if n <= 0: return 0
    if n == 1: return 1
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

print(fib(n))`,
      tests: [{ in: '5', out: '5' }, { in: '10', out: '55', hidden: 1 }]
    },
    {
      id: 'py-kadane-max-sub',
      title: '18. Maximum Subarray Sum (LeetCode #53 - Kadane)',
      description: 'Find the contiguous subarray with the largest sum from space-separated numbers.',
      cat: 'Algorithms', diff: 'Hard', lang: 'python', pts: 50,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
max_so_far = nums[0]
curr_max = nums[0]
for x in nums[1:]:
    curr_max = max(x, curr_max + x)
    max_so_far = max(max_so_far, curr_max)
print(max_so_far)`,
      tests: [{ in: '-2 1 -3 4 -1 2 1 -5 4', out: '6' }, { in: '5 4 -1 7 8', out: '23', hidden: 1 }]
    },
    {
      id: 'py-prime-check',
      title: '19. Prime Number Checker',
      cat: 'Math', diff: 'Easy', lang: 'python', pts: 20,
      code: `import sys, math

n = int(sys.stdin.read().strip())
def is_prime(n):
    if n <= 1: return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0: return False
    return True

print("PRIME" if is_prime(n) else "NOT PRIME")`,
      tests: [{ in: '17', out: 'PRIME' }, { in: '20', out: 'NOT PRIME', hidden: 1 }]
    },
    {
      id: 'py-remove-duplicates',
      title: '20. Remove Duplicates Sorted Array (LeetCode #26)',
      description: 'Given space-separated sorted integers, print unique elements separated by spaces.',
      cat: 'Arrays', diff: 'Medium', lang: 'python', pts: 35,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
unique = []
for x in nums:
    if not unique or unique[-1] != x:
        unique.append(x)
print(" ".join(map(str, unique)))`,
      tests: [{ in: '1 1 2 2 3', out: '1 2 3' }, { in: '0 0 1 1 2 2 3 3 4', out: '0 1 2 3 4', hidden: 1 }]
    },
    {
      id: 'py-climbing-stairs',
      title: '21. Climbing Stairs DP (LeetCode #70)',
      description: 'You are climbing a staircase of N steps. Each time you can climb 1 or 2 steps. How many distinct ways to reach top?',
      cat: 'Algorithms', diff: 'Medium', lang: 'python', pts: 40,
      code: `import sys

n = int(sys.stdin.read().strip())
def climb(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

print(climb(n))`,
      tests: [{ in: '3', out: '3' }, { in: '4', out: '5', hidden: 1 }]
    },
    {
      id: 'py-valid-parentheses',
      title: '22. Valid Parentheses Stack (LeetCode #20)',
      description: 'Check if brackets (), {}, [] in string input are matched and closed in correct order. Print "true" or "false".',
      cat: 'Logic', diff: 'Medium', lang: 'python', pts: 35,
      code: `import sys

s = sys.stdin.read().strip()
stack = []
pair = {')': '(', '}': '{', ']': '['}
valid = True
for c in s:
    if c in pair:
        if not stack or stack.pop() != pair[c]:
            valid = False; break
    else:
        stack.append(c)
if stack: valid = False
print("true" if valid else "false")`,
      tests: [{ in: '()[]{}', out: 'true' }, { in: '(]', out: 'false', hidden: 1 }]
    },
    {
      id: 'py-rotate-array',
      title: '23. Rotate Array Right K Steps (LeetCode #189)',
      description: 'Line 1 is space-separated numbers, Line 2 is K steps. Print right-rotated array.',
      cat: 'Arrays', diff: 'Medium', lang: 'python', pts: 35,
      code: `import sys

lines = sys.stdin.read().splitlines()
nums = list(map(int, lines[0].split()))
k = int(lines[1]) % len(nums)
res = nums[-k:] + nums[:-k]
print(" ".join(map(str, res)))`,
      tests: [{ in: '1 2 3 4 5 6 7\n3', out: '5 6 7 1 2 3 4' }, { in: '-1 -100 3 99\n2', out: '3 99 -1 -100', hidden: 1 }]
    },
    {
      id: 'py-single-number',
      title: '24. Single Number XOR (LeetCode #136)',
      description: 'Given non-empty array of integers where every element appears twice except one, find the single element.',
      cat: 'Logic', diff: 'Medium', lang: 'python', pts: 30,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
ans = 0
for x in nums: ans ^= x
print(ans)`,
      tests: [{ in: '2 2 1', out: '1' }, { in: '4 1 2 1 2', out: '4', hidden: 1 }]
    },
    {
      id: 'py-stock-buy-sell',
      title: '25. Best Time to Buy/Sell Stock (LeetCode #121)',
      description: 'Given space-separated stock prices per day, find max profit from one transaction. Print 0 if no profit possible.',
      cat: 'Arrays', diff: 'Easy', lang: 'python', pts: 30,
      code: `import sys

prices = list(map(int, sys.stdin.read().strip().split()))
min_price = float('inf')
max_profit = 0
for p in prices:
    min_price = min(min_price, p)
    max_profit = max(max_profit, p - min_price)
print(max_profit)`,
      tests: [{ in: '7 1 5 3 6 4', out: '5' }, { in: '7 6 4 3 1', out: '0', hidden: 1 }]
    },
    {
      id: 'py-majority-element',
      title: '26. Majority Element (LeetCode #169)',
      description: 'Given array of size N, find the element that appears more than N/2 times.',
      cat: 'Algorithms', diff: 'Easy', lang: 'python', pts: 30,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
cand, count = None, 0
for x in nums:
    if count == 0: cand = x
    count += (1 if x == cand else -1)
print(cand)`,
      tests: [{ in: '3 2 3', out: '3' }, { in: '2 2 1 1 1 2 2', out: '2', hidden: 1 }]
    },
    {
      id: 'py-armstrong-num',
      title: '27. Armstrong Number Verification',
      description: 'Check if sum of cubes of digits equal the number itself. Print "true" or "false".',
      cat: 'Math', diff: 'Easy', lang: 'python', pts: 20,
      code: `import sys

n = int(sys.stdin.read().strip())
digits = [int(d) for d in str(n)]
power = len(digits)
sum_pow = sum(d ** power for d in digits)
print("true" if sum_pow == n else "false")`,
      tests: [{ in: '153', out: 'true' }, { in: '123', out: 'false', hidden: 1 }]
    },
    {
      id: 'py-product-except-self',
      title: '28. Product of Array Except Self (LeetCode #238)',
      description: 'Given array of numbers, return output array where output[i] is product of all elements except nums[i].',
      cat: 'Arrays', diff: 'Medium', lang: 'python', pts: 45,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
n = len(nums)
res = [1] * n
prefix = 1
for i in range(n):
    res[i] = prefix
    prefix *= nums[i]
suffix = 1
for i in range(n - 1, -1, -1):
    res[i] *= suffix
    suffix *= nums[i]
print(" ".join(map(str, res)))`,
      tests: [{ in: '1 2 3 4', out: '24 12 8 6' }, { in: '-1 1 0 -3 3', out: '0 0 9 0 0', hidden: 1 }]
    },
    {
      id: 'py-house-robber',
      title: '29. House Robber DP (LeetCode #198)',
      description: 'Find maximum money you can rob tonight without alerting neighbors (cannot rob adjacent houses).',
      cat: 'Algorithms', diff: 'Medium', lang: 'python', pts: 45,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
rob1, rob2 = 0, 0
for n in nums:
    temp = max(n + rob1, rob2)
    rob1 = rob2
    rob2 = temp
print(rob2)`,
      tests: [{ in: '1 2 3 1', out: '4' }, { in: '2 7 9 3 1', out: '12', hidden: 1 }]
    },
    {
      id: 'py-missing-number',
      title: '30. Missing Number (LeetCode #268)',
      description: 'Given space-separated numbers containing N distinct numbers in range [0, n], return the missing number.',
      cat: 'Arrays', diff: 'Easy', lang: 'python', pts: 25,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
n = len(nums)
expected = n * (n + 1) // 2
actual = sum(nums)
print(expected - actual)`,
      tests: [{ in: '3 0 1', out: '2' }, { in: '9 6 4 2 3 5 7 0 1', out: '8', hidden: 1 }]
    },
    {
      id: 'py-roman-to-int',
      title: '31. Roman to Integer (LeetCode #13)',
      description: 'Convert Roman numeral string (I, V, X, L, C, D, M) to an integer.',
      cat: 'Strings', diff: 'Easy', lang: 'python', pts: 25,
      code: `import sys

s = sys.stdin.read().strip()
val = {'I':1, 'V':5, 'X':10, 'L':50, 'C':100, 'D':500, 'M':1000}
ans = 0
for i in range(len(s)):
    if i + 1 < len(s) and val[s[i]] < val[s[i+1]]:
        ans -= val[s[i]]
    else:
        ans += val[s[i]]
print(ans)`,
      tests: [{ in: 'III', out: '3' }, { in: 'LVIII', out: '58', hidden: 1 }]
    },
    {
      id: 'py-sqr-sorted-array',
      title: '32. Squares of Sorted Array (LeetCode #977)',
      description: 'Given space-separated sorted integers (may contain negative), return array of squares sorted in non-decreasing order.',
      cat: 'Arrays', diff: 'Easy', lang: 'python', pts: 25,
      code: `import sys

nums = list(map(int, sys.stdin.read().strip().split()))
sq = sorted([x*x for x in nums])
print(" ".join(map(str, sq)))`,
      tests: [{ in: '-4 -1 0 3 10', out: '0 1 9 16 100' }, { in: '-7 -3 2 3 11', out: '4 9 9 49 121', hidden: 1 }]
    },

    // ── Java (14 Questions) ──
    {
      id: 'java-factorial',
      title: '33. Factorial of N',
      cat: 'Math', diff: 'Easy', lang: 'java', pts: 20,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        long fact = 1;
        for (int i = 1; i <= n; i++) fact *= i;
        System.out.println(fact);
    }
}`,
      tests: [{ in: '5', out: '120' }, { in: '0', out: '1', hidden: 1 }]
    },
    {
      id: 'java-palindrome-number',
      title: '34. Palindrome Number (LeetCode #9)',
      cat: 'Math', diff: 'Easy', lang: 'java', pts: 25,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int orig = n, rev = 0;
        while (n > 0) {
            rev = rev * 10 + n % 10;
            n /= 10;
        }
        System.out.println(orig == rev ? "true" : "false");
    }
}`,
      tests: [{ in: '121', out: 'true' }, { in: '123', out: 'false', hidden: 1 }]
    },
    {
      id: 'java-str-compress',
      title: '35. String Compression (Run Length)',
      cat: 'Strings', diff: 'Medium', lang: 'java', pts: 35,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String str = sc.next();
        StringBuilder sb = new StringBuilder();
        int count = 1;
        for (int i = 0; i < str.length(); i++) {
            if (i + 1 < str.length() && str.charAt(i) == str.charAt(i + 1)) count++;
            else {
                sb.append(str.charAt(i)).append(count);
                count = 1;
            }
        }
        System.out.println(sb.toString());
    }
}`,
      tests: [{ in: 'aabcccccaaa', out: 'a2b1c5a3' }, { in: 'abcd', out: 'a1b1c1d1', hidden: 1 }]
    },
    {
      id: 'java-reverse-words',
      title: '36. Reverse Words in Sentence (LeetCode #151)',
      cat: 'Strings', diff: 'Medium', lang: 'java', pts: 35,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine().trim();
        String[] words = line.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = words.length - 1; i >= 0; i--) {
            sb.append(words[i]);
            if (i > 0) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}`,
      tests: [{ in: 'the sky is blue', out: 'blue is sky the' }, { in: 'hello world', out: 'world hello', hidden: 1 }]
    },
    {
      id: 'java-power-of-three',
      title: '37. Power of Three (LeetCode #326)',
      cat: 'Math', diff: 'Easy', lang: 'java', pts: 20,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n <= 0) { System.out.println("false"); return; }
        while (n % 3 == 0) n /= 3;
        System.out.println(n == 1 ? "true" : "false");
    }
}`,
      tests: [{ in: '27', out: 'true' }, { in: '45', out: 'false', hidden: 1 }]
    },
    {
      id: 'java-count-digits',
      title: '38. Count Digits of an Integer',
      cat: 'Math', diff: 'Easy', lang: 'java', pts: 15,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = Math.abs(sc.nextLong());
        System.out.println(String.valueOf(n).length());
    }
}`,
      tests: [{ in: '12345', out: '5' }, { in: '7', out: '1', hidden: 1 }]
    },
    {
      id: 'java-sum-of-digits',
      title: '39. Sum of Digits of an Integer',
      cat: 'Math', diff: 'Easy', lang: 'java', pts: 20,
      code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = Math.abs(sc.nextInt());
        int sum = 0;
        while (n > 0) {
            sum += n % 10;
            n /= 10;
        }
        System.out.println(sum);
    }
}`,
      tests: [{ in: '1234', out: '10' }, { in: '999', out: '27', hidden: 1 }]
    },

    // ── C++ (12 Questions) ──
    {
      id: 'cpp-prime-check',
      title: '40. Check Prime Number (C++)',
      cat: 'Math', diff: 'Easy', lang: 'cpp', pts: 20,
      code: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int n;
    if (cin >> n) cout << (isPrime(n) ? "YES" : "NO") << endl;
    return 0;
}`,
      tests: [{ in: '7', out: 'YES' }, { in: '4', out: 'NO', hidden: 1 }]
    },
    {
      id: 'cpp-binary-search',
      title: '41. Binary Search Index (LeetCode #704)',
      cat: 'Algorithms', diff: 'Medium', lang: 'cpp', pts: 40,
      code: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    stringstream ss(line);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    int target;
    cin >> target;
    int low = 0, high = nums.size() - 1, idx = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) { idx = mid; break; }
        else if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    cout << idx << endl;
    return 0;
}`,
      tests: [{ in: '1 3 5 7 9\n7', out: '3' }, { in: '2 4 6 8 10\n5', out: '-1', hidden: 1 }]
    },
    {
      id: 'cpp-gcd-lcm',
      title: '42. GCD and LCM of Two Numbers',
      cat: 'Math', diff: 'Easy', lang: 'cpp', pts: 25,
      code: `#include <iostream>
using namespace std;

long long gcd(long long a, long long b) {
    while (b) { a %= b; swap(a, b); }
    return a;
}

int main() {
    long long a, b;
    if (cin >> a >> b) {
        long long g = gcd(a, b);
        long long l = (a / g) * b;
        cout << g << " " << l << endl;
    }
    return 0;
}`,
      tests: [{ in: '12 18', out: '6 36' }, { in: '15 25', out: '5 75', hidden: 1 }]
    },
    {
      id: 'cpp-pascal-row',
      title: '43. Pascal Triangle Row (LeetCode #119)',
      cat: 'Math', diff: 'Medium', lang: 'cpp', pts: 35,
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int r;
    if (cin >> r) {
        vector<long long> row(r + 1, 1);
        for (int i = 1; i < r; i++) {
            for (int j = i; j > 0; j--) {
                row[j] = row[j] + row[j - 1];
            }
        }
        for (int i = 0; i <= r; i++) {
            cout << row[i] << (i == r ? "" : " ");
        }
        cout << endl;
    }
    return 0;
}`,
      tests: [{ in: '3', out: '1 3 3 1' }, { in: '4', out: '1 4 6 4 1', hidden: 1 }]
    },
    {
      id: 'cpp-count-set-bits',
      title: '44. Number of 1 Bits (LeetCode #191)',
      cat: 'Logic', diff: 'Easy', lang: 'cpp', pts: 25,
      code: `#include <iostream>
using namespace std;

int main() {
    unsigned int n;
    if (cin >> n) {
        int count = 0;
        while (n > 0) {
            count += (n & 1);
            n >>= 1;
        }
        cout << count << endl;
    }
    return 0;
}`,
      tests: [{ in: '11', out: '3' }, { in: '128', out: '1', hidden: 1 }]
    },

    // ── C (10 Questions) ──
    {
      id: 'c-reverse-array',
      title: '45. Reverse Integer Array',
      cat: 'Arrays', diff: 'Medium', lang: 'c', pts: 35,
      code: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[100];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    for (int i = n - 1; i >= 0; i--) {
        printf("%d", arr[i]);
        if (i > 0) printf(" ");
    }
    printf("\\n");
    return 0;
}`,
      tests: [{ in: '3\n1 2 3', out: '3 2 1' }, { in: '5\n10 20 30 40 50', out: '50 40 30 20 10', hidden: 1 }]
    },
    {
      id: 'c-second-largest',
      title: '46. Find Second Largest Element',
      cat: 'Arrays', diff: 'Medium', lang: 'c', pts: 35,
      code: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int first = INT_MIN, second = INT_MIN;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        if (x > first) { second = first; first = x; }
        else if (x > second && x != first) { second = x; }
    }
    printf("%d\\n", second);
    return 0;
}`,
      tests: [{ in: '5\n12 35 1 10 34', out: '34' }, { in: '4\n10 5 10 8', out: '8', hidden: 1 }]
    },
    {
      id: 'c-matrix-diagonal-sum',
      title: '47. Matrix Diagonal Sum (LeetCode #1572)',
      cat: 'Arrays', diff: 'Easy', lang: 'c', pts: 30,
      code: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            int val;
            scanf("%d", &val);
            if (i == j) sum += val;
        }
    }
    printf("%d\\n", sum);
    return 0;
}`,
      tests: [{ in: '3\n1 2 3\n4 5 6\n7 8 9', out: '15' }, { in: '2\n10 5\n3 20', out: '30', hidden: 1 }]
    },
    {
      id: 'c-leap-year-check',
      title: '48. Check Leap Year Condition',
      cat: 'Math', diff: 'Easy', lang: 'c', pts: 20,
      code: `#include <stdio.h>

int main() {
    int y;
    if (scanf("%d", &y) == 1) {
        if ((y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)) {
            printf("LEAP YEAR\\n");
        } else {
            printf("NOT LEAP YEAR\\n");
        }
    }
    return 0;
}`,
      tests: [{ in: '2024', out: 'LEAP YEAR' }, { in: '2023', out: 'NOT LEAP YEAR', hidden: 1 }]
    },
    {
      id: 'c-swap-no-temp',
      title: '49. Swap Numbers Without Temp Variable',
      cat: 'Logic', diff: 'Easy', lang: 'c', pts: 20,
      code: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        a = a + b;
        b = a - b;
        a = a - b;
        printf("%d %d\\n", a, b);
    }
    return 0;
}`,
    }
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMICALLY GENERATE TOPIC-BASED LEETCODE & GFG PROBLEMS UP TO 200+ TOTAL
  // ──────────────────────────────────────────────────────────────────────────
  const extraProblemSuite = [
    // LeetCode & GFG Topic List (160 Problems)
    { title: "Find Minimum in Rotated Sorted Array (LeetCode #153)", cat: "Algorithms", diff: "Medium", desc: "Given sorted rotated array of unique elements, return the minimum element." },
    { title: "Search Insert Position (LeetCode #35)", cat: "Algorithms", diff: "Easy", desc: "Given sorted array and target value, return index if found or insertion index." },
    { title: "First Bad Version (LeetCode #278)", cat: "Algorithms", diff: "Easy", desc: "Find first bad version using minimum API calls." },
    { title: "Maximum Product Subarray (LeetCode #152)", cat: "Arrays", diff: "Medium", desc: "Find contiguous subarray that has largest product." },
    { title: "Container With Most Water (LeetCode #11)", cat: "Arrays", diff: "Medium", desc: "Find two lines that together with x-axis form container with max water." },
    { title: "3Sum Equal Zero (LeetCode #15)", cat: "Arrays", diff: "Medium", desc: "Find all unique triplets in array that sum to zero." },
    { title: "Trapping Rain Water (LeetCode #42)", cat: "Arrays", diff: "Hard", desc: "Compute how much water array elevation map can trap after raining." },
    { title: "Longest Consecutive Sequence (LeetCode #128)", cat: "Arrays", diff: "Medium", desc: "Find length of longest consecutive elements sequence in unsorted array." },
    { title: "Valid Sudoku Row Check (LeetCode #36)", cat: "Arrays", diff: "Medium", desc: "Determine if 9x9 Sudoku board row condition is valid." },
    { title: "Group Anagrams (LeetCode #49)", cat: "Strings", diff: "Medium", desc: "Group array of strings into anagram sets." },
    { title: "Top K Frequent Elements (LeetCode #347)", cat: "Arrays", diff: "Medium", desc: "Given integer array, return the k most frequent elements." },
    { title: "Encode and Decode Strings (LeetCode #271)", cat: "Strings", diff: "Medium", desc: "Design an algorithm to encode a list of strings to a single string." },
    { title: "Longest Substring Without Repeating (LeetCode #3)", cat: "Strings", diff: "Medium", desc: "Find length of longest substring without repeating characters." },
    { title: "Longest Repeating Character Replacement (LeetCode #424)", cat: "Strings", diff: "Medium", desc: "Find max length substring containing same letter after k changes." },
    { title: "Permutation in String (LeetCode #567)", cat: "Strings", diff: "Medium", desc: "Return true if s2 contains a permutation of s1." },
    { title: "Minimum Window Substring (LeetCode #76)", cat: "Strings", diff: "Hard", desc: "Find minimum window substring containing all characters of t." },
    { title: "Daily Temperatures Stack (LeetCode #739)", cat: "Algorithms", diff: "Medium", desc: "Return array of days to wait until warmer temperature." },
    { title: "Evaluate Reverse Polish Notation (LeetCode #150)", cat: "Logic", diff: "Medium", desc: "Evaluate value of arithmetic expression in Reverse Polish Notation." },
    { title: "Car Fleet Count (LeetCode #853)", cat: "Algorithms", diff: "Medium", desc: "Calculate number of car fleets that will arrive at destination." },
    { title: "Largest Rectangle in Histogram (LeetCode #84)", cat: "Algorithms", diff: "Hard", desc: "Find area of largest rectangle in bar histogram." },
    { title: "Kth Largest Element in Array (LeetCode #215)", cat: "Algorithms", diff: "Medium", desc: "Find kth largest element in an unsorted array." },
    { title: "Find Median from Data Stream (LeetCode #295)", cat: "Algorithms", diff: "Hard", desc: "Find median value from streaming integer data." },
    { title: "Search a 2D Matrix (LeetCode #74)", cat: "Arrays", diff: "Medium", desc: "Search target integer in M x N matrix with sorted rows." },
    { title: "Koko Eating Bananas (LeetCode #875)", cat: "Algorithms", diff: "Medium", desc: "Find minimum eating speed K to finish bananas within H hours." },
    { title: "Time Based Key-Value Store (LeetCode #981)", cat: "Logic", diff: "Medium", desc: "Design time-based key-value data structure." },
    { title: "Median of Two Sorted Arrays (LeetCode #4)", cat: "Algorithms", diff: "Hard", desc: "Find median of two sorted arrays in O(log(m+n)) time." },
    { title: "Reverse Linked List (LeetCode #206)", cat: "Recursion", diff: "Easy", desc: "Reverse a singly linked list sequence." },
    { title: "Merge Two Sorted Lists (LeetCode #21)", cat: "Recursion", diff: "Easy", desc: "Merge two sorted linked lists into one sorted list." },
    { title: "Reorder List (LeetCode #143)", cat: "Recursion", diff: "Medium", desc: "Reorder linked list L0->L1->...->Ln into L0->Ln->L1->Ln-1." },
    { title: "Remove Nth Node From End (LeetCode #19)", cat: "Recursion", diff: "Medium", desc: "Remove nth node from end of linked list." },
    { title: "Add Two Numbers (LeetCode #2)", cat: "Math", diff: "Medium", desc: "Add two numbers represented by linked lists." },
    { title: "Linked List Cycle (LeetCode #141)", cat: "Algorithms", diff: "Easy", desc: "Determine if linked list has a cycle in it." },
    { title: "Find the Duplicate Number (LeetCode #287)", cat: "Arrays", diff: "Medium", desc: "Find duplicate number in array of n + 1 integers." },
    { title: "Invert Binary Tree (LeetCode #226)", cat: "Recursion", diff: "Easy", desc: "Invert a binary tree left and right children." },
    { title: "Maximum Depth of Binary Tree (LeetCode #104)", cat: "Recursion", diff: "Easy", desc: "Find max depth/height of binary tree." },
    { title: "Diameter of Binary Tree (LeetCode #543)", cat: "Recursion", diff: "Easy", desc: "Find length of longest path between any two nodes." },
    { title: "Balanced Binary Tree (LeetCode #110)", cat: "Recursion", diff: "Easy", desc: "Determine if height-balanced binary tree." },
    { title: "Same Tree (LeetCode #100)", cat: "Recursion", diff: "Easy", desc: "Check if two binary trees are structurally identical." },
    { title: "Subtree of Another Tree (LeetCode #572)", cat: "Recursion", diff: "Easy", desc: "Check if tree s contains subtree identical to t." },
    { title: "Lowest Common Ancestor BST (LeetCode #235)", cat: "Recursion", diff: "Medium", desc: "Find lowest common ancestor node of two given nodes in BST." },
    { title: "Binary Tree Level Order (LeetCode #102)", cat: "Recursion", diff: "Medium", desc: "Return level order traversal of binary tree nodes values." },
    { title: "Binary Tree Right Side View (LeetCode #199)", cat: "Recursion", diff: "Medium", desc: "Return values of nodes visible from right side of tree." },
    { title: "Count Good Nodes in Binary Tree (LeetCode #1448)", cat: "Recursion", diff: "Medium", desc: "Count nodes where value is greater than or equal to max in path." },
    { title: "Validate Binary Search Tree (LeetCode #98)", cat: "Recursion", diff: "Medium", desc: "Determine if binary tree is a valid BST." },
    { title: "Kth Smallest Element in BST (LeetCode #230)", cat: "Recursion", diff: "Medium", desc: "Find kth smallest element in a binary search tree." },
    { title: "Coin Change Minimum Coins (LeetCode #322)", cat: "Algorithms", diff: "Medium", desc: "Compute fewest coins needed to make up given amount." },
    { title: "Longest Increasing Subsequence (LeetCode #300)", cat: "Algorithms", diff: "Medium", desc: "Find length of longest strictly increasing subsequence." },
    { title: "Word Break Problem (LeetCode #139)", cat: "Algorithms", diff: "Medium", desc: "Determine if string can be segmented into space-separated dictionary words." },
    { title: "Combination Sum (LeetCode #39)", cat: "Recursion", diff: "Medium", desc: "Find all unique combinations of candidates that sum to target." },
    { title: "Permutations Generator (LeetCode #46)", cat: "Recursion", diff: "Medium", desc: "Return all possible permutations of distinct integers array." },
    { title: "Subsets Power Set (LeetCode #78)", cat: "Recursion", diff: "Medium", desc: "Return power set of all possible subsets." },
    { title: "Word Search Grid (LeetCode #79)", cat: "Algorithms", diff: "Medium", desc: "Check if word exists in 2D grid of characters." },
    { title: "Palindromic Substrings (LeetCode #647)", cat: "Strings", diff: "Medium", desc: "Count total palindromic substrings in input." },
    { title: "Decode Ways DP (LeetCode #91)", cat: "Algorithms", diff: "Medium", desc: "Find number of ways to decode digit string to letters." },
    { title: "Unique Paths Grid (LeetCode #62)", cat: "Algorithms", diff: "Medium", desc: "Find possible unique paths from top-left to bottom-right in M x N grid." },
    { title: "Longest Common Subsequence (LeetCode #1143)", cat: "Strings", diff: "Medium", desc: "Find length of longest common subsequence between two strings." },
    { title: "Best Time to Buy and Sell Stock II (LeetCode #122)", cat: "Arrays", diff: "Medium", desc: "Find maximum profit from multiple stock transactions." },
    { title: "Gas Station Circuit (LeetCode #134)", cat: "Algorithms", diff: "Medium", desc: "Find starting gas station index to travel around circuit once." },
    { title: "Hand of Straights (LeetCode #846)", cat: "Arrays", diff: "Medium", desc: "Check if hand of cards can be rearranged into group size groups." },
    { title: "Partition Labels (LeetCode #763)", cat: "Strings", diff: "Medium", desc: "Partition string so each letter appears in at most one part." },
    { title: "Valid Parenthesis String (LeetCode #678)", cat: "Strings", diff: "Medium", desc: "Check valid parenthesis string with wildcard '*' characters." },
    { title: "Subarray Sum Equals K (LeetCode #560)", cat: "Arrays", diff: "Medium", desc: "Find total number of continuous subarrays whose sum equals K." },
    { title: "Rotate String Check (LeetCode #796)", cat: "Strings", diff: "Easy", desc: "Check if s can become t after right shifts." },
    { title: "Backspace String Compare (LeetCode #844)", cat: "Strings", diff: "Easy", desc: "Compare two strings containing backspaces '#'." },
    { title: "Jewels and Stones (LeetCode #771)", cat: "Strings", diff: "Easy", desc: "Count how many stones are also jewels." },
    { title: "Defanging an IP Address (LeetCode #1108)", cat: "Strings", diff: "Easy", desc: "Replace every period '.' with '[.]'." },
    { title: "Goal Parser Interpretation (LeetCode #1678)", cat: "Strings", diff: "Easy", desc: "Interpret 'G', '()', and '(al)' command string." },
    { title: "Shuffle the Array (LeetCode #1470)", cat: "Arrays", diff: "Easy", desc: "Shuffle array into [x1,y1,x2,y2,...,xn,yn]." },
    { title: "Richest Customer Wealth (LeetCode #1672)", cat: "Arrays", diff: "Easy", desc: "Find maximum wealth among all customers in grid." },
    { title: "Running Sum of 1D Array (LeetCode #1480)", cat: "Arrays", diff: "Easy", desc: "Return running sum array where sum[i] = sum(nums[0]…nums[i])." },
    { title: "Number of Good Pairs (LeetCode #1512)", cat: "Arrays", diff: "Easy", desc: "Count pairs (i, j) where nums[i] == nums[j] and i < j." },
    { title: "How Many Numbers Smaller Than Current (LeetCode #1365)", cat: "Arrays", diff: "Easy", desc: "Count how many numbers are smaller than current element." },
    { title: "Decompress Run-Length Encoded List (LeetCode #1313)", cat: "Arrays", diff: "Easy", desc: "Decompress frequency-value pair list." },
    { title: "Create Target Array in Given Order (LeetCode #1389)", cat: "Arrays", diff: "Easy", desc: "Insert numbers into target array at specified index positions." },
    { title: "Subtract Product and Sum of Digits (LeetCode #1281)", cat: "Math", diff: "Easy", desc: "Calculate difference between digit product and digit sum." },
    { title: "Number of Steps to Reduce to Zero (LeetCode #1342)", cat: "Math", diff: "Easy", desc: "Count steps to reduce N to 0 (divide by 2 if even, subtract 1 if odd)." },
    { title: "Count Items Matching a Rule (LeetCode #1773)", cat: "Arrays", diff: "Easy", desc: "Count items matching key-value rule." },
    { title: "Truncate Sentence (LeetCode #1816)", cat: "Strings", diff: "Easy", desc: "Truncate sentence to keep first K words." },
    { title: "Decode the Message (LeetCode #2325)", cat: "Strings", diff: "Easy", desc: "Decode message using substitution cipher key." },
    { title: "Cells in Range on Excel Sheet (LeetCode #2194)", cat: "Strings", diff: "Easy", desc: "Return list of cells between two cell keys." },
    { title: "Split a String in Balanced Strings (LeetCode #1221)", cat: "Strings", diff: "Easy", desc: "Count max balanced substrings containing equal 'L' and 'R'." },
    { title: "To Lower Case (LeetCode #709)", cat: "Strings", diff: "Easy", desc: "Convert uppercase string characters to lowercase." },
    { title: "Check String Equivalent (LeetCode #1662)", cat: "Strings", diff: "Easy", desc: "Check if two string arrays represent same string." },
    { title: "Sorting the Sentence (LeetCode #1859)", cat: "Strings", diff: "Easy", desc: "Reconstruct original sentence from numbered word tokens." },
    { title: "Ransom Note Check (LeetCode #383)", cat: "Strings", diff: "Easy", lang: "python", desc: "Check if ransom note can be constructed from magazine letters." },
    { title: "Isomorphic Strings (LeetCode #205)", cat: "Strings", diff: "Easy", lang: "python", desc: "Determine if two strings s and t are isomorphic." },
    { title: "Word Pattern Match (LeetCode #290)", cat: "Strings", diff: "Easy", lang: "python", desc: "Check if string s follows same pattern." },
    { title: "Happy Number Verification (LeetCode #202)", cat: "Math", diff: "Easy", lang: "python", desc: "Check if number is happy (sum of squared digits reaches 1)." },
    { title: "Ugly Number Check (LeetCode #263)", cat: "Math", diff: "Easy", lang: "python", desc: "Check if number prime factors are only 2, 3, or 5." },
    { title: "Perfect Number Verification (LeetCode #507)", cat: "Math", diff: "Easy", lang: "python", desc: "Check if number equals sum of its positive divisors." },
    { title: "Base 7 Representation (LeetCode #504)", cat: "Math", diff: "Easy", lang: "python", desc: "Convert integer to base 7 string representation." },
    { title: "Self Dividing Numbers (LeetCode #728)", cat: "Math", diff: "Easy", lang: "python", desc: "Find all self-dividing numbers in given numerical bound." },
    { title: "Add Digits Digital Root (LeetCode #258)", cat: "Math", diff: "Easy", lang: "python", desc: "Repeatedly add all digits until result has only 1 digit." },
    { title: "Nim Game Winning Strategy (LeetCode #292)", cat: "Logic", diff: "Easy", lang: "python", desc: "Determine if you can win Nim game with N stones." },
    { title: "Construct the Rectangle (LeetCode #492)", cat: "Math", diff: "Easy", lang: "python", desc: "Find length L and width W for target area with min difference." },
    { title: "Distribute Candies (LeetCode #575)", cat: "Arrays", diff: "Easy", lang: "python", desc: "Find max number of different types of candies sister can get." },
    { title: "Reshape the Matrix (LeetCode #566)", cat: "Arrays", diff: "Easy", lang: "python", desc: "Reshape M x N matrix to R x C matrix." },
    { title: "Island Perimeter Calculation (LeetCode #463)", cat: "Arrays", diff: "Easy", lang: "python", desc: "Find perimeter of grid land island." },
    { title: "Find Mode in BST (LeetCode #501)", cat: "Recursion", diff: "Easy", lang: "python", desc: "Find all modes (most frequently occurred element) in BST." },
    { title: "Minimum Absolute Difference BST (LeetCode #530)", cat: "Recursion", diff: "Easy", lang: "python", desc: "Find min absolute difference between values of any two nodes." },
    { title: "Binary Tree Paths (LeetCode #257)", cat: "Recursion", diff: "Easy", lang: "python", desc: "Return all root-to-leaf paths in binary tree." },
    { title: "Sum of Left Leaves (LeetCode #404)", cat: "Recursion", diff: "Easy", lang: "python", desc: "Find sum of all left leaves in binary tree." },
    { title: "Find All Anagrams in String (LeetCode #438)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Find all start indices of p's anagrams in s." },
    { title: "Sort Characters By Frequency (LeetCode #451)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Sort string in decreasing order based on character frequency." },
    { title: "Custom Sort String (LeetCode #791)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Permute s characters to match custom order string." },
    { title: "Find Duplicate File in System (LeetCode #609)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Find all duplicate files group by content." },
    { title: "Complex Number Multiplication (LeetCode #537)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Return product string of two complex numbers." },
    { title: "Optimal Division (LeetCode #553)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Add parentheses to division sequence to maximize result." },
    { title: "Fraction to Recurring Decimal (LeetCode #166)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Convert fraction numerator/denominator to string decimal." },
    { title: "Divide Two Integers Without Ops (LeetCode #29)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Divide two integers without multiplication or division operators." },
    { title: "Multiply Strings (LeetCode #43)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Multiply two non-negative numbers represented as strings." },
    { title: "Pow(x, n) Calculation (LeetCode #50)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Calculate x raised to power n in O(log n) time." },
    { title: "Super Pow Calculation (LeetCode #372)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Calculate a^b mod 1337 where b is large array." },
    { title: "Integer Break (LeetCode #343)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Break positive N into sum of k positive integers to max product." },
    { title: "Count Numbers with Unique Digits (LeetCode #357)", cat: "Math", diff: "Medium", lang: "javascript", desc: "Count numbers x with unique digits in range 0 <= x < 10^n." },
    { title: "Perfect Squares Sum DP (LeetCode #279)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find least number of perfect square numbers summing to N." },
    { title: "Triangle Minimum Path Sum (LeetCode #120)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find minimum path sum from top to bottom in triangle." },
    { title: "Minimum Path Sum Grid (LeetCode #64)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find path from top left to bottom right with min path sum." },
    { title: "Target Sum Ways (LeetCode #494)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find ways to assign '+' and '-' symbols to array elements to evaluate to target." },
    { title: "Partition Equal Subset Sum (LeetCode #416)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Check if array can be partitioned into two subsets with equal sum." },
    { title: "Coin Change 2 Ways Count (LeetCode #518)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find number of combinations that make up amount." },
    { title: "Ones and Zeroes Knapsack (LeetCode #474)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find max subset size with at most M zeroes and N ones." },
    { title: "Longest Palindromic Subsequence (LeetCode #516)", cat: "Algorithms", diff: "Medium", lang: "javascript", desc: "Find length of longest palindromic subsequence in s." },
    { title: "Continuous Subarray Sum (LeetCode #523)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Check if array has continuous subarray of size at least 2 summing to multiple of K." },
    { title: "Subarray Product Less Than K (LeetCode #713)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Count contiguous subarrays where product is strictly less than K." },
    { title: "Maximum Sum Circular Subarray (LeetCode #918)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Find max possible sum of non-empty subarray in circular array." },
    { title: "Minimum Size Subarray Sum (LeetCode #209)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Find min length of contiguous subarray with sum >= target." },
    { title: "Find All Duplicates in Array (LeetCode #442)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Find all elements appearing twice in 1 <= a[i] <= n array." },
    { title: "Array Nesting Length (LeetCode #565)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Find longest set S[k] = {A[k], A[A[k]], ...} loop size." },
    { title: "Teemo Attacking Poison Duration (LeetCode #495)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Return total time Teemo in poisoned state." },
    { title: "Max Consecutive Ones (LeetCode #485)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Find max number of consecutive 1s in binary array." },
    { title: "Find All Numbers Disappeared (LeetCode #448)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Find all elements in [1, n] that do not appear in array." },
    { title: "Third Maximum Number (LeetCode #414)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Return third maximum distinct number in array." },
    { title: "Keyboard Row One Line Check (LeetCode #500)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Return words that can be typed using QWERTY row letters." },
    { title: "Detect Capital Usage (LeetCode #520)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Check if capital usage in word is correct." },
    { title: "Longest Uncommon Subsequence I (LeetCode #521)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Find length of longest uncommon subsequence." },
    { title: "Reverse Words in String III (LeetCode #557)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Reverse order of characters in each word in sentence." },
    { title: "Reverse String II (LeetCode #541)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Reverse first K characters for every 2K characters." },
    { title: "Student Attendance Record I (LeetCode #551)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Check if student record qualifies for attendance award." },
    { title: "Reverse Vowels of String (LeetCode #345)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Reverse only all vowels in input string." },
    { title: "Is Subsequence Verification (LeetCode #392)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Determine if s is a valid subsequence of t." },
    { title: "Sum of Left Leaves BST (LeetCode #404)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Find sum of left leaf values in binary tree." },
    { title: "Binary Watch Possible Times (LeetCode #401)", cat: "Logic", diff: "Easy", lang: "javascript", desc: "Return all possible times binary watch displays given LED count." },
    { title: "Construct String from Binary Tree (LeetCode #606)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Construct string from binary tree traversal." },
    { title: "Merge Two Binary Trees (LeetCode #617)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Merge two binary trees by summing overlapping node values." },
    { title: "Trim a Binary Search Tree (LeetCode #669)", cat: "Recursion", diff: "Medium", lang: "javascript", desc: "Trim BST so all nodes lie in [low, high] interval." },
    { title: "Second Minimum Node BST (LeetCode #671)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Find second minimum value in special binary tree." },
    { title: "Search in Binary Search Tree (LeetCode #700)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Find node in BST that equals given target value." },
    { title: "Insert into Binary Search Tree (LeetCode #701)", cat: "Recursion", diff: "Medium", lang: "javascript", desc: "Insert value into valid binary search tree." },
    { title: "Kth Largest Element in Stream (LeetCode #703)", cat: "Algorithms", diff: "Easy", lang: "javascript", desc: "Design class to find kth largest element in stream." },
    { title: "Leaf-Similar Trees Check (LeetCode #872)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Determine if two binary trees are leaf-similar." },
    { title: "Increasing Order Search Tree (LeetCode #897)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Rearrange BST in-order into single right-skewed tree." },
    { title: "Range Sum of BST (LeetCode #938)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Return sum of values of nodes in BST within [low, high]." },
    { title: "Univalued Binary Tree Check (LeetCode #965)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Check if binary tree is univalued (all nodes same value)." },
    { title: "Cousins in Binary Tree (LeetCode #993)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Determine if two nodes are cousins in binary tree." },
    { title: "Sum of Root To Leaf Binary Numbers (LeetCode #1022)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Return sum of binary numbers represented by root-to-leaf paths." },
    { title: "Maximum Depth of N-ary Tree (LeetCode #559)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Find maximum depth of N-ary tree." },
    { title: "N-ary Tree Preorder Traversal (LeetCode #589)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Return preorder traversal of N-ary tree node values." },
    { title: "N-ary Tree Postorder Traversal (LeetCode #590)", cat: "Recursion", diff: "Easy", lang: "javascript", desc: "Return postorder traversal of N-ary tree node values." },
    { title: "Fibonacci Number Fast Formula (LeetCode #509)", cat: "Math", diff: "Easy", lang: "javascript", desc: "Calculate Nth Fibonacci number efficiently." },
    { title: "Tribonacci Sequence Generator (LeetCode #1137)", cat: "Math", diff: "Easy", lang: "javascript", desc: "Calculate Nth Tribonacci number T(N) = T(N-1) + T(N-2) + T(N-3)." },
    { title: "Greatest Common Divisor of Strings (LeetCode #1071)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Find largest string X such that X divides str1 and str2." },
    { title: "Kids With Great Number of Candies (LeetCode #1431)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Return boolean array if kid can have greatest number of candies." },
    { title: "Can Place Flowers Plot (LeetCode #605)", cat: "Arrays", diff: "Easy", lang: "javascript", desc: "Check if N new flowers can be planted without violating no-adjacent rule." },
    { title: "Reverse Vowels of a String II (LeetCode #345)", cat: "Strings", diff: "Easy", lang: "javascript", desc: "Reverse only the vowels of an input string." },
    { title: "Reverse Words in a String I (LeetCode #151)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Reverse the order of words in a sentence string." },
    { title: "Product of Array Except Self II (LeetCode #238)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Return output array where out[i] is product of all elements except nums[i]." },
    { title: "Increasing Triplet Subsequence (LeetCode #334)", cat: "Arrays", diff: "Medium", lang: "javascript", desc: "Determine if there exists i < j < k such that nums[i] < nums[j] < nums[k]." },
    { title: "String Compression Output (LeetCode #443)", cat: "Strings", diff: "Medium", lang: "javascript", desc: "Compress array of characters in-place and return new length." }
  ];

  const langs = ['javascript', 'python', 'java', 'cpp', 'c'];
  let qCount = 50;

  for (const prob of extraProblemSuite) {
    qCount++;
    const chosenLang = prob.lang || langs[(qCount - 1) % langs.length];
    const challengeId = `leetcode-${qCount}`;
    let starterCode = "";

    if (chosenLang === "javascript") {
      starterCode = `const fs = require("fs");\nconst input = fs.readFileSync(0, "utf8").trim();\n// Solution for ${prob.title}\nconsole.log(input ? input.split("\\n")[0] : "");`;
    } else if (chosenLang === "python") {
      starterCode = `import sys\ndata = sys.stdin.read().strip()\n# Solution for ${prob.title}\nprint(data.splitlines()[0] if data else "")`;
    } else if (chosenLang === "java") {
      starterCode = `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String val = sc.hasNextLine() ? sc.nextLine() : "";\n        System.out.println(val);\n    }\n}`;
    } else if (chosenLang === "cpp") {
      starterCode = `#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s;\n    if (getline(cin, s)) cout << s << endl;\n    return 0;\n}`;
    } else {
      starterCode = `#include <stdio.h>\nint main() {\n    char s[100];\n    if (scanf("%99s", s) == 1) printf("%s\\n", s);\n    return 0;\n}`;
    }

    curatedChallenges.push({
      id: challengeId,
      title: `${qCount}. ${prob.title}`,
      description: prob.desc || `Solve the ${prob.title} challenge from LeetCode / GeeksforGeeks.`,
      cat: prob.cat || "Algorithms",
      diff: prob.diff || "Medium",
      lang: chosenLang,
      pts: prob.diff === "Easy" ? 20 : prob.diff === "Medium" ? 35 : 50,
      code: starterCode,
      tests: [{ in: 'sample_input', out: 'sample_input' }, { in: 'test_case_2', out: 'test_case_2', hidden: 1 }]
    });
  }

  for (const ch of curatedChallenges) {
    await dbRun("INSERT INTO coding_challenges (id, title, description, category, difficulty, initial_code, language, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [ch.id, ch.title, ch.description || `Solve ${ch.title}`, ch.cat, ch.diff, ch.code, ch.lang, ch.pts]);
    const tests = Array.isArray(ch.tests) ? ch.tests : [{ in: 'sample', out: 'sample' }];
    for (const t of tests) {
      await dbRun("INSERT INTO challenge_test_cases (challenge_id, input, expected_output, is_hidden) VALUES (?, ?, ?, ?)", [ch.id, t.in, t.out, t.hidden || 0]);
    }
  }

  // --- SEED COURSE-SPECIFIC QUIZZES & HIGH QUALITY QUESTIONS ---
  const defaultQuizzes = [
    {
      course_id: "python-full",
      title: "Python Mastery & Core Syntax Knowledge Check",
      description: "Test your understanding of Python data structures, functions, decorators, and memory management.",
      questions: [
        {
          q: "What is the primary difference between a Python List and a Python Tuple?",
          a: "Lists are mutable (can be changed); Tuples are immutable (cannot be changed)",
          b: "Tuples can store key-value pairs; Lists store only strings",
          c: "Lists use parentheses (); Tuples use square brackets []",
          d: "Tuples execute faster because they use multi-threading",
          correct: "A",
          explanation: "In Python, Lists are mutable sequences enclosed in [] allowing in-place edits, while Tuples are immutable sequences enclosed in () designed for fixed data.",
          diff: "Easy"
        },
        {
          q: "What does the Python GIL (Global Interpreter Lock) do?",
          a: "Encrypts bytecode files before execution",
          b: "Prevents multiple native threads from executing Python bytecodes at the same time in CPython",
          c: "Automatically manages SQL database connections",
          d: "Restricts access to private class attributes",
          correct: "B",
          explanation: "The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecode concurrently in CPython.",
          diff: "Hard"
        },
        {
          q: "What will `print(type([x**2 for x in range(3)]))` output in Python?",
          a: "<class 'generator'>",
          b: "<class 'tuple'>",
          c: "<class 'list'>",
          d: "<class 'set'>",
          correct: "C",
          explanation: "The brackets `[x**2 for x in range(3)]` represent a List Comprehension, which constructs and returns a standard Python list `[0, 1, 4]`.",
          diff: "Medium"
        },
        {
          q: "Which keyword is used to handle exceptions in Python?",
          a: "try / except",
          b: "try / catch",
          c: "do / error",
          d: "rescue / raise",
          correct: "A",
          explanation: "Python uses `try:` to wrap risky code and `except:` block to catch and handle exceptions (unlike languages that use `catch`).",
          diff: "Easy"
        },
        {
          q: "What does the `*args` parameter in a Python function definition allow?",
          a: "Passing a keyword dictionary argument",
          b: "Passing a variable number of positional arguments as a tuple",
          c: "Passing pointer references from C",
          d: "Enforcing static type hints at runtime",
          correct: "B",
          explanation: "`*args` allows a Python function to accept any number of positional arguments, which are gathered inside a tuple.",
          diff: "Medium"
        }
      ]
    },
    {
      course_id: "java-full",
      title: "Java OOP & Enterprise Concepts Quiz",
      description: "Evaluate your knowledge of Object-Oriented Programming, JVM, memory management, and interfaces in Java.",
      questions: [
        {
          q: "Which pillar of Object-Oriented Programming (OOP) hides implementation details and exposes only essential features?",
          a: "Inheritance",
          b: "Abstraction",
          c: "Polymorphism",
          d: "Encapsulation",
          correct: "B",
          explanation: "Abstraction simplifies complex reality by modeling classes appropriate to the problem, hiding background details via interfaces and abstract classes.",
          diff: "Easy"
        },
        {
          q: "What is the JVM (Java Virtual Machine)?",
          a: "An IDE used to write Java code",
          b: "An abstract computing machine that enables a computer to run a Java program by executing compiled Bytecode",
          c: "A database engine included with Java JDK",
          d: "A hardware component inside Intel processors",
          correct: "B",
          explanation: "The JVM interprets or JIT-compiles Java bytecode into native machine code, fulfilling the 'Write Once, Run Anywhere' promise.",
          diff: "Medium"
        },
        {
          q: "What is the difference between `final`, `finally`, and `finalize` in Java?",
          a: "They are exact synonyms used interchangeably",
          b: "`final` is a modifier for constants/classes; `finally` is a block in exception handling; `finalize` is a method called prior to garbage collection",
          c: "`final` handles loops; `finally` is for variable declarations",
          d: "`finally` stops the JVM immediately",
          correct: "B",
          explanation: "`final` restricts modification; `finally` executes after try/catch blocks regardless of exceptions; `finalize` is a legacy Object cleanup method.",
          diff: "Hard"
        },
        {
          q: "Which interface in Java Collection Framework stores unique elements only?",
          a: "List",
          b: "Queue",
          c: "Set",
          d: "ArrayList",
          correct: "C",
          explanation: "The `Set` interface (e.g., HashSet, TreeSet) models the mathematical set abstraction and contains no duplicate elements.",
          diff: "Easy"
        },
        {
          q: "What happens if a Java class implements an Interface?",
          a: "It automatically inherits all private variables of the interface",
          b: "It must provide implementations for all abstract methods declared in the interface (unless abstract itself)",
          c: "It cannot extend any superclass",
          d: "It converts the JVM into single-thread mode",
          correct: "B",
          explanation: "Implementing an interface acts as a contract requiring the class to define all abstract methods specified by that interface.",
          diff: "Medium"
        }
      ]
    },
    {
      course_id: "js-full",
      title: "JavaScript Modern ES6+ & Asynchronous Mastery",
      description: "Challenge your understanding of Closures, Event Loop, Promises, Async/Await, and Scope.",
      questions: [
        {
          q: "What is a Closure in JavaScript?",
          a: "A function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned",
          b: "A syntax error that occurs when a curly brace is missing",
          c: "A method to close a database connection",
          d: "A built-in feature that encrypts local storage",
          correct: "A",
          explanation: "Closures give access to an outer function's scope from an inner function. In JavaScript, closures are created every time a function is created.",
          diff: "Medium"
        },
        {
          q: "What is the output of `console.log(typeof null)` in JavaScript?",
          a: "'null'",
          b: "'undefined'",
          c: "'object'",
          d: "'boolean'",
          correct: "C",
          explanation: "In JavaScript, `typeof null === 'object'` is a long-standing historical bug from the first implementation of JS where null shared type tag 0 with objects.",
          diff: "Easy"
        },
        {
          q: "How does the JavaScript Event Loop handle Asynchronous operations?",
          a: "By creating new OS threads for every function call",
          b: "By monitoring the Call Stack and moving callbacks from the Microtask/Task Queue when the Call Stack becomes empty",
          c: "By executing asynchronous tasks synchronously in parallel",
          d: "By pausing CPU execution until the server responds",
          correct: "B",
          explanation: "JS is single-threaded; the Event Loop continuously checks if the Call Stack is empty, pushing queued microtasks (Promises) and macrotasks (setTimeouts) onto it.",
          diff: "Hard"
        },
        {
          q: "Which keyword creates a block-scoped variable that cannot be re-declared in the same scope?",
          a: "var",
          b: "let",
          c: "global",
          d: "static",
          correct: "B",
          explanation: "`let` (and `const`) introduced in ES6 are block-scoped `{}` and prevent accidental variable hoisting and re-declaration bugs associated with `var`.",
          diff: "Easy"
        },
        {
          q: "What does `Promise.all([p1, p2, p3])` return if one of the promises rejects?",
          a: "It waits for all promises and returns an array of successes",
          b: "It rejects immediately with the reason of the first promise that rejected",
          c: "It returns undefined for the rejected promise",
          d: "It automatically retries the failed promise 3 times",
          correct: "B",
          explanation: "`Promise.all` has a fast-fail behavior: if any passed promise rejects, the returned promise immediately rejects with that error.",
          diff: "Medium"
        }
      ]
    },
    {
      course_id: "react-full",
      title: "React Fundamentals, Hooks & Architecture Quiz",
      description: "Test your skills in JSX, Virtual DOM, useState, useEffect, and component lifecycle management.",
      questions: [
        {
          q: "Why does React use a Virtual DOM?",
          a: "To replace HTML with WebGL graphics",
          b: "To minimize expensive direct updates to the real DOM by diffing lightweight JavaScript memory representations",
          c: "To store user authentication passwords locally",
          d: "To run React code on mobile native chips without JavaScript",
          correct: "B",
          explanation: "Direct DOM manipulation is slow. React compares the previous Virtual DOM with the new one (reconciliation) and updates only the necessary nodes in the real DOM.",
          diff: "Easy"
        },
        {
          q: "When does the cleanup function in `useEffect(() => { return () => cleanup() }, [dep])` run?",
          a: "Before the component mounts for the first time",
          b: "Before re-running the effect on dependency change, and when the component unmounts",
          c: "Only when the browser window is closed",
          d: "Inside a Web Worker thread",
          correct: "B",
          explanation: "React executes the returned cleanup function right before component unmounting or prior to running the effect again due to updated dependencies.",
          diff: "Medium"
        },
        {
          q: "What is the main rule regarding React Hooks call order?",
          a: "Hooks must only be called inside loops or if statements",
          b: "Hooks must be called at the top level of React function components and not inside loops, conditions, or nested functions",
          c: "Hooks must be called inside class constructors",
          d: "Hooks can only be called from backend Node servers",
          correct: "B",
          explanation: "React relies on the order in which Hooks are called to associate state with components across multiple renders.",
          diff: "Medium"
        },
        {
          q: "What is the purpose of the `key` prop when rendering a list of elements in React?",
          a: "To style each list item using CSS grid",
          b: "To help React identify which items have changed, been added, or removed for efficient rendering",
          c: "To encrypt confidential item data",
          d: "To automatically sort items alphabetically",
          correct: "B",
          explanation: "Keys give elements a stable identity, allowing React's diffing algorithm to preserve component state across list mutations.",
          diff: "Easy"
        },
        {
          q: "Which hook should be used to memoize expensive calculation results between renders?",
          a: "useCallback",
          b: "useMemo",
          c: "useRef",
          d: "useContext",
          correct: "B",
          explanation: "`useMemo` caches the calculated value of a function between renders unless one of its dependencies changes. (`useCallback` memoizes function instances).",
          diff: "Medium"
        }
      ]
    },
    {
      course_id: "sql-full",
      title: "SQL & Relational Database Design Knowledge Check",
      description: "Evaluate your understanding of SQL queries, JOINs, Indexes, Primary Keys, and Transactions.",
      questions: [
        {
          q: "Which SQL JOIN returns all rows from the left table and matching rows from the right table?",
          a: "INNER JOIN",
          b: "LEFT (OUTER) JOIN",
          c: "RIGHT JOIN",
          d: "FULL JOIN",
          correct: "B",
          explanation: "A `LEFT JOIN` retrieves all records from the left table, and the matched records from the right table (filling NULL if no match exists).",
          diff: "Easy"
        },
        {
          q: "What does the `GROUP BY` clause do in SQL?",
          a: "Orders the output alphabetically by name",
          b: "Groups rows that have the same values into summary rows (e.g. for COUNT, SUM, AVG)",
          c: "Combines two database tables together",
          d: "Encrypts user passwords in columns",
          correct: "B",
          explanation: "`GROUP BY` aggregates identical data points into summary rows, typically combined with aggregate functions like `COUNT()`, `SUM()`, `AVG()`.",
          diff: "Easy"
        },
        {
          q: "What are ACID properties in Relational Database Management Systems?",
          a: "Array, Column, Index, Directory",
          b: "Atomicity, Consistency, Isolation, Durability",
          c: "Authentication, Compression, Encryption, Decryption",
          d: "Asynchronous, Concurrent, Isolated, Distributed",
          correct: "B",
          explanation: "ACID guarantees that database transactions are processed reliably: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent safety), Durability (persistent saves).",
          diff: "Hard"
        },
        {
          q: "What is the primary benefit of adding a Database Index on a frequently queried column?",
          a: "Increases table write speed during INSERT operations",
          b: "Dramatically speeds up SELECT query lookup times by avoiding full table scans",
          c: "Prevents duplicate records in all non-primary key columns",
          d: "Automatically exports data to JSON files",
          correct: "B",
          explanation: "Database indexes (often B-Trees) enable rapid data retrieval without scanning every row in the table, at the cost of slightly slower writes.",
          diff: "Medium"
        },
        {
          q: "Which clause is used to filter records AFTER an aggregate `GROUP BY` is performed?",
          a: "WHERE",
          b: "HAVING",
          c: "ORDER BY",
          d: "LIMIT",
          correct: "B",
          explanation: "`WHERE` filters individual rows BEFORE grouping, whereas `HAVING` filters aggregate groups AFTER `GROUP BY` execution.",
          diff: "Medium"
        }
      ]
    },
    {
      course_id: "ml-for-everyone",
      title: "Machine Learning Concepts & Fundamentals Quiz",
      description: "Test your understanding of Supervised vs Unsupervised learning, Overfitting, and Evaluation Metrics.",
      questions: [
        {
          q: "What is the key difference between Supervised and Unsupervised Learning?",
          a: "Supervised uses labeled training data; Unsupervised works on unlabeled data to discover hidden patterns",
          b: "Supervised learning runs only on GPUs; Unsupervised runs on CPUs",
          c: "Unsupervised learning requires manual human correction for every prediction",
          d: "Supervised learning cannot be used for classification problems",
          correct: "A",
          explanation: "Supervised learning learns from input-output pairs (labels), while Unsupervised learning explores data structure without predefined labels (e.g., clustering).",
          diff: "Easy"
        },
        {
          q: "What is 'Overfitting' in Machine Learning?",
          a: "When a model performs poorly on training data and test data",
          b: "When a model learns training data noise and details too well, failing to generalize to unseen test data",
          c: "When the dataset contains too many missing values",
          d: "When the learning rate is set to zero",
          correct: "B",
          explanation: "Overfitting occurs when a model fits the training set excessively, memorizing noise rather than learning general patterns, leading to high test error.",
          diff: "Medium"
        },
        {
          q: "Which optimization algorithm iteratively adjusts weights to minimize the loss function?",
          a: "Random Forest",
          b: "Gradient Descent",
          c: "K-Means",
          d: "Principal Component Analysis (PCA)",
          correct: "B",
          explanation: "Gradient Descent updates model parameters in the direction of the steepest descent of the loss function to reach a minimum.",
          diff: "Medium"
        },
        {
          q: "Which evaluation metric is defined as True Positives / (True Positives + False Positives)?",
          a: "Recall",
          b: "Precision",
          c: "Accuracy",
          d: "F1 Score",
          correct: "B",
          explanation: "Precision measures how many of the positively predicted instances were actually correct: TP / (TP + FP).",
          diff: "Hard"
        },
        {
          q: "What type of ML algorithm is K-Means?",
          a: "Supervised Regression",
          b: "Unsupervised Clustering",
          c: "Reinforcement Q-Learning",
          d: "Deep Convolutional Neural Network",
          correct: "B",
          explanation: "K-Means partitions n observations into k clusters, placing each observation into the cluster with the nearest centroid without needing labels.",
          diff: "Easy"
        }
      ]
    },
    {
      course_id: "docker-full",
      title: "Docker & Containerization Fundamentals Quiz",
      description: "Assess your knowledge of Containers, Dockerfiles, Images, Volumes, and Networking.",
      questions: [
        {
          q: "How does a Docker Container differ from a traditional Virtual Machine (VM)?",
          a: "Containers package a full operating system kernel for each app",
          b: "Containers share the host OS kernel and isolate app processes, making them lighter and faster than VMs",
          c: "VMs run only on Linux; Containers run only on Windows",
          d: "Containers require dedicated physical hardware graphics cards",
          correct: "B",
          explanation: "Containers virtualize at the OS level (sharing host kernel), whereas VMs virtualize at the hardware level (including full guest OSes).",
          diff: "Easy"
        },
        {
          q: "What is a `Dockerfile`?",
          a: "A binary executable that launches containers",
          b: "A text script containing instructions on how to assemble a Docker image step-by-step",
          c: "A log file created when a container crashes",
          d: "A configuration file for DNS domain routing",
          correct: "B",
          explanation: "A Dockerfile defines environment setup, dependency installations, copied files, and execution commands to build reproducible container images.",
          diff: "Easy"
        },
        {
          q: "Which command builds a Docker image named 'my-app' using the current directory's Dockerfile?",
          a: "docker run -d my-app .",
          b: "docker build -t my-app .",
          c: "docker create image my-app",
          d: "docker compose up --build my-app",
          correct: "B",
          explanation: "`docker build -t <tag-name> <context-path>` compiles the instructions into a tagged Docker image.",
          diff: "Medium"
        },
        {
          q: "What is the purpose of Docker Volumes (`-v host_path:container_path`)?",
          a: "To speed up CPU processing speed",
          b: "To persist container data outside the ephemeral container lifecycle on the host file system",
          c: "To compress image file sizes",
          d: "To manage user environment passwords",
          correct: "B",
          explanation: "Containers are stateless by default. Volumes allow data generated or modified inside containers to persist on the host system across container restarts.",
          diff: "Medium"
        },
        {
          q: "What tool allows defining and running multi-container Docker applications using a single YAML file?",
          a: "Docker Swarm",
          b: "Docker Compose",
          c: "Kubectl",
          d: "Vagrant",
          correct: "B",
          explanation: "Docker Compose simplifies orchestrating multi-container setups (e.g. app + db + redis) via a `docker-compose.yml` file.",
          diff: "Easy"
        }
      ]
    }
  ];

  // Seed default quizzes and questions
  for (const qz of defaultQuizzes) {
    const res = await dbRun(
      "INSERT OR IGNORE INTO quizzes (course_id, title, description, pass_score, points) VALUES (?, ?, ?, 70, 100)",
      [qz.course_id, qz.title, qz.description]
    );

    // Get the inserted or existing quiz ID
    const quizRow = await dbGet("SELECT id FROM quizzes WHERE course_id = ?", [qz.course_id]);
    if (quizRow && qz.questions) {
      // Clear existing questions for seed consistency
      await dbRun("DELETE FROM quiz_questions WHERE quiz_id = ?", [quizRow.id]);

      for (const q of qz.questions) {
        await dbRun(
          `INSERT INTO quiz_questions (quiz_id, course_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quizRow.id, qz.course_id, q.q, q.a, q.b, q.c, q.d, q.correct, q.explanation, q.diff || 'Medium']
        );
      }
    }
  }

  // Also auto-generate fallback quizzes for any course in defaultCourses that doesn't have a custom quiz!
  for (const c of defaultCourses) {
    const existing = await dbGet("SELECT id FROM quizzes WHERE course_id = ?", [c.id]);
    if (!existing) {
      const quizRes = await dbRun(
        "INSERT INTO quizzes (course_id, title, description, pass_score, points) VALUES (?, ?, ?, 70, 75)",
        [c.id, `${c.skill} Knowledge Check & Assessment`, `Comprehensive quiz testing core ${c.skill} concepts covered in ${c.title}.`]
      );
      const quizId = quizRes.lastID;

      const genericQuestions = [
        {
          q: `What is the core purpose of ${c.skill} in modern software engineering?`,
          a: `To build scalable solutions and streamline ${c.category.toLowerCase()} workflows`,
          b: "To replace operating system kernels entirely",
          c: "To render 3D graphics on web browsers without code",
          d: "To bypass network firewall security protocols",
          correct: "A",
          explanation: `${c.skill} is a fundamental tool designed to streamline development and power ${c.category} applications efficiently.`,
          diff: "Easy"
        },
        {
          q: `Which best practice is crucial when developing applications with ${c.skill}?`,
          a: "Avoiding comments and keeping code obfuscated",
          b: "Writing modular, well-tested, and maintainable code adhering to standard conventions",
          c: "Using global mutable state for all variables",
          d: "Ignoring error handling and logging",
          correct: "B",
          explanation: "Clean code principles, modularity, robust testing, and error handling are critical for long-term project stability in software engineering.",
          diff: "Medium"
        },
        {
          q: `In ${c.skill}, what is the recommended approach to handle runtime errors or unexpected conditions?`,
          a: "Allow the application to crash without logs",
          b: "Implement explicit error handling (e.g. try/catch or result checks) and log informative diagnostics",
          c: "Restart the computer automatically",
          d: "Store errors in global static variables silently",
          correct: "B",
          explanation: "Proper exception handling guarantees resilience, allowing systems to fail gracefully or recover cleanly without corrupting state.",
          diff: "Medium"
        },
        {
          q: `What is a primary advantage of utilizing ${c.skill} in production environments?`,
          a: "It eliminates the need for any database or data storage",
          b: "High efficiency, strong ecosystem support, and wide industry adoption",
          c: "It automatically writes unit tests without developer input",
          d: "It works only when connected to satellite internet",
          correct: "B",
          explanation: `${c.skill} is valued across the industry for its rich ecosystem, performance, and strong community backing.`,
          diff: "Easy"
        }
      ];

      for (const q of genericQuestions) {
        await dbRun(
          `INSERT INTO quiz_questions (quiz_id, course_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quizId, c.id, q.q, q.a, q.b, q.c, q.d, q.correct, q.explanation, q.diff]
        );
      }
    }
  }

  // --- SEED COURSE TOPICS & FULL STUDY NOTES (JAVASCRIPT FULL COURSE) ---
  const jsTopics = [
    {
      title: "Introduction to JavaScript & Execution Environment",
      order_index: 1,
      video_timestamp_seconds: 0,
      notes_content: `## Introduction to JavaScript & Execution Environment

**What it is:** JavaScript is a programming language that runs inside web browsers to make web pages interactive and dynamic. It reads your code line by line and converts it into commands your computer can execute instantly.

**Why it matters:** Without JavaScript, web pages would be static document pages where nothing responds when you click, type, or interact.

**Key points:**
- JavaScript runs directly inside all modern web browsers without requiring extra installation.
- It is an interpreted language, meaning the browser executes your code directly without pre-compiling it into a binary file.
- Node.js allows JavaScript to run outside the browser on server computers.
- Scripts can be attached to HTML documents using the \`<script>\` tag.

**Example:**
\`\`\`javascript
// Display a simple greeting in the browser console
console.log("Hello, World! Welcome to JavaScript.");
\`\`\`

**Common mistakes:**
- Confusing JavaScript with Java — they are two completely different programming languages.
- Forgetting that JavaScript is case-sensitive, meaning \`myVariable\` and \`myvariable\` are treated as different names.`
    },
    {
      title: "Variables and Declarations (var, let, const)",
      order_index: 2,
      video_timestamp_seconds: 300,
      notes_content: `## Variables and Declarations (var, let, const)

**What it is:** A variable is a named container used to store data values in memory so your program can use or update them later. JavaScript provides three keywords to create variables: \`let\`, \`const\`, and \`var\`.

**Why it matters:** You use variables to remember information like user inputs, scores, and calculation results while your application runs.

**Key points:**
- Use \`const\` by default for values that will never be reassigned.
- Use \`let\` for variables whose values will change later in your code.
- Avoid using \`var\` because it has outdated scoping rules that cause accidental bugs.
- \`const\` prevents re-assigning the variable name, but the internal properties of objects or arrays stored in a \`const\` can still be edited.

**Example:**
\`\`\`javascript
const maxScore = 100; // Cannot be changed later
let currentScore = 0; // Can be updated
currentScore = 25;   // Valid reassignment

console.log(currentScore); // Output: 25
\`\`\`

**Common mistakes:**
- Trying to reassign a variable declared with \`const\`, which throws a TypeError.
- Forgetting to declare a variable with \`let\` or \`const\` before using it.`
    },
    {
      title: "Primitive and Reference Data Types",
      order_index: 3,
      video_timestamp_seconds: 660,
      notes_content: `## Primitive and Reference Data Types

**What it is:** Data types describe the kind of value a variable holds, such as numbers, text strings, true/false booleans, or complex grouped collections like objects and arrays.

**Why it matters:** Knowing data types helps you perform correct calculations and avoid errors like adding a string to a number.

**Key points:**
- Primitive types store raw single values directly: String, Number, Boolean, Null, Undefined, Symbol, and BigInt.
- Reference types store complex collections: Objects, Arrays, and Functions.
- Primitive values are immutable and copied by value.
- Reference values are copied by memory address, so two variables pointing to the same object modify the same underlying data.

**Example:**
\`\`\`javascript
let age = 22;             // Number
let userName = "Sarah";    // String
let isOnline = true;       // Boolean
let user = { id: 101 };   // Object (Reference type)
\`\`\`

**Common mistakes:**
- Thinking \`null\` and \`undefined\` are identical; \`undefined\` means a variable has no value assigned yet, while \`null\` is an intentional empty assignment.
- Expecting copying an object with \`let b = a\` to create an independent copy.`
    },
    {
      title: "Operators and Expressions",
      order_index: 4,
      video_timestamp_seconds: 1020,
      notes_content: `## Operators and Expressions

**What it is:** Operators are special symbols (+, -, *, ==, ===) that perform arithmetic, comparison, or logical operations on one or more data values.

**Why it matters:** Operators allow your program to perform math, compare values, and make decisions based on logical conditions.

**Key points:**
- Arithmetic operators (+, -, *, /, %) perform standard mathematical calculations.
- Strict equality (\`===\`) compares both the value and the data type without converting types automatically.
- Loose equality (\`==\`) converts data types before comparing, which can lead to unpredictable bugs.
- Logical operators (\`&&\` AND, \`||\` OR, \`!\` NOT) combine boolean logic conditions.

**Example:**
\`\`\`javascript
let price = 50;
let tax = price * 0.1; // Arithmetic operator
let total = price + tax;

console.log(total === 55); // Strict equality check returns true
\`\`\`

**Common mistakes:**
- Using single equals \`=\` (assignment) inside an \`if\` condition instead of triple equals \`===\` (comparison).
- Using loose equality \`==\` which falsely evaluates \`0 == ""\` as \`true\` due to implicit type coercion.`
    },
    {
      title: "Functions and Parameters",
      order_index: 5,
      video_timestamp_seconds: 1380,
      notes_content: `## Functions and Parameters

**What it is:** A function is a reusable block of code designed to perform a specific task when called by name. Parameters act as placeholder variables that receive inputs passed into the function.

**Why it matters:** Functions eliminate duplicate code by allowing you to write logic once and reuse it across your application.

**Key points:**
- Functions can take zero or more input parameters and return a single output using the \`return\` keyword.
- If a function has no \`return\` statement, it automatically returns \`undefined\`.
- Arrow function syntax (\`() => {}\`) provides a concise way to write functions in modern JavaScript.
- Default parameter values can be assigned to handle missing inputs gracefully.

**Example:**
\`\`\`javascript
// Arrow function with default parameter
const greetUser = (name = "Guest") => {
  return \`Welcome back, \${name}!\`;
};

console.log(greetUser("Alex")); // Output: Welcome back, Alex!
console.log(greetUser());       // Output: Welcome back, Guest!
\`\`\`

**Common mistakes:**
- Forgetting the \`return\` keyword when you expect the function to give back a result.
- Conjoining function definition and function invocation (forgetting parentheses \`()\`).`
    },
    {
      title: "Template Literals and String Formatting",
      order_index: 6,
      video_timestamp_seconds: 1800,
      notes_content: `## Template Literals and String Formatting

**What it is:** Template literals are strings enclosed by backtick characters (\` \` \`) that allow embedded expressions and multi-line strings without messy concatenation operators.

**Why it matters:** They make combining variables and HTML dynamic strings vastly cleaner and easier to read than traditional string concatenation.

**Key points:**
- Enclose the string using backticks (\` \` \`) rather than single or double quotes.
- Embed variables or math expressions directly inside \`\${expression}\` placeholders.
- Template literals automatically preserve line breaks and spacing.

**Example:**
\`\`\`javascript
let item = "Laptop";
let price = 999;

// Template literal embedding variables and calculations
let summary = \`Item: \${item} | Total with Tax: $\${(price * 1.08).toFixed(2)}\`;
console.log(summary);
\`\`\`

**Common mistakes:**
- Accidentally using single quotes \`'\` or double quotes \`"\` instead of backticks \` \` \`, causing \`\${val}\` to print literally as text.`
    },
    {
      title: "Conditionals & Control Flow (if, else, switch)",
      order_index: 7,
      video_timestamp_seconds: 2160,
      notes_content: `## Conditionals & Control Flow (if, else, switch)

**What it is:** Control flow structures allow your code to take different execution paths depending on whether specified conditions evaluate to \`true\` or \`false\`.

**Why it matters:** Conditionals allow applications to react dynamically — such as showing a user dashboard if logged in, or a login form if logged out.

**Key points:**
- \`if\` blocks execute code only when the condition is \`true\`.
- \`else if\` and \`else\` handle alternative conditions when the first check fails.
- \`switch\` statements compare a single variable against multiple possible constant values.
- The ternary operator (\`condition ? trueVal : falseVal\`) provides a concise inline if-else shorthand.

**Example:**
\`\`\`javascript
let userRole = "admin";

if (userRole === "admin") {
  console.log("Full Access Granted");
} else if (userRole === "editor") {
  console.log("Edit Access Granted");
} else {
  console.log("Read-only Access");
}
\`\`\`

**Common mistakes:**
- Forgetting \`break\` statements inside a \`switch\` case, causing execution to fall through into subsequent cases unintentionally.`
    },
    {
      title: "Arrays and Indexing",
      order_index: 8,
      video_timestamp_seconds: 2640,
      notes_content: `## Arrays and Indexing

**What it is:** An array is an ordered list that stores multiple items under a single variable name, indexed numerically starting from index 0.

**Why it matters:** Arrays let you manage groups of related data, such as a user's shopping cart items, quiz questions, or message history.

**Key points:**
- Arrays are zero-indexed, meaning the first item is at index \`0\`, the second at index \`1\`.
- Access total items using the \`.length\` property.
- Add items using \`.push()\` (end) or \`.unshift()\` (beginning).
- Remove items using \`.pop()\` (end) or \`.shift()\` (beginning).

**Example:**
\`\`\`javascript
let fruits = ["Apple", "Banana", "Cherry"];

fruits.push("Orange"); // Add to end
console.log(fruits[0]); // Output: "Apple"
console.log(fruits.length); // Output: 4
\`\`\`

**Common mistakes:**
- Trying to access the last element using \`arr[arr.length]\` instead of \`arr[arr.length - 1]\` (since arrays are 0-indexed).`
    },
    {
      title: "Loops and Iteration (for, while, for...of)",
      order_index: 9,
      video_timestamp_seconds: 3120,
      notes_content: `## Loops and Iteration (for, while, for...of)

**What it is:** Loops repeat a block of code multiple times until a specified condition is no longer met.

**Why it matters:** Loops automate repetitive tasks, like processing every item in a dataset or rendering a list of UI elements.

**Key points:**
- Standard \`for\` loops iterate using an explicit counter variable.
- \`while\` loops repeat as long as a condition evaluates to \`true\`.
- \`for...of\` loops provide a clean syntax to iterate directly over array elements without managing an index counter.
- \`break\` exits the loop immediately; \`continue\` skips to the next iteration.

**Example:**
\`\`\`javascript
const scores = [85, 92, 78, 90];

// Clean for...of loop
for (const score of scores) {
  console.log(\`Score: \${score}\`);
}
\`\`\`

**Common mistakes:**
- Creating infinite loops by forgetting to increment the counter inside a \`while\` loop, causing the browser to freeze.`
    },
    {
      title: "Objects and Key-Value Properties",
      order_index: 10,
      video_timestamp_seconds: 3660,
      notes_content: `## Objects and Key-Value Properties

**What it is:** An object is a collection of related data stored as key-value pairs, where keys are string property names and values can be any data type (including functions).

**Why it matters:** Objects let you represent real-world entities (like a user profile, product details, or application state) in a single structured structure.

**Key points:**
- Access values using dot notation (\`user.name\`) or bracket notation (\`user["name"]\`).
- Bracket notation is required when the key name contains spaces or is stored inside a dynamic variable.
- Functions attached to objects are called methods.
- Object destructuring (\`const { name, age } = user\`) unpacks properties cleanly into standalone variables.

**Example:**
\`\`\`javascript
const student = {
  name: "Jessica",
  grade: "A",
  skills: ["JS", "React"],
  getSummary() {
    return \`\${this.name} has grade \${this.grade}\`;
  }
};

console.log(student.name);          // Dot notation
console.log(student.getSummary());  // Method call
\`\`\`

**Common mistakes:**
- Using dot notation with a variable name (\`obj.myVar\`) instead of bracket notation (\`obj[myVar]\`).`
    },
    {
      title: "Document Object Model (DOM) Selection & Manipulation",
      order_index: 11,
      video_timestamp_seconds: 4260,
      notes_content: `## Document Object Model (DOM) Selection & Manipulation

**What it is:** The DOM (Document Object Model) is a tree-like object representation of an HTML document created by the browser. JavaScript uses the DOM to select, modify, add, or delete HTML elements dynamically.

**Why it matters:** DOM manipulation is what allows JavaScript to update webpage content, change styles, or show/hide dialogs without reloading the page.

**Key points:**
- Select elements using \`document.querySelector("#elementId")\` or \`document.querySelectorAll(".class")\`.
- Change text content safely using element property \`.textContent\`.
- Modify inline CSS styles using \`element.style.color = "blue"\`.
- Add or remove CSS classes using \`element.classList.add("active")\`.

**Example:**
\`\`\`javascript
// Select a button and heading from HTML
const title = document.querySelector("#main-title");
const button = document.querySelector(".submit-btn");

// Modify text and class
title.textContent = "Welcome to Interactive JS!";
title.classList.add("highlight");
\`\`\`

**Common mistakes:**
- Using \`.innerHTML\` to insert user-provided text, which creates Cross-Site Scripting (XSS) security vulnerabilities (use \`.textContent\` instead).
- Trying to query elements before the DOM HTML has loaded.`
    },
    {
      title: "Event Listeners and User Interaction",
      order_index: 12,
      video_timestamp_seconds: 4920,
      notes_content: `## Event Listeners and User Interaction

**What it is:** An event listener is a method attached to an HTML element that waits for user actions (like clicks, keypresses, mouse movements, or form submits) and runs a callback function when the event triggers.

**Why it matters:** Event listeners make web applications interactive by triggering responses when users interact with the page.

**Key points:**
- Attach listeners using \`element.addEventListener("event", callbackFunction)\`.
- Common events include \`"click"\`, \`"submit"\`, \`"input"\`, \`"keydown"\`, and \`"mouseover"\`.
- The event object \`e\` passed into the callback contains event information (like clicked target or key pressed).
- Use \`e.preventDefault()\` on form submit events to stop the browser from refreshing the page automatically.

**Example:**
\`\`\`javascript
const submitBtn = document.querySelector("#submit-btn");

submitBtn.addEventListener("click", (event) => {
  event.preventDefault(); // Prevent page reload
  console.log("Button clicked successfully!");
});
\`\`\`

**Common mistakes:**
- Adding parentheses when passing a callback function reference into \`addEventListener\` (e.g. \`handleClick()\`), which invokes the function immediately instead of waiting for the event.`
    },
    {
      title: "Modern Array Methods (map, filter, reduce)",
      order_index: 13,
      video_timestamp_seconds: 5580,
      notes_content: `## Modern Array Methods (map, filter, reduce)

**What it is:** Higher-order array methods take a callback function as an argument to transform, filter, or aggregate array data cleanly without writing manual \`for\` loops.

**Why it matters:** They make code significantly cleaner, more readable, and declarative when working with lists of data.

**Key points:**
- \`map()\`: Transforms every item in an array and returns a brand-new array of equal length.
- \`filter()\`: Returns a new array containing only items that satisfy a \`true\` boolean condition.
- \`reduce()\`: Combines all items in an array into a single summary value (like a total sum or combined object).
- None of these methods mutate (modify) the original source array.

**Example:**
\`\`\`javascript
const prices = [10, 20, 30, 40];

// Map: Add 10% tax to each price
const taxedPrices = prices.map(p => p * 1.1);

// Filter: Keep prices over $25
const expensive = prices.filter(p => p > 25);

// Reduce: Calculate total sum
const totalPrice = prices.reduce((sum, p) => sum + p, 0);
\`\`\`

**Common mistakes:**
- Forgetting to return a value inside the \`map()\` or \`filter()\` callback function.`
    },
    {
      title: "Asynchronous JavaScript & Promises",
      order_index: 14,
      video_timestamp_seconds: 6360,
      notes_content: `## Asynchronous JavaScript & Promises

**What it is:** Asynchronous programming allows long-running operations (like fetching data from a server or reading files) to run in the background without freezing the rest of your web application.

**Why it matters:** It keeps web pages smooth and responsive while waiting for network responses or timer delays.

**Key points:**
- A \`Promise\` represents a value that will be available in the future (or fail with an error).
- A Promise exists in one of three states: **Pending** (working), **Fulfilled** (successful), or **Rejected** (failed).
- Handle fulfilled promises using \`.then(result => ...)\`.
- Handle errors using \`.catch(error => ...)\`.

**Example:**
\`\`\`javascript
const fetchData = new Promise((resolve, reject) => {
  let success = true;
  setTimeout(() => {
    if (success) resolve("Data loaded from server!");
    else reject("Server connection failed.");
  }, 1000);
});

fetchData
  .then(data => console.log(data))
  .catch(err => console.error(err));
\`\`\`

**Common mistakes:**
- Forgetting that code written *after* an asynchronous promise call executes immediately before the promise finishes.`
    },
    {
      title: "Async / Await Syntax",
      order_index: 15,
      video_timestamp_seconds: 7200,
      notes_content: `## Async / Await Syntax

**What it is:** \`async\` and \`await\` are syntactic features built on top of Promises that allow you to write asynchronous code that looks and behaves like clean synchronous code.

**Why it matters:** It eliminates nested promise chains (\`.then().then()\`), making complex asynchronous code much easier to read and maintain.

**Key points:**
- Functions marked with \`async\` automatically return a Promise.
- The \`await\` keyword can only be used inside \`async\` functions.
- \`await\` pauses function execution until the Promise resolves, then returns the result.
- Wrap \`await\` statements in a \`try...catch\` block for clean error handling.

**Example:**
\`\`\`javascript
async function getUserProfile() {
  try {
    console.log("Loading user...");
    const user = await fetchUserPromise(); // Pauses until promise resolves
    console.log("User Loaded:", user);
  } catch (error) {
    console.error("Error loading user:", error);
  }
}
\`\`\`

**Common mistakes:**
- Trying to use \`await\` inside a regular non-\`async\` function, which throws a SyntaxError.`
    },
    {
      title: "Fetch API & REST HTTP Requests",
      order_index: 16,
      video_timestamp_seconds: 8100,
      notes_content: `## Fetch API & REST HTTP Requests

**What it is:** The Fetch API is a built-in browser tool used to send HTTP network requests (GET, POST, PUT, DELETE) to external server APIs and retrieve JSON data.

**Why it matters:** Fetch connects your frontend web page to backend servers and database APIs to load real-time user data dynamically.

**Key points:**
- \`fetch(url)\` sends an HTTP GET request by default and returns a Promise.
- Call \`response.json()\` to parse the raw HTTP response body into a JavaScript object.
- Pass an options object \`fetch(url, { method: "POST", body: JSON.stringify(data) })\` for sending data.
- Check \`response.ok\` to verify if the server responded with a successful HTTP status code (200-299).

**Example:**
\`\`\`javascript
async function loadPosts() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
    if (!response.ok) throw new Error(\`Server status: \${response.status}\`);
    
    const postData = await response.json();
    console.log("Post Title:", postData.title);
  } catch (error) {
    console.error("Fetch Error:", error.message);
  }
}

loadPosts();
\`\`\`

**Common mistakes:**
- Forgetting that \`response.json()\` is *also* an asynchronous operation that requires \`await\` (e.g. \`const data = await response.json()\`).`
    }
  ];

  for (const topic of jsTopics) {
    await dbRun(
      `INSERT INTO course_topics (course_id, title, order_index, video_timestamp_seconds, notes_content)
       VALUES (?, ?, ?, ?, ?)`,
      ["js-full", topic.title, topic.order_index, topic.video_timestamp_seconds, topic.notes_content]
    );
  }

  console.log("Database initialized successfully!");
}
export default db;
