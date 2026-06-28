"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchMatches, STAGE_BY_ROUND } from "@/lib/footballData";

function adminPath(code: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return `/c/${code}/admin?${qs}`;
}

/** Load a competition only if the admin token matches; otherwise 404 home. */
async function requireAdmin(code: string, token: string) {
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
  });
  if (!competition || competition.adminToken !== token) {
    redirect("/?error=" + encodeURIComponent("Invalid admin link."));
  }
  return competition!;
}

export async function setRound(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const round = String(formData.get("round"));
  const competition = await requireAdmin(code, token);
  await prisma.competition.update({
    where: { id: competition.id },
    data: { round },
  });
  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: "Round updated." }));
}

/** Pull fixtures/results for the competition's round from football-data.org. */
export async function syncFromApi(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const competition = await requireAdmin(code, token);
  const stage = STAGE_BY_ROUND[competition.round];

  let synced = 0;
  try {
    const matches = await fetchMatches(stage);
    for (const m of matches) {
      await prisma.match.upsert({
        where: {
          competitionId_externalId: {
            competitionId: competition.id,
            externalId: m.externalId,
          },
        },
        create: { competitionId: competition.id, ...m },
        update: {
          stage: m.stage,
          isKnockout: m.isKnockout,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeCrest: m.homeCrest,
          awayCrest: m.awayCrest,
          kickoff: m.kickoff,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          qualifier: m.qualifier,
        },
      });
      synced++;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    redirect(adminPath(code, { token, error: message }));
  }

  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: `Synced ${synced} matches.` }));
}

export async function addMatch(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const competition = await requireAdmin(code, token);

  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoffRaw = String(formData.get("kickoff") ?? "");
  const isKnockout = formData.get("isKnockout") === "on";

  if (!homeTeam || !awayTeam || !kickoffRaw) {
    redirect(adminPath(code, { token, error: "Fill in both teams and a kickoff time." }));
  }

  await prisma.match.create({
    data: {
      competitionId: competition.id,
      homeTeam,
      awayTeam,
      kickoff: new Date(kickoffRaw),
      isKnockout,
      stage: STAGE_BY_ROUND[competition.round] ?? "ROUND_OF_32",
    },
  });
  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: "Match added." }));
}

export async function setResult(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const matchId = String(formData.get("matchId"));
  const competition = await requireAdmin(code, token);

  const match = await prisma.match.findFirst({
    where: { id: matchId, competitionId: competition.id },
  });
  if (!match) redirect(adminPath(code, { token, error: "Match not found." }));

  const status = String(formData.get("status")) as
    | "SCHEDULED"
    | "IN_PLAY"
    | "FINISHED";
  const homeRaw = String(formData.get("homeScore") ?? "");
  const awayRaw = String(formData.get("awayScore") ?? "");
  const rawQualifier = String(formData.get("qualifier") ?? "");

  // Scores only apply once a result is being recorded.
  const homeScore = homeRaw === "" ? null : Math.max(0, parseInt(homeRaw, 10) || 0);
  const awayScore = awayRaw === "" ? null : Math.max(0, parseInt(awayRaw, 10) || 0);
  const qualifier =
    rawQualifier === "HOME" || rawQualifier === "AWAY" ? rawQualifier : null;

  if (status === "FINISHED" && (homeScore === null || awayScore === null)) {
    redirect(
      adminPath(code, {
        token,
        error: "Enter the 90-minute score before marking a match finished.",
      }),
    );
  }

  await prisma.match.update({
    where: { id: match!.id },
    data: { status, homeScore, awayScore, qualifier },
  });
  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: "Result saved." }));
}

export async function deleteMatch(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const matchId = String(formData.get("matchId"));
  const competition = await requireAdmin(code, token);
  await prisma.match.deleteMany({
    where: { id: matchId, competitionId: competition.id },
  });
  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: "Match removed." }));
}
