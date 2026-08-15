import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const userRole = pgEnum("user_role", ["user", "creator", "admin"]);
export const characterStatus = pgEnum("character_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
]);
export const contentRating = pgEnum("content_rating", [
  "general",
  "sensitive",
  "adult",
]);
export const imageType = pgEnum("image_type", ["avatar", "cover", "gallery"]);
export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);
export const credentialOwner = pgEnum("credential_owner", ["user", "system"]);
export const quotaEventType = pgEnum("quota_event_type", [
  "usage",
  "adjustment",
  "refund",
]);
export const storyDecision = pgEnum("story_decision", [
  "hold",
  "develop",
  "transition",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRole("role").default("user").notNull(),
  changePasswordRequired: boolean("change_password_required")
    .default(false)
    .notNull(),
  banned: boolean("banned").default(false).notNull(),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  monthlyMessages: integer("monthly_messages").default(30).notNull(),
  canCreateCharacters: boolean("can_create_characters")
    .default(false)
    .notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

export const userEntitlements = pgTable("user_entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  ...timestamps,
});

export const quotaPeriods = pgTable(
  "quota_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    allowance: integer("allowance").notNull(),
    used: integer("used").default(0).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("quota_period_unique").on(t.userId, t.periodStart)],
);

export const quotaEvents = pgTable("quota_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  quotaPeriodId: uuid("quota_period_id")
    .notNull()
    .references(() => quotaPeriods.id, { onDelete: "cascade" }),
  type: quotaEventType("type").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  actorId: text("actor_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    originalLocale: text("original_locale").default("vi").notNull(),
    status: characterStatus("status").default("draft").notNull(),
    rating: contentRating("rating").default("general").notNull(),
    featured: boolean("featured").default(false).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("characters_status_idx").on(t.status),
    index("characters_owner_idx").on(t.ownerId),
  ],
);

export const characterTranslations = pgTable(
  "character_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    biography: text("biography").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("character_translation_unique").on(t.characterId, t.locale),
    index("character_translation_search_idx").using(
      "gin",
      sql`to_tsvector('simple', ${t.name} || ' ' || ${t.shortDescription})`,
    ),
  ],
);

export const characterPersonas = pgTable("character_personas", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" })
    .unique(),
  canon: text("canon").notNull(),
  personality: text("personality").notNull(),
  motivations: text("motivations").notNull(),
  fears: text("fears").notNull(),
  likes: text("likes").notNull(),
  weaknesses: text("weaknesses").notNull(),
  relationships: text("relationships").notNull(),
  speechStyle: text("speech_style").notNull(),
  vocabulary: text("vocabulary").notNull(),
  addressStyle: text("address_style").notNull(),
  expressionHabits: text("expression_habits").notNull(),
  knowledge: text("knowledge").notNull(),
  unknowns: text("unknowns").notNull(),
  boundaries: text("boundaries").notNull(),
  exampleDialogue: text("example_dialogue").notNull(),
  promptVersion: integer("prompt_version").default(1).notNull(),
  ...timestamps,
});

export const characterScenarios = pgTable("character_scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

export const scenarioTranslations = pgTable(
  "scenario_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => characterScenarios.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    location: text("location").notNull(),
    time: text("time").notNull(),
    userRole: text("user_role").notNull(),
    relationship: text("relationship").notNull(),
    goal: text("goal").notNull(),
    openingMessage: text("opening_message").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("scenario_translation_unique").on(t.scenarioId, t.locale),
  ],
);

export const characterImages = pgTable("character_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: imageType("type").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  altText: text("alt_text"),
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});
export const categoryTranslations = pgTable(
  "category_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    uniqueIndex("category_translation_unique").on(t.categoryId, t.locale),
  ],
);
export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});
export const characterCategories = pgTable(
  "character_categories",
  {
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.categoryId] })],
);
export const characterTags = pgTable(
  "character_tags",
  {
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.tagId] })],
);

export type CustomScenario = {
  title: string;
  description: string;
  location: string;
  time: string;
  userRole: string;
  relationship: string;
  goal: string;
  openingMessage: string;
};

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => characterScenarios.id),
    locale: text("locale").notNull(),
    title: text("title"),
    userPreferredName: text("user_preferred_name"),
    preferredAddress: text("preferred_address"),
    customScenario: jsonb("custom_scenario").$type<CustomScenario>(),
    generating: boolean("generating").default(false).notNull(),
    promptVersion: integer("prompt_version").default(1).notNull(),
    ...timestamps,
  },
  (t) => [index("conversations_user_idx").on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    variantOfId: uuid("variant_of_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const conversationMemories = pgTable("conversation_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  summary: jsonb("summary").notNull(),
  throughMessageId: uuid("through_message_id").references(() => messages.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const conversationStoryStates = pgTable("conversation_story_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" })
    .unique(),
  turnCount: integer("turn_count").default(0).notNull(),
  phase: text("phase").default("opening").notNull(),
  tension: integer("tension").default(10).notNull(),
  momentum: integer("momentum").default(0).notNull(),
  trust: integer("trust").default(0).notNull(),
  affinity: integer("affinity").default(0).notNull(),
  conflict: integer("conflict").default(0).notNull(),
  currentLocation: text("current_location"),
  currentTime: text("current_time"),
  openThreads: jsonb("open_threads").$type<string[]>().default([]).notNull(),
  establishedFacts: jsonb("established_facts")
    .$type<string[]>()
    .default([])
    .notNull(),
  lastTransitionTurn: integer("last_transition_turn").default(0).notNull(),
  calmTurns: integer("calm_turns").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  ...timestamps,
});

export const storyEvents = pgTable(
  "story_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    decision: storyDecision("decision").notNull(),
    confidence: real("confidence").default(0).notNull(),
    reason: text("reason").notNull(),
    signals: jsonb("signals").$type<unknown[]>().default([]).notNull(),
    stateBefore: jsonb("state_before").notNull(),
    stateAfter: jsonb("state_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("story_events_conversation_idx").on(t.conversationId, t.createdAt),
  ],
);

export const apiCredentials = pgTable(
  "api_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: credentialOwner("owner_type").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyLastFour: text("key_last_four").notNull(),
    active: boolean("active").default(true).notNull(),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("credentials_owner_idx").on(t.ownerType, t.userId)],
);

export const aiModelsTable = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull().unique(),
  label: text("label").notNull(),
  active: boolean("active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  modelId: text("model_id").notNull(),
  usedPersonalKey: boolean("used_personal_key").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  successful: boolean("successful").notNull(),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const characterStats = pgTable("character_stats", {
  characterId: uuid("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  views: integer("views").default(0).notNull(),
  chats: integer("chats").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  trendingScore: real("trending_score").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const characterViews = pgTable(
  "character_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id),
    visitorHash: text("visitor_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("views_character_date_idx").on(t.characterId, t.createdAt)],
);
export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.characterId] })],
);
export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.characterId] })],
);

export const characterComments = pgTable(
  "character_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    rating: integer("rating").default(5).notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index("character_comments_character_idx").on(t.characterId, t.createdAt),
    index("character_comments_user_idx").on(t.userId),
  ],
);

export const characterReviews = pgTable("character_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").references(() => users.id),
  decision: text("decision").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const moderationNotes = pgTable("moderation_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const banners = pgTable("banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  imageUrl: text("image_url").notNull(),
  href: text("href"),
  title: text("title").notNull(),
  locale: text("locale"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...timestamps,
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  conversations: many(conversations),
  entitlement: one(userEntitlements),
}));
export const characterRelations = relations(characters, ({ many, one }) => ({
  translations: many(characterTranslations),
  images: many(characterImages),
  scenarios: many(characterScenarios),
  persona: one(characterPersonas),
  stats: one(characterStats),
}));
export const characterTranslationRelations = relations(characterTranslations, ({ one }) => ({
  character: one(characters, {
    fields: [characterTranslations.characterId],
    references: [characters.id],
  }),
}));
export const characterImageRelations = relations(characterImages, ({ one }) => ({
  character: one(characters, {
    fields: [characterImages.characterId],
    references: [characters.id],
  }),
}));
export const characterPersonaRelations = relations(characterPersonas, ({ one }) => ({
  character: one(characters, {
    fields: [characterPersonas.characterId],
    references: [characters.id],
  }),
}));
export const characterStatsRelations = relations(characterStats, ({ one }) => ({
  character: one(characters, {
    fields: [characterStats.characterId],
    references: [characters.id],
  }),
}));
export const characterScenarioRelations = relations(characterScenarios, ({ one, many }) => ({
  character: one(characters, {
    fields: [characterScenarios.characterId],
    references: [characters.id],
  }),
  translations: many(scenarioTranslations),
}));
export const scenarioTranslationRelations = relations(scenarioTranslations, ({ one }) => ({
  scenario: one(characterScenarios, {
    fields: [scenarioTranslations.scenarioId],
    references: [characterScenarios.id],
  }),
}));
