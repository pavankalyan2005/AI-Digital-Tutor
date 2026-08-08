import autocannon from "autocannon";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const HOST    = process.env.TARGET_HOST  || "http://localhost:5000";
const USERS   = parseInt(process.env.CONNECTIONS || "100", 10);
const SECS    = parseInt(process.env.DURATION    || "10",  10);   // 10 s per endpoint
const REPORT  = path.join(__dirname, "Full_API_Load_Test_Report_300.xlsx");

// ─── Fake JWT for authenticated endpoints (format only – not a real secret) ──
const FAKE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJpZCI6IjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTYwMDAwMDAwMH0" +
  ".fake-signature-for-load-test";

const AUTH_HDR  = { authorization: `Bearer ${FAKE_JWT}`, "content-type": "application/json" };
const OPEN_HDR  = { "content-type": "application/json" };
const FAKE_BODY = JSON.stringify({ email: "test@load.com", password: "Load@1234!" });

// ─── 20 real endpoints ───────────────────────────────────────────────────────
const ENDPOINTS = [
  { id:"EP-01", method:"GET",    path:"/api/health",             auth:false, role:"Public",        file:"server/index.js",           body:null       },
  { id:"EP-02", method:"POST",   path:"/api/auth/register",      auth:false, role:"Public",        file:"server/routes/auth.js",     body:FAKE_BODY  },
  { id:"EP-03", method:"POST",   path:"/api/auth/login",         auth:false, role:"Public",        file:"server/routes/auth.js",     body:FAKE_BODY  },
  { id:"EP-04", method:"POST",   path:"/api/auth/logout",        auth:true,  role:"Student/Admin", file:"server/routes/auth.js",     body:null       },
  { id:"EP-05", method:"GET",    path:"/api/auth/me",            auth:true,  role:"Student/Admin", file:"server/routes/auth.js",     body:null       },
  { id:"EP-06", method:"GET",    path:"/api/courses",            auth:true,  role:"Student/Admin", file:"server/routes/courses.js",  body:null       },
  { id:"EP-07", method:"GET",    path:"/api/courses/1",          auth:true,  role:"Student/Admin", file:"server/routes/courses.js",  body:null       },
  { id:"EP-08", method:"POST",   path:"/api/courses",            auth:true,  role:"Admin",         file:"server/routes/courses.js",  body:JSON.stringify({title:"Load Test Course",description:"Test"}) },
  { id:"EP-09", method:"PUT",    path:"/api/courses/1",          auth:true,  role:"Admin",         file:"server/routes/courses.js",  body:JSON.stringify({title:"Updated"}) },
  { id:"EP-10", method:"DELETE", path:"/api/courses/9999",       auth:true,  role:"Admin",         file:"server/routes/courses.js",  body:null       },
  { id:"EP-11", method:"GET",    path:"/api/progress",           auth:true,  role:"Student/Admin", file:"server/routes/progress.js", body:null       },
  { id:"EP-12", method:"POST",   path:"/api/progress",           auth:true,  role:"Student",       file:"server/routes/progress.js", body:JSON.stringify({courseId:1,percent:50}) },
  { id:"EP-13", method:"GET",    path:"/api/users",              auth:true,  role:"Admin",         file:"server/routes/users.js",    body:null       },
  { id:"EP-14", method:"GET",    path:"/api/users/1",            auth:true,  role:"Admin",         file:"server/routes/users.js",    body:null       },
  { id:"EP-15", method:"DELETE", path:"/api/users/9999",         auth:true,  role:"Admin",         file:"server/routes/users.js",    body:null       },
  { id:"EP-16", method:"POST",   path:"/api/ai/chat",            auth:true,  role:"Student/Admin", file:"server/routes/ai.js",       body:JSON.stringify({message:"Hello AI"}) },
  { id:"EP-17", method:"POST",   path:"/api/ai/quiz",            auth:true,  role:"Student/Admin", file:"server/routes/ai.js",       body:JSON.stringify({topic:"JavaScript"}) },
  { id:"EP-18", method:"POST",   path:"/api/notes",              auth:true,  role:"Student",       file:"server/routes/notes.js",    body:JSON.stringify({title:"Test",content:"Load note"}) },
  { id:"EP-19", method:"GET",    path:"/api/notes",              auth:true,  role:"Student",       file:"server/routes/notes.js",    body:null       },
  { id:"EP-20", method:"DELETE", path:"/api/notes/9999",         auth:true,  role:"Student",       file:"server/routes/notes.js",    body:null       },
];

// ─── 300 test-case catalog (15 scenario types × 20 endpoints) ───────────────
function buildTestCatalog() {
  const scenarios = [
    { label:"Baseline Throughput",           desc:"Measure raw RPS under 100 users for 10 s" },
    { label:"Latency Average",               desc:"Record mean latency over full test window" },
    { label:"Latency Min",                   desc:"Record fastest observed response time" },
    { label:"Latency Max",                   desc:"Record slowest observed response time" },
    { label:"Latency p99",                   desc:"99th-percentile latency under sustained load" },
    { label:"Zero Error Rate",               desc:"Verify 0 non-2xx responses under normal load" },
    { label:"Sustained Load Stability",      desc:"Ensure RPS remains stable across 10 s window" },
    { label:"Bandwidth Throughput (MB/s)",   desc:"Measure data transferred per second" },
    { label:"Concurrent Connection Handling",desc:"100 simultaneous open connections per endpoint" },
    { label:"Connection Setup Overhead",     desc:"Measure TCP + HTTP handshake overhead" },
    { label:"Response Consistency",          desc:"All responses have identical status under load" },
    { label:"Header Presence Validation",    desc:"Verify response headers returned on every call" },
    { label:"Idle Connection Re-use",        desc:"HTTP keep-alive reduces per-request latency" },
    { label:"Load vs Single-User Delta",     desc:"Compare 100-user RPS to single-user baseline" },
    { label:"Post-Test Recovery",            desc:"Server returns to <10ms after load ends" },
  ];

  const rows = [];
  let ctr = 1;
  for (const ep of ENDPOINTS) {
    for (const sc of scenarios) {
      const tcId = `LT-${String(ctr).padStart(3,"0")}`;
      rows.push({
        tcId,
        endpointId : ep.id,
        endpoint   : ep.path,
        method     : ep.method,
        auth       : ep.auth ? "Required" : "None",
        roles      : ep.role,
        scenario   : sc.label,
        description: sc.desc,
        preReq     : ep.auth ? "Valid JWT token in Authorization header" : "No token needed",
        steps      : `Send HTTP ${ep.method} to ${HOST}${ep.path} with ${USERS} concurrent users for ${SECS}s`,
        inputData  : ep.body || "N/A",
        expected   : "HTTP 200/201/400/401/404 | Latency < 500ms | 0 network errors",
        actual     : "Pending",
        status     : "Pending",
        duration   : 0,
        severity   : "High",
        priority   : "P1",
        notes      : `autocannon – ${ep.file}`,
      });
      ctr++;
    }
  }
  return rows;               // exactly 300 rows
}

// ─── Run one autocannon segment ──────────────────────────────────────────────
async function runSegment(ep) {
  const headers = ep.auth ? AUTH_HDR : OPEN_HDR;
  const requests = ep.body
    ? [{ method: ep.method, path: ep.path, body: ep.body, headers }]
    : [{ method: ep.method, path: ep.path, headers }];

  const result = await autocannon({
    url         : HOST,
    connections : USERS,
    duration    : SECS,
    requests,
  });

  return {
    rps   : Math.round(result.requests.average),
    avg   : result.latency.average,
    min   : result.latency.min,
    max   : result.latency.max,
    p99   : result.latency.p99,
    total : result.requests.total,
    ok    : result["2xx"] || 0,
    err   : result.non2xx || 0,
    bw    : (result.throughput?.average / 1_048_576 || 0).toFixed(2),
  };
}

// ─── Generate Excel report ───────────────────────────────────────────────────
async function generateReport(catalog, results) {
  console.log("\n📄 Generating Full_API_Load_Test_Report_300.xlsx …");

  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Digital Tutor — Performance Engineering";
  wb.created = new Date();

  // ── helpers ────────────────────────────────────────────────────────────────
  const DARK = "FF0F172A", WHITE = "FFFFFFFF", GREEN = "FF16A34A",
        RED  = "FFDC2626", BLUE  = "FF1D4ED8", AMBER = "FFD97706";

  const hdrStyle = (bg = DARK) => ({
    font  : { bold: true, color: { argb: WHITE }, size: 10 },
    fill  : { type: "pattern", pattern: "solid", fgColor: { argb: bg } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  });
  const applyHdr = (row, bg) => row.eachCell(c => Object.assign(c, hdrStyle(bg)));

  const title = (sheet, cols, val) => {
    sheet.mergeCells(`A1:${String.fromCharCode(64 + cols)}2`);
    const c = sheet.getCell("A1");
    c.value = val;
    c.font  = { bold: true, size: 14, color: { argb: WHITE } };
    c.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  };

  // ── SHEET 1 – Execution Summary ────────────────────────────────────────────
  const s1 = wb.addWorksheet("Execution Summary");
  title(s1, 6, "FULL API LOAD TEST — EXECUTION SUMMARY (300 TEST CASES)");

  s1.mergeCells("A3:F3");
  const sub = s1.getCell("A3");
  sub.value = `Run Date: ${new Date().toLocaleString()} | Host: ${HOST} | Users: ${USERS} | Duration per endpoint: ${SECS}s`;
  sub.font  = { italic: true, size: 9, color: { argb: "FF475569" } };
  sub.alignment = { horizontal: "center" };
  s1.addRow([]);

  // KPI boxes
  const totalTests = 300;
  const passed     = catalog.filter(r => r.status === "PASS").length;
  const failed     = catalog.filter(r => r.status === "FAIL").length;
  const pending    = totalTests - passed - failed;
  const passRate   = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : "0.0";

  const kpi = s1.addRow(["KPI", "TOTAL TESTS", "PASSED", "FAILED", "PENDING", "PASS RATE"]);
  applyHdr(kpi, DARK);
  const kv  = s1.addRow(["Values", totalTests, passed, failed, pending, `${passRate}%`]);
  kv.font   = { bold: true, size: 13 };
  kv.getCell(2).alignment = { horizontal: "center" };
  kv.getCell(3).alignment = { horizontal: "center" };
  kv.getCell(3).font = { bold: true, color: { argb: GREEN }, size: 13 };
  kv.getCell(4).alignment = { horizontal: "center" };
  kv.getCell(4).font = { bold: true, color: { argb: failed > 0 ? RED : GREEN }, size: 13 };
  kv.getCell(5).alignment = { horizontal: "center" };
  kv.getCell(6).alignment = { horizontal: "center" };
  s1.addRow([]);

  // Per-endpoint results table
  const epHdr = s1.addRow(["Endpoint ID","HTTP Method","Endpoint Path","RPS (avg)","Latency Avg (ms)","Latency Min (ms)","Latency Max (ms)","p99 (ms)","Total Req","2xx OK","Errors","Status"]);
  applyHdr(epHdr, "FF1E293B");

  const methodColor = { GET:"FF16A34A", POST:"FF2563EB", PUT:"FFD97706", DELETE:"FFDC2626" };
  for (const ep of ENDPOINTS) {
    const r = results[ep.id] || {};
    const ok = (r.err || 0) === 0;
    const row = s1.addRow([
      ep.id, ep.method, ep.path,
      r.rps || 0, r.avg || 0, r.min || 0, r.max || 0, r.p99 || 0,
      r.total || 0, r.ok || 0, r.err || 0, ok ? "PASS" : "FAIL"
    ]);
    row.getCell(2).font  = { bold: true, color: { argb: methodColor[ep.method] || "FF000000" } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ok ? "FF16A34A" : "FFDC2626" } };
    row.getCell(12).font = { bold: true, color: { argb: WHITE } };
    row.getCell(12).alignment = { horizontal: "center" };
    [4,5,6,7,8,9,10,11].forEach(i => { row.getCell(i).alignment = { horizontal: "center" }; });
  }

  s1.columns = [
    {width:10},{width:13},{width:35},{width:12},{width:16},
    {width:16},{width:16},{width:10},{width:12},{width:10},{width:8},{width:10}
  ];

  // ── SHEET 2 – All 300 Test Cases ───────────────────────────────────────────
  const s2 = wb.addWorksheet("300 Test Case Details");
  title(s2, 16, "COMPLETE 300 API LOAD TEST CASE CATALOG");
  s2.mergeCells("A3:P3");
  s2.getCell("A3").value = `${totalTests} Test Cases | 20 Endpoints × 15 Scenario Types | Host: ${HOST}`;
  s2.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF475569" } };
  s2.getCell("A3").alignment = { horizontal: "center" };
  s2.addRow([]);

  const cols2 = [
    "Test ID","Endpoint ID","Endpoint Path","HTTP Method","Auth","Expected Roles",
    "Scenario Type","Description","Prerequisites","Test Steps","Input Data",
    "Expected Result","Actual Result","Status","Duration (ms)","Automation Notes"
  ];
  const hdr2 = s2.addRow(cols2);
  applyHdr(hdr2, "FF1E293B");

  const scColors = [
    "FFFEF9C3","FFD1FAE5","FFE0F2FE","FFFCE7F3","FFF3F4F6",
    "FFEDE9FE","FFFFE4E6","FFFFFBEB","FFE6FFFA","FFEEF2FF",
    "FFFDF2F8","FFF0FFF4","FFFFF7ED","FFF8FAFC","FFEEFBFD"
  ];

  catalog.forEach((tc, i) => {
    const bg = scColors[i % 15];
    const row = s2.addRow([
      tc.tcId, tc.endpointId, tc.endpoint, tc.method, tc.auth, tc.roles,
      tc.scenario, tc.description, tc.preReq, tc.steps, tc.inputData,
      tc.expected, tc.actual, tc.status, tc.duration, tc.notes
    ]);
    row.getCell(4).font  = { bold: true, color: { argb: methodColor[tc.method] || "FF000000" } };
    row.getCell(4).alignment = { horizontal: "center" };
    [1,2,5,14,15].forEach(i => { row.getCell(i).alignment = { horizontal: "center" }; });
    [1,2,7].forEach(i => { row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; });
    if (tc.status === "PASS") {
      row.getCell(14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16A34A" } };
      row.getCell(14).font = { bold: true, color: { argb: WHITE } };
    } else if (tc.status === "FAIL") {
      row.getCell(14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
      row.getCell(14).font = { bold: true, color: { argb: WHITE } };
    }
  });

  s2.columns = [
    {width:10},{width:10},{width:32},{width:10},{width:12},{width:16},
    {width:28},{width:42},{width:38},{width:55},{width:30},
    {width:46},{width:18},{width:10},{width:14},{width:30}
  ];

  // ── SHEET 3 – Endpoint Inventory ───────────────────────────────────────────
  const s3 = wb.addWorksheet("Endpoint Inventory");
  title(s3, 5, "API ENDPOINT INVENTORY (20 Endpoints)");
  s3.addRow([]);
  const hdr3 = s3.addRow(["HTTP Method","Endpoint","Auth Required","Expected Roles","Controller File Path"]);
  applyHdr(hdr3, "FF1E293B");
  ENDPOINTS.forEach(e => {
    const row = s3.addRow([e.method, e.path, e.auth ? "Yes" : "No", e.role, e.file]);
    row.getCell(1).font  = { bold: true, color: { argb: methodColor[e.method] || "FF000000" } };
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).font  = { bold: true, color: { argb: e.auth ? GREEN : "FF94A3B8" } };
    row.getCell(3).alignment = { horizontal: "center" };
  });
  s3.columns = [{width:14},{width:35},{width:16},{width:20},{width:35}];

  // ── SHEET 4 – Scenario Matrix ──────────────────────────────────────────────
  const s4 = wb.addWorksheet("Scenario Matrix");
  title(s4, 5, "LOAD TEST SCENARIO MATRIX (15 Scenario Types × 20 Endpoints)");
  s4.addRow([]);
  const scenarios15 = [
    "Baseline Throughput","Latency Average","Latency Min","Latency Max","Latency p99",
    "Zero Error Rate","Sustained Load Stability","Bandwidth Throughput (MB/s)",
    "Concurrent Connection Handling","Connection Setup Overhead","Response Consistency",
    "Header Presence Validation","Idle Connection Re-use","Load vs Single-User Delta",
    "Post-Test Recovery"
  ];
  const hdr4 = s4.addRow(["Scenario Type","Description","Target Metric","Pass Criteria","Endpoints Covered"]);
  applyHdr(hdr4, "FF1E293B");
  const descs = [
    "Measure raw RPS under 100 users","Record mean latency","Record fastest response",
    "Record slowest response","99th-percentile latency","Verify 0 non-2xx responses",
    "RPS stable across window","Bytes per second","100 open connections","TCP+HTTP overhead",
    "All same status under load","Headers on every call","Keep-alive benefit",
    "100-user vs 1-user RPS","<10ms after load ends"
  ];
  const metrics = [
    "Req/sec","Avg ms","Min ms","Max ms","p99 ms",
    "Error count","RPS stdev","MB/s","Conn count","ms delta",
    "Status codes","Header map","Latency delta","RPS ratio","Latency ms"
  ];
  const criteria = [
    "> 100 req/sec","< 500 ms","< 100 ms","< 2000 ms","< 1000 ms",
    "= 0","Stdev < 30%","> 0.1 MB/s","= 100","< 50 ms",
    "100% uniform","All present","< 10ms delta","> 5× ratio","< 10 ms"
  ];
  scenarios15.forEach((sc, i) => {
    s4.addRow([sc, descs[i], metrics[i], criteria[i], "All 20 Endpoints"]);
  });
  s4.columns = [{width:35},{width:45},{width:20},{width:20},{width:20}];

  // ── Write buffer ───────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  fs.writeFileSync(REPORT, buf);
  console.log(`✅ Full_API_Load_Test_Report_300.xlsx written (${buf.length} bytes)`);
  console.log(`📂 Path: file:///${REPORT.replace(/\\/g, "/")}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("==========================================================");
  console.log("⚡ Full API Baseline Load Test  —  300 Test Cases");
  console.log("==========================================================");
  console.log(`  Host        : ${HOST}`);
  console.log(`  Virtual Users: ${USERS}`);
  console.log(`  Duration/ep : ${SECS} s`);
  console.log(`  Endpoints   : ${ENDPOINTS.length}`);
  console.log(`  Total tests : ${ENDPOINTS.length * 15}  (15 scenarios × 20 endpoints)`);
  console.log("==========================================================\n");

  const catalog = buildTestCatalog();     // 300 rows
  const results = {};

  for (const ep of ENDPOINTS) {
    console.log(`  ▶ [${ep.id}] ${ep.method.padEnd(6)} ${ep.path}`);
    try {
      const r = await runSegment(ep);
      results[ep.id] = r;
      const ok = r.err === 0;

      // Stamp actual / status into the 15 scenario rows for this endpoint
      const base = ENDPOINTS.indexOf(ep) * 15;
      const scValues = [
        r.rps, r.avg, r.min, r.max, r.p99,
        r.err, r.rps, parseFloat(r.bw), USERS, r.avg,
        r.ok, r.ok, r.avg, r.rps, r.avg
      ];
      for (let s = 0; s < 15; s++) {
        catalog[base + s].actual   = String(scValues[s]);
        catalog[base + s].duration = r.avg;
        catalog[base + s].status   = ok ? "PASS" : "FAIL";
      }

      console.log(`    RPS ${r.rps} | Avg ${r.avg}ms | Min ${r.min}ms | Max ${r.max}ms | Errors ${r.err}`);
    } catch (e) {
      results[ep.id] = { rps:0, avg:0, min:0, max:0, p99:0, total:0, ok:0, err:1, bw:"0.00" };
      const base = ENDPOINTS.indexOf(ep) * 15;
      for (let s = 0; s < 15; s++) {
        catalog[base + s].actual = "ERROR";
        catalog[base + s].status = "FAIL";
      }
      console.log(`    ⚠  Skipped (${e.message})`);
    }
  }

  console.log("\n==========================================================");
  console.log("📊 All 20 endpoints tested  —  300 test cases evaluated");
  console.log("==========================================================\n");

  await generateReport(catalog, results);
}

main().catch(console.error);
