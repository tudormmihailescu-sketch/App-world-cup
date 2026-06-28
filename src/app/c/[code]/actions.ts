"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentPlayer, setPlayerCookie } from "@/lib/session";

function competitionPath(code: string) {
  return `/c/${code}`;
}

/** Join a competition by picking a display name; remembered via cookie. */
export async function joinAsPlayer(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
  });
  if (!competition) redirect("/?error=Competition+not+found");
  if (!name) {
    redirect(`${competitionPath(code)}?error=` + encodeURIComponent("Enter a name."));
  }

  // Your name is your identity in this (no-password) competition. If a player
  // with this name already exists, resume it — this lets you get back to your
  // picks from any device or URL, even if the remembering-cookie was lost.
  // Otherwise create a new player.
  const player =
    (await prisma.player.findUnique({
      where: { competitionId_name: { competitionId: competition!.id, name } },
    })) ??
    (await prisma.player.create({
      data: { competitionId: competition!.id, name },
    }));

  setPlayerCookie(competition!.id, player.sessionToken);
  revalidatePath(competitionPath(code));
  redirect(competitionPath(code));
}

/** Create or update the current player's prediction for one match. */
export async function submitPrediction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
  });
  if (!competition) redirect("/?error=Competition+not+found");

  const player = await getCurrentPlayer(competition!.id);
  if (!player) {
    redirect(`${competitionPath(code)}?error=` + encodeURIComponent("Join first."));
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, competitionId: competition!.id },
  });
  if (!match) redirect(competitionPath(code));

  // Predictions lock at kickoff (or once the match is underway/finished).
  const locked = match!.status !== "SCHEDULED" || new Date() >= match!.kickoff;
  if (locked) {
    redirect(
      `${competitionPath(code)}?error=` +
        encodeURIComponent("That match is locked."),
    );
  }

  const homeScore = Math.max(0, parseInt(String(formData.get("homeScore")), 10) || 0);
  const awayScore = Math.max(0, parseInt(String(formData.get("awayScore")), 10) || 0);
  const rawQualifier = String(formData.get("qualifier") ?? "");
  const qualifier =
    match!.isKnockout && (rawQualifier === "HOME" || rawQualifier === "AWAY")
      ? rawQualifier
      : null;

  await prisma.prediction.upsert({
    where: {
      matchId_playerId: { matchId: match!.id, playerId: player!.id },
    },
    create: {
      matchId: match!.id,
      playerId: player!.id,
      homeScore,
      awayScore,
      qualifier,
    },
    update: { homeScore, awayScore, qualifier },
  });

  revalidatePath(competitionPath(code));
  redirect(competitionPath(code) + "#match-" + match!.id);
}
