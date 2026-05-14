import prisma from "@/lib/prisma";
import StickerGrid from "@/components/StickerGrid";
import { auth } from "@/lib/auth";

export default async function AdminStickersPage() {
  const session = await auth();
  const user = session?.user as
    | { name?: string; id?: string; role?: string }
    | undefined;
  const adminKey = user?.name ?? user?.id;

  const stickers = await prisma.sticker.findMany({
    where: adminKey ? { verifiedBy: adminKey } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      subCategory: true,
      rarity: true,
      isLive: true,
      cloudinaryUrl: true,
      thumbnailUrl: true,
      type: true,
      verifiedBy: true,
    },
  });

  return <StickerGrid stickers={stickers} />;
}
