import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "@/store/store";
import {
  addMessage,
  createSession,
  deleteSession,
  getMessages,
  getSession,
  listSessions,
} from "@/chat/chat";

let tmpDir: string;
let db: Db;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wdmwd-chat-test-"));
  db = createDb(join(tmpDir, "test.db"));
  migrate(db, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe("chat — sessions", () => {
  it("creates and reads a session", () => {
    const s = createSession(db, "My title");
    expect(s.id).toBeTruthy();
    const read = getSession(db, s.id);
    expect(read).not.toBeNull();
    expect(read!.title).toBe("My title");
  });

  it("returns null for unknown session", () => {
    expect(getSession(db, "does-not-exist")).toBeNull();
  });

  it("lists sessions ordered by updatedAt desc", () => {
    const a = createSession(db, "A");
    const b = createSession(db, "B");
    addMessage(db, a.id, "user", "hi"); // bumps A's updatedAt
    const sessions = listSessions(db);
    // A should be first because its updatedAt is now newer
    expect(sessions[0]!.id).toBe(a.id);
    expect(sessions[1]!.id).toBe(b.id);
  });

  it("deletes a session", () => {
    const s = createSession(db);
    expect(deleteSession(db, s.id)).toBe(true);
    expect(getSession(db, s.id)).toBeNull();
  });

  it("returns false when deleting unknown session", () => {
    expect(deleteSession(db, "nope")).toBe(false);
  });

  it("cascades messages on session delete", () => {
    const s = createSession(db);
    addMessage(db, s.id, "user", "m1");
    addMessage(db, s.id, "assistant", "m2");
    expect(getMessages(db, s.id)).toHaveLength(2);
    deleteSession(db, s.id);
    expect(getMessages(db, s.id)).toHaveLength(0);
  });
});

describe("chat — messages", () => {
  it("persists and retrieves messages in order", () => {
    const s = createSession(db);
    addMessage(db, s.id, "user", "first");
    addMessage(db, s.id, "assistant", "second");
    addMessage(db, s.id, "user", "third");
    const msgs = getMessages(db, s.id);
    expect(msgs.map((m) => m.content)).toEqual(["first", "second", "third"]);
  });

  it("returns the most recent N messages", () => {
    const s = createSession(db);
    for (let i = 0; i < 10; i++) {
      addMessage(db, s.id, "user", `m${i}`);
    }
    const msgs = getMessages(db, s.id, 3);
    expect(msgs).toHaveLength(3);
    expect(msgs.map((m) => m.content)).toEqual(["m7", "m8", "m9"]);
  });

  it("persists metadata as JSON", () => {
    const s = createSession(db);
    addMessage(db, s.id, "user", "hi", { source: "test", n: 42 });
    const [m] = getMessages(db, s.id);
    expect(m!.metadata).toEqual({ source: "test", n: 42 });
  });

  it("isolates messages across sessions", () => {
    const a = createSession(db);
    const b = createSession(db);
    addMessage(db, a.id, "user", "for A");
    addMessage(db, b.id, "user", "for B");
    expect(getMessages(db, a.id)).toHaveLength(1);
    expect(getMessages(db, b.id)).toHaveLength(1);
    expect(getMessages(db, a.id)[0]!.content).toBe("for A");
  });
});