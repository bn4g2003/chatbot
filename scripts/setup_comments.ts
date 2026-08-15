import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { characters, users, characterComments } from "../lib/db/schema";

async function main() {
  console.log("Setting up character_comments table...");
  
  // 1. Create table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS character_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS character_comments_character_idx ON character_comments(character_id, created_at);
    CREATE INDEX IF NOT EXISTS character_comments_user_idx ON character_comments(user_id);
  `);

  console.log("Table character_comments is ready.");

  // 2. Fetch all users and characters to seed sample comments
  const allUsers = await db.select().from(users);
  const allChars = await db.select().from(characters);

  if (allUsers.length === 0 || allChars.length === 0) {
    console.log("No users or characters found. Skipping comment seeding.");
    return;
  }

  const primaryUser = allUsers[0];
  const otherUsers = allUsers.length > 1 ? allUsers.slice(1) : [primaryUser];

  // Seed sample comments for each character if none exist
  for (const char of allChars) {
    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(characterComments)
      .where(sql`character_id = ${char.id}`);

    if (Number(existing[0]?.count || 0) > 0) {
      continue;
    }

    const sampleReviews = getSampleCommentsForSlug(char.slug);
    for (let i = 0; i < sampleReviews.length; i++) {
      const rev = sampleReviews[i];
      const user = otherUsers[i % otherUsers.length] || primaryUser;
      
      await db.insert(characterComments).values({
        characterId: char.id,
        userId: user.id,
        content: rev.content,
        rating: rev.rating,
        likesCount: rev.likes,
        createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 4), // hours ago
      });
    }
    console.log(`Seeded ${sampleReviews.length} comments for character ${char.slug}`);
  }

  console.log("All comments setup and seeded successfully!");
}

function getSampleCommentsForSlug(slug: string) {
  const genericComments = [
    { content: "Nhân vật phản hồi siêu cuốn và cực kỳ sát nguyên tác anime! Cảm giác như đang nói chuyện với nhân vật thực sự vậy.", rating: 5, likes: 14 },
    { content: "Các câu dẫn thoại và miêu tả hành động rất mượt mà. Kịch bản nhập vai phong phú, 10/10 điểm cho Lorelia!", rating: 5, likes: 8 },
    { content: "Trải nghiệm roleplay đỉnh chóp, tính cách đúng chuẩn không lẫn đi đâu được. Rất mong có thêm nhiều kịch bản mới nữa.", rating: 5, likes: 6 },
    { content: "Giọng văn sâu sắc, nắm bắt cảm xúc nhân vật rất tốt. Tuyệt vời!", rating: 5, likes: 3 },
  ];

  if (slug.includes("frieren")) {
    return [
      { content: "Frieren nói chuyện với tông giọng điềm tĩnh, triết lý về thời gian và phép thuật làm mình xúc động thực sự. Cảm giác như đang đồng hành cùng cô ấy qua hàng trăm năm.", rating: 5, likes: 29 },
      { content: "Thử kịch bản thu thập ma pháp cổ đại mà cuốn quá trời! Bot nhớ chi tiết rất tốt và diễn tả phong thái pháp sư ngàn năm chuẩn đét.", rating: 5, likes: 18 },
      { content: "Đúng chất Frieren lười dậy sớm nhưng lúc nghiêm túc thì ngầu bá cháy. Tuyệt phẩm!", rating: 5, likes: 11 },
    ];
  }

  if (slug.includes("makima")) {
    return [
      { content: "Makima bí ẩn, tao nhã và toát ra thần thái uy quyền đầy thao túng. Từng lời nói vừa ngọt ngào vừa khiến người ta sởn gai ốc!", rating: 5, likes: 35 },
      { content: "Roleplay điều tra Quỷ Súng với Makima cực kỳ căng thẳng và hấp dẫn. Trải nghiệm đỉnh cao luôn.", rating: 5, likes: 21 },
      { content: "Thần thái 'Nghe lời tôi nhé' chuẩn 100% nguyên tác Chainsaw Man. Khuyên mọi người nên thử!", rating: 5, likes: 15 },
    ];
  }

  if (slug.includes("gojo")) {
    return [
      { content: "Thầy Gojo siêu tếu táo, tự tin và ngạo nghễ đúng chuẩn 'Vô Hạ Hạn'. Chat với thầy cười đau cả bụng mà lúc combat thì siêu ngầu!", rating: 5, likes: 42 },
      { content: "Bối cảnh dạo phố ăn bánh ngọt ở Shibuya diễn tả rất dễ thương. 10 sao!", rating: 5, likes: 25 },
    ];
  }

  if (slug.includes("yor")) {
    return [
      { content: "Yor vừa là người vợ dịu dàng đáng yêu vừa là sát thủ Công Chúa Gai sát khí ngút ngàn. Sự đối lập dễ thương cực!", rating: 5, likes: 22 },
      { content: "Kịch bản bữa tối gia đình Forger siêu ấm áp và hài hước. Rất thích cách diễn đạt của bot.", rating: 5, likes: 14 },
    ];
  }

  return genericComments;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
