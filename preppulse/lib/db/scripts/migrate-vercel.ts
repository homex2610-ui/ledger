import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log("[migrate] DATABASE_URL not set — skipping migrations");
  process.exit(0);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

try {
  try {
    const state = await pool.query("SELECT COALESCE(json_agg(name), '[]'::json) AS applied FROM __drizzle_migrations");
    console.log("[migrate] applied so far:", JSON.stringify(state.rows[0].applied));
  } catch {
    console.log("[migrate] __drizzle_migrations table does not exist yet");
  }
  try {
    const tables = await pool.query(
      "SELECT COALESCE(string_agg(tablename, ', ' ORDER BY tablename), '') AS t FROM pg_tables WHERE schemaname = 'public'",
    );
    console.log("[migrate] tables:", tables.rows[0].t);
  } catch {
    /* ignore */
  }

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] done — all pending migrations applied");
} catch (error) {
  const cause = error as { cause?: { message?: string }; message?: string };
  console.error("[migrate] FAILED:", cause?.message);
  console.error("[migrate] root cause:", cause?.cause?.message ?? JSON.stringify(error).slice(0, 800));
  process.exit(1);
} finally {
  await pool.end();
}