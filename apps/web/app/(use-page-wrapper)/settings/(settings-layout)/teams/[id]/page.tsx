import type { PageProps } from "app/_types";
import { notFound, redirect } from "next/navigation";
import { parseTeamIdParam } from "~/settings/teams/lib/teamUtils";

const Page = async ({ params }: PageProps) => {
  const teamId = parseTeamIdParam((await params).id);
  if (!teamId) notFound();

  redirect(`/settings/teams/${teamId}/profile`);
};

export default Page;
