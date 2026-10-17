import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes, createHmac, createHash } from "node:crypto";
const contents = readFileSync(".dev.vars", "utf8");
const secret = contents
  .split(/\r?\n/)
  .find((line) => line.startsWith("BETTER_AUTH_SECRET="))
  ?.slice("BETTER_AUTH_SECRET=".length)
  .trim()
  .replace(/^["']|["']$/g, "");
if (!secret) throw Error("Run node scripts/dev-setup.mjs first.");
mkdirSync(".wrangler", { recursive: true });
execFileSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--file",
    "seeds/development.sql",
  ],
  { stdio: "pipe" },
);
const sessions = {},
  sql = [];
for (const who of ["a", "b", "driver"]) {
  const token = randomBytes(32).toString("base64url"),
    now = Date.now(),
    signature = createHmac("sha256", secret).update(token).digest("base64");
  sql.push(
    "INSERT INTO session(id,userId,token,expiresAt,createdAt,updatedAt) VALUES('" +
      randomUUID() +
      "','demo-user-" +
      who +
      "','" +
      token +
      "'," +
      (now + 3600000) +
      "," +
      now +
      "," +
      now +
      ");",
  );
  sessions[who] = {
    name: "better-auth.session_token",
    value: encodeURIComponent(token + "." + signature),
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
  };
}
const keyB = "hh_" + randomBytes(32).toString("base64url");
sql.push(
  "INSERT INTO apiKeys(id,tenantId,name,tokenHash,prefix,createdAt) VALUES('" +
    randomUUID() +
    "','demo-company-b','Local plan gate test','" +
    createHash("sha256").update(keyB).digest("hex") +
    "','local'," +
    Date.now() +
    ");",
);
writeFileSync(".wrangler/e2e-fixture.sql", sql.join("\n"));
execFileSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--file",
    ".wrangler/e2e-fixture.sql",
  ],
  { stdio: "pipe" },
);
writeFileSync(".wrangler/e2e-state.json", JSON.stringify({ sessions, keyB }));
console.log(
  "Local E2E fixtures ready. No remote services or production data changed.",
);
