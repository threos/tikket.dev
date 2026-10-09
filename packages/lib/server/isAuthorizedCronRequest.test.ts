import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCronRequest } from "./isAuthorizedCronRequest";

function buildRequest({ authorization, query = "" }: { authorization?: string; query?: string } = {}) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request(`http://localhost/api/cron/test${query}`, { headers });
}

describe("isAuthorizedCronRequest", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_API_KEY", "test-api-key");
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts CRON_API_KEY in the authorization header", () => {
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "test-api-key" }))).toBe(true);
  });

  it("accepts CRON_API_KEY in the apiKey query param", () => {
    expect(isAuthorizedCronRequest(buildRequest({ query: "?apiKey=test-api-key" }))).toBe(true);
  });

  it("accepts Vercel Cron's Bearer CRON_SECRET", () => {
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "Bearer test-secret" }))).toBe(true);
  });

  it("rejects a request without credentials", () => {
    expect(isAuthorizedCronRequest(buildRequest())).toBe(false);
  });

  it("rejects a wrong key", () => {
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "wrong-key" }))).toBe(false);
    expect(isAuthorizedCronRequest(buildRequest({ query: "?apiKey=wrong-key" }))).toBe(false);
  });

  it("rejects a wrong Bearer secret", () => {
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "Bearer wrong-secret" }))).toBe(false);
  });

  it("does not accept CRON_SECRET without the Bearer prefix", () => {
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "test-secret" }))).toBe(false);
  });

  it("rejects 'Bearer undefined' when CRON_SECRET is unset", () => {
    vi.stubEnv("CRON_SECRET", undefined);
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "Bearer undefined" }))).toBe(false);
  });

  it("rejects 'Bearer ' when CRON_SECRET is empty", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "Bearer " }))).toBe(false);
  });

  it("rejects 'undefined' and 'null' when CRON_API_KEY is unset", () => {
    vi.stubEnv("CRON_API_KEY", undefined);
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "undefined" }))).toBe(false);
    expect(isAuthorizedCronRequest(buildRequest({ query: "?apiKey=null" }))).toBe(false);
  });

  it("rejects an empty apiKey when CRON_API_KEY is empty", () => {
    vi.stubEnv("CRON_API_KEY", "");
    expect(isAuthorizedCronRequest(buildRequest({ query: "?apiKey=" }))).toBe(false);
  });

  it("still accepts Bearer CRON_SECRET when CRON_API_KEY is unset", () => {
    vi.stubEnv("CRON_API_KEY", undefined);
    expect(isAuthorizedCronRequest(buildRequest({ authorization: "Bearer test-secret" }))).toBe(true);
  });
});
