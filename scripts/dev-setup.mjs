import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".dev.vars")) {
  writeFileSync(
    ".dev.vars",
    "BETTER_AUTH_SECRET=" +
      randomBytes(48).toString("base64url") +
      "\nDATA_ENCRYPTION_KEY=" +
      randomBytes(32).toString("base64") +
      "\n",
  );
  console.log("Local development secrets created in ignored .dev.vars.");
} else console.log(".dev.vars already exists; preserved.");
