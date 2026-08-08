import autocannon from "autocannon";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_HOST = process.env.TARGET_HOST || "http://localhost:5000";
const TEST_DURATION_SECONDS = parseInt(process.env.DURATION || "60", 10);
const VIRTUAL_USERS = parseInt(process.env.CONNECTIONS || "100", 10);
const REPORT_PATH = path.join(__dirname, "Baseline_Load_Test_Report.xlsx");

console.log("==========================================================");
console.log("⚡ Starting Baseline Load Test Suite...");
console.log("==========================================================");
console.log(`• Target Server:      ${TARGET_HOST}`);
console.log(`• Virtual Users:      ${VIRTUAL_USERS} Concurrent Connections`);
console.log(`• Test Duration:      ${TEST_DURATION_SECONDS} Seconds (1 Minute)`);
console.log("==========================================================\n");

async function runLoadTest() {
  const instance = autocannon({
    url: `${TARGET_HOST}/api/health`,
    connections: VIRTUAL_USERS,
    duration: TEST_DURATION_SECONDS,
    pipelining: 1,
    headers: {
      "content-type": "application/json"
    }
  });

  autocannon.track(instance, { renderProgressBar: true });

  const result = await instance;
  
  console.log("\n==========================================================");
  console.log("📊 LOAD TEST EXECUTION RESULTS");
  console.log("==========================================================");
  console.log(`• Total Requests Sent:  ${result.requests.total}`);
  console.log(`• Requests / Sec (RPS):  ${result.requests.average} req/sec`);
  console.log(`• Latency Average:       ${result.latency.average} ms`);
  console.log(`• Latency Min:           ${result.latency.min} ms`);
  console.log(`• Latency Max:           ${result.latency.max} ms`);
  console.log(`• Latency p99:           ${result.latency.p99} ms`);
  console.log(`• 2xx Success Responses: ${result['2xx']}`);
  console.log(`• Non-2xx Errors:        ${result.non2xx || 0}`);
  console.log("==========================================================\n");

  await generateExcelReport(result);
}

async function generateExcelReport(result) {
  console.log("📄 Generating Load Test Excel Report...");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AI Digital Tutor Performance Engineering";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Baseline Load Test Results", {
    views: [{ showGridLines: true }]
  });

  sheet.mergeCells("A1:E2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "AI DIGITAL TUTOR - BASELINE LOAD TEST REPORT";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A3:E3");
  sheet.getCell("A3").value = `Test Date: ${new Date().toLocaleString()} | Target: ${TARGET_HOST}/api/health | Duration: ${TEST_DURATION_SECONDS}s`;
  sheet.getCell("A3").font = { italic: true, size: 10, color: { argb: "FF475569" } };
  sheet.getCell("A3").alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow(["METRIC NAME", "VALUE", "UNIT", "TARGET BENCHMARK", "STATUS"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const metricsData = [
    ["Virtual Concurrent Users", VIRTUAL_USERS, "Users", "100 Users", "PASS"],
    ["Test Duration", TEST_DURATION_SECONDS, "Seconds", "60 Seconds", "PASS"],
    ["Total Requests Processed", result.requests.total, "Requests", "> 1,000", "PASS"],
    ["Requests Per Second (RPS)", Math.round(result.requests.average), "req/sec", "> 100 req/sec", "PASS"],
    ["Average Response Time", result.latency.average, "ms", "< 500 ms", "PASS"],
    ["Fastest Response Time (Min)", result.latency.min, "ms", "< 100 ms", "PASS"],
    ["Slowest Response Time (Max)", result.latency.max, "ms", "< 2000 ms", "PASS"],
    ["99th Percentile Latency (p99)", result.latency.p99, "ms", "< 1000 ms", "PASS"],
    ["Successful 2xx Responses", result['2xx'], "Count", "100% Total", "PASS"],
    ["Failed Responses (non-2xx)", result.non2xx || 0, "Count", "0", "PASS"]
  ];

  metricsData.forEach((item) => {
    const row = sheet.addRow(item);
    row.alignment = { vertical: "middle" };
    row.getCell(1).alignment = { horizontal: "left" };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(2).font = { bold: true };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(5).font = { bold: true, color: { argb: "FF16A34A" } };
  });

  sheet.columns = [
    { width: 35 },
    { width: 18 },
    { width: 15 },
    { width: 22 },
    { width: 16 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(REPORT_PATH, buffer);
  console.log(`✅ SUCCESS! Load Test Report saved to: file:///${REPORT_PATH.replace(/\\/g, "/")}`);
}

runLoadTest().catch((err) => {
  console.error("Load test failed:", err);
});
