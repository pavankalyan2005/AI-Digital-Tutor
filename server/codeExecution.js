import { dbRun, dbGet } from "./db.js";

/**
 * Fallback chain for code execution.
 * Tries Judge0 CE (Public), CodeX, then Piston.
 */
const EXECUTION_SERVICES = [
  {
    name: 'Judge0',
    url: "https://ce.judge0.com",
    type: 'judge0',
    langMap: {
      'javascript': 63, // Node.js (12.14.0)
      'python': 71,     // Python (3.8.1)
      'java': 62,       // Java (OpenJDK 13.0.1)
      'cpp': 54,        // C++ (GCC 9.2.0)
      'c': 50           // C (GCC 9.2.0)
    }
  },
  {
    name: 'CodeX',
    url: "https://api.codex.jaagrav.in",
    type: 'codex',
    langMap: {
      'javascript': 'js',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c'
    }
  },
  {
    name: 'Piston',
    url: "https://emkc.org/api/v2/piston",
    type: 'piston',
    langMap: {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c'
    }
  }
];

export async function executeCode(language, code, stdin = "") {
  let lastError = null;

  for (const service of EXECUTION_SERVICES) {
    try {
      console.log(`🚀 Attempting code execution via ${service.name} for ${language}...`);

      if (service.type === 'judge0') {
        const langId = service.langMap[language.toLowerCase()];
        if (!langId) throw new Error(`Judge0 doesn't support ${language}`);

        const payload = {
          source_code: Buffer.from(code).toString('base64'),
          language_id: langId,
          stdin: Buffer.from(stdin).toString('base64'),
        };

        // Added base64_encoded=true to ensure Judge0 returns Base64 strings, preventing garbled output
        const subRes = await fetch(`${service.url}/submissions?wait=true&base64_encoded=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!subRes.ok) throw new Error(`Judge0 returned ${subRes.status}`);

        const result = await subRes.json();

        // Status ID 3 is "Accepted"
        return {
          stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : "",
          stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : (result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : ""),
          exit_code: result.status.id === 3 ? 0 : 1,
          output: (result.stdout || result.stderr || result.compile_output) ? Buffer.from(result.stdout || result.stderr || result.compile_output, 'base64').toString() : ""
        };
      }

      if (service.type === 'codex') {
        const payload = {
          language: service.langMap[language.toLowerCase()] || language,
          code: code,
          input: stdin
        };

        const response = await fetch(service.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`CodeX returned ${response.status}`);

        const result = await response.json();
        if (result.error && result.error.toLowerCase().includes("upstream")) throw new Error("CodeX is down.");

        return {
          stdout: result.output || "",
          stderr: result.error || "",
          exit_code: result.status === 200 && !result.error ? 0 : 1,
          output: result.output || result.error || ""
        };
      }

      if (service.type === 'piston') {
        // Piston requires version, fetch runtimes first
        const runtimesRes = await fetch(`${service.url}/runtimes`);
        const runtimes = await runtimesRes.json();
        const pistonLang = service.langMap[language.toLowerCase()];
        const runtime = runtimes.find(r => r.language === pistonLang);

        if (!runtime) throw new Error(`Piston doesn't support ${language}`);

        const payload = {
          language: runtime.language,
          version: runtime.version,
          files: [{ content: code }],
          stdin: stdin,
          run_timeout: 10000
        };

        const response = await fetch(`${service.url}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.message && result.message.includes("whitelist")) {
          throw new Error("Piston public API is whitelist-only.");
        }

        return {
          stdout: result.run.stdout,
          stderr: result.run.stderr || (result.compile ? result.compile.stderr : ""),
          exit_code: result.run.code,
          output: result.run.output
        };
      }
    } catch (err) {
      console.warn(`⚠️ ${service.name} execution failed:`, err.message);
      lastError = err;
      continue; // Try next service in chain
    }
  }

  throw new Error(`All code execution services failed. ${lastError?.message}`);
}

export async function validateRuntimes() {
  console.log("🔍 Checking code execution service availability...");
  for (const service of EXECUTION_SERVICES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Fixed health check endpoint for Judge0 (uses /languages instead of root)
      const healthUrl = service.url + (service.type === 'piston' ? '/runtimes' : '/languages');
      const res = await fetch(healthUrl, { signal: controller.signal });

      clearTimeout(timeoutId);
      if (res.ok) console.log(`✅ ${service.name} service is reachable.`);
      else console.warn(`❌ ${service.name} returned status ${res.status}.`);
    } catch (err) {
      console.warn(`❌ ${service.name} is unreachable: ${err.message}`);
    }
  }
}

export async function validateSubmission(userId, challengeId, code, language) {
  const challenge = await dbGet("SELECT * FROM coding_challenges WHERE id = ?", [challengeId]);
  if (!challenge) throw new Error("Challenge not found.");

  const testCases = JSON.parse(challenge.test_cases || "[]");
  let passedCount = 0;
  const results = [];

  for (const testCase of testCases) {
    const execResult = await executeCode(language, code, testCase.input.join("\n"));

    const actual = execResult.stdout.trim();
    const expected = String(testCase.expected).trim();
    const passed = actual === expected;

    if (passed) passedCount++;

    results.push({
      input: testCase.input,
      expected: expected,
      actual: actual,
      passed,
      stderr: execResult.stderr
    });
  }

  const success = testCases.length > 0 && passedCount === testCases.length;
  const status = success ? "Success" : "Failed";

  await dbRun(
    "INSERT INTO user_submissions (user_id, challenge_id, status, user_code) VALUES (?, ?, ?, ?)",
    [userId, challengeId, status, code]
  );

  if (success) {
    await dbRun("UPDATE profiles SET points = points + 100 WHERE user_id = ?", [userId]);
  }

  return { success, status, testResults: results, passedCount, totalCount: testCases.length };
}
