import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Env } from "../env";
export function database(env: Env) {
  return drizzle(env.DB, { schema });
}
export function statement(db: D1Database, query: string, ...args: unknown[]) {
  return db.prepare(query).bind(...args);
}
export async function rows<T>(
  db: D1Database,
  query: string,
  ...args: unknown[]
): Promise<T[]> {
  return (await statement(db, query, ...args).all<T>()).results;
}
export async function first<T>(
  db: D1Database,
  query: string,
  ...args: unknown[]
): Promise<T | null> {
  return statement(db, query, ...args).first<T>();
}
export const uid = () => crypto.randomUUID();
