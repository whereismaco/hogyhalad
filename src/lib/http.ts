import { ZodError } from "zod";
import { AppError } from "./domain";
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      },
      400,
    );
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  const message = error instanceof Error ? error.message : "";
  if (message.includes("QUOTA_"))
    return json({ error: "Elérted a csomagod havi korlátját." }, 409);
  if (message.includes("SEAT_LIMIT"))
    return json({ error: "Nincs több szabad felhasználói hely." }, 409);
  if (message.includes("UNIQUE constraint"))
    return json(
      { error: "Ez az adat már létezik, vagy a műveletet már végrehajtottad." },
      409,
    );
  // Provider errors and SQL messages can contain personal data or secrets.
  console.error("HogyHalad request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return json(
    {
      error:
        "A művelet nem sikerült. Próbáld újra, vagy ellenőrizd az integráció beállításait.",
    },
    500,
  );
}
export async function body(request: Request) {
  const raw = await readText(request);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(400, "Hibás JSON kérés.");
  }
}
export async function readBytes(request: Request, maximum = 1048576) {
  if (Number(request.headers.get("content-length") || 0) > maximum)
    throw new AppError(413, "Túl nagy kérés.");
  const reader = request.body?.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  if (reader)
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maximum) {
          await reader.cancel();
          throw new AppError(413, "Túl nagy kérés.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function readText(request: Request, maximum = 1048576) {
  return new TextDecoder().decode(await readBytes(request, maximum));
}
export async function readForm(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data;"))
    throw new AppError(415, "Multipart feltöltés szükséges.");
  const bytes = await readBytes(request, 11 * 1024 * 1024);
  return new Response(bytes.buffer, {
    headers: { "Content-Type": type },
  }).formData();
}
