import { getPublicTeamService } from "@calcom/features/teams/di/PublicTeamService.container";
import type { PublicTeamProfileDto } from "@calcom/features/teams/lib/types";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import type { EmbedProps } from "app/WithEmbedSSR";
import type { GetServerSideProps } from "next";
import { z } from "zod";

export type TeamPublicPageProps = {
  team: PublicTeamProfileDto;
  safeBio: string;
  markdownStrippedBio: string;
  descriptionsAsSafeHTML: Record<number, string>;
} & EmbedProps;

const paramsSchema = z.object({ slug: z.string().transform((s) => slugify(s)) });

export const getServerSideProps: GetServerSideProps<TeamPublicPageProps> = async (context) => {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) return { notFound: true } as const;

  const team = await getPublicTeamService().getPublicProfileBySlug({ slug: parsedParams.data.slug });
  if (!team) return { notFound: true } as const;

  const descriptionsAsSafeHTML: Record<number, string> = {};
  for (const eventType of team.eventTypes) {
    descriptionsAsSafeHTML[eventType.id] = markdownToSafeHTML(eventType.description);
  }

  return {
    props: {
      team,
      safeBio: markdownToSafeHTML(team.bio),
      markdownStrippedBio: stripMarkdown(team.bio ?? ""),
      descriptionsAsSafeHTML,
    },
  };
};
