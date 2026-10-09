import { execSync } from "node:child_process";
import process from "node:process";

// On Vercel the build runs right after install, and `@calcom/web#build` already runs
// everything web needs from post-install (Prisma generate, app-store codegen, platform
// packages) through its task dependencies. Running it here too only repeats that work.
if (process.env.VERCEL === "1") {
  console.log("Skipping turbo post-install on Vercel: the build task graph runs it.");
  process.exit(0);
}

try {
  execSync("turbo run post-install", { stdio: "inherit" });
} catch (error) {
  process.exit(error.status ?? 1);
}
