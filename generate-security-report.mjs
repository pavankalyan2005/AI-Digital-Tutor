// generate-security-report.mjs
// Generates a fully formatted Excel security report for AI Digital Tutor
// Run: node generate-security-report.mjs

import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'Vulnerability Test Results');
mkdirSync(OUT_DIR, { recursive: true });

// ─── DATA ────────────────────────────────────────────────────────────────────

const findings = [
  {
    id: 'F-001', severity: 'Critical', status: 'Fixed',
    title: 'Hardcoded Fallback JWT Secret Key',
    type: 'Broken Authentication / Insecure Cryptography',
    file: 'server/index.js:54',
    endpoint: 'All Authenticated Endpoints',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-798',
    cvss: '9.8 (Critical)',
    description: 'The JWT signing secret falls back to a hardcoded predictable string when JWT_SECRET is not set in the environment.',
    impact: 'Full account takeover. Privilege escalation to admin. Access to all user data and admin routes.',
    fix: 'Removed fallback. Fail-fast check added on server startup: if (!JWT_SECRET) process.exit(1). Random 256-bit key added to server/.env.',
    priority: 'P0 — Today',
    effort: 'Low'
  },
  {
    id: 'F-002', severity: 'Critical', status: 'Fixed',
    title: 'Firebase Auth Token Verification Bypass',
    type: 'Broken Authentication / Authentication Bypass',
    file: 'server/index.js:218-225',
    endpoint: 'POST /api/auth/google',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-287',
    cvss: '9.8 (Critical)',
    description: 'When Firebase ID token verification failed, the error was logged as a warning and execution continued — creating a valid authenticated session for unverified users.',
    impact: 'An attacker could impersonate ANY user by supplying their email address with no Google credentials needed.',
    fix: 'Added return res.status(401).json({ error: "Invalid Google credential." }) on verification failure.',
    priority: 'P0 — Today',
    effort: 'Low'
  },
  {
    id: 'F-003', severity: 'Critical', status: 'Fixed',
    title: 'Missing Admin RBAC — Any Student Can Delete All Courses',
    type: 'Broken Access Control / Missing RBAC',
    file: 'server/index.js:531-598',
    endpoint: 'POST /api/admin/courses, DELETE /api/admin/courses/:id, POST /api/admin/modules, PUT /api/admin/modules/:id, DELETE /api/admin/modules/:id',
    owasp: 'A01:2021 — Broken Access Control',
    cwe: 'CWE-285',
    cvss: '9.1 (Critical)',
    description: 'All 5 admin course and module management routes used only authenticateToken (any logged-in user), NOT requireAdmin.',
    impact: 'Any student could wipe all courses and modules from the platform.',
    fix: 'Added requireAdmin middleware to all 5 admin endpoints.',
    priority: 'P0 — Today',
    effort: 'Low'
  },
  {
    id: 'F-004', severity: 'Critical', status: 'Fixed',
    title: 'Remote Code Execution via Host Shell Execution',
    type: 'Remote Code Execution / Sandbox Escape',
    file: 'server/sandbox.js:139',
    endpoint: 'POST /api/code/run',
    owasp: 'A03:2021 — Injection',
    cwe: 'CWE-78',
    cvss: '9.8 (Critical)',
    description: 'User-supplied JavaScript was written to a temp file and executed on the host server using child_process.exec() with no sandboxing.',
    impact: 'Potential full host server compromise and arbitrary command execution.',
    fix: 'Replaced child_process.exec host shell execution with an in-memory V8 vm.runInContext sandbox with CPU timeout and isolated globals.',
    priority: 'P0 — Today',
    effort: 'Medium'
  },
  {
    id: 'F-005', severity: 'Critical', status: 'Fixed',
    title: 'Firebase serviceAccountKey.json Exposure Risk',
    type: 'Exposed Credential / Secret Leakage',
    file: 'server/serviceAccountKey.json',
    endpoint: 'N/A',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-312',
    cvss: '8.6 (High)',
    description: 'The Firebase Admin private key file was present in the project directory.',
    impact: 'Potential unauthorized Firebase Admin privilege escalation.',
    fix: 'Added serviceAccountKey.json, *.db-shm, and *.db-wal to server/.gitignore and protected credential loading.',
    priority: 'P0 — Today',
    effort: 'Medium'
  },
  {
    id: 'F-006', severity: 'High', status: 'Fixed',
    title: 'Wildcard CORS — All Origins Accepted',
    type: 'Dangerous CORS Configuration',
    file: 'server/index.js:57',
    endpoint: 'All API Endpoints',
    owasp: 'A05:2021 — Security Misconfiguration',
    cwe: 'CWE-942',
    cvss: '8.1 (High)',
    description: 'CORS was configured to accept requests from any origin (*).',
    impact: 'Cross-Site Request Forgery and unauthorized cross-origin API access.',
    fix: 'Configured dynamic origin allowlist matching localhost:5173, localhost:3000, and FRONTEND_URL.',
    priority: 'P1 — This Week',
    effort: 'Low'
  },
  {
    id: 'F-007', severity: 'High', status: 'Fixed',
    title: 'Missing Security Headers — Helmet Not Installed',
    type: 'Missing Security Controls',
    file: 'server/index.js',
    endpoint: 'All Endpoints',
    owasp: 'A05:2021 — Security Misconfiguration',
    cwe: 'CWE-693',
    cvss: '7.5 (High)',
    description: 'No HTTP security headers (X-Frame-Options, HSTS, CSP, etc.) were set.',
    impact: 'Exposed application to clickjacking, MIME-sniffing, and protocol downgrade attacks.',
    fix: 'Installed helmet package and registered helmet() middleware at the top of the application stack.',
    priority: 'P1 — This Week',
    effort: 'Low'
  },
  {
    id: 'F-008', severity: 'High', status: 'Fixed',
    title: 'Error Stack Traces Leaked to API Clients',
    type: 'Sensitive Data Exposure / Information Leakage',
    file: 'server/index.js:1796',
    endpoint: 'All Endpoints (Global Error Handler)',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-209',
    cvss: '5.3 (Medium)',
    description: 'The global error handler returned internal error details and stack traces to clients.',
    impact: 'Disclosed internal paths and query details to attackers.',
    fix: 'Updated global error handler to suppress stack traces and internal details when NODE_ENV is production.',
    priority: 'P1 — This Week',
    effort: 'Low'
  },
  {
    id: 'F-009', severity: 'High', status: 'Fixed',
    title: 'No Brute-Force Protection on Authentication Endpoints',
    type: 'Insufficient Brute-Force Protection',
    file: 'server/index.js:135, 174',
    endpoint: 'POST /api/auth/login, POST /api/auth/signup',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-307',
    cvss: '7.5 (High)',
    description: 'No rate limiting was applied to login or signup endpoints.',
    impact: 'Account takeover via high-speed credential stuffing or brute-force attacks.',
    fix: 'Configured authLimiter (15 requests per 15 minutes per IP) on auth endpoints.',
    priority: 'P1 — This Week',
    effort: 'Low'
  },
  {
    id: 'F-010', severity: 'High', status: 'Fixed',
    title: 'Hardcoded 7-Day JWT Token Duration',
    type: 'Improper Session Management',
    file: 'server/index.js:164, 193, 255',
    endpoint: 'All Auth Endpoints',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-613',
    cvss: '6.5 (Medium)',
    description: 'JWT tokens had a fixed 7d expiration time.',
    impact: 'Stolen tokens remained valid for a full week.',
    fix: 'Made JWT token expiration configurable via JWT_EXPIRES_IN environment variable (default 24h).',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  },
  {
    id: 'F-011', severity: 'Medium', status: 'Fixed',
    title: 'Duplicate Route Definitions — Silent Dead Code',
    type: 'Configuration / Code Quality',
    file: 'server/index.js',
    endpoint: '/api/sessions/start, /api/sessions/:id/end, /api/progress/weekly',
    owasp: 'A05:2021 — Security Misconfiguration',
    cwe: 'CWE-561',
    cvss: '4.0 (Medium)',
    description: 'Session and progress endpoints were defined twice in index.js.',
    impact: 'Risk of maintenance errors and dead security code.',
    fix: 'Removed all duplicate route handlers from server/index.js.',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  },
  {
    id: 'F-012', severity: 'Medium', status: 'Fixed',
    title: 'Stored XSS via Community Posts — No Input Sanitization',
    type: 'Stored XSS / Missing Input Validation',
    file: 'server/index.js:1461-1475',
    endpoint: 'POST /api/projects',
    owasp: 'A03:2021 — Injection',
    cwe: 'CWE-79',
    cvss: '6.1 (Medium)',
    description: 'Community post title and content were saved without HTML sanitization.',
    impact: 'Risk of stored XSS scripts executing in clients.',
    fix: 'Added HTML tag stripping and length truncation (title max 255, content max 5000) before DB insertion.',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  },
  {
    id: 'F-013', severity: 'Medium', status: 'Fixed',
    title: 'JWT Role Claim Verification Hardening',
    type: 'Insecure Authorization',
    file: 'server/index.js:104-110',
    endpoint: 'All Authenticated Endpoints',
    owasp: 'A01:2021 — Broken Access Control',
    cwe: 'CWE-285',
    cvss: '4.3 (Medium)',
    description: 'Role verification relied purely on token payload.',
    impact: 'Role modifications might persist in old token payloads until expiration.',
    fix: 'Verified requireAdmin performs real-time DB query for current role.',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  },
  {
    id: 'F-014', severity: 'Medium', status: 'Fixed',
    title: 'No Password Complexity Policy',
    type: 'Weak Authentication',
    file: 'server/index.js:135-172',
    endpoint: 'POST /api/auth/signup',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-521',
    cvss: '4.3 (Medium)',
    description: 'Short or trivial passwords were allowed during signup.',
    impact: 'Accounts vulnerable to trivial password guessing.',
    fix: 'Enforced minimum password length check (at least 8 characters) on user registration.',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  },
  {
    id: 'F-015', severity: 'Medium', status: 'Fixed',
    title: 'JWT_SECRET Missing from server/.env',
    type: 'Secrets Management',
    file: 'server/.env',
    endpoint: 'N/A',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-321',
    cvss: '5.0 (Medium)',
    description: 'server/.env did not contain JWT_SECRET.',
    impact: 'Environment was unconfigured for production JWT keys.',
    fix: 'Generated a cryptographically secure 256-bit secret key into server/.env.',
    priority: 'P1 — This Week',
    effort: 'Low'
  },
  {
    id: 'F-016', severity: 'Low', status: 'Fixed',
    title: 'Non-Cryptographic Random File Naming',
    type: 'Weak Randomness',
    file: 'server/sandbox.js',
    endpoint: 'POST /api/code/run',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-338',
    cvss: '2.6 (Low)',
    description: 'Math.random() was used for temporary file naming in code execution sandbox.',
    impact: 'Low predictability risk.',
    fix: 'Replaced file-based execution entirely with in-memory V8 vm context.',
    priority: 'P3 — Backlog',
    effort: 'Low'
  },
  {
    id: 'F-017', severity: 'Low', status: 'Fixed',
    title: 'Unauthenticated Coding Challenges Endpoint',
    type: 'Information Disclosure',
    file: 'server/index.js:1478',
    endpoint: 'GET /api/code/challenges',
    owasp: 'A01:2021 — Broken Access Control',
    cwe: 'CWE-284',
    cvss: '3.1 (Low)',
    description: 'Coding challenges were accessible without authentication.',
    impact: 'Scraping of challenge data.',
    fix: 'Added authenticateToken middleware to GET /api/code/challenges.',
    priority: 'P3 — Backlog',
    effort: 'Low'
  },
  {
    id: 'F-018', severity: 'Low', status: 'Fixed',
    title: 'app.listen() Called Before Error Handler Registration',
    type: 'Configuration / Middleware Order',
    file: 'server/index.js:1781, 1786',
    endpoint: 'N/A',
    owasp: 'A05:2021 — Security Misconfiguration',
    cwe: 'CWE-1006',
    cvss: '2.0 (Low)',
    description: 'app.listen() was declared prior to registering error middleware.',
    impact: 'Fragile middleware execution order.',
    fix: 'Reordered app.listen() to run after all route and error middleware registrations.',
    priority: 'P3 — Backlog',
    effort: 'Low'
  },
  {
    id: 'F-019', severity: 'Medium', status: 'Fixed',
    title: 'Vulnerable npm Dependencies (Package Vulnerabilities)',
    type: 'Third-Party Component Vulnerability',
    file: 'package.json, server/package.json',
    endpoint: 'All Endpoints (Supply Chain)',
    owasp: 'A06:2021 — Vulnerable and Outdated Components',
    cwe: 'CWE-1104',
    cvss: '7.5 (High)',
    description: 'Outdated third-party packages reported by npm audit.',
    impact: 'Potential supply chain risks in transitive dependencies.',
    fix: 'Executed npm audit fix across root and server dependencies.',
    priority: 'P2 — Next Sprint',
    effort: 'Low'
  }
];

const depVulns = [
  { pkg: 'tar', via: 'sqlite3', severity: 'Critical', cvss: 9.8, advisory: 'GHSA-34x7-hfp2-rc4v', impact: 'Arbitrary file write via path traversal', fix: 'npm audit fix --force' },
  { pkg: 'react-router', via: 'Direct', severity: 'High', cvss: 8.1, advisory: 'GHSA-49rj-9fvp-4h2h', impact: 'RCE via turbo-stream deserialization', fix: 'npm audit fix' },
  { pkg: 'react-router', via: 'Direct', severity: 'High', cvss: 7.5, advisory: 'GHSA-8646-j5j9-6r62', impact: 'XSS in RSC redirect handling', fix: 'npm audit fix' },
  { pkg: 'brace-expansion', via: 'Transitive', severity: 'High', cvss: 7.5, advisory: 'GHSA-mh99-v99m-4gvg', impact: 'DoS via out-of-memory crash', fix: 'npm audit fix' },
  { pkg: 'postcss', via: 'Transitive', severity: 'High', cvss: 7.5, advisory: 'GHSA-r28c-9q8g-f849', impact: 'Arbitrary .map file read via source maps', fix: 'npm audit fix' },
  { pkg: 'nanoid', via: 'Transitive', severity: 'High', cvss: 7.5, advisory: 'GHSA-28wg-ghj8-5hjv', impact: 'Infinite loop / process hang', fix: 'npm audit fix' },
  { pkg: 'ip-address', via: 'Transitive', severity: 'High', cvss: 8.1, advisory: 'GHSA-mwp4-54f8-5fhr', impact: 'SSRF / trust-boundary bypass', fix: 'npm audit fix' },
  { pkg: 'dompurify', via: 'monaco-editor', severity: 'Moderate', cvss: 6.1, advisory: 'GHSA-cmwh-pvxp-8882', impact: 'XSS via CUSTOM_ELEMENT_HANDLING bypass', fix: 'npm audit fix' },
  { pkg: '@babel/core', via: 'Build tools', severity: 'Low', cvss: 3.2, advisory: 'GHSA-4x5r-pxfx-6jf8', impact: 'Arbitrary file read via sourceMappingURL', fix: 'npm audit fix' },
  { pkg: 'body-parser', via: 'express', severity: 'Moderate', cvss: 5.3, advisory: 'GHSA-v422-hmwv-36x6', impact: 'DoS — invalid Content-Length disables size limits', fix: 'npm audit fix' },
];

const remediation = [
  { priority: 'P0 — Today', findings: 'F-001, F-002, F-003, F-004, F-005', action: 'JWT secret, Firebase auth bypass, Admin RBAC, RCE sandbox, git secret exclusion', effort: 'Low–Medium', fixed: 5, open: 0 },
  { priority: 'P1 — This Week', findings: 'F-006, F-007, F-008, F-009, F-015', action: 'CORS allowlist, Helmet headers, Error suppression, Auth rate limiter, JWT_SECRET in .env', effort: 'Low', fixed: 5, open: 0 },
  { priority: 'P2 — Next Sprint', findings: 'F-010, F-011, F-012, F-013, F-014, F-019', action: 'Configurable JWT duration, Remove dup routes, XSS sanitization, Role re-validation, Password policy, npm audit fix', effort: 'Low', fixed: 6, open: 0 },
  { priority: 'P3 — Backlog', findings: 'F-016, F-017, F-018', action: 'In-memory VM sandbox, Auth on /api/code/challenges, Middleware order', effort: 'Low', fixed: 3, open: 0 },
];

// ─── WORKBOOK ─────────────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ─── SHEET 1: EXECUTIVE SUMMARY ──────────────────────────────────────────────

const summaryData = [
  ['AI DIGITAL TUTOR — BACKEND SECURITY ASSESSMENT REPORT'],
  [''],
  ['Assessment Date', '2026-08-08'],
  ['Target Application', 'AI Digital Tutor — Node.js / Express 4.x Backend'],
  ['Technology Stack', 'Node.js, Express 4.x, SQLite, JWT, Firebase Admin SDK'],
  ['Files Reviewed', 'server/index.js, server/sandbox.js, server/codeExecution.js, server/db.js'],
  ['Assessment Type', 'SAST (Static Application Security Testing) + Manual Remediation'],
  [''],
  ['FINDINGS SUMMARY', ''],
  ['Severity', 'Count', 'Fixed', 'Open'],
  ['Critical', 5, 5, 0],
  ['High', 5, 5, 0],
  ['Medium', 5, 5, 0],
  ['Low', 4, 4, 0],
  ['TOTAL', 19, 19, 0],
  [''],
  ['OVERALL REMEDIATION STATUS', '100% RESOLVED'],
  [''],
  ['OWASP TOP 10 COVERAGE'],
  ['OWASP Category', 'Findings'],
  ['A01 — Broken Access Control', 'F-003, F-013, F-017'],
  ['A02 — Cryptographic Failures', 'F-005, F-008, F-015, F-016'],
  ['A03 — Injection (XSS / RCE)', 'F-004, F-012'],
  ['A05 — Security Misconfiguration', 'F-006, F-007, F-011, F-018'],
  ['A06 — Vulnerable & Outdated Components', 'F-019'],
  ['A07 — Identification & Auth Failures', 'F-001, F-002, F-009, F-010, F-014'],
];

const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
setColWidths(wsSummary, [40, 55, 15, 15]);
XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Executive Summary');

// ─── SHEET 2: ALL FINDINGS ────────────────────────────────────────────────────

const findingHeaders = [
  'ID', 'Severity', 'Status', 'Title', 'Type / Category',
  'Affected File / Line', 'Endpoint', 'OWASP Mapping', 'CWE', 'CVSS Score',
  'Description', 'Impact', 'Recommended Fix', 'Priority', 'Effort'
];

const findingRows = findings.map(f => [
  f.id, f.severity, f.status, f.title, f.type,
  f.file, f.endpoint, f.owasp, f.cwe, f.cvss,
  f.description, f.impact, f.fix, f.priority, f.effort
]);

const wsFindings = XLSX.utils.aoa_to_sheet([findingHeaders, ...findingRows]);
setColWidths(wsFindings, [8, 10, 10, 45, 35, 35, 45, 45, 12, 12, 80, 60, 80, 18, 10]);
XLSX.utils.book_append_sheet(wb, wsFindings, '🔍 All Findings');

// ─── SHEET 3: CRITICAL ONLY ───────────────────────────────────────────────────

const criticalFindings = findings.filter(f => f.severity === 'Critical');
const wsCritical = XLSX.utils.aoa_to_sheet([
  findingHeaders,
  ...criticalFindings.map(f => [
    f.id, f.severity, f.status, f.title, f.type,
    f.file, f.endpoint, f.owasp, f.cwe, f.cvss,
    f.description, f.impact, f.fix, f.priority, f.effort
  ])
]);
setColWidths(wsCritical, [8, 10, 10, 45, 35, 35, 45, 45, 12, 12, 80, 60, 80, 18, 10]);
XLSX.utils.book_append_sheet(wb, wsCritical, '🔴 Critical Findings');

// ─── SHEET 4: DEP VULNERABILITIES ────────────────────────────────────────────

const depHeaders = ['Package', 'Via / Dependency', 'Severity', 'CVSS Score', 'Advisory ID', 'Advisory URL', 'Impact', 'Recommended Fix'];
const depRows = depVulns.map(d => [
  d.pkg, d.via, d.severity, d.cvss,
  d.advisory,
  `https://github.com/advisories/${d.advisory}`,
  d.impact, d.fix
]);

const wsDeps = XLSX.utils.aoa_to_sheet([depHeaders, ...depRows]);
setColWidths(wsDeps, [20, 18, 12, 12, 25, 55, 55, 20]);
XLSX.utils.book_append_sheet(wb, wsDeps, '📦 Dependency Vulns');

// ─── SHEET 5: REMEDIATION PLAN ───────────────────────────────────────────────

const remHeaders = ['Priority', 'Finding IDs', 'Action Required', 'Effort', 'Fixed Count', 'Open Count'];
const remRows = remediation.map(r => [r.priority, r.findings, r.action, r.effort, r.fixed, r.open]);

const wsRem = XLSX.utils.aoa_to_sheet([remHeaders, ...remRows]);
setColWidths(wsRem, [20, 35, 80, 15, 12, 12]);
XLSX.utils.book_append_sheet(wb, wsRem, '✅ Remediation Plan');

// ─── SHEET 6: FIXES APPLIED ──────────────────────────────────────────────────

const fixedFindings = findings.filter(f => f.status === 'Fixed');
const wsFixed = XLSX.utils.aoa_to_sheet([
  ['Finding ID', 'Title', 'Severity', 'What Was Fixed'],
  ...fixedFindings.map(f => [f.id, f.title, f.severity, f.fix])
]);
setColWidths(wsFixed, [12, 50, 12, 80]);
XLSX.utils.book_append_sheet(wb, wsFixed, '✓ Fixes Applied');

// ─── WRITE FILE ───────────────────────────────────────────────────────────────

const outPath = join(OUT_DIR, 'AI-Digital-Tutor-Security-Report.xlsx');
XLSX.writeFile(wb, outPath);
console.log('✅ Updated Excel report written to:', outPath);
