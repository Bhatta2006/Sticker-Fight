import "dotenv/config";
import prisma from "../lib/prisma";

async function testDatabase() {
  console.log("🔍 Testing Prisma Postgres connection...\n");
  try {
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW()`;
    console.log("✅ Connected to database! Server time:", result[0].now);

    const count = await prisma.sticker.count();
    console.log(`✅ stickers table exists — ${count} row(s) found`);

    console.log("\n🎉 All tests passed! Your database is working perfectly.\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
