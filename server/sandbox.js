import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for deep comparison of results
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Runs user JavaScript code against a list of test cases in an isolated child process.
 * @param {string} userCode The function code written by the user.
 * @param {string} functionName The name of the function to test (e.g. 'reverseString').
 * @param {Array} testCases An array of test case objects: { input: [...args], expected: result }
 * @returns {Promise<object>} Execution results including overall status, stdout, and test details.
 */
export function runJavaScriptSandbox(userCode, functionName, testCases) {
  return new Promise((resolve) => {
    const tempDir = path.resolve(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const fileId = Math.random().toString(36).substring(7);
    const filePath = path.join(tempDir, `run_${fileId}.js`);

    // We build a runner script that embeds the user's code, overrides console.log to capture standard output,
    // and runs each test case, writing the final JSON results to standard output.
    const runnerContent = `
const results = [];
let capturedLogs = [];

// Override console.log
const originalLog = console.log;
console.log = (...args) => {
  capturedLogs.push(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' '));
};

try {
  // 1. Inject User Code
  ${userCode}

  // 2. Resolve target function
  const targetFn = typeof ${functionName} !== 'undefined' ? ${functionName} : null;
  if (typeof targetFn !== 'function') {
    throw new Error("Function '${functionName}' is not defined or is not a function.");
  }

  // 3. Define deepEqual inside the isolated environment
  function deepCompare(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepCompare(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  // 4. Run Test Cases
  const tests = ${JSON.stringify(testCases)};
  
  for (let i = 0; i < tests.length; i++) {
    const testCase = tests[i];
    const startTime = process.hrtime();
    let passed = false;
    let actualValue = null;
    let errorMsg = null;
    const initialLogLength = capturedLogs.length;

    try {
      actualValue = targetFn(...testCase.input);
      passed = deepCompare(actualValue, testCase.expected);
    } catch (err) {
      errorMsg = err.message || String(err);
      passed = false;
    }

    const endTime = process.hrtime(startTime);
    const durationMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);

    results.push({
      testIndex: i,
      input: testCase.input,
      expected: testCase.expected,
      actual: actualValue,
      passed,
      error: errorMsg,
      logs: capturedLogs.slice(initialLogLength),
      durationMs: parseFloat(durationMs)
    });
  }

  // Output structured result JSON
  originalLog(JSON.stringify({
    status: "success",
    testResults: results,
    allLogs: capturedLogs
  }));

} catch (globalErr) {
  originalLog(JSON.stringify({
    status: "error",
    error: globalErr.message || String(globalErr)
  }));
}
`;

    // Write temp script
    fs.writeFileSync(filePath, runnerContent, "utf8");

    // Execute with a 2-second timeout to handle infinite loops!
    exec(`node "${filePath}"`, { timeout: 2000, maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }

      if (error && error.killed) {
        return resolve({
          success: false,
          status: "Time Limit Exceeded",
          error: "Your code took longer than 2.0 seconds to execute. Check for infinite loops.",
          testResults: [],
          allLogs: []
        });
      }

      if (stderr && stderr.trim()) {
        return resolve({
          success: false,
          status: "Runtime Error",
          error: stderr.trim(),
          testResults: [],
          allLogs: []
        });
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.status === "error") {
          return resolve({
            success: false,
            status: "Compile/Syntax Error",
            error: parsed.error,
            testResults: [],
            allLogs: parsed.allLogs || []
          });
        }

        const allPassed = parsed.testResults.every((t) => t.passed);
        return resolve({
          success: allPassed,
          status: allPassed ? "Success" : "Failed Tests",
          testResults: parsed.testResults,
          allLogs: parsed.allLogs,
          error: null
        });
      } catch (parseErr) {
        return resolve({
          success: false,
          status: "Execution Error",
          error: stdout || "An unexpected error occurred during execution.",
          testResults: [],
          allLogs: []
        });
      }
    });
  });
}
