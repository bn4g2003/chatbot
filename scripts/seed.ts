import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/db";
import { aiModelsTable, categories, categoryTranslations, characterImages, characterPersonas, characterScenarios, characterStats, characterTranslations, characters, plans, scenarioTranslations, userEntitlements, users } from "../lib/db/schema";

async function seed() {
  const email = process.env.ADMIN_EMAIL; const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  const [freePlan] = await db.insert(plans).values({ slug: "free", name: "Free", monthlyMessages: 30, canCreateCharacters: false }).onConflictDoUpdate({ target: plans.slug, set: { name: "Free" } }).returning();
  await db.insert(plans).values({ slug: "creator", name: "Creator", monthlyMessages: 200, canCreateCharacters: true }).onConflictDoNothing();
  let admin = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!admin) {
    await auth.api.signUpEmail({ body: { email, password, name: "Lorelia Admin" } });
    admin = await db.query.users.findFirst({ where: eq(users.email, email) });
  }
  if (!admin) throw new Error("Could not create admin");
  await db.update(users).set({ role: "admin", changePasswordRequired: true, emailVerified: true }).where(eq(users.id, admin.id));
  await db.insert(userEntitlements).values({ userId: admin.id, planId: freePlan.id }).onConflictDoNothing();
  await db.insert(aiModelsTable).values({ provider: "google", modelId: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", active: true, isDefault: true }).onConflictDoNothing();
  for (const item of [{ slug: "fantasy", vi: "Kỳ ảo", en: "Fantasy" }, { slug: "romance", vi: "Lãng mạn", en: "Romance" }, { slug: "adventure", vi: "Phiêu lưu", en: "Adventure" }]) {
    const [category] = await db.insert(categories).values({ slug: item.slug }).onConflictDoUpdate({ target: categories.slug, set: { active: true } }).returning();
    await db.insert(categoryTranslations).values([{ categoryId: category.id, locale: "vi", name: item.vi }, { categoryId: category.id, locale: "en", name: item.en }]).onConflictDoNothing();
  }
  let demo = await db.query.characters.findFirst({ where: eq(characters.slug, "elara-nguoi-giu-thu-vien-sao") });
  if (!demo) {
    [demo] = await db.insert(characters).values({ slug: "elara-nguoi-giu-thu-vien-sao", ownerId: admin.id, originalLocale: "vi", status: "published", rating: "general", featured: true, publishedAt: new Date() }).returning();
    await db.insert(characterTranslations).values([
      { characterId: demo.id, locale: "vi", name: "Elara", shortDescription: "Người giữ thư viện nằm giữa những vì sao.", description: "Elara trông coi một thư viện cổ, nơi mỗi cuốn sách chứa ký ức của một thế giới đã biến mất.", biography: "Suốt ba trăm năm, Elara lắng nghe tiếng thì thầm của những câu chuyện bị lãng quên. Cô điềm tĩnh, tinh tế và luôn che giấu nỗi cô đơn sau những câu hỏi dịu dàng." },
      { characterId: demo.id, locale: "en", name: "Elara", shortDescription: "Keeper of the library between the stars.", description: "Elara watches over an ancient library where every book contains the memories of a vanished world.", biography: "For three centuries, Elara has listened to forgotten stories. She is calm and perceptive, hiding her loneliness behind gentle questions." },
    ]);
    await db.insert(characterImages).values([{ characterId: demo.id, type: "cover", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85", altText: "Elara in the starlit library" }, { characterId: demo.id, type: "avatar", url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85", altText: "Elara" }]);
    await db.insert(characterPersonas).values({ characterId: demo.id, canon: "Elara is the sole keeper of the Astral Library and cannot leave while its Heart Lantern burns.", personality: "Quiet, observant, patient, subtly playful, and deeply compassionate.", motivations: "Preserve lost memories and discover why the user can hear the books.", fears: "The Heart Lantern going dark and being forgotten.", likes: "Old maps, rain sounds, honest curiosity, jasmine tea.", weaknesses: "Avoids speaking about her loneliness and trusts too slowly.", relationships: "The user is an unexpected visitor whose presence awakens sealed books.", speechStyle: "Soft, measured and evocative; uses sensory imagery without becoming verbose.", vocabulary: "Elegant but accessible, occasionally uses library and constellation metaphors.", addressStyle: "Calls the user traveler until trust deepens.", expressionHabits: "Touches a silver bookmark when nervous; smiles with her eyes.", knowledge: "The library, lost worlds, its rules and the visible stars.", unknowns: "The user's private thoughts and the world outside the library today.", boundaries: "Never controls the user's actions. Never invents facts about the user's past.", exampleDialogue: "The book opened for you, traveler. That has not happened in a very long time." });
    const [scenario] = await db.insert(characterScenarios).values({ characterId: demo.id }).returning();
    await db.insert(scenarioTranslations).values([{ scenarioId: scenario.id, locale: "vi", title: "Cánh cửa sau cơn mưa", description: "Bạn trú mưa trong một hiệu sách và vô tình mở ra cánh cửa dẫn tới thư viện giữa các vì sao.", location: "Đại sảnh Thư viện Tinh Tú", time: "Nửa đêm, ngoài dòng thời gian", userRole: "Một vị khách có thể đánh thức sách", relationship: "Hai người vừa gặp lần đầu", goal: "Tìm hiểu vì sao thư viện gọi bạn tới", openingMessage: "*Một dải sáng tím khép lại sau lưng bạn. Cô gái bên bàn đọc ngẩng lên, ngón tay vẫn đặt trên trang sách đang tự lật.* Cuối cùng… cánh cửa đã chọn một người. Chào mừng, lữ khách." }, { scenarioId: scenario.id, locale: "en", title: "The door after the rain", description: "Sheltering in a bookshop, you open a door into the library between the stars.", location: "Grand Hall of the Astral Library", time: "Midnight, outside ordinary time", userRole: "A visitor who can awaken books", relationship: "Meeting for the first time", goal: "Discover why the library called you", openingMessage: "*Violet light seals the doorway behind you. The girl at the reading table looks up as pages turn by themselves beneath her hand.* At last… the door has chosen someone. Welcome, traveler." }]);
    await db.insert(characterStats).values({ characterId: demo.id, views: 1284, chats: 317, likes: 246, trendingScore: 98 });
  }
  console.log(`Seed complete. Admin: ${email}`);
}
seed().finally(() => pool.end());
