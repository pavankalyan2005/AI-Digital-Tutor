import { runJavaScriptSandbox } from "./sandbox.js";
import { initDatabase, dbRun, dbGet, dbAll } from "./db.js";
import assert from "assert";

async function runTests() {
  console.log("==========================================");
  console.log("🔍 Running Automated System Sanity Tests");
  console.log("==========================================");

  // 1. Initialize DB
  try {
    await initDatabase();
    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
    process.exit(1);
  }

  // 2. Test Sandbox Code Execution
  console.log("\n🏃 Testing isolated Code Runner Sandbox...");
  const userCode = `
    function reverseString(str) {
      return str.split('').reverse().join('');
    }
  `;
  const testCases = [
    { input: ["hello"], expected: "olleh" },
    { input: ["world"], expected: "dlrow" }
  ];

  try {
    const result = await runJavaScriptSandbox(userCode, "reverseString", testCases);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "Success");
    assert.strictEqual(result.testResults.length, 2);
    console.log("✅ Sandbox successfully compiled and passed 2/2 test cases!");
  } catch (err) {
    console.error("❌ Sandbox validation failed:", err.message);
    process.exit(1);
  }

  // 3. Test Database Seed Data Queries
  console.log("\n📊 Testing Seed Data Queries...");
  try {
    const courses = await dbAll("SELECT * FROM courses");
    assert.ok(courses.length > 0, "No courses found in database");
    console.log(`✅ Seed Verification: Found ${courses.length} courses successfully!`);

    const challenges = await dbAll("SELECT * FROM coding_challenges");
    assert.ok(challenges.length > 0, "No coding challenges found in database");
    console.log(`✅ Seed Verification: Found ${challenges.length} challenges successfully!`);
  } catch (err) {
    console.error("❌ Database queries validation failed:", err.message);
    process.exit(1);
  }

  console.log("\n==========================================");
  console.log("🎉 ALL CORE SYSTEM SANITY TESTS PASSED! 🎉");
  console.log("==========================================");
  process.exit(0);
}

runTests();
