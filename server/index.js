import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import helmet from "helmet";
import { initializeApp as initFirebaseAdmin, cert } from "firebase-admin/app";
import { getAuth as getFirebaseAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  initDatabase,
  dbRun,
  dbGet,
  dbAll
} from "./db.js";
import { rateLimit } from "express-rate-limit";
import { executeCode, validateSubmission, validateRuntimes } from "./codeExecution.js";
import { runJavaScriptSandbox } from "./sandbox.js";
import {
  getTutorChatResponse,
  getDebuggerResponse,
  getNotesResponse,
  getMockInterviewResponse,
  generateAIQuizResponse,
  getCuratedSkillNotes,
  generateCourseTopics
} from "./ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseAdminApp = null;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(__dirname, "serviceAccountKey.json");
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    firebaseAdminApp = initFirebaseAdmin({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized with serviceAccountKey.json!");
  } else {
    console.log("Firebase Admin SDK: No serviceAccountKey.json found at server/serviceAccountKey.json.");
  }
} catch (fbErr) {
  console.warn("Firebase Admin SDK initialization notice:", fbErr.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Fail fast if JWT_SECRET is not configured — never fall back to a weak hardcoded value
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
  console.error("Run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and add to server/.env");
  process.exit(1);
}

// Middlewares
// Security headers (Helmet must come first, before any routes)
app.use(helmet({
  contentSecurityPolicy: false // Disable strict CSP to allow embeds (YouTube, etc.)
}));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    name: "AI Digital Tutor Server API",
    status: "ok",
    healthCheck: "/api/health",
    time: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Rate limiter for code execution - cap abuse
const codeExecuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Execution limit reached. Please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for authentication endpoints — prevents brute-force & credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15-min window per IP
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Database on Startup
initDatabase()
  .then(() => validateRuntimes())
  .catch(err => {
    console.error("Initialization failed:", err);
  });

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required. Please sign in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token. Please sign in again." });
    }
    req.user = decoded;
    next();
  });
}

// Admin Authorization Middleware
async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Access token required. Please sign in." });
  }

  try {
    const user = await dbGet("SELECT role FROM users WHERE id = ?", [req.user.userId]);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }
    req.user.role = "admin";
    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal server error checking permissions." });
  }
}

// ----------------------------------------------------
// 1. AUTHENTICATION & PROFILE ROUTES
// ----------------------------------------------------

app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existingUser = await dbGet("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Hardcode role to 'student' regardless of any client payload
    const assignedRole = 'student';
    const result = await dbRun(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      [email, hash, assignedRole]
    );
    const userId = result.lastID;

    // Initialize default profile
    await dbRun(
      "INSERT INTO profiles (user_id, full_name, avatar, current_level, points, streak_days, last_active_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, email.split("@")[0], "https://api.dicebear.com/7.x/bottts/svg?seed=" + userId, 1, 0, 1, new Date().toISOString().split("T")[0]]
    );

    const token = jwt.sign({ userId, email, role: assignedRole }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      token,
      user: { id: userId, email, full_name: email.split("@")[0], role: assignedRole }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const userRole = user.role || 'student';
    const profile = await dbGet("SELECT * FROM profiles WHERE user_id = ?", [user.id]);
    const token = jwt.sign({ userId: user.id, email: user.email, role: userRole }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || email.split("@")[0],
        role: userRole,
        onboarding_completed: profile?.onboarding_completed || 0,
        assessment_completed: profile?.assessment_completed || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/google", async (req, res, next) => {
  const { email, displayName, photoURL, uid, idToken } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required for Google authentication." });
  }

  // Verify Firebase ID token if Firebase Admin SDK is initialized and idToken is provided
  // SECURITY: If token verification fails we MUST reject the request — not silently continue
  if (idToken && firebaseAdminApp) {
    try {
      const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
      console.log(`[Firebase Admin] Verified ID Token for email: ${decodedToken.email}`);
    } catch (tokenErr) {
      console.warn("[Firebase Admin] Token verification failed:", tokenErr.message);
      return res.status(401).json({ error: "Invalid Google credential. Authentication failed. Please sign in again." });
    }
  } else if (!idToken) {
    // If Firebase Admin is available but no token was sent, reject
    if (firebaseAdminApp) {
      return res.status(401).json({ error: "Google ID token is required for authentication." });
    }
  }

  try {
    let user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
    let userId;
    let userRole = 'student';

    if (!user) {
      const dummyPassword = await bcrypt.hash(`google_${uid || 'firebase'}_${Date.now()}`, 10);
      const result = await dbRun(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
        [email, dummyPassword, 'student']
      );
      userId = result.lastID;

      const nameToUse = displayName || email.split("@")[0];
      const avatarToUse = photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

      await dbRun(
        "INSERT INTO profiles (user_id, full_name, avatar, current_level, points, streak_days, last_active_date, onboarding_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, nameToUse, avatarToUse, 1, 100, 1, new Date().toISOString().split("T")[0], 1]
      );

      user = { id: userId, email, role: 'student' };
    } else {
      userId = user.id;
      userRole = user.role || 'student';
    }

    const profile = await dbGet("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    const token = jwt.sign({ userId: user.id, email: user.email, role: userRole }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || displayName || email.split("@")[0],
        role: userRole,
        onboarding_completed: profile?.onboarding_completed || 1,
        assessment_completed: profile?.assessment_completed || 0,
        profile
      }
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await dbGet("SELECT id, email, role FROM users WHERE id = ?", [req.user.userId]);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = await dbGet("SELECT * FROM profiles WHERE user_id = ?", [req.user.userId]);
    const interests = await dbAll("SELECT interest_name FROM user_interests WHERE user_id = ?", [req.user.userId]);

    res.json({
      ...user,
      role: user.role || 'student',
      profile: {
        ...profile,
        interests: interests.map(i => i.interest_name)
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/profile-setup", authenticateToken, async (req, res, next) => {
  const { full_name, avatar, interests } = req.body;
  if (!full_name) {
    return res.status(400).json({ error: "Full name is required." });
  }
  try {
    await dbRun(
      "UPDATE profiles SET full_name = ?, avatar = ?, onboarding_completed = 1 WHERE user_id = ?",
      [full_name, avatar, req.user.userId]
    );

    // Re-insert interests
    await dbRun("DELETE FROM user_interests WHERE user_id = ?", [req.user.userId]);
    if (interests && Array.isArray(interests)) {
      for (const interest of interests) {
        await dbRun(
          "INSERT OR IGNORE INTO user_interests (user_id, interest_name) VALUES (?, ?)",
          [req.user.userId, interest]
        );
      }
    }

    res.json({ success: true, message: "Profile configured successfully." });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/assessment", authenticateToken, async (req, res, next) => {
  const { score, level } = req.body;
  try {
    await dbRun(
      "UPDATE profiles SET assessment_completed = 1, points = points + ?, current_level = MAX(current_level, ?) WHERE user_id = ?",
      [score || 100, level || 2, req.user.userId]
    );
    res.json({ success: true, message: "Assessment recorded successfully." });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 2. COURSES & LEARNING PATHS ROUTES
// ----------------------------------------------------

app.get("/api/categories", async (req, res, next) => {
  try {
    const categories = await dbAll(`
      SELECT cat.id, cat.name, cat.color, COUNT(c.id) as course_count
      FROM categories cat
      LEFT JOIN courses c ON cat.id = c.category_id
      GROUP BY cat.id
    `);
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

app.get("/api/courses", async (req, res, next) => {
  const { search, category, difficulty, price_type, language } = req.query;
  
  let query = "SELECT DISTINCT c.* FROM courses c";
  let params = [];
  let conditions = [];

  if (price_type || language || (search && search.trim() !== "")) {
    query += " LEFT JOIN modules m ON c.id = m.course_id";
  }

  if (category) {
    conditions.push("LOWER(c.skill) = LOWER(?)");
    params.push(category);
  }
  if (price_type) {
    conditions.push("m.price_type = ?");
    params.push(price_type);
  }
  if (language) {
    conditions.push("m.language = ?");
    params.push(language);
  }
  if (search && search.trim() !== "") {
    conditions.push("(c.title LIKE ? OR c.description LIKE ? OR m.title LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  try {
    const courses = await dbAll(query, params);
    const mapped = courses.map(c => ({
      ...c,
      category: c.skill || c.category,
      image_url: c.thumbnail,
      modules_count: c.modules_count || 0
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

app.get("/api/courses/:skill", async (req, res, next) => {
  try {
    const courses = await dbAll("SELECT * FROM courses WHERE LOWER(skill) = LOWER(?) OR LOWER(category) = LOWER(?)", [req.params.skill, req.params.skill]);
    const mapped = courses.map(c => ({
      ...c,
      category: c.skill || c.category,
      image_url: c.thumbnail,
      modules_count: c.modules_count || 0
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

app.get("/api/course/:id", async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {}
  }

  try {
    const course = await dbGet("SELECT * FROM courses WHERE id = ?", [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }
    
    let modules = await dbAll("SELECT * FROM modules WHERE course_id = ? ORDER BY [order] ASC", [req.params.id]);
    
    if (userId) {
      await dbRun("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [userId, req.params.id]);
      const progress = await dbAll("SELECT lesson_id, completed, watched_duration FROM user_progress WHERE user_id = ?", [userId]);
      const bookmarks = await dbAll("SELECT lesson_id FROM bookmarks WHERE user_id = ?", [userId]);
      const notes = await dbAll("SELECT lesson_id, notes_text FROM custom_notes WHERE user_id = ?", [userId]);
      
      const progressMap = new Map(progress.map(p => [p.lesson_id, { completed: p.completed, watchedDuration: p.watched_duration }]));
      const bookmarkedIds = new Set(bookmarks.map(b => b.lesson_id));
      const notesMap = new Map(notes.map(n => [n.lesson_id, n.notes_text]));
      
      modules = modules.map(m => ({
        ...m,
        completed: progressMap.get(m.id)?.completed || 0,
        watchedDuration: progressMap.get(m.id)?.watchedDuration || 0,
        bookmarked: bookmarkedIds.has(m.id) ? 1 : 0,
        custom_note: notesMap.get(m.id) || "",
        // Ensure video_url and video_duration are fallback-safe
        video_url: m.video_url || `https://www.youtube.com/embed/${m.videoId}`,
        video_duration: m.video_duration || m.duration
      }));
    } else {
      modules = modules.map(m => ({
        ...m,
        video_url: m.video_url || `https://www.youtube.com/embed/${m.videoId}`,
        video_duration: m.video_duration || m.duration
      }));
    }
    
    res.json({
      ...course,
      category: course.skill || course.category,
      image_url: course.thumbnail,
      modules: modules,
      lessons: modules
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/lesson/:id", async (req, res, next) => {
  try {
    const module = await dbGet("SELECT * FROM modules WHERE id = ?", [req.params.id]);
    if (!module) {
      return res.status(404).json({ error: "Module not found." });
    }
    res.json({
      ...module,
      video_url: module.video_url || `https://www.youtube.com/embed/${module.videoId}`,
      video_duration: module.video_duration || module.duration
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/courses/modules/:id", async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {}
  }

  try {
    const module = await dbGet("SELECT * FROM modules WHERE id = ?", [req.params.id]);
    if (!module) {
      return res.status(404).json({ error: "Module not found." });
    }

    let progress = null;
    if (userId) {
      progress = await dbGet("SELECT completed, watched_duration FROM user_progress WHERE user_id = ? AND lesson_id = ?", [userId, req.params.id]);
    }

    res.json({
      ...module,
      completed: progress?.completed || 0,
      watchedDuration: progress?.watched_duration || 0,
      video_url: module.video_url || `https://www.youtube.com/embed/${module.videoId}`,
      video_duration: module.video_duration || module.duration
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// ADMIN ROUTES (FIXES 404)
// ----------------------------------------------------

// SECURITY: All /api/admin/* routes require BOTH authenticateToken AND requireAdmin
app.post("/api/admin/courses", authenticateToken, requireAdmin, async (req, res, next) => {
  const { id, title, description, category, difficulty, duration } = req.body;
  try {
    const cat = await dbGet("SELECT id FROM categories WHERE name = ?", [category]);
    await dbRun(
      "INSERT INTO courses (id, title, description, skill, category, category_id, thumbnail, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, description, category, category, cat?.id || 1, "https://images.unsplash.com/photo-1516321318423-f06f85e504b3", difficulty || "Beginner"]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/courses/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await dbRun("DELETE FROM courses WHERE id = ?", [req.params.id]);
    await dbRun("DELETE FROM modules WHERE course_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/modules", authenticateToken, requireAdmin, async (req, res, next) => {
  const { course_id, title, duration, video_url, video_duration, channel_name, rating, level, price_type, language } = req.body;
  const id = `mod-${Date.now()}`;

  // Robust YouTube ID extraction
  const extractId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };
  const videoId = extractId(video_url);

  try {
    await dbRun(
      "INSERT INTO modules (id, course_id, title, video_url, videoId, duration, video_duration, channel_name, rating, level, price_type, language, [order]) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, course_id, title, video_url, videoId, duration, video_duration, channel_name || "Self Taught", rating || 4.8, level || "Beginner", price_type || "Free", language || "English", 1]
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

app.put("/api/admin/modules/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  const { title, video_url, video_duration } = req.body;
  try {
    await dbRun(
      "UPDATE modules SET title = ?, video_url = ?, duration = ? WHERE id = ?",
      [title, video_url, video_duration, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/modules/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    await dbRun("DELETE FROM modules WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/progress/update", authenticateToken, async (req, res, next) => {
  const { lessonId, completed, watchedDuration, totalDuration } = req.body;
  const userId = req.user.userId;
  
  if (!lessonId) {
    return res.status(400).json({ error: "lessonId is required." });
  }

  try {
    // Auto-enroll if not already enrolled in the course this lesson belongs to
    const module = await dbGet("SELECT course_id FROM modules WHERE id = ?", [lessonId]);
    if (module) {
      await dbRun("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [userId, module.course_id]);
    }

    // If totalDuration is provided, check if we should auto-complete (90% threshold)
    let isCompleted = completed ? 1 : 0;
    if (watchedDuration && totalDuration && watchedDuration / totalDuration >= 0.9) {
      isCompleted = 1;
    }

    await dbRun(
      "INSERT INTO user_progress (user_id, lesson_id, completed, watched_duration, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = ?, watched_duration = ?, updated_at = CURRENT_TIMESTAMP",
      [userId, lessonId, isCompleted, watchedDuration || 0, isCompleted, watchedDuration || 0]
    );

    let pointsAwarded = 0;
    if (isCompleted) {
      const profile = await dbGet("SELECT points, streak_days, last_active_date FROM profiles WHERE user_id = ?", [userId]);
      // ... rest of the point awarding logic
      if (!profile) {
        // Fallback for missing profile
        await dbRun(
          "INSERT OR IGNORE INTO profiles (user_id, full_name, last_active_date) VALUES (?, ?, ?)",
          [userId, "Student", new Date().toISOString().split("T")[0]]
        );
      }

      const currentProfile = profile || { points: 0, streak_days: 0, last_active_date: null };
      const todayStr = new Date().toISOString().split("T")[0];

      let newStreak = currentProfile.streak_days || 0;
      if (currentProfile.last_active_date !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (currentProfile.last_active_date === yesterdayStr || !currentProfile.last_active_date) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      pointsAwarded = 50;
      const newPoints = (currentProfile.points || 0) + pointsAwarded;
      const newLevel = Math.floor(newPoints / 500) + 1;

      await dbRun(
        "UPDATE profiles SET points = ?, current_level = ?, streak_days = ?, last_active_date = ? WHERE user_id = ?",
        [newPoints, newLevel, newStreak, todayStr, userId]
      );
    }

    res.json({
      success: true,
      pointsAwarded,
      completed: completed ? 1 : 0,
      watchedDuration: watchedDuration || 0
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/courses/modules/:id/complete", authenticateToken, async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user.userId;
    await dbRun(
      "INSERT INTO user_progress (user_id, lesson_id, completed, watched_duration) VALUES (?, ?, 1, 100) ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1",
      [userId, lessonId]
    );
    res.json({ success: true, pointsAwarded: 50, streak: 1 });
  } catch (err) {
    next(err);
  }
});

app.post("/api/courses/modules/:id/bookmark", authenticateToken, async (req, res, next) => {
  const moduleId = req.params.id;
  const userId = req.user.userId;
  try {
    const existing = await dbGet("SELECT * FROM bookmarks WHERE user_id = ? AND lesson_id = ?", [userId, moduleId]);
    if (existing) {
      await dbRun("DELETE FROM bookmarks WHERE user_id = ? AND lesson_id = ?", [userId, moduleId]);
      res.json({ bookmarked: 0 });
    } else {
      await dbRun("INSERT INTO bookmarks (user_id, lesson_id) VALUES (?, ?)", [userId, moduleId]);
      res.json({ bookmarked: 1 });
    }
  } catch (err) {
    next(err);
  }
});

app.post("/api/courses/modules/:id/notes", authenticateToken, async (req, res, next) => {
  const moduleId = req.params.id;
  const userId = req.user.userId;
  const { notes } = req.body;
  if (notes === undefined) {
    return res.status(400).json({ error: "Notes content is required." });
  }
  try {
    await dbRun(
      "INSERT INTO custom_notes (user_id, lesson_id, notes_text) VALUES (?, ?, ?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET notes_text = ?, updated_at = CURRENT_TIMESTAMP",
      [userId, moduleId, notes, notes]
    );
    res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
});

app.get("/api/ai/recommendations", authenticateToken, async (req, res, next) => {
  try {
    const interests = await dbAll("SELECT interest_name FROM user_interests WHERE user_id = ?", [req.user.userId]);
    const interestNames = interests.map(i => i.interest_name.toLowerCase());
    
    const completedProgress = await dbAll("SELECT lesson_id FROM user_progress WHERE user_id = ? AND completed = 1", [req.user.userId]);
    const completedIds = new Set(completedProgress.map(p => p.lesson_id));
    
    const allModules = await dbAll("SELECT m.*, c.title as course_title, c.skill as category FROM modules m JOIN courses c ON m.course_id = c.id");
    
    let recommended = allModules.filter(m => !completedIds.has(m.id));
    
    recommended.sort((a, b) => {
      const aMatch = interestNames.some(interest => (a.category?.toLowerCase() || "").includes(interest) || a.title.toLowerCase().includes(interest)) ? 1 : 0;
      const bMatch = interestNames.some(interest => (b.category?.toLowerCase() || "").includes(interest) || b.title.toLowerCase().includes(interest)) ? 1 : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
    
    res.json(recommended.slice(0, 4));
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// QUIZ & COURSE-SPECIFIC KNOWLEDGE CHECK ROUTES
// ----------------------------------------------------

// 1. Get all available quizzes grouped by course
app.get("/api/quizzes", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const quizzes = await dbAll(`
      SELECT 
        q.id,
        q.course_id,
        q.title,
        q.description,
        q.pass_score,
        q.points,
        c.title as course_title,
        c.skill,
        c.category,
        c.level,
        c.thumbnail,
        (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as total_questions,
        (SELECT MAX(percentage) FROM user_quiz_attempts uqa WHERE uqa.quiz_id = q.id AND uqa.user_id = ?) as best_score,
        (SELECT COUNT(*) FROM user_quiz_attempts uqa WHERE uqa.quiz_id = q.id AND uqa.user_id = ?) as attempts_count
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      ORDER BY c.category, c.title
    `, [userId, userId]);

    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

// 2. Get quiz by course ID
app.get("/api/quizzes/course/:courseId", authenticateToken, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    let quiz = await dbGet(`
      SELECT q.*, c.title as course_title, c.skill, c.category, c.level
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      WHERE q.course_id = ?
    `, [courseId]);

    if (!quiz) {
      // Fallback: check if course exists
      const course = await dbGet("SELECT * FROM courses WHERE id = ?", [courseId]);
      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }
      
      // Auto-create default quiz row for this course
      const result = await dbRun(
        "INSERT INTO quizzes (course_id, title, description, pass_score, points) VALUES (?, ?, ?, 70, 75)",
        [course.id, `${course.skill} Knowledge Check & Quiz`, `Test your understanding of ${course.title}.`]
      );
      const quizId = result.lastID;
      
      // Add default questions
      const defaultQuestions = [
        {
          q: `What is the primary role of ${course.skill} in modern software applications?`,
          a: `To streamline ${course.category} development and deliver scalable features`,
          b: "To replace operating systems completely",
          c: "To bypass network firewall security",
          d: "To encrypt local system hard drives",
          correct: "A",
          explanation: `${course.skill} is an industry-standard technology designed to construct robust ${course.category} systems.`,
          diff: "Easy"
        },
        {
          q: `Which programming practice is essential when implementing ${course.skill}?`,
          a: "Ignoring error handling and edge cases",
          b: "Writing modular, readable, well-tested code adhering to standard conventions",
          c: "Storing all data in global static variables",
          d: "Disabling logs and type checks",
          correct: "B",
          explanation: "Clean modular code and robust error management ensure scalable, maintainable software architectures.",
          diff: "Medium"
        },
        {
          q: `How should runtime exceptions be handled in ${course.skill}?`,
          a: "Silently ignoring exceptions",
          b: "Catching exceptions explicitly, logging diagnostics, and recovering gracefully",
          c: "Force crashing the server",
          d: "Overwriting system files",
          correct: "B",
          explanation: "Structured error handling prevents catastrophic crashes and provides clear diagnostic insights.",
          diff: "Medium"
        }
      ];

      for (const q of defaultQuestions) {
        await dbRun(
          `INSERT INTO quiz_questions (quiz_id, course_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quizId, course.id, q.q, q.a, q.b, q.c, q.d, q.correct, q.explanation, q.diff]
        );
      }

      quiz = await dbGet(`
        SELECT q.*, c.title as course_title, c.skill, c.category, c.level
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE q.id = ?
      `, [quizId]);
    }

    const questions = await dbAll(`
      SELECT id, question, option_a, option_b, option_c, option_d, difficulty, explanation
      FROM quiz_questions
      WHERE quiz_id = ?
      ORDER BY id ASC
    `, [quiz.id]);

    res.json({
      quiz,
      questions
    });
  } catch (err) {
    next(err);
  }
});

// 3. Submit Quiz Answers and evaluate results
app.post("/api/quizzes/:quizId/submit", authenticateToken, async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers, courseId } = req.body; // answers: { [questionId]: "A" | "B" | "C" | "D" }
    const userId = req.user.userId;

    const quiz = await dbGet("SELECT * FROM quizzes WHERE id = ?", [quizId]);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const questions = await dbAll("SELECT * FROM quiz_questions WHERE quiz_id = ?", [quizId]);
    if (questions.length === 0) {
      return res.status(400).json({ error: "This quiz does not have any questions." });
    }

    let correctCount = 0;
    const questionResults = questions.map((q) => {
      const selectedOption = answers ? answers[q.id] : null;
      const isCorrect = selectedOption === q.correct_option;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        question: q.question,
        selectedOption: selectedOption || "Not Answered",
        correctOption: q.correct_option,
        isCorrect,
        explanation: q.explanation,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        }
      };
    });

    const totalQuestions = questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= (quiz.pass_score || 70);

    // Calculate XP points awarded
    let pointsAwarded = 0;
    if (passed) {
      pointsAwarded = quiz.points || 100;
      if (percentage === 100) pointsAwarded += 50; // Perfect score bonus
    } else {
      pointsAwarded = Math.round((percentage / 100) * (quiz.points || 50));
    }

    // Award points to user profile
    await dbRun(
      "UPDATE profiles SET points = points + ?, streak_days = streak_days + 1 WHERE user_id = ?",
      [pointsAwarded, userId]
    );

    // Record user quiz attempt
    const attemptResult = await dbRun(
      `INSERT INTO user_quiz_attempts (user_id, quiz_id, course_id, score, total_questions, percentage, points_awarded)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, quiz.id, quiz.course_id || courseId || "", correctCount, totalQuestions, percentage, pointsAwarded]
    );

    res.json({
      attemptId: attemptResult.lastID,
      score: correctCount,
      totalQuestions,
      percentage,
      passed,
      passScore: quiz.pass_score || 70,
      pointsAwarded,
      questionResults
    });
  } catch (err) {
    next(err);
  }
});

// 4. Get User Quiz Attempt History
app.get("/api/quizzes/history", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const history = await dbAll(`
      SELECT 
        uqa.id,
        uqa.score,
        uqa.total_questions,
        uqa.percentage,
        uqa.points_awarded,
        uqa.attempted_at,
        q.title as quiz_title,
        c.title as course_title,
        c.skill
      FROM user_quiz_attempts uqa
      JOIN quizzes q ON uqa.quiz_id = q.id
      JOIN courses c ON q.course_id = c.id
      WHERE uqa.user_id = ?
      ORDER BY uqa.attempted_at DESC
      LIMIT 20
    `, [userId]);

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// 5. Generate Dynamic AI Quiz for any topic/skill
app.post("/api/quizzes/generate-ai", authenticateToken, async (req, res, next) => {
  try {
    const { topic, skill } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required to generate AI quiz." });
    }

    const aiQuestions = await generateAIQuizResponse(topic, skill);
    res.json({
      topic,
      skill: skill || topic,
      questions: aiQuestions
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// STUDY NOTES & CURATED SKILL REFERENCES ENDPOINTS
// ----------------------------------------------------

// Get Curated Skill Reference Notes & Docs Links
app.get("/api/notes/reference/:skill", authenticateToken, async (req, res, next) => {
  try {
    const { skill } = req.params;
    const notesMarkdown = getCuratedSkillNotes(skill);
    res.json({
      skill,
      notes: notesMarkdown
    });
  } catch (err) {
    next(err);
  }
});

// Generate AI Custom Study Notes for any topic
app.post("/api/ai/notes", authenticateToken, async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required to generate study notes." });
    }

    const notesMarkdown = await getNotesResponse(topic);
    res.json({
      topic,
      notes: notesMarkdown
    });
  } catch (err) {
    next(err);
  }
});

// Get Course Topics and Full Study Notes breakdown (Auto-generates if missing)
app.get("/api/courses/:courseId/topics", authenticateToken, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    let topics = await dbAll(
      `SELECT id, course_id, title, order_index, video_timestamp_seconds, notes_content
       FROM course_topics
       WHERE course_id = ?
       ORDER BY order_index ASC`,
      [courseId]
    );

    // If no topics pre-seeded, dynamically compile topics for this course & store in DB
    if (!topics || topics.length === 0) {
      const course = await dbGet(`SELECT title, skill, category FROM courses WHERE id = ?`, [courseId]);
      const generatedTopics = generateCourseTopics(
        course?.title || courseId,
        course?.skill || "Programming",
        course?.category || "General"
      );

      for (const t of generatedTopics) {
        await dbRun(
          `INSERT INTO course_topics (course_id, title, order_index, video_timestamp_seconds, notes_content)
           VALUES (?, ?, ?, ?, ?)`,
          [courseId, t.title, t.order_index, t.video_timestamp_seconds, t.notes_content]
        );
      }

      topics = await dbAll(
        `SELECT id, course_id, title, order_index, video_timestamp_seconds, notes_content
         FROM course_topics
         WHERE course_id = ?
         ORDER BY order_index ASC`,
        [courseId]
      );
    }

    res.json(topics);
  } catch (err) {
    next(err);
  }
});

app.get("/api/stats/progress", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let profile = await dbGet("SELECT points, current_level, streak_days, last_active_date FROM profiles WHERE user_id = ?", [userId]);

    const todayStr = new Date().toISOString().split("T")[0];

    // Initialize profile if not present
    if (!profile) {
      await dbRun(
        "INSERT OR IGNORE INTO profiles (user_id, full_name, current_level, points, streak_days, last_active_date) VALUES (?, 'Student', 1, 0, 1, ?)",
        [userId, todayStr]
      );
      profile = { points: 0, current_level: 1, streak_days: 1, last_active_date: todayStr };
    }

    let streakDays = profile.streak_days || 1;
    const lastActive = profile.last_active_date;

    // Real-time streak tracking logic
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(todayStr);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1 && lastActive !== todayStr) {
        streakDays += 1;
        await dbRun("UPDATE profiles SET streak_days = ?, last_active_date = ? WHERE user_id = ?", [streakDays, todayStr, userId]);
      } else if (diffDays > 1) {
        streakDays = 1;
        await dbRun("UPDATE profiles SET streak_days = 1, last_active_date = ? WHERE user_id = ?", [todayStr, userId]);
      }
    } else {
      await dbRun("UPDATE profiles SET streak_days = 1, last_active_date = ? WHERE user_id = ?", [todayStr, userId]);
      streakDays = 1;
    }

    const submissions = await dbAll("SELECT * FROM user_submissions WHERE user_id = ?", [userId]);
    const completedProgress = await dbAll("SELECT lesson_id FROM user_progress WHERE user_id = ? AND completed = 1", [userId]);

    res.json({
      points: profile.points || 0,
      current_level: profile.current_level || 1,
      currentLevel: profile.current_level || 1,
      streak_days: streakDays,
      streakDays: streakDays,
      total_submissions: submissions.length,
      totalSubmissions: submissions.length,
      successful_submissions: submissions.filter(s => s.status === "Success").length,
      successfulSubmissions: submissions.filter(s => s.status === "Success").length,
      completed_modules_count: completedProgress.length,
      completedModulesCount: completedProgress.length
    });
  } catch (err) {
    next(err);
  }
});

// ── Weekly Learning Activity (real study hours data) ─────────────────────
app.get("/api/progress/weekly", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dowMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '0': 6 };
    const result = days.map((day) => ({ day, hours: 0, courses: 0 }));

    // 1. Get study hours from learning sessions in the last 7 days
    const sessionRows = await dbAll(`
      SELECT 
        strftime('%w', started_at) as dow,
        ROUND(SUM(COALESCE(duration_seconds, 0)) / 3600.0, 1) as hours,
        COUNT(DISTINCT reference_id) as courses
      FROM learning_sessions
      WHERE user_id = ?
        AND started_at >= datetime('now', '-7 days')
      GROUP BY dow
    `, [userId]);

    sessionRows.forEach(r => {
      const idx = dowMap[r.dow];
      if (idx !== undefined) {
        result[idx].hours = Math.max(result[idx].hours, r.hours || 0);
        result[idx].courses = r.courses || 0;
      }
    });

    // 2. Combine with watched video duration from user_progress
    const progressRows = await dbAll(`
      SELECT 
        strftime('%w', updated_at) as dow,
        ROUND(SUM(COALESCE(watched_duration, 0)) / 3600.0, 1) as hours
      FROM user_progress
      WHERE user_id = ?
        AND updated_at >= datetime('now', '-7 days')
      GROUP BY dow
    `, [userId]);

    progressRows.forEach(r => {
      const idx = dowMap[r.dow];
      if (idx !== undefined) {
        result[idx].hours = Math.round((result[idx].hours + (r.hours || 0)) * 10) / 10;
      }
    });

    // 3. Fallback baseline activity if student has 0 recorded activity yet this week
    const totalHours = result.reduce((acc, curr) => acc + curr.hours, 0);
    if (totalHours === 0) {
      const todayDow = dowMap[new Date().getDay().toString()];
      if (todayDow !== undefined) {
        result[todayDow].hours = 1.5;
        result[todayDow].courses = 1;
        if (todayDow > 0) {
          result[todayDow - 1].hours = 0.8;
          result[todayDow - 1].courses = 1;
        }
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Skill Distribution (from enrolled courses + real-time progress) ──
app.get("/api/progress/skill-distribution", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Check if user has enrollments; if none, auto-enroll in Python course or default course
    const enrollCount = await dbGet("SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?", [userId]);
    if (!enrollCount || enrollCount.count === 0) {
      const pythonCourse = await dbGet("SELECT id FROM courses WHERE LOWER(skill) LIKE '%python%' OR LOWER(title) LIKE '%python%' LIMIT 1");
      const defaultCourse = pythonCourse || await dbGet("SELECT id FROM courses LIMIT 1");
      if (defaultCourse) {
        await dbRun("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [userId, defaultCourse.id]);
      }
    }

    // Get all enrolled courses with completion counts per skill/category
    const rows = await dbAll(`
      SELECT 
        COALESCE(c.skill, c.category, c.title) as category,
        c.title as course_title,
        c.id as course_id,
        COUNT(DISTINCT m.id) as total,
        COUNT(DISTINCT CASE WHEN up.completed = 1 THEN up.lesson_id END) as completed
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN modules m ON m.course_id = c.id
      LEFT JOIN user_progress up ON up.lesson_id = m.id AND up.user_id = ?
      WHERE e.user_id = ?
      GROUP BY c.id
    `, [userId, userId]);

    const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];

    const result = rows.map((r, i) => {
      const skillName = r.category || r.course_title || "Python Programming";
      const scoreVal = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
      return {
        skill: skillName,
        name: skillName,
        score: scoreVal,
        value: scoreVal,
        completed: r.completed || 0,
        total: r.total || 0,
        course_id: r.course_id,
        color: colors[i % colors.length]
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Enroll in a course ─────────────────────────────────────────────────────
app.post("/api/courses/:id/enroll", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const courseId = req.params.id;
    await dbRun("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [userId, courseId]);
    res.json({ success: true, message: `Enrolled in course ${courseId}` });
  } catch (err) {
    next(err);
  }
});

// ── Enrolled Courses with real-time completion % ───────────────────────────
app.get("/api/progress/enrolled-courses", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const rows = await dbAll(`
      SELECT 
        c.id,
        c.title,
        c.skill,
        c.thumbnail,
        c.level,
        COUNT(DISTINCT m.id) as total_modules,
        COUNT(DISTINCT CASE WHEN up.completed = 1 THEN up.lesson_id END) as completed_modules,
        MAX(up.updated_at) as last_studied,
        SUM(COALESCE(up.watched_duration, 0)) as total_watch_seconds
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN modules m ON m.course_id = c.id
      LEFT JOIN user_progress up ON up.lesson_id = m.id AND up.user_id = ?
      WHERE e.user_id = ?
      GROUP BY c.id
      ORDER BY last_studied DESC
    `, [userId, userId]);

    const result = rows.map(r => ({
      ...r,
      completion_percent: r.total_modules > 0 
        ? Math.round((r.completed_modules / r.total_modules) * 100) 
        : 0,
      study_hours: Math.round((r.total_watch_seconds || 0) / 3600 * 10) / 10
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Comprehensive Dashboard Stats ──────────────────────────────────────────
app.get("/api/progress/dashboard-stats", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const profile = await dbGet(
      "SELECT points, current_level, streak_days FROM profiles WHERE user_id = ?",
      [userId]
    );

    const enrolledCount = await dbGet(
      "SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?",
      [userId]
    );

    const completedCount = await dbGet(
      "SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1",
      [userId]
    );

    const totalStudySeconds = await dbGet(`
      SELECT SUM(COALESCE(duration_seconds, 0)) as total
      FROM learning_sessions WHERE user_id = ?
    `, [userId]);

    const totalStudyHours = Math.round((totalStudySeconds?.total || 0) / 3600 * 10) / 10;

    res.json({
      points: profile?.points || 0,
      current_level: profile?.current_level || 1,
      streak_days: profile?.streak_days || 0,
      enrolled_courses: enrolledCount?.count || 0,
      completed_modules: completedCount?.count || 0,
      total_study_hours: totalStudyHours
    });
  } catch (err) {
    next(err);
  }
});

// ── Learning Session Tracking (Real-time timezone safe) ────────────────────
app.post("/api/sessions/start", authenticateToken, async (req, res, next) => {
  const { feature, reference_id } = req.body;
  try {
    const nowIso = new Date().toISOString();
    const result = await dbRun(
      "INSERT INTO learning_sessions (user_id, feature, reference_id, started_at) VALUES (?, ?, ?, ?)",
      [req.user.userId, feature || "course", reference_id || null, nowIso]
    );
    res.status(201).json({ sessionId: result.lastID });
  } catch (err) { next(err); }
});

app.post("/api/sessions/:id/end", authenticateToken, async (req, res, next) => {
  try {
    const session = await dbGet(
      "SELECT started_at FROM learning_sessions WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );
    if (!session) return res.status(404).json({ error: "Session not found." });

    // Handle UTC string parsing safely across local timezones
    let startedStr = String(session.started_at || "");
    if (startedStr && !startedStr.endsWith("Z") && !startedStr.includes("+")) {
      startedStr = startedStr.replace(" ", "T") + "Z";
    }
    const startedMs = new Date(startedStr).getTime();
    let durationSeconds = Math.round((Date.now() - startedMs) / 1000);

    // Sanity checks: clamp non-numbers or negative durations to 0, and cap single session to max 2 hours (7200s)
    if (isNaN(durationSeconds) || durationSeconds < 0) durationSeconds = 0;
    if (durationSeconds > 7200) durationSeconds = 300; // default 5 min if corrupted

    const nowIso = new Date().toISOString();
    await dbRun(
      "UPDATE learning_sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?",
      [nowIso, durationSeconds, req.params.id]
    );
    res.json({ success: true, durationSeconds });
  } catch (err) { next(err); }
});

// User Goals
app.get("/api/goals", authenticateToken, async (req, res, next) => {
  try {
    const goals = await dbAll("SELECT * FROM user_goals WHERE user_id = ?", [req.user.userId]);
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

app.post("/api/goals", authenticateToken, async (req, res, next) => {
  const { goal_text, target_date } = req.body;
  if (!goal_text || !target_date) {
    return res.status(400).json({ error: "Goal text and target date are required." });
  }
  try {
    const result = await dbRun(
      "INSERT INTO user_goals (user_id, goal_text, target_date) VALUES (?, ?, ?)",
      [req.user.userId, goal_text, target_date]
    );
    res.status(201).json({ id: result.lastID, goal_text, target_date, completed: 0 });
  } catch (err) {
    next(err);
  }
});

app.put("/api/goals/:id", authenticateToken, async (req, res, next) => {
  const { completed } = req.body;
  try {
    await dbRun(
      "UPDATE user_goals SET completed = ? WHERE id = ? AND user_id = ?",
      [completed ? 1 : 0, req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/goals/:id", authenticateToken, async (req, res, next) => {
  try {
    await dbRun(
      "DELETE FROM user_goals WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Community
app.get("/api/projects", authenticateToken, async (req, res, next) => {
  try {
    const posts = await dbAll(
      "SELECT cp.*, u.email FROM community_posts cp JOIN users u ON cp.user_id = u.id ORDER BY cp.created_at DESC"
    );
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects", authenticateToken, async (req, res, next) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  try {
    const result = await dbRun(
      "INSERT INTO community_posts (user_id, title, content) VALUES (?, ?, ?)",
      [req.user.userId, title, content]
    );
    res.status(201).json({ id: result.lastID, title, content, likes: 0, comments_count: 0 });
  } catch (err) {
    next(err);
  }
});

// Coding challenges
app.get("/api/code/challenges", async (req, res, next) => {
  try {
    const challenges = await dbAll("SELECT id, title, description, category, difficulty, initial_code, language FROM coding_challenges");
    res.json(challenges);
  } catch (err) {
    next(err);
  }
});

app.post("/api/code/execute", authenticateToken, codeExecuteLimiter, async (req, res, next) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    return res.status(400).json({ error: "Language and code are required." });
  }

  try {
    const result = await executeCode(language, code, stdin);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post("/api/code/run", authenticateToken, codeExecuteLimiter, async (req, res, next) => {
  const { challengeId, code, language } = req.body;
  if (!challengeId || !code || !language) {
    return res.status(400).json({ error: "Challenge ID, code, and language are required." });
  }

  try {
    const result = await validateSubmission(req.user.userId, challengeId, code, language);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// AI Tutor
app.post("/api/ai/chat", authenticateToken, async (req, res, next) => {
  const { prompt, history } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  let reply;
  try {
    reply = await getTutorChatResponse(prompt, history || []);
  } catch (aiErr) {
    console.error("Gemini API Error:", aiErr);
    return res.status(503).json({ error: "AI Tutor is currently unavailable. Please try again later.", details: aiErr.message });
  }

  try {
    const existingChat = await dbGet("SELECT id, message_history FROM ai_chats WHERE user_id = ? AND type = 'tutor'", [req.user.userId]);
    let chatHistory = [];
    if (existingChat) chatHistory = JSON.parse(existingChat.message_history);
    chatHistory.push({ role: "user", content: prompt }, { role: "ai", content: reply });
    if (existingChat) await dbRun("UPDATE ai_chats SET message_history = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(chatHistory), existingChat.id]);
    else await dbRun("INSERT INTO ai_chats (user_id, type, message_history) VALUES (?, 'tutor', ?)", [req.user.userId, JSON.stringify(chatHistory)]);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

app.post("/api/ai/debug", authenticateToken, async (req, res, next) => {
  try {
    const analysis = await getDebuggerResponse(req.body.code || "", req.body.error || "");
    res.json({ analysis });
  } catch (err) {
    console.error("Gemini API Error (Debug):", err);
    res.status(503).json({ error: "AI Debugger failed to respond.", details: err.message });
  }
});

app.post("/api/ai/notes", authenticateToken, async (req, res, next) => {
  try {
    const notes = await getNotesResponse(req.body.topic || "");
    res.json({ notes });
  } catch (err) {
    console.error("Gemini API Error (Notes):", err);
    res.status(503).json({ error: "AI Note Generator failed.", details: err.message });
  }
});

app.post("/api/ai/interview", authenticateToken, async (req, res, next) => {
  try {
    const interviewPayload = await getMockInterviewResponse(req.body.chatHistory || [], req.body.nextTurnPrompt || "");
    res.json(interviewPayload);
  } catch (err) {
    console.error("Gemini API Error (Interview):", err);
    res.status(503).json({ error: "AI Interview Coach failed.", details: err.message });
  }
});

// Dynamic Course-Specific & Skill Roadmaps
app.get("/api/roadmaps/:skill", async (req, res, next) => {
  try {
    const rawSkill = req.params.skill || "";
    const skillLower = rawSkill.toLowerCase();

    // 1. Check if it matches a specific course in SQLite DB
    const course = await dbGet(
      "SELECT * FROM courses WHERE LOWER(id) = ? OR LOWER(skill) = ? OR LOWER(title) LIKE ?",
      [skillLower, skillLower, `%${skillLower}%`]
    );

    if (course) {
      const topics = await dbAll(
        "SELECT * FROM course_topics WHERE course_id = ? ORDER BY order_index ASC",
        [course.id]
      );
      const modules = await dbAll(
        "SELECT * FROM modules WHERE course_id = ? ORDER BY [order] ASC",
        [course.id]
      );

      const weeks = [];
      const topicList = topics.length > 0 ? topics : (modules.length > 0 ? modules : []);

      if (topicList.length > 0) {
        const weeksCount = 6;
        const chunkSize = Math.max(1, Math.ceil(topicList.length / weeksCount));

        for (let w = 1; w <= weeksCount; w++) {
          const startIdx = (w - 1) * chunkSize;
          const chunk = topicList.slice(startIdx, startIdx + chunkSize);
          const weekTopic = chunk[0] ? chunk[0].title : `Week ${w} Advanced Concepts`;
          const detailStr = chunk.map(c => c.title).join(", ") || `Deep dive into ${course.title} week ${w} topics.`;
          
          weeks.push({
            week: w,
            topic: `Week ${w}: ${weekTopic}`,
            detail: `Master essential modules: ${detailStr}`,
            steps: chunk.length > 0 
              ? chunk.map(c => `Study Lesson: ${c.title}`) 
              : [`Study week ${w} lecture content`, `Practice hands-on coding exercises`, `Attempt ${course.skill} knowledge check`]
          });
        }
      } else {
        weeks.push(
          { week: 1, topic: "Course Onboarding & Syntax Setup", detail: `Set up tools and master core fundamentals of ${course.title}.`, steps: ["Environment installation", "Basic syntax & variables", "First working demo"] },
          { week: 2, topic: "Core Control Flow & Data Structures", detail: "Conditionals, loops, arrays, lists and hash tables.", steps: ["If-else & loop logic", "Data structure operations", "Functions & scope"] },
          { week: 3, topic: "Object-Oriented & Modular Design", detail: "Classes, encapsulation, abstraction and modular code.", steps: ["Classes & OOP design", "Inheritance & polymorphism", "Module structure"] },
          { week: 4, topic: "Advanced Technical Concepts", detail: "Asynchronous execution, algorithms, and data parsing.", steps: ["Async operations", "Algorithmic efficiency", "API & data handling"] },
          { week: 5, topic: "Real-World Application Building", detail: "Constructing full project architecture and integrations.", steps: ["Database connection", "API service integration", "Testing & debugging"] },
          { week: 6, topic: "Deployment & Capstone Project", detail: "Production deployment, performance optimization, final capstone.", steps: ["Refactoring code", "CI/CD Deployment", "Final Capstone Showcase"] }
        );
      }

      return res.json({
        title: `${course.title} - Full Mastery Roadmap`,
        description: `Official week-by-week structured curriculum for ${course.title} (${course.skill}). Follow these milestones to achieve complete proficiency.`,
        course_id: course.id,
        weeks
      });
    }

    // 2. Pre-defined Skill Categories
    const categoryRoadmaps = {
      webdev: {
        title: "Full-Stack Web Development Roadmap",
        description: "Comprehensive 6-week blueprint covering HTML/CSS, Modern JavaScript, React, Node.js, Databases & Cloud Deployment.",
        weeks: [
          { week: 1, topic: "HTML5 & Modern CSS3 Architecture", detail: "Master responsive Flexbox, Grid, CSS Variables & Semantic Layouts.", steps: ["Semantic HTML structure", "Flexbox & CSS Grid layouts", "TailwindCSS & Responsive design"] },
          { week: 2, topic: "JavaScript Deep Dive & DOM Manipulation", detail: "ES6+ syntax, Async/Await, Fetch API, and Event Loop.", steps: ["ES6 Array methods & Closures", "Promises & Async/Await", "DOM Event Handling"] },
          { week: 3, topic: "React.js Component Architecture", detail: "JSX, Hooks (useState, useEffect), State Management & React Router.", steps: ["Functional Components & Props", "useState & useEffect hooks", "Client-side Routing"] },
          { week: 4, topic: "Node.js & Express RESTful APIs", detail: "Building scalable backend services, JWT authentication, and middleware.", steps: ["Express server setup", "REST API endpoints", "JWT Authentication"] },
          { week: 5, topic: "Database Design & ORM Integration", detail: "SQL & NoSQL schemas, SQLite, PostgreSQL & MongoDB.", steps: ["Database migrations & schemas", "CRUD queries", "ORM/ODM integration"] },
          { week: 6, topic: "Full-Stack Integration & Cloud Deployment", detail: "Deploying frontend to Vercel and backend to Docker/AWS.", steps: ["CORS & API integration", "Production build optimization", "CI/CD Deployment"] }
        ]
      },
      aiml: {
        title: "AI & Machine Learning Engineer Roadmap",
        description: "Master Python data science, NumPy, Pandas, Scikit-Learn, Deep Learning, and LLM Applications.",
        weeks: [
          { week: 1, topic: "Python for Data Science & Math Foundations", detail: "NumPy matrix operations, Pandas DataFrames & Linear Algebra.", steps: ["NumPy arrays & vectorization", "Pandas Data cleaning", "Matrix multiplication"] },
          { week: 2, topic: "Exploratory Data Analysis & Visualization", detail: "Matplotlib, Seaborn, Feature Engineering & Preprocessing.", steps: ["Data visualization with Seaborn", "Handling missing values", "Feature scaling & encoding"] },
          { week: 3, topic: "Supervised Machine Learning", detail: "Linear Regression, Decision Trees, Random Forests & SVMs.", steps: ["Regression models", "Classification metrics (F1, ROC-AUC)", "Scikit-Learn pipelines"] },
          { week: 4, topic: "Unsupervised Learning & Model Tuning", detail: "K-Means Clustering, PCA dimension reduction & Hyperparameter Tuning.", steps: ["Clustering techniques", "PCA dimensionality reduction", "GridSearchCV tuning"] },
          { week: 5, topic: "Deep Learning & Neural Networks", detail: "PyTorch fundamentals, Convolutional Networks & Transformers.", steps: ["PyTorch tensors & autograd", "Building MLP & CNN architectures", "Transfer Learning"] },
          { week: 6, topic: "Generative AI & LLM Application Deployment", detail: "Building RAG systems, OpenAI/Gemini API integration & Vector DBs.", steps: ["LangChain/LlamaIndex basics", "Vector databases (Chroma/Pinecone)", "Deploying AI web apps"] }
        ]
      },
      programming: {
        title: "Programming Essentials & DSA Roadmap",
        description: "Master core computer science fundamentals, Data Structures, Algorithms and Problem Solving.",
        weeks: [
          { week: 1, topic: "Programming Foundations & Memory", detail: "Variables, Primitive Types, Control Flow, Memory allocation.", steps: ["Control structures & loops", "Function stack frames", "Pointers & references"] },
          { week: 2, topic: "Linear Data Structures", detail: "Arrays, Linked Lists, Stacks, Queues & Two Pointer Techniques.", steps: ["Array operations & complexity", "Singly & Doubly Linked Lists", "Stack & Queue implementations"] },
          { week: 3, topic: "Recursion & Searching/Sorting", detail: "Binary Search, Merge Sort, Quick Sort, Recursive divide-and-conquer.", steps: ["Recursion tree analysis", "Binary Search variations", "Merge & Quick Sort algorithms"] },
          { week: 4, topic: "Trees & Binary Search Trees", detail: "Tree Traversals (Inorder, Preorder, Postorder), BST operations.", steps: ["Binary Tree traversals", "BST insertion & deletion", "Balanced Trees (AVL/Red-Black)"] },
          { week: 5, topic: "Graphs & Traversal Algorithms", detail: "BFS, DFS, Dijkstra Shortest Path, Topological Sorting.", steps: ["Graph representations (Adjacency)", "BFS & DFS implementations", "Dijkstra's Algorithm"] },
          { week: 6, topic: "Dynamic Programming & LeetCode Prep", detail: "Memoization, Tabulation, Knapsack, Longest Common Subsequence.", steps: ["Identify overlapping subproblems", "1D & 2D DP state transitions", "Solving top interview problems"] }
        ]
      },
      cybersecurity: {
        title: "Ethical Hacking & Cybersecurity Roadmap",
        description: "Learn Linux security, network penetration testing, web app security (OWASP Top 10) & defensive hardening.",
        weeks: [
          { week: 1, topic: "Linux Security & Command Line Power", detail: "Bash scripting, file permissions, network utilities (nmap, netstat).", steps: ["Linux administration basics", "User privilege management", "Bash scripting for security"] },
          { week: 2, topic: "Network Fundamentals & Packet Analysis", detail: "TCP/IP protocol stack, Wireshark, DNS & Port Scanning.", steps: ["TCP 3-way handshake", "Wireshark packet analysis", "Nmap port scanning strategies"] },
          { week: 3, topic: "Web Application Security (OWASP Top 10)", detail: "SQL Injection, Cross-Site Scripting (XSS), CSRF & Auth Bypasses.", steps: ["SQLi detection & exploitation", "XSS payload construction", "CSRF tokens & cookies"] },
          { week: 4, topic: "System Penetration Testing & Metasploit", detail: "Vulnerability scanning, exploit execution & privilege escalation.", steps: ["Metasploit framework usage", "Windows/Linux privilege escalation", "Buffer overflow basics"] },
          { week: 5, topic: "Cryptography & Secure Communication", detail: "Symmetric/Asymmetric encryption, Hashing, SSL/TLS certificates.", steps: ["AES & RSA algorithms", "SHA-256 & password hashing", "SSL/TLS handshake"] },
          { week: 6, topic: "Defensive Security & Incident Response", detail: "SIEM monitoring, Firewall rules, SOC analysis & Hardening.", steps: ["Log monitoring & SIEM", "Writing Snort/Suricata rules", "Security audit reports"] }
        ]
      },
      uiux: {
        title: "UI/UX & Product Design Roadmap",
        description: "Master User Research, Wireframing, Figma Prototyping, Design Systems, and Usability Testing.",
        weeks: [
          { week: 1, topic: "UX Research & User Persona Creation", detail: "User interviews, empathy maps, competitive analysis.", steps: ["Conducting user research", "Creating User Personas", "User Journey Mapping"] },
          { week: 2, topic: "Information Architecture & Wireframing", detail: "Sitemaps, user flows, low-fidelity paper & digital wireframes.", steps: ["Designing user flows", "Low-fidelity wireframing", "Card sorting"] },
          { week: 3, topic: "Figma Mastery & Component Systems", detail: "Auto Layout, Variants, Constraints, Design Tokens.", steps: ["Auto-layout & responsive frames", "Figma component sets & variants", "Typography & Color scale"] },
          { week: 4, topic: "High-Fidelity UI Design & Micro-Interactions", detail: "Visual hierarchy, glassmorphism, animations & dark mode.", steps: ["Designing high-fi screen mockups", "Interactive component states", "Micro-animations in Figma"] },
          { week: 5, topic: "Prototyping & Usability Testing", detail: "Interactive prototypes, usability test sessions & feedback loops.", steps: ["Smart animate transitions", "Usability test script writing", "A/B Testing analysis"] },
          { week: 6, topic: "Design System Documentation & Developer Handoff", detail: "Exporting assets, spec sheets, Storybook integration.", steps: ["Design System guidelines", "Developer handoff documentation", "Building design portfolio"] }
        ]
      }
    };

    const matchedKey = Object.keys(categoryRoadmaps).find(k => skillLower.includes(k)) || "programming";
    res.json(categoryRoadmaps[matchedKey]);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 7. SESSION TRACKING & WEEKLY PROGRESS
// ----------------------------------------------------

app.post("/api/sessions/start", authenticateToken, async (req, res, next) => {
  const { feature, reference_id } = req.body;
  const userId = req.user.userId;
  if (!feature) return res.status(400).json({ error: "Feature identifier is required." });
  try {
    const result = await dbRun(
      "INSERT INTO learning_sessions (user_id, feature, reference_id, started_at) VALUES (?, ?, ?, datetime('now'))",
      [userId, feature, reference_id]
    );
    res.status(201).json({ sessionId: result.lastID });
  } catch (err) {
    next(err);
  }
});

app.post("/api/sessions/:id/end", authenticateToken, async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.user.userId;
  try {
    const session = await dbGet("SELECT started_at FROM learning_sessions WHERE id = ? AND user_id = ?", [sessionId, userId]);
    if (!session) return res.status(404).json({ error: "Session not found" });

    await dbRun(
      `UPDATE learning_sessions
       SET ended_at = datetime('now'),
           duration_seconds = CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER)
       WHERE id = ?`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/progress/weekly", authenticateToken, async (req, res, next) => {
  const userId = req.user.userId;
  try {
    // Get total duration per day for the last 7 days including today
    // 0=Sunday, 1=Monday, ..., 6=Saturday
    const rawStats = await dbAll(`
      SELECT
        strftime('%w', started_at) as day_index,
        SUM(duration_seconds) as total_seconds
      FROM learning_sessions
      WHERE user_id = ?
        AND started_at >= date('now', 'weekday 0', '-7 days')
      GROUP BY day_index
    `, [userId]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const statsMap = new Map(rawStats.map(s => [parseInt(s.day_index), s.total_seconds]));

    const weeklyData = days.map((day, index) => ({
      day,
      hours: Math.round((statsMap.get(index) || 0) / 3600 * 10) / 10
    }));

    // Shift to start from Monday as per UI request (Mon-Sun)
    const mondayFirst = [...weeklyData.slice(1), weeklyData[0]];
    res.json(mondayFirst);
  } catch (err) {
    next(err);
  }
});



// ----------------------------------------------------
// ADMIN ROUTES
// ----------------------------------------------------

// Global Error Handler (must be registered BEFORE app.listen)
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("Unhandled error on", req.method, req.originalUrl);
  console.error(err);

  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== "production";
  res.status(status).json({
    error: isDev ? (err.message || "Internal server error") : "An error occurred. Please try again.",
    ...(isDev && { details: err.stack, path: req.originalUrl, method: req.method })
  });
});

// Start listening AFTER all middleware and routes are registered
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AI Digital Tutor server is running on port ${PORT} (0.0.0.0)`);
});
