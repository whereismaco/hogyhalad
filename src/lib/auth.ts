import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { database } from "./db";
import { required, type Env } from "./env";
import { escapeHtml } from "./security";
export function createAuth(env: Env) {
  return betterAuth({
    appName: "HogyHalad",
    baseURL: env.APP_URL,
    secret: required(env.BETTER_AUTH_SECRET, "Belépési titok"),
    database: drizzleAdapter(database(env), {
      provider: "sqlite",
      transaction: false,
    }),
    emailAndPassword: { enabled: false },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {},
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    trustedOrigins: [env.APP_URL],
    advanced: { useSecureCookies: new URL(env.APP_URL).protocol === "https:" },
    plugins: [
      magicLink({
        expiresIn: 900,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization:
                "Bearer " + required(env.RESEND_API_KEY, "E-mail-küldés"),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: env.AUTH_FROM,
              to: email,
              subject: "Belépés a HogyHalad fiókodba",
              html:
                '<p>A belépési link 15 percig, egyszer használható.</p><p><a href="' +
                escapeHtml(url) +
                '">Belépés a HogyHaladba</a></p><p>Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.</p>',
            }),
          });
          if (!response.ok)
            throw new Error("A belépőlevél küldése sikertelen.");
        },
      }),
    ],
  });
}
