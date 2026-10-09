import type {
  PublicTeamEventTypeDto,
  PublicTeamMemberDto,
  PublicTeamProfileDto,
} from "@calcom/features/teams/lib/types";
import type {
  PublicTeamRecord,
  PublicTeamRepository,
} from "@calcom/features/teams/repositories/PublicTeamRepository";

export interface IPublicTeamServiceDeps {
  publicTeamRepository: PublicTeamRepository;
}

type PublicUserRecord = PublicTeamRecord["members"][number]["user"];

function toPublicMember(user: PublicUserRecord): PublicTeamMemberDto {
  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

export class PublicTeamService {
  constructor(private readonly deps: IPublicTeamServiceDeps) {}

  async getPublicProfileBySlug({ slug }: { slug: string }): Promise<PublicTeamProfileDto | null> {
    const team = await this.deps.publicTeamRepository.findBySlugIncludePublicEventTypesAndMembers({ slug });
    if (!team) return null;
    return this.toProfileDto(team);
  }

  private toProfileDto(team: PublicTeamRecord): PublicTeamProfileDto {
    // Private teams must not reveal who is on the team, which includes the hosts shown on event cards.
    const revealMembers = !team.isPrivate;

    const eventTypes: PublicTeamEventTypeDto[] = team.eventTypes
      // Managed event types are templates for members' personal events and cannot be booked on the team page.
      .filter((eventType) => eventType.schedulingType !== "MANAGED")
      .map((eventType) => ({
        id: eventType.id,
        slug: eventType.slug,
        title: eventType.title,
        description: eventType.description,
        length: eventType.length,
        schedulingType: eventType.schedulingType,
        hosts: revealMembers ? eventType.hosts.map((host) => toPublicMember(host.user)) : [],
      }));

    return {
      id: team.id,
      name: team.name,
      slug: team.slug ?? "",
      bio: team.bio,
      logoUrl: team.logoUrl,
      isPrivate: team.isPrivate,
      hideBranding: team.hideBranding,
      theme: team.theme,
      brandColor: team.brandColor,
      darkBrandColor: team.darkBrandColor,
      members: revealMembers ? team.members.map((member) => toPublicMember(member.user)) : [],
      eventTypes,
    };
  }
}
