import prisma from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import getInstallCountPerApp, { resetInstallCountCache } from "./getInstallCountPerApp";

vi.mock("@calcom/prisma", () => ({
  default: { $queryRaw: vi.fn() },
}));

const queryRaw = vi.mocked(prisma.$queryRaw);

describe("getInstallCountPerApp", () => {
  beforeEach(() => {
    vi.useRealTimers();
    queryRaw.mockReset();
    resetInstallCountCache();
  });

  it("maps install counts by app slug", async () => {
    queryRaw.mockResolvedValueOnce([
      { appId: "google-calendar", installCount: 5 },
      { appId: "office365-calendar", installCount: 2 },
    ]);

    await expect(getInstallCountPerApp()).resolves.toEqual({
      "google-calendar": 5,
      "office365-calendar": 2,
    });
  });

  it("serves repeat calls from cache within the TTL", async () => {
    queryRaw.mockResolvedValue([{ appId: "google-calendar", installCount: 1 }]);

    await getInstallCountPerApp();
    await getInstallCountPerApp();

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("queries again after the TTL expires", async () => {
    vi.useFakeTimers();
    queryRaw.mockResolvedValue([{ appId: "google-calendar", installCount: 1 }]);

    await getInstallCountPerApp();
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await getInstallCountPerApp();

    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed query", async () => {
    queryRaw.mockRejectedValueOnce(new Error("db down"));
    queryRaw.mockResolvedValueOnce([{ appId: "google-calendar", installCount: 3 }]);

    await expect(getInstallCountPerApp()).rejects.toThrow("db down");
    await expect(getInstallCountPerApp()).resolves.toEqual({ "google-calendar": 3 });
  });
});
