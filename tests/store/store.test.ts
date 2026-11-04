import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { createDb, schema, type Db } from "@/store/store";

let tmpDir: string;
let db: Db;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wdmwd-test-"));
  db = createDb(join(tmpDir, "test.db"));
  migrate(db, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
});

describe("store — schema round-trip", () => {
  it("inserts and reads a session", () => {
    const id = "sess-1";
    db.insert(schema.sessions).values({ id, title: "Test" }).run();

    const rows = db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Test");
    expect(rows[0]!.createdAt).toBeGreaterThan(0);
  });

  it("cascades message deletion when a session is deleted", () => {
    db.insert(schema.sessions).values({ id: "sess-c" }).run();
    db.insert(schema.messages)
      .values({
        id: "msg-1",
        sessionId: "sess-c",
        role: "user",
        content: "hello",
      })
      .run();

    expect(db.select().from(schema.messages).all()).toHaveLength(1);
    db.delete(schema.sessions).where(eq(schema.sessions.id, "sess-c")).run();
    expect(db.select().from(schema.messages).all()).toHaveLength(0);
  });

  it("stores JSON metadata and reads it back as an object", () => {
    db.insert(schema.sessions).values({ id: "sess-j" }).run();
    db.insert(schema.messages)
      .values({
        id: "msg-j",
        sessionId: "sess-j",
        role: "assistant",
        content: "response",
        metadata: { tokens: 42, model: "gpt-4o-mini" },
      })
      .run();

    const [row] = db.select().from(schema.messages).all();
    expect(row!.metadata).toEqual({ tokens: 42, model: "gpt-4o-mini" });
  });

  it("rejects an invalid enum value for role (CHECK constraint)", () => {
    db.insert(schema.sessions).values({ id: "sess-e" }).run();
    expect(() =>
      db
        .insert(schema.messages)
        .values({
          id: "msg-e",
          sessionId: "sess-e",
          // Deliberately bypass TS so we exercise the runtime CHECK
          // constraint. If the SQL CHECK is missing from the migration,
          // SQLite accepts this row and the test fails — which is the
          // whole point.
          role: "hacker" as unknown as "user",
          content: "x",
        })
        .run(),
    ).toThrow();
  });

  it("uniquely constrains (chainId, address) on entities", () => {
    const row = {
      id: "e1",
      chainId: 8453,
      address: "0xabc0000000000000000000000000000000000001",
      type: "wallet",
    };
    db.insert(schema.entities).values(row).run();
    expect(() =>
      db
        .insert(schema.entities)
        .values({ ...row, id: "e2" })
        .run(),
    ).toThrow();
  });
});