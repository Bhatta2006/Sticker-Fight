import prisma from "@/lib/prisma";
import StickerGrid from "@/components/StickerGrid";

export default async function AdminStickersPage() {
  const stickers = await prisma.sticker.findMany({
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
    },
  });

  return <StickerGrid stickers={stickers} />;
}
