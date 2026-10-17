import { createAuth } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { errorResponse } from "@/lib/http";
async function handler(request: Request) {
  try {
    return await createAuth(await getEnv()).handler(request);
  } catch (error) {
    return errorResponse(error);
  }
}
export { handler as GET, handler as POST };
