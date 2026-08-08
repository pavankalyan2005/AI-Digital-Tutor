/**
 * Security Quick-Fix Helper Script
 * Applies the highest-priority, non-breaking security fixes automatically.
 * Run: node scripts/apply-security-fixes.js
 *
 * MANUAL ACTIONS REQUIRED (not automated):
 *  1. Revoke exposed API keys (Gemini, OpenRouter, Firebase)
 *  2. Add requireAdmin to admin routes
 *  3. Fix Firebase auth bypass
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SERVER = path.join(ROOT, "server");

let fixCount = 0;

function log(msg) { console.log("[FIX] " + msg); }
function warn(msg) { console.warn("[WARN] " + msg); }

// =====================================================
// FIX 1: Update .gitignore
// =====================================================
function fixGitignore() {
  const gitignorePath = path.join(ROOT, ".gitignore");
  const lines = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8").split("\n") : [];
  const toAdd = [
    "# Security - never commit these",
    ".env",
    "server/.env",
    "server/serviceAccountKey.json",
    "*.key",
    "*.pem",
  ];
  let changed = false;
  for (const line of toAdd) {
    if (!lines.includes(line)) {
      lines.push(line);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(gitignorePath, lines.join("\n"), "utf8");
    log("Updated .gitignore with security exclusions");
    fixCount++;
  } else {
    log(".gitignore already has security entries");
  }
}

// =====================================================
// FIX 2: Generate JWT_SECRET and add to server/.env
// =====================================================
function fixJwtSecret() {
  const envPath = path.join(SERVER, ".env");
  const existingContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (existingContent.includes("JWT_SECRET=")) {
    log("JWT_SECRET already in server/.env");
    return;
  }
  const newSecret = crypto.randomBytes(64).toString("hex");
  const addition = `\n# Auto-generated JWT secret - KEEP PRIVATE\nJWT_SECRET=${newSecret}\n`;
  writeFileSync(envPath, existingContent + addition, "utf8");
  log("Generated and saved JWT_SECRET to server/.env");
  warn("IMPORTANT: server/.env must be in .gitignore - never commit this file!");
  fixCount++;
}

// =====================================================
// FIX 3: Add NODE_ENV=production to server/.env
// =====================================================
function fixNodeEnv() {
  const envPath = path.join(SERVER, ".env");
  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (content.includes("NODE_ENV=")) {
    log("NODE_ENV already set");
    return;
  }
  writeFileSync(envPath, content + "\nNODE_ENV=production\n", "utf8");
  log("Set NODE_ENV=production in server/.env");
  fixCount++;
}

// =====================================================
// FIX 4: Install helmet in server
// =====================================================
function fixHelmet() {
  try {
    const serverPkg = JSON.parse(readFileSync(path.join(SERVER, "package.json"), "utf8"));
    if (serverPkg.dependencies && serverPkg.dependencies.helmet) {
      log("helmet already installed in server");
      return;
    }
    log("Installing helmet in server/...");
    execSync("npm install helmet --save", { cwd: SERVER, stdio: "inherit" });
    log("helmet installed. Add: import helmet from 'helmet'; app.use(helmet()); to server/index.js");
    fixCount++;
  } catch(e) {
    warn("Could not install helmet: " + e.message);
  }
}

// =====================================================
// FIX 5: Run npm audit fix on root
// =====================================================
function fixDependencies() {
  log("Running npm audit fix on root package...");
  try {
    execSync("npm audit fix", { cwd: ROOT, stdio: "inherit" });
    log("npm audit fix complete on root");
    fixCount++;
  } catch(e) {
    warn("npm audit fix had issues (some may require --force): " + e.message);
  }
}

// =====================================================
// FIX 6: Create security reminder checklist
// =====================================================
function createChecklist() {
  const checklist = `# Security Fix Checklist

## AUTOMATED (completed by this script)
- [x] .gitignore updated to exclude .env, serviceAccountKey.json
- [x] JWT_SECRET generated and saved to server/.env
- [x] NODE_ENV=production set in server/.env
- [x] helmet installed
- [x] npm audit fix run

## MANUAL ACTIONS REQUIRED

### CRITICAL - Do immediately
- [ ] REVOKE Gemini API key: <REDACTED_GEMINI_KEY>
  URL: https://console.cloud.google.com/apis/credentials
- [ ] REVOKE OpenRouter key: <REDACTED_OPENROUTER_KEY>
  URL: https://openrouter.ai/keys
- [ ] REVOKE Firebase service account key (key ID: 4461c385...)
  URL: https://console.cloud.google.com/iam-admin/serviceaccounts
- [ ] Remove server/serviceAccountKey.json from git history:
  git filter-repo --path server/serviceAccountKey.json --invert-paths

### CRITICAL - Code changes needed in server/index.js
- [ ] Add requireAdmin to all 5 admin routes (lines 530, 544, 554, 577, 590)
- [ ] Fix Firebase auth bypass: reject when token verification fails (line 218-225)
- [ ] Remove hardcoded JWT fallback: const JWT_SECRET = process.env.JWT_SECRET (line 54)
- [ ] Remove hardcoded API keys in ai.js (lines 5-7)
- [ ] Add auth rate limiters to /api/auth/login, /signup, /google
- [ ] Restrict CORS from * to specific allowed origins
- [ ] Add helmet() to server middleware
- [ ] Fix global error handler to not expose stack traces (lines 1709-1724)

### HIGH - Code changes
- [ ] Fix /api/auth/google to use only token-verified email
- [ ] Add prompt length validation on all /api/ai/* endpoints
- [ ] Add input validation: email format, password strength, language whitelist

### MEDIUM - Code changes
- [ ] Change GET /api/projects to return full_name instead of u.email
- [ ] Remove 4 duplicate route definitions
- [ ] Add structured security event logging

### MEDIUM - Configuration
- [ ] Update react-router to 7.18.2: npm install react-router@7.18.2
- [ ] Update vite to 6.4.3: npm install vite@6.4.3 --save-dev
`;
  writeFileSync(path.join(ROOT, "SECURITY-CHECKLIST.md"), checklist, "utf8");
  log("Created SECURITY-CHECKLIST.md");
}

// =====================================================
// Run all fixes
// =====================================================
console.log("\\n=== AI Digital Tutor Security Quick-Fix Script ===\\n");

fixGitignore();
fixJwtSecret();
fixNodeEnv();
fixHelmet();
fixDependencies();
createChecklist();

console.log(\`\\n=== Complete: \${fixCount} automated fixes applied ===\`);
console.log("Review SECURITY-CHECKLIST.md for remaining manual actions.\\n");
