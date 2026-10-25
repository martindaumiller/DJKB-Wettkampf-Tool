import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
export function openDatabase(filename) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const raw = new DatabaseSync(filename);
  raw.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  if (!raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tournament_state'").get())
    raw.exec(readFileSync(new URL('../drizzle/0000_aberrant_elektra.sql', import.meta.url), 'utf8'));
  const db = { raw, prepare(sql) {
    let values = [];
    return { bind(...v) { values = v; return this; },
      async first() { return raw.prepare(sql).get(...values) || null; },
      async all() { return {results: raw.prepare(sql).all(...values)}; },
      run() { const r = raw.prepare(sql).run(...values); return {meta:{changes:r.changes}}; }
    };
  }, async batch(statements) {
    raw.exec('BEGIN IMMEDIATE');
    try { const result = statements.map(s => s.run()); raw.exec('COMMIT'); return result; }
    catch(e) { raw.exec('ROLLBACK'); throw e; }
  }, async snapshot(destination) { await backup(raw, destination); },
  close() { raw.close(); }};
  return db;
}
