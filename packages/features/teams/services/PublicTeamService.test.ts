import type {
  PublicTeamRecord,
  PublicTeamRepository,
} from "@calcom/features/teams/repositories/PublicTeamRepository";
import { describe, expect, it, vi } from "vitest";
import { PublicTeamService } from "./PublicTeamService";

const alice = { id: 1, name: "Alice", username: "alice", avatarUrl: "https://example.com/alice.png" };
const bob = { id: 2, name: "Bob", username: "bob", avatarUrl: null };

function buildTeamRecord(overrides: Partial<PublicTeamRecord> = {}): PublicTeamRecord {
  return {
    id: 10,
    name: "Sales",
    slug: "sales",
    bio: "We sell things",
    logoUrl: null,
    isPrivate: false,
    hideBranding: false,
    theme: "dark",
    brandColor: "#111111",
    darkBrandColor: "#eeeeee",
    members: [{ user: alice }, { user: bob }],
    eventTypes: [
      {
        id: 100,
        slug: "demo",
        title: "Demo",
        description: "A product demo",
        length: 30,
        schedulingType: "ROUND_ROBIN",
        hosts: [{ user: alice }, { user: bob }],
      },
      {
        id: 101,
        slug: "onboarding",
        title: "Onboarding",
        description: null,
        length: 60,
        schedulingType: "COLLECTIVE",
        hosts: [{ user: alice }],
      },
      {
        id: 102,
        slug: "personal-template",
        title: "Personal template",
        description: null,
        length: 15,
        schedulingType: "MANAGED",
        hosts: [],
      },
    ],
    ...overrides,
  };
}

function buildService(record: PublicTeamRecord | null) {
  const findBySlugIncludePublicEventTypesAndMembers = vi.fn().mockResolvedValue(record);
  const publicTeamRepository = {
    findBySlugIncludePublicEventTypesAndMembers,
  } as unknown as PublicTeamRepository;
  return {
    service: new PublicTeamService({ publicTeamRepository }),
    findBySlugIncludePublicEventTypesAndMembers,
  };
}

describe("PublicTeamService.getPublicProfileBySlug", () => {
  it("returns null when the team does not exist", async () => {
    const { service, findBySlugIncludePublicEventTypesAndMembers } = buildService(null);

    await expect(service.getPublicProfileBySlug({ slug: "missing" })).resolves.toBeNull();
    expect(findBySlugIncludePublicEventTypesAndMembers).toHaveBeenCalledWith({ slug: "missing" });
  });

  it("maps a public team to the profile DTO with members and bookable event types", async () => {
    const { service } = buildService(buildTeamRecord());

    const profile = await service.getPublicProfileBySlug({ slug: "sales" });

    expect(profile).toEqual({
      id: 10,
      name: "Sales",
      slug: "sales",
      bio: "We sell things",
      logoUrl: null,
      isPrivate: false,
      hideBranding: false,
      theme: "dark",
      brandColor: "#111111",
      darkBrandColor: "#eeeeee",
      members: [
        { userId: 1, name: "Alice", username: "alice", avatarUrl: "https://example.com/alice.png" },
        { userId: 2, name: "Bob", username: "bob", avatarUrl: null },
      ],
      eventTypes: [
        {
          id: 100,
          slug: "demo",
          title: "Demo",
          description: "A product demo",
          length: 30,
          schedulingType: "ROUND_ROBIN",
          hosts: [
            { userId: 1, name: "Alice", username: "alice", avatarUrl: "https://example.com/alice.png" },
            { userId: 2, name: "Bob", username: "bob", avatarUrl: null },
          ],
        },
        {
          id: 101,
          slug: "onboarding",
          title: "Onboarding",
          description: null,
          length: 60,
          schedulingType: "COLLECTIVE",
          hosts: [
            { userId: 1, name: "Alice", username: "alice", avatarUrl: "https://example.com/alice.png" },
          ],
        },
      ],
    });
  });

  it("hides members and event hosts for private teams", async () => {
    const { service } = buildService(buildTeamRecord({ isPrivate: true }));

    const profile = await service.getPublicProfileBySlug({ slug: "sales" });

    expect(profile?.members).toEqual([]);
    expect(profile?.eventTypes.map((eventType) => eventType.hosts)).toEqual([[], []]);
    expect(profile?.eventTypes.map((eventType) => eventType.slug)).toEqual(["demo", "onboarding"]);
  });

  it("never exposes fields that are not part of the public DTO", async () => {
    const aliceWithEmail = { ...alice, email: "alice@example.com" };
    const { service } = buildService(
      buildTeamRecord({ members: [{ user: aliceWithEmail }] } as Partial<PublicTeamRecord>)
    );

    const profile = await service.getPublicProfileBySlug({ slug: "sales" });

    expect(JSON.stringify(profile)).not.toContain("alice@example.com");
  });
});
