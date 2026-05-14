import cloudinary from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (!session || user?.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { paramsToSign } = body as { paramsToSign: Record<string, string> };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return Response.json({ signature });
}
