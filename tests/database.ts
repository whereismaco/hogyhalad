import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
export function testDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON;");
  for (const migration of readdirSync(resolve("migrations"))
    .filter((p) => p.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(resolve("migrations", migration), "utf8"));
  class Prepared {
    constructor(
      readonly sql: string,
      readonly args: SQLInputValue[] = [],
    ) {}
    bind(...args: SQLInputValue[]) {
      return new Prepared(this.sql, args);
    }
    async all() {
      const prepared = sqlite.prepare(this.sql);
      const results = prepared.all(...this.args);
      return {
        success: true,
        results,
        meta: {
          changes: sqlite.prepare("SELECT changes() AS n").get()!.n,
          rows_read: results.length,
          rows_written: 0,
          duration: 0,
          last_row_id: 0,
          changed_db: true,
          size_after: 0,
        },
      };
    }
    async run() {
      return this.all();
    }
    async first(column?: string) {
      const result = sqlite.prepare(this.sql).get(...this.args);
      return result ? (column ? result[column] : result) : null;
    }
    async raw(options?: { columnNames?: boolean }) {
      const prepared = sqlite.prepare(this.sql);
      const values = prepared.all(...this.args).map((r) => Object.values(r));
      return options?.columnNames
        ? [prepared.columns().map((c) => c.name), ...values]
        : values;
    }
  }
  const db = {
    prepare: (sql: string) => new Prepared(sql),
    batch: async (statements: Prepared[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    exec: async (sql: string) => {
      sqlite.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
  return {
    db: db as unknown as D1Database,
    sqlite,
    close: () => sqlite.close(),
  };
}
