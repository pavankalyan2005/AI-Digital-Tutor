/**
 * Security Report Excel Generator
 * Generates findings.xlsx and endpoint-inventory.xlsx
 * Run: node scripts/generate-security-excel.js
 */

// Uses only built-in Node.js - generates a CSV that Excel can open
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "../Vulnerability Test Results");

// === SECURITY FINDINGS ===
const findings = [
  { id: "F-001", severity: "CRITICAL", type: "Hardcoded Credentials", file: "server/ai.js", line: "5-7", endpoint: "All /api/ai/*", description: "Live Gemini and OpenRouter API keys hardcoded as fallback values in source code", impact: "Financial loss, AI API abuse, unauthorized access", fix: "Remove hardcoded fallbacks. Rotate keys. Use secrets manager." },
  { id: "F-002", severity: "CRITICAL", type: "Weak JWT Secret", file: "server/index.js", line: "54", endpoint: "All authenticated endpoints", description: "JWT_SECRET falls back to weak predictable hardcoded string not set in .env", impact: "Token forgery, admin privilege escalation, account takeover", fix: "Generate 64-byte random secret. Remove || fallback. Exit on missing." },
  { id: "F-003", severity: "CRITICAL", type: "Broken Access Control", file: "server/index.js", line: "530-597", endpoint: "POST/DELETE /api/admin/courses, POST/PUT/DELETE /api/admin/modules", description: "requireAdmin middleware exists but not applied to any admin route", impact: "Any authenticated user can perform admin operations", fix: "Add requireAdmin middleware to all 5 admin routes" },
  { id: "F-004", severity: "CRITICAL", type: "Remote Code Execution", file: "server/sandbox.js", line: "60", endpoint: "Internal (code challenges)", description: "User JavaScript directly injected via string interpolation and executed with child_process.exec() on host", impact: "Full server RCE, credential theft, data destruction", fix: "Replace with external Judge0/Piston APIs. Never exec user code on host." },
  { id: "F-016", severity: "CRITICAL", type: "Exposed Private Key", file: "server/serviceAccountKey.json", line: "1-14", endpoint: "Firebase Admin", description: "Firebase service account RSA private key committed to repository", impact: "Complete Firebase project takeover, token forgery for any user", fix: "Revoke key immediately. Remove from git history. Add to .gitignore." },
  { id: "F-005", severity: "HIGH", type: "Wildcard CORS", file: "server/index.js", line: "57", endpoint: "All endpoints", description: "cors({ origin: '*' }) allows any website to make cross-origin API requests", impact: "Cross-site data exfiltration, CSRF-like attacks", fix: "Whitelist specific allowed origins only" },
  { id: "F-006", severity: "HIGH", type: "Missing Rate Limiting", file: "server/index.js", line: "135-272", endpoint: "POST /api/auth/login, /signup, /google", description: "No rate limiting on authentication endpoints allows brute-force attacks", impact: "Password brute-forcing, account takeover, DoS", fix: "Apply 10-attempt/15-min rate limiter to all auth routes" },
  { id: "F-007", severity: "HIGH", type: "Auth Bypass", file: "server/index.js", line: "218-225", endpoint: "POST /api/auth/google", description: "Firebase token verification failure silently ignored - auth proceeds anyway", impact: "Account takeover via email spoofing without any credentials", fix: "Reject request when token verification fails. Use only decoded email." },
  { id: "F-008", severity: "HIGH", type: "Information Disclosure", file: "server/index.js", line: "1709-1724", endpoint: "All (global error handler)", description: "NODE_ENV not set so stack traces, paths, methods exposed to clients", impact: "Internal architecture revealed, aids exploit development", fix: "Set NODE_ENV=production. Never expose stack/path in error responses." },
  { id: "F-009", severity: "HIGH", type: "Prompt Injection", file: "server/index.js", line: "1411-1464", endpoint: "POST /api/ai/chat, /debug, /notes, /interview", description: "Raw user input passed to AI APIs without sanitization or length limits", impact: "AI jailbreaking, unbounded API cost, data leakage", fix: "Cap prompts at 2000 chars. Limit history. Add system guardrails." },
  { id: "F-010", severity: "MEDIUM", type: "Missing Input Validation", file: "server/index.js", line: "Multiple", endpoint: "/api/auth/signup, /api/auth/profile-setup, /api/code/execute", description: "No email format check, no password complexity, no language whitelist", impact: "Invalid data stored, weak passwords accepted, unexpected behavior", fix: "Validate email regex, password length, language whitelist" },
  { id: "F-011", severity: "MEDIUM", type: "Missing Security Headers", file: "server/index.js", line: "All", endpoint: "All endpoints", description: "No helmet or security headers configured (X-Frame-Options, HSTS, CSP etc)", impact: "Clickjacking, MIME sniffing, no HTTPS enforcement", fix: "npm install helmet && app.use(helmet())" },
  { id: "F-012", severity: "MEDIUM", type: "PII Exposure", file: "server/index.js", line: "1347-1349", endpoint: "GET /api/projects", description: "Community posts API returns all users' email addresses", impact: "Mass PII harvest by any authenticated user, GDPR violation", fix: "Return only full_name from profiles table, not email" },
  { id: "F-013", severity: "MEDIUM", type: "IDOR Risk", file: "server/index.js", line: "1264-1291", endpoint: "POST /api/sessions/:id/end", description: "Duplicate route implementations with inconsistent ownership validation", impact: "Session data manipulation across users", fix: "Remove duplicate routes, use single authoritative implementation" },
  { id: "F-014", severity: "MEDIUM", type: "Duplicate Routes", file: "server/index.js", line: "Multiple", endpoint: "sessions/start, sessions/:id/end, progress/weekly, progress/skill-distribution", description: "4 route groups defined twice - Express uses first, second is dead code", impact: "Security regression risk during refactoring", fix: "Remove all duplicate route definitions" },
  { id: "F-015", severity: "MEDIUM", type: "Insufficient Logging", file: "server/index.js", line: "Auth routes", endpoint: "/api/auth/login, /signup", description: "No structured security event logging for failed logins, admin operations", impact: "Cannot detect attacks in progress, no forensics after breach", fix: "Add JSON security event logs with IP, timestamp, event type" },
  { id: "F-017", severity: "CRITICAL", type: "Vulnerable Dependencies", file: "package.json", line: "N/A", endpoint: "Various", description: "tar (CRITICAL DoS), react-router (RCE CVSS 8.1), vite (File Read), postcss (Path Traversal)", impact: "DoS, potential RCE via frontend, arbitrary file disclosure", fix: "npm audit fix. Update react-router@latest, vite@6.4.3" },
  { id: "F-018", severity: "LOW", type: "Insecure Network Binding", file: "server/index.js", line: "1705", endpoint: "All", description: "Server binds to 0.0.0.0 - exposed on all network interfaces", impact: "Wider attack surface than necessary", fix: "Bind to 127.0.0.1 behind reverse proxy" },
  { id: "F-019", severity: "LOW", type: "Weak Password Hashing", file: "server/index.js", line: "147-148", endpoint: "POST /api/auth/signup", description: "bcrypt cost factor 10 (minimum). No server-side pepper.", impact: "Offline brute-force feasible if DB leaked", fix: "Increase to cost factor 12-14. Apply server-side pepper." },
  { id: "F-020", severity: "LOW", type: "CSRF", file: "server/index.js", line: "All", endpoint: "All POST/PUT/DELETE", description: "No CSRF protection. Wildcard CORS increases risk.", impact: "Low risk with JWT but escalates if tokens moved to cookies", fix: "Keep tokens in Authorization headers. SameSite=Strict if cookies used." },
];

// === ENDPOINT INVENTORY ===
const endpoints = [
  { endpoint: "/", method: "GET", auth: "No", roles: "Public", file: "server/index.js:66", notes: "Server info" },
  { endpoint: "/api/health", method: "GET", auth: "No", roles: "Public", file: "server/index.js:75", notes: "Health check" },
  { endpoint: "/api/auth/signup", method: "POST", auth: "No", roles: "Public", file: "server/index.js:135", notes: "WARN: No rate limit" },
  { endpoint: "/api/auth/login", method: "POST", auth: "No", roles: "Public", file: "server/index.js:174", notes: "WARN: No rate limit" },
  { endpoint: "/api/auth/google", method: "POST", auth: "No", roles: "Public", file: "server/index.js:211", notes: "CRITICAL: Auth bypass risk" },
  { endpoint: "/api/auth/me", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:274", notes: "" },
  { endpoint: "/api/auth/profile-setup", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:297", notes: "Avatar not validated" },
  { endpoint: "/api/auth/assessment", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:325", notes: "" },
  { endpoint: "/api/categories", method: "GET", auth: "No", roles: "Public", file: "server/index.js:342", notes: "" },
  { endpoint: "/api/courses", method: "GET", auth: "No", roles: "Public", file: "server/index.js:356", notes: "" },
  { endpoint: "/api/courses/:skill", method: "GET", auth: "No", roles: "Public", file: "server/index.js:403", notes: "" },
  { endpoint: "/api/course/:id", method: "GET", auth: "Optional", roles: "Any", file: "server/index.js:418", notes: "" },
  { endpoint: "/api/lesson/:id", method: "GET", auth: "No", roles: "Public", file: "server/index.js:476", notes: "" },
  { endpoint: "/api/courses/modules/:id", method: "GET", auth: "Optional", roles: "Any", file: "server/index.js:492", notes: "" },
  { endpoint: "/api/admin/courses", method: "POST", auth: "Yes", roles: "CRITICAL: ANY (should be Admin)", file: "server/index.js:530", notes: "Missing requireAdmin!" },
  { endpoint: "/api/admin/courses/:id", method: "DELETE", auth: "Yes", roles: "CRITICAL: ANY (should be Admin)", file: "server/index.js:544", notes: "Missing requireAdmin!" },
  { endpoint: "/api/admin/modules", method: "POST", auth: "Yes", roles: "CRITICAL: ANY (should be Admin)", file: "server/index.js:554", notes: "Missing requireAdmin!" },
  { endpoint: "/api/admin/modules/:id", method: "PUT", auth: "Yes", roles: "CRITICAL: ANY (should be Admin)", file: "server/index.js:577", notes: "Missing requireAdmin!" },
  { endpoint: "/api/admin/modules/:id", method: "DELETE", auth: "Yes", roles: "CRITICAL: ANY (should be Admin)", file: "server/index.js:590", notes: "Missing requireAdmin!" },
  { endpoint: "/api/progress/update", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:599", notes: "" },
  { endpoint: "/api/courses/modules/:id/complete", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:674", notes: "" },
  { endpoint: "/api/courses/modules/:id/bookmark", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:688", notes: "" },
  { endpoint: "/api/courses/modules/:id/notes", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:705", notes: "" },
  { endpoint: "/api/ai/recommendations", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:723", notes: "" },
  { endpoint: "/api/quizzes", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:756", notes: "" },
  { endpoint: "/api/quizzes/course/:courseId", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:787", notes: "" },
  { endpoint: "/api/quizzes/:quizId/submit", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:878", notes: "" },
  { endpoint: "/api/quizzes/history", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:958", notes: "" },
  { endpoint: "/api/quizzes/generate-ai", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:987", notes: "AI generation - no guardrails" },
  { endpoint: "/api/notes/reference/:skill", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1010", notes: "" },
  { endpoint: "/api/ai/notes", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1024", notes: "No prompt validation" },
  { endpoint: "/api/courses/:courseId/topics", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1042", notes: "" },
  { endpoint: "/api/stats/progress", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1085", notes: "" },
  { endpoint: "/api/progress/weekly", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1105", notes: "DUPLICATE ROUTE" },
  { endpoint: "/api/progress/skill-distribution", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1140", notes: "DUPLICATE ROUTE" },
  { endpoint: "/api/progress/enrolled-courses", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1173", notes: "" },
  { endpoint: "/api/progress/dashboard-stats", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1212", notes: "" },
  { endpoint: "/api/sessions/start", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1252", notes: "DUPLICATE ROUTE" },
  { endpoint: "/api/sessions/:id/end", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1264", notes: "DUPLICATE ROUTE - IDOR risk" },
  { endpoint: "/api/goals", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1294", notes: "" },
  { endpoint: "/api/goals", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1303", notes: "" },
  { endpoint: "/api/goals/:id", method: "PUT", auth: "Yes", roles: "Any", file: "server/index.js:1319", notes: "" },
  { endpoint: "/api/goals/:id", method: "DELETE", auth: "Yes", roles: "Any", file: "server/index.js:1332", notes: "" },
  { endpoint: "/api/projects", method: "GET", auth: "Yes", roles: "Any", file: "server/index.js:1344", notes: "LEAKS all user emails" },
  { endpoint: "/api/projects", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1356", notes: "" },
  { endpoint: "/api/code/challenges", method: "GET", auth: "No", roles: "Public", file: "server/index.js:1373", notes: "" },
  { endpoint: "/api/code/execute", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1382", notes: "Rate limited (10/min)" },
  { endpoint: "/api/code/run", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1396", notes: "Rate limited (10/min)" },
  { endpoint: "/api/ai/chat", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1411", notes: "No prompt validation" },
  { endpoint: "/api/ai/debug", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1436", notes: "No input validation" },
  { endpoint: "/api/ai/interview", method: "POST", auth: "Yes", roles: "Any", file: "server/index.js:1456", notes: "" },
  { endpoint: "/api/roadmaps/:skill", method: "GET", auth: "No", roles: "Public", file: "server/index.js:1467", notes: "" },
];

// === DEPENDENCY VULNERABILITIES ===
const deps = [
  { package: "tar", installedVersion: "<=7.5.20", severity: "CRITICAL", advisory: "GHSA-23hp-3jrh-7fpw", title: "Decompression/parse DoS via unlimited input", cvss: "7.5", cwe: "CWE-770", fixVersion: ">=7.5.21" },
  { package: "react-router", installedVersion: "7.13.0", severity: "HIGH", advisory: "GHSA-49rj-9fvp-4h2h", title: "Arbitrary constructor invocation via TYPE_ERROR deserialization (Unauth RCE)", cvss: "8.1", cwe: "CWE-502", fixVersion: "7.18.2" },
  { package: "react-router", installedVersion: "7.13.0", severity: "HIGH", advisory: "GHSA-rxv8-25v2-qmq8", title: "DoS via reflected user input in single-fetch", cvss: "7.5", cwe: "CWE-770", fixVersion: "7.14.0" },
  { package: "react-router", installedVersion: "7.13.0", severity: "HIGH", advisory: "GHSA-8x6r-g9mw-2r78", title: "DoS via unbounded path expansion in __manifest endpoint", cvss: "7.5", cwe: "CWE-400", fixVersion: "7.15.0" },
  { package: "brace-expansion", installedVersion: "<=5.0.8", severity: "HIGH", advisory: "GHSA-mh99-v99m-4gvg", title: "DoS via unbounded expansion causing out-of-memory crash", cvss: "7.5", cwe: "CWE-770", fixVersion: "5.0.9" },
  { package: "shell-quote", installedVersion: "<=1.8.4", severity: "HIGH", advisory: "GHSA-395f-4hp3-45gv", title: "Quadratic-complexity Denial of Service in parse()", cvss: "7.5", cwe: "CWE-407", fixVersion: "1.8.5+" },
  { package: "vite", installedVersion: "6.3.5", severity: "HIGH", advisory: "GHSA-p9ff-h696-f583", title: "Arbitrary File Read via Vite Dev Server WebSocket", cvss: "7.5", cwe: "CWE-200", fixVersion: "6.4.3" },
  { package: "vite", installedVersion: "6.3.5", severity: "HIGH", advisory: "GHSA-fx2h-pf6j-xcff", title: "server.fs.deny bypass on Windows alternate paths", cvss: "7.5", cwe: "CWE-22", fixVersion: "6.4.3" },
  { package: "postcss", installedVersion: "<=8.5.22", severity: "HIGH", advisory: "GHSA-r28c-9q8g-f849", title: "Path Traversal in sourceMappingURL leads to arbitrary .map file disclosure", cvss: "7.5", cwe: "CWE-22", fixVersion: "8.5.23+" },
  { package: "dompurify", installedVersion: "<=3.4.11", severity: "MODERATE", advisory: "GHSA-cmwh-pvxp-8882", title: "Permanent ALLOWED_ATTR pollution via setConfig() - XSS bypass", cvss: "N/A", cwe: "CWE-79", fixVersion: "3.4.12+" },
  { package: "@babel/core", installedVersion: "<=7.29.0", severity: "LOW", advisory: "GHSA-4x5r-pxfx-6jf8", title: "Arbitrary File Read via sourceMappingURL Comment", cvss: "3.2", cwe: "CWE-22", fixVersion: "7.30.0+" },
];

// Generate CSV for findings
function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach(row => lines.push(headers.map(h => escape(row[h])).join(",")));
  return lines.join("\n");
}

// Findings CSV
const findingsCsv = toCSV(
  ["id","severity","type","file","line","endpoint","description","impact","fix"],
  findings
);
fs.writeFileSync(path.join(outputDir, "findings.csv"), findingsCsv);

// Endpoints CSV
const endpointsCsv = toCSV(
  ["endpoint","method","auth","roles","file","notes"],
  endpoints
);
fs.writeFileSync(path.join(outputDir, "endpoint-inventory.csv"), endpointsCsv);

// Dependencies CSV
const depsCsv = toCSV(
  ["package","installedVersion","severity","advisory","title","cvss","cwe","fixVersion"],
  deps
);
fs.writeFileSync(path.join(outputDir, "dependency-vulnerabilities.csv"), depsCsv);

// Risk Summary CSV
const riskSummary = [
  { category: "Authentication", score: "35/100", criticalIssues: "Weak JWT secret, Firebase auth bypass" },
  { category: "Authorization", score: "20/100", criticalIssues: "Admin routes unprotected - any user has admin access" },
  { category: "Secrets Management", score: "5/100", criticalIssues: "5 live credentials exposed in source code" },
  { category: "Input Validation", score: "40/100", criticalIssues: "No email/password validation, no language whitelist" },
  { category: "Code Execution Safety", score: "10/100", criticalIssues: "Direct RCE via sandbox - user JS runs on host" },
  { category: "Dependency Security", score: "30/100", criticalIssues: "Critical tar CVE, RCE-level react-router vuln" },
  { category: "Security Configuration", score: "35/100", criticalIssues: "No headers, wildcard CORS, no auth rate limits" },
  { category: "Logging & Monitoring", score: "20/100", criticalIssues: "No security event audit trail" },
  { category: "OVERALL", score: "28/100", criticalIssues: "5 Critical, 4 High, 6 Medium, 3 Low findings" },
];
const riskCsv = toCSV(["category","score","criticalIssues"], riskSummary);
fs.writeFileSync(path.join(outputDir, "risk-summary.csv"), riskCsv);

console.log("=== Security Report Generation Complete ===");
console.log("Files written to: " + outputDir);
console.log("  - findings.csv       (" + findings.length + " findings)");
console.log("  - endpoint-inventory.csv  (" + endpoints.length + " endpoints)");
console.log("  - dependency-vulnerabilities.csv  (" + deps.length + " entries)");
console.log("  - risk-summary.csv");
console.log("\nOpen CSV files in Excel to review as spreadsheets.");
