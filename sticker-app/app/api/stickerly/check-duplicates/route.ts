import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST body: { shas: string[] }
// Returns: { duplicates: string[] }  — list of sha values already in DB
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { shas } = await req.json() as { shas: string[] };
  if (!Array.isArray(shas) || shas.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  const found = await prisma.sticker.findMany({
    where: { phash: { in: shas } },
    select: { phash: true },
  });

  const duplicates = found.map((s) => s.phash).filter(Boolean) as string[];
  return NextResponse.json({ duplicates });
}
