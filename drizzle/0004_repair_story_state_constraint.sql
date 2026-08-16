DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = 'public.conversation_story_states'::regclass
			AND conname = 'conversation_story_states_conversation_id_unique'
	) THEN
		ALTER TABLE "conversation_story_states"
			ADD CONSTRAINT "conversation_story_states_conversation_id_unique"
			UNIQUE ("conversation_id");
	END IF;
END
$$;
