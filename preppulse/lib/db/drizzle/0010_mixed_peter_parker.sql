UPDATE "users" AS u
SET "handle" = u."handle" || '-' || substr(u."id"::text, 1, 8)
WHERE u."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "handle" ORDER BY "created_at", "id") AS rn
    FROM "users"
  ) AS ranked
  WHERE rn > 1
);
CREATE UNIQUE INDEX "users_handle_unique" ON "users" USING btree ("handle");