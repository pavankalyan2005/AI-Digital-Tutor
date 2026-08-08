import bcrypt from "bcryptjs";
import { dbGet, dbRun } from "./db.js";

async function createAdminAccount() {
  const adminEmail = process.argv[2] || "admin@aidigitaltutor.com";
  const adminPassword = process.argv[3] || "Admin123!";

  console.log(`Creating Admin Account: ${adminEmail}`);

  // Check if account exists
  let user = await dbGet("SELECT * FROM users WHERE email = ?", [adminEmail]);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(adminPassword, salt);

  if (user) {
    console.log(`Account ${adminEmail} already exists. Updating password and ensuring admin role...`);
    await dbRun("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?", [hash, user.id]);
    console.log(`Updated user ID ${user.id} to role = 'admin'.`);
  } else {
    const result = await dbRun(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
      [adminEmail, hash]
    );
    const userId = result.lastID;

    // Create profile
    await dbRun(
      "INSERT INTO profiles (user_id, full_name, avatar, current_level, points, streak_days, last_active_date, onboarding_completed, assessment_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        "System Administrator",
        "https://api.dicebear.com/7.x/bottts/svg?seed=admin_avatar",
        10,
        9999,
        30,
        new Date().toISOString().split("T")[0],
        1,
        1
      ]
    );

    console.log(`Created new Admin User with ID ${userId} and role = 'admin'.`);
  }

  process.exit(0);
}

createAdminAccount().catch(console.error);
