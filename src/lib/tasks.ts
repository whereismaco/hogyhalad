import { statement, uid } from "./db";
export function taskStatement(
  db: D1Database,
  tenantId: string | null,
  type: string,
  payload: unknown,
  dedupeKey: string,
  id = uid(),
) {
  const now = Date.now();
  return statement(
    db,
    "INSERT INTO tasks(id,tenantId,type,payload,dedupeKey,availableAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(dedupeKey) DO NOTHING",
    id,
    tenantId,
    type,
    JSON.stringify(payload),
    dedupeKey,
    now,
    now,
    now,
  );
}
export async function enqueue(
  db: D1Database,
  tenantId: string | null,
  type: string,
  payload: unknown,
  dedupeKey: string,
) {
  await taskStatement(db, tenantId, type, payload, dedupeKey).run();
  return db
    .prepare("SELECT id FROM tasks WHERE dedupeKey=?")
    .bind(dedupeKey)
    .first<{ id: string }>();
}
export function taskAfterEvent(
  db: D1Database,
  tenantId: string,
  type: string,
  payload: unknown,
  dedupeKey: string,
  eventId: string,
) {
  const now = Date.now();
  return statement(
    db,
    "INSERT INTO tasks(id,tenantId,type,payload,dedupeKey,availableAt,createdAt,updatedAt) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM jobEvents WHERE id=? AND tenantId=?) ON CONFLICT(dedupeKey) DO NOTHING",
    uid(),
    tenantId,
    type,
    JSON.stringify(payload),
    dedupeKey,
    now,
    now,
    now,
    eventId,
    tenantId,
  );
}
