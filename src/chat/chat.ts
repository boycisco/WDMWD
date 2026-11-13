// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Chat persistence — sessions and messages backed by Drizzle + SQLite.
 *
 * Every function takes `db` explicitly so tests can inject a temp DB
 * (same pattern as tests/store/store.test.ts).
 *
 * Session deletion cascades to messages via SQL foreign key
 * `ON DELETE CASCADE` — implemented in the migration, not here.
 */

import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import {
  messages as messagesTable,
  sessions as sessionsTable,
} from "@/store/schema";
import type { Db } from "@/store/store";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

const DEFAULT_TITLE = "New conversation";

export function createSession(db: Db, title = DEFAULT_TITLE): Session {
  const id = randomUUID();
  const now = Date.now();
  db.insert(sessionsTable).values({ id, title }).run();
  return { id, title, createdAt: now, updatedAt: now };
}

export function getSession(db: Db, id: string): Session | null {
  const rows = db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, id))
    .all();
  return rows[0] ?? null;
}

export function listSessions(db: Db, limit = 50): Session[] {
  return db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.updatedAt))
    .limit(limit)
    .all();
}

export function deleteSession(db: Db, id: string): boolean {
  const existing = getSession(db, id);
  if (!existing) return false;
  db.delete(sessionsTable).where(eq(sessionsTable.id, id)).run();
  return true;
}

export function addMessage(
  db: Db,
  sessionId: string,
  role: StoredMessage["role"],
  content: string,
  metadata?: Record<string, unknown>,
  explicitId?: string,
): StoredMessage {
  const id = explicitId ?? randomUUID();
  const now = Date.now();
  db.insert(messagesTable)
    .values({
      id,
      sessionId,
      role,
      content,
      metadata: metadata ?? null,
    })
    .run();
  // Bump session's updatedAt so listSessions orders correctly.
  db.update(sessionsTable)
    .set({ updatedAt: now })
    .where(eq(sessionsTable.id, sessionId))
    .run();
  return { id, sessionId, role, content, metadata, createdAt: now };
}

/**
 * Retrieve the most recent `limit` messages, ordered oldest-first
 * (chat display order). Query descending internally so we get the
 * newest, then reverse.
 */
export function getMessages(
  db: Db,
  sessionId: string,
  limit = 100,
): StoredMessage[] {
  const rows = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit)
    .all();
  return rows.reverse().map((r) => ({
    ...r,
    metadata: r.metadata ?? undefined,
  }));
}

// ─── Session statistics ────────────────────────────────────────

export interface SessionWithStats extends Session {
  messageCount: number;
  lastMessageSnippet?: string;
}

function attachStats(db: Db, session: Session): SessionWithStats {
  const countRows = db
    .select({ c: sql<number>`count(*)` })
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, session.id))
    .all();
  const messageCount = Number(countRows[0]?.c ?? 0);

  const lastRows = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, session.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1)
    .all();
  const lastContent = lastRows[0]?.content;

  return {
    ...session,
    messageCount,
    lastMessageSnippet: lastContent ? lastContent.slice(0, 120) : undefined,
  };
}

export function listSessionsWithStats(
  db: Db,
  limit = 50,
): SessionWithStats[] {
  return listSessions(db, limit).map((s) => attachStats(db, s));
}

export function getSessionWithStats(
  db: Db,
  id: string,
): SessionWithStats | null {
  const session = getSession(db, id);
  return session ? attachStats(db, session) : null;
}