/**
 * Project-local PostgreSQL server for development.
 *
 * Runs a self-contained PostgreSQL instance that lives entirely inside this
 * repo (data directory: lib/db/.pgdata) so it never touches any other project
 * or any system-wide Postgres installation.
 *
 * Usage: node ./scripts/local-postgres.mjs
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "..", ".pgdata");

const port = Number(process.env.PG_PORT ?? 5433);
const user = process.env.PG_USER ?? "bazaar";
const password = process.env.PG_PASSWORD ?? "bazaar";
const database = process.env.PG_DATABASE ?? "global_bazaar";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
});

// Probe for the cluster's config file rather than the directory itself: an
// empty .pgdata folder can be left behind by tooling, and treating that as an
// initialised cluster makes the server fail to start.
const isFirstRun = !existsSync(path.join(dataDir, "postgresql.conf"));

if (isFirstRun) {
  console.log(`[pg] initialising cluster at ${dataDir}`);
  await pg.initialise();
}

await pg.start();
console.log(`[pg] listening on 127.0.0.1:${port}`);

if (isFirstRun) {
  await pg.createDatabase(database);
  console.log(`[pg] created database "${database}"`);
}

console.log(
  `[pg] DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:${port}/${database}`,
);

async function shutdown() {
  console.log("\n[pg] stopping…");
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
