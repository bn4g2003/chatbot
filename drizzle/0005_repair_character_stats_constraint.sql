DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = 'public.character_stats'::regclass
			AND contype IN ('p', 'u')
			AND conkey = ARRAY[
				(
					SELECT attnum
					FROM pg_attribute
					WHERE attrelid = 'public.character_stats'::regclass
						AND attname = 'character_id'
				)
			]::smallint[]
	) THEN
		ALTER TABLE "character_stats"
			ADD CONSTRAINT "character_stats_pkey"
			PRIMARY KEY ("character_id");
	END IF;
END
$$;
