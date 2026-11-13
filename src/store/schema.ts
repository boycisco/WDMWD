// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Drizzle schema — SQLite tables for WDMWD.
 *
 * Convention notes:
 *  - IDs are TEXT (UUIDs generated in application code). Stable across
 *    process restarts, URL-safe, future-proof for federation.
 *  - Timestamps are INTEGER unix milliseconds. Never floats, never strings.
 *    Default uses SQLite's `unixepoch()` * 1000.
 *  - `metadata` / `result` / `data` / `value` columns are TEXT with
 *    `{ mode: "json" }` — Drizzle serializes/deserializes automatically.
 *  - Foreign keys use ON DELETE CASCADE so deleting a session cleans up
 *    its messages, investigations, and evidence (spec §10).
 *  - Enum-like columns (`role`, `status`, `classification`) use BOTH the
 *    TypeScript `enum` option (compile-time narrowing) AND a CHECK
 *    constraint (runtime enforcement by SQLite). Drizzle's `enum` option
 *    is purely a type-level construct — it does NOT emit a CHECK clause.
 */

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

// ─── sessions ──────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New conversation"),
  createdAt: integer("created_at").notNull().default(nowMs),
  updatedAt: integer("updated_at").notNull().default(nowMs),
});

// ─── messages ──────────────────────────────────────────────────

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system", "tool"],
    }).notNull(),
    content: text("content").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: integer("created_at").notNull().default(nowMs),
  },
  (t) => [
    index("messages_session_idx").on(t.sessionId, t.createdAt),
    check(
      "messages_role_check",
      sql`${t.role} IN ('user','assistant','system','tool')`,
    ),
  ],
);

// ─── investigations ────────────────────────────────────────────

export const investigations = sqliteTable(
  "investigations",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "wallet" | "transaction" | "trace" | "relations" | "patterns"
    target: text("target").notNull(), // address or tx hash, lowercase
    chainId: integer("chain_id").notNull(),
    status: text("status", {
      enum: ["pending", "running", "complete", "failed"],
    })
      .notNull()
      .default("pending"),
    result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (t) => [
    index("investigations_session_idx").on(t.sessionId, t.createdAt),
    index("investigations_target_idx").on(t.chainId, t.target),
    check(
      "investigations_status_check",
      sql`${t.status} IN ('pending','running','complete','failed')`,
    ),
  ],
);

// ─── evidence ──────────────────────────────────────────────────

export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    investigationId: text("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "transfer" | "receipt" | "log" | "call"
    classification: text("classification", {
      enum: ["confirmed", "inferred", "unknown"],
    }).notNull(),
    data: text("data", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    source: text("source").notNull(), // "rpc:base" | "alchemy" | ...
    createdAt: integer("created_at").notNull().default(nowMs),
  },
  (t) => [
    index("evidence_investigation_idx").on(t.investigationId),
    check(
      "evidence_classification_check",
      sql`${t.classification} IN ('confirmed','inferred','unknown')`,
    ),
  ],
);

// ─── entities ──────────────────────────────────────────────────

export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey(),
    chainId: integer("chain_id").notNull(),
    address: text("address").notNull(), // lowercase hex
    type: text("type").notNull(), // "wallet" | "contract" | "token" | "unknown"
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
  },
  (t) => [
    uniqueIndex("entities_chain_address_idx").on(t.chainId, t.address),
  ],
);

// ─── settings ──────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull().default(nowMs),
});