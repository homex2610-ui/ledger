import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log("[migrate] DATABASE_URL not set — skipping migrations");
  process.exit(0);
}

const pool = new Pool({ connectionString });
const log = (...args: unknown[]) => console.log("[migrate]", ...args);

const readSql = (tag: string) => readFileSync(new URL(`../drizzle/${tag}.sql`, import.meta.url), "utf8");
const hashOf = (sql: string) => createHash("sha256").update(sql).digest("hex");

async function runOnClient(client: PoolClient, sql: string): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

try {
  await pool.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await pool.query(
    "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)",
  );

  const applied = new Set(
    (await pool.query("SELECT created_at FROM drizzle.__drizzle_migrations")).rows.map((row) => Number(row.created_at)),
  );

  const journal = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8")) as {
    entries: { when: number; tag: string }[];
  };

  const toApply: { when: number; tag: string; sql: string }[] = [];

  for (const entry of journal.entries) {
    if (applied.has(entry.when)) continue;
    const sql = readSql(entry.tag);
    const client = await pool.connect();
    let probeOk = false;
    try {
      await runOnClient(client, sql);
      probeOk = true;
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      if (/already exists|duplicate key value/i.test(message)) {
        log(`${entry.tag}: already reflected in the database — baselining without re-running`);
        await client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [
          hashOf(sql),
          entry.when,
        ]);
      } else {
        log(`${entry.tag}: probe failed unexpectedly: ${message}`);
        throw error;
      }
    } finally {
      client.release();
    }
    if (probeOk) toApply.push({ when: entry.when, tag: entry.tag, sql });
  }

  for (const migration of toApply) {
    log(`${migration.tag}: applying`);
    const client = await pool.connect();
    try {
      await runOnClient(client, migration.sql);
      await client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [
        hashOf(migration.sql),
        migration.when,
      ]);
      log(`${migration.tag}: applied`);
    } catch (error) {
      const cause = error as { cause?: { message?: string }; message?: string };
      log(`${migration.tag}: FAILED — ${cause?.message}`);
      log(`root cause: ${cause?.cause?.message ?? JSON.stringify(error).slice(0, 500)}`);
      throw error;
    } finally {
      client.release();
    }
  }

  const capacity = await pool.query(
    "SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cohorts' AND column_name = 'capacity'",
  );
  log("cohorts.capacity default:", capacity.rows[0]?.column_default ?? "MISSING");
  const index = await pool.query("SELECT count(*)::int AS c FROM pg_indexes WHERE indexname = 'users_handle_unique'");
  log("users_handle_unique index present:", index.rows[0].c === 1);
  const cohorts = await pool.query("SELECT count(*)::int AS c FROM cohorts");
  log("cohort rows:", cohorts.rows[0].c);
  const dupes = await pool.query(
    "SELECT count(*)::int AS c FROM (SELECT handle FROM users GROUP BY handle HAVING count(*) > 1) AS d",
  );
  log("users with duplicate handles:", dupes.rows[0].c);
  log("migration reconciliation complete");
} catch (error) {
  log("FATAL:", (error as Error).message);
  process.exit(1);
} finally {
  await pool.end();
}