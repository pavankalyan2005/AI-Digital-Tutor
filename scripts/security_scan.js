#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const workspace = process.cwd();
const serverDir = path.join(workspace, 'server');
const outDir = path.join(workspace, 'Vulnerability Test Results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

// 1. Detect endpoints in server/index.js by simple regex
const indexPath = path.join(serverDir, 'index.js');
const indexSrc = readFileSafe(indexPath);
const routeRegex = /app\.(get|post|put|delete|patch)\(([^,]+),?([^\)]*)\)/g;
const endpoints = [];
let m;
while ((m = routeRegex.exec(indexSrc))) {
  const method = m[1].toUpperCase();
  const rawPath = m[2].trim();
  const pathStr = rawPath.replace(/^['\"]|['\"]$/g, '');
  const middleware = m[3] ? m[3].trim() : '';
  const authRequired = /authenticateToken/.test(m[0]) || /authenticateToken/.test(m[3] || '') || /authenticateToken/.test(indexSrc.slice(m.index - 200, m.index + 200));
  endpoints.push({ endpoint: pathStr, method, authRequired, middleware: middleware.replace(/\n/g, ' ') });
}

// Write endpoint CSV
const epCsv = ['Endpoint,Method,Authentication Required,Middleware\n'];
for (const e of endpoints) epCsv.push(`"${e.endpoint}",${e.method},${e.authRequired},"${e.middleware}"\n`);
fs.writeFileSync(path.join(outDir, 'endpoint-inventory.csv'), epCsv.join(''));

// 2. Scan for hardcoded secrets (simple regexes)
const secrets = [];
const fileList = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walk(full); }
    else fileList.push(full);
  }
}
walk(workspace);

const keyPatterns = [ /GEMINI_API_KEY\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}/i, /OPENROUTER_API_KEY\s*[:=]\s*["']?sk-[A-Za-z0-9_\-]{20,}/i, /AI_DIGITAL_TUTOR_SECRET_KEY|ai_digital_tutor_secret_key/i, /JWT_SECRET\s*[:=]\s*["']?.{10,}/i ];

for (const f of fileList) {
  const s = readFileSafe(f);
  for (const p of keyPatterns) {
    if (p.test(s)) secrets.push({ file: path.relative(workspace, f), match: (s.match(p) || []).slice(0,1).toString().slice(0,80) });
  }
  // also look for .env presence
  if (path.basename(f) === '.env') {
    secrets.push({ file: path.relative(workspace, f), match: '.env file present' });
  }
}

// Write findings CSV and markdown
const findings = [];
for (const s of secrets) {
  const severity = /GEMINI|OPENROUTER|JWT_SECRET|ai_digital/i.test(s.match) ? 'Critical' : 'High';
  findings.push({ severity, type: 'Hardcoded secret', file: s.file, description: s.match });
}

// Additional checks (CORS *)
if (indexSrc.includes("cors({ origin: \"*\" })") || indexSrc.includes("cors({ origin: '*' })")) {
  findings.push({ severity: 'High', type: 'CORS wildcard', file: path.relative(workspace, indexPath), description: 'CORS configured with origin: *' });
}

// Default JWT secret detection
if (/JWT_SECRET\s*=\s*process\.env\.JWT_SECRET\s*\|\|\s*["']ai_digital_tutor_secret_key_123456["']/.test(indexSrc) || indexSrc.includes('ai_digital_tutor_secret_key_123456')) {
  findings.push({ severity: 'High', type: 'Default JWT secret', file: path.relative(workspace, indexPath), description: 'Default fallback JWT secret is hardcoded' });
}

// Write CSVs
const findingsCsv = ['Severity,Type,File,Description\n'];
for (const f of findings) findingsCsv.push(`"${f.severity}","${f.type}","${f.file}","${f.description}"\n`);
fs.writeFileSync(path.join(outDir, 'findings.csv'), findingsCsv.join(''));

// Write human readable markdown summary
const md = [];
md.push('# Static Security Scan Summary\n');
md.push(`Generated: ${new Date().toISOString()}\n`);
md.push('## Key Findings\n');
for (const f of findings) md.push(`- **${f.severity}**: ${f.type} — ${f.description} ([${f.file}](${f.file}))\n`);
if (findings.length === 0) md.push('- No immediate hardcoded secrets or risky CORS policies detected by heuristics.\n');
fs.writeFileSync(path.join(outDir, 'security-review.md'), md.join('\n'));

console.log('Security scan complete. Reports written to:', outDir);
console.log('Endpoints discovered:', endpoints.length);
