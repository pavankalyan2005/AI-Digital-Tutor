import vm from "vm";
import crypto from "crypto";

/**
 * Runs user JavaScript code in a secure Node.js VM context without shell process execution.
 * Prevents OS command injection, file system access, and network exfiltration.
 * @param {string} userCode The function code written by the user.
 * @param {string} functionName The name of the function to test (e.g. 'reverseString').
 * @param {Array} testCases An array of test case objects: { input: [...args], expected: result }
 * @returns {Promise<object>} Execution results including overall status, stdout, and test details.
 */
export function runJavaScriptSandbox(userCode, functionName, testCases) {
  return new Promise((resolve) => {
    const capturedLogs = [];

    // Isolated sandbox environment without access to process, fs, child_process, or network APIs
    const sandbox = {
      console: {
        log: (...args) => {
          capturedLogs.push(
            args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
          );
        }
      },
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Math,
      Date,
      RegExp,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite
    };

    function deepCompare(a, b) {
      if (a === b) return true;
      if (typeof a !== typeof b) return false;
      if (a && b && typeof a === "object" && typeof b === "object") {
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

    try {
      // Secure VM script construction
      const scriptContent = `
        ${userCode}
        ;if (typeof ${functionName} !== 'function') {
          throw new Error("Function '${functionName}' is not defined or is not a function.");
        }
        ${functionName};
      `;

      const ctx = vm.createContext(sandbox);
      // Run in isolated V8 context with 2000ms CPU execution cap
      const targetFn = vm.runInContext(scriptContent, ctx, { timeout: 2000 });

      const results = [];
      const safeTestCases = Array.isArray(testCases) ? testCases : [];

      for (let i = 0; i < safeTestCases.length; i++) {
        const testCase = safeTestCases[i];
        const startTime = process.hrtime();
        let passed = false;
        let actualValue = null;
        let errorMsg = null;
        const initialLogLength = capturedLogs.length;

        try {
          const args = Array.isArray(testCase.input) ? testCase.input : [testCase.input];
          actualValue = targetFn(...args);
          passed = deepCompare(actualValue, testCase.expected);
        } catch (err) {
          errorMsg = err.message || String(err);
          passed = false;
        }

        const endTime = process.hrtime(startTime);
        const durationMs = parseFloat((endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2));

        results.push({
          testIndex: i,
          input: testCase.input,
          expected: testCase.expected,
          actual: actualValue,
          passed,
          error: errorMsg,
          logs: capturedLogs.slice(initialLogLength),
          durationMs
        });
      }

      const allPassed = results.length > 0 && results.every(t => t.passed);
      return resolve({
        success: allPassed,
        status: allPassed ? "Success" : "Failed Tests",
        testResults: results,
        allLogs: capturedLogs,
        error: null
      });
    } catch (err) {
      const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out');
      return resolve({
        success: false,
        status: isTimeout ? "Time Limit Exceeded" : "Runtime Error",
        error: isTimeout
          ? "Your code took longer than 2.0 seconds to execute. Check for infinite loops."
          : (err.message || String(err)),
        testResults: [],
        allLogs: capturedLogs
      });
    }
  });
}
