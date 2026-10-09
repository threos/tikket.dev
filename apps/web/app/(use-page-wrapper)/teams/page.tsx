import { redirect } from "next/navigation";

// Signup via a team invite token sends people to /teams?token=…; the invite itself is already
// applied during signup, so the team list in settings is the right landing page.
export default function TeamsPage() {
  redirect("/settings/teams");
}
