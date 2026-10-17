import { AppError } from "./domain";
import { statement, uid } from "./db";
import type { Access } from "./access";
import { getJob } from "./crm";
export function imageMime(bytes: Uint8Array) {
  if (
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function upload(
  ctx: Access,
  jobId: string,
  file: File,
  kind: "PHOTO" | "SIGNATURE",
) {
  await getJob(ctx, jobId);
  if (file.size > 10 * 1024 * 1024 || file.size < 40)
    throw new AppError(400, "A kép legfeljebb 10 MB lehet.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = imageMime(bytes);
  if (!mime || (kind === "SIGNATURE" && mime !== "image/png"))
    throw new AppError(
      400,
      "PNG, JPG vagy WebP kép tölthető fel; az aláírás PNG legyen.",
    );
  if (kind === "SIGNATURE") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      width = view.getUint32(16),
      height = view.getUint32(20);
    if (width < 1 || height < 1 || width > 3000 || height > 1500)
      throw new AppError(
        400,
        "Az aláírás mérete legfeljebb 3000 × 1500 képpont lehet.",
      );
  }
  const id = uid(),
    key = ctx.tenant.id + "/" + jobId + "/" + id;
  await ctx.env.FILES.put(key, bytes, { httpMetadata: { contentType: mime } });
  try {
    await statement(
      ctx.env.DB,
      "INSERT INTO files(id,tenantId,jobId,kind,objectKey,filename,mime,size,createdAt) VALUES(?,?,?,?,?,?,?,?,?)",
      id,
      ctx.tenant.id,
      jobId,
      kind,
      key,
      file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100),
      mime,
      bytes.length,
      Date.now(),
    ).run();
  } catch (error) {
    await ctx.env.FILES.delete(key);
    throw error;
  }
  return { id };
}
