import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type CreatorStatus = "pending" | "approved" | "rejected";

export interface Creator {
  id: number;
  code: string;
  token: string;
  name: string;
  email: string;
  handle: string;
  platform: string;
  payout_email: string;
  status: CreatorStatus;
  created_at: number;
}

export interface Subscriber {
  app_user_id: string;
  creator_id: number | null;
  heard_from: string | null;
  first_paid_at: number | null;
  created_at: number;
}

export type LedgerKind = "commission" | "reversal" | "bonus" | "payout";

export interface LedgerEntry {
  id: number;
  creator_id: number;
  kind: LedgerKind;
  amount_cents: number;
  event_id: string | null;
  transaction_id: string | null;
  app_user_id: string | null;
  note: string | null;
  available_at: number;
  created_at: number;
}

export interface Payout {
  id: number;
  creator_id: number;
  amount_cents: number;
  status: "pending" | "paid" | "cancelled";
  reference: string | null;
  created_at: number;
  paid_at: number | null;
}

const schema = `
CREATE TABLE IF NOT EXISTS creators (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  payout_email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subscribers (
  app_user_id TEXT PRIMARY KEY,
  creator_id INTEGER REFERENCES creators(id),
  heard_from TEXT,
  first_paid_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  app_user_id TEXT,
  received_at INTEGER NOT NULL,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  event_id TEXT,
  transaction_id TEXT,
  app_user_id TEXT,
  note TEXT,
  available_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_creator ON ledger(creator_id, available_at);
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  referer TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  url TEXT NOT NULL,
  disclosed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  reference TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
`;

export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(schema);
  return db;
}

export const now = (): number => Date.now();
