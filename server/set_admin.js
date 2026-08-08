import { dbRun, dbAll } from "./db.js";

async function setAdmin() {
  const targetEmail = process.argv[2] || "pavan@gmail.com";
  console.log(`Setting admin role for: ${targetEmail}`);
  const result = await dbRun("UPDATE users SET role = 'admin' WHERE email = ?", [targetEmail]);
  console.log(`Updated ${result.changes} user(s) to admin.`);

  const adminUsers = await dbAll("SELECT id, email, role FROM users WHERE role = 'admin'");
  console.log("Current Admin Users in DB:");
  console.log(adminUsers);
  process.exit(0);
}

setAdmin().catch(console.error);
