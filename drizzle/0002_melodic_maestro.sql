CREATE TYPE "public"."story_decision" AS ENUM('hold', 'develop', 'transition');--> statement-breakpoint
CREATE TABLE "conversation_story_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"phase" text DEFAULT 'opening' NOT NULL,
	"tension" integer DEFAULT 10 NOT NULL,
	"momentum" integer DEFAULT 0 NOT NULL,
	"trust" integer DEFAULT 0 NOT NULL,
	"affinity" integer DEFAULT 0 NOT NULL,
	"conflict" integer DEFAULT 0 NOT NULL,
	"current_location" text,
	"current_time" text,
	"open_threads" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"established_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_transition_turn" integer DEFAULT 0 NOT NULL,
	"calm_turns" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_story_states_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "story_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"source_message_id" uuid,
	"decision" "story_decision" NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state_before" jsonb NOT NULL,
	"state_after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_story_states" ADD CONSTRAINT "conversation_story_states_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_events_conversation_idx" ON "story_events" USING btree ("conversation_id","created_at");