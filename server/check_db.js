import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "tutor.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("DB connection error:", err.message);
  }
});

db.all("SELECT id, title, video_url FROM modules", [], (err, rows) => {
  if (err) {
    console.error("Query error:", err.message);
  } else {
    console.log("Modules in Database:");
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
