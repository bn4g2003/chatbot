import "dotenv/config";
import { db } from "../lib/db";
import { banners } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function seedBanners() {
  console.log("Seeding banners from public/banner folder...");

  const bannerData = [
    {
      imageUrl: "/banner/banner1.png",
      title: "Khám phá thế giới Manga & Anime - Trò chuyện cùng nhân vật bạn yêu thích",
      href: "/vi",
      sortOrder: 1,
      active: true,
    },
    {
      imageUrl: "/banner/2.png",
      title: "Bước vào những câu chuyện nhập vai sống động và chân thực cùng Lorelia",
      href: "/vi/creator",
      sortOrder: 2,
      active: true,
    },
    {
      imageUrl: "/banner/3.png",
      title: "Tự do sáng tạo bối cảnh, tính cách và câu chuyện của riêng bạn",
      href: "/vi/creator",
      sortOrder: 3,
      active: true,
    },
  ];

  const existing = await db.select().from(banners);
  console.log(`Found ${existing.length} existing banners.`);

  for (const b of bannerData) {
    const found = existing.find((item) => item.imageUrl === b.imageUrl);
    if (found) {
      await db.update(banners).set(b).where(eq(banners.id, found.id));
      console.log(`Updated banner: ${b.imageUrl}`);
    } else {
      await db.insert(banners).values(b);
      console.log(`Inserted banner: ${b.imageUrl}`);
    }
  }

  console.log("Banner seeding complete with 3 images!");
  process.exit(0);
}

seedBanners().catch((err) => {
  console.error("Banner seeding error:", err);
  process.exit(1);
});
