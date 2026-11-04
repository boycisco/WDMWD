import { describe, expect, it } from "vitest";
import { loadConfig, safeConfig } from "@/config/config";
import { ConfigError } from "@/core/errors";

describe("config.loadConfig", () => {
  it("applies sensible development defaults", () => {
    const cfg = loadConfig({ NODE_ENV: "development" });
    expect(cfg.env).toBe("development");
    expect(cfg.server.port).toBe(3000);
    expect(cfg.server.host).toBe("127.0.0.1");
    expect(cfg.server.remote).toBe(false);
    expect(cfg.database.url).toBe("file:./data/wdmwd.db");
    expect(cfg.ai.provider).toBe("openai");
    expect(cfg.ai.openaiModel).toBe("gpt-4o-mini");
    expect(cfg.limits.maxToolCalls).toBe(8);
    expect(cfg.limits.maxAgentIterations).toBe(6);
    expect(cfg.limits.maxTraceDepth).toBe(5);
    expect(cfg.limits.requestTimeoutMs).toBe(60_000);
  });

  it("coerces numeric strings", () => {
    const cfg = loadConfig({ PORT: "4000", MAX_TOOL_CALLS: "12" });
    expect(cfg.server.port).toBe(4000);
    expect(cfg.limits.maxToolCalls).toBe(12);
  });

  it("rejects non-numeric PORT", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(ConfigError);
  });

  it("rejects out-of-range PORT", () => {
    expect(() => loadConfig({ PORT: "99999" })).toThrow(ConfigError);
  });

  it("rejects public HOST without REMOTE_ACCESS", () => {
    expect(() =>
      loadConfig({ HOST: "0.0.0.0", REMOTE_ACCESS: "false" }),
    ).toThrow(ConfigError);
  });

  it("accepts public HOST with REMOTE_ACCESS=true", () => {
    const cfg = loadConfig({ HOST: "0.0.0.0", REMOTE_ACCESS: "true" });
    expect(cfg.server.host).toBe("0.0.0.0");
    expect(cfg.server.remote).toBe(true);
  });

  it("requires OPENAI_API_KEY in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        BASE_RPC_URL: "https://example.com",
      }),
    ).toThrow(ConfigError);
  });

  it("requires a chain endpoint in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toThrow(ConfigError);
  });

  it("accepts a fully populated production environment", () => {
    const cfg = loadConfig({
      NODE_ENV: "production",
      OPENAI_API_KEY: "sk-test",
      BASE_RPC_URL: "https://example.com",
    });
    expect(cfg.env).toBe("production");
  });
});

describe("config.safeConfig", () => {
  it("redacts secrets and exposes only presence flags", () => {
    const cfg = loadConfig({
      OPENAI_API_KEY: "sk-secret-value",
      ALCHEMY_API_KEY: "alchemy-secret-value",
    });
    const safe = safeConfig(cfg);
    expect(safe.ai.openaiApiKeyConfigured).toBe(true);
    expect(safe.chain.alchemyApiKeyConfigured).toBe(true);
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("sk-secret-value");
    expect(serialized).not.toContain("alchemy-secret-value");
  });
});