import { describe, expect, it } from "vitest";
import { pickPreviewHosts } from "./previewHosts";

describe("pickPreviewHosts", () => {
  it("returns three distinct characters with the first one up next", () => {
    const hosts = pickPreviewHosts();

    expect(hosts).toHaveLength(3);
    expect(new Set(hosts.map((host) => host.name)).size).toBe(3);
    expect(hosts.map((host) => host.isNext)).toEqual([true, false, false]);
    expect(hosts.map((host) => host.share)).toEqual([50, 30, 20]);
  });

  it("points every host at its cropped avatar", () => {
    const hosts = pickPreviewHosts(() => 0);

    expect(hosts.map((host) => host.name)).toEqual(["Akame", "Gon", "Happy"]);
    expect(hosts[0].avatarUrl).toBe("/landing/characters/akame.webp");
  });

  it("can pick the last character in the pool", () => {
    const hosts = pickPreviewHosts(() => 0.999);

    expect(hosts[0].name).toBe("Yusuke");
  });
});
