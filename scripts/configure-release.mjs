import { readFileSync, writeFileSync } from "node:fs";
const environment = process.argv[2];
if (!["staging", "production"].includes(environment))
  throw Error("Invalid environment.");
const id = process.env.D1_DATABASE_ID,
  url = process.env.APP_URL;
if (!id || !/^[a-f0-9-]{36}$/i.test(id) || !url?.startsWith("https://"))
  throw Error("D1_DATABASE_ID and HTTPS APP_URL are required.");
for (const path of ["wrangler.jsonc", "wrangler.background.jsonc"]) {
  const config = JSON.parse(readFileSync(path, "utf8"));
  config.env[environment].d1_databases[0].database_id = id;
  config.env[environment].vars.APP_URL = url;
  if (process.env.EMAIL_DOMAIN)
    config.env[environment].vars.EMAIL_DOMAIN = process.env.EMAIL_DOMAIN;
  if (process.env.AUTH_FROM)
    config.env[environment].vars.AUTH_FROM = process.env.AUTH_FROM;
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}
