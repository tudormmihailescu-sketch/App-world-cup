"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STAGE_BY_ROUND } from "@/lib/footballData";
import { syncCompetition } from "@/lib/sync";
import { generateJoinCode } from "@/lib/codes";
import { rootIdOf } from "@/lib/rounds";

function adminPath(code: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return `/c/${code}/admin?${qs}`;
}

/**
 * Load a round only if the token matches the group's admin token (the root
 * round's token, shared across all rounds). Otherwise bounce home.
 */
async function requireAdmin(code: string, token: string) {
  const competition = await prisma.competition.findUnique({
    where: { joinCode: code },
  });
  if (!competition) {
    redirect("/?error=" + encodeURIComponent("Invalid admin link."));
  }
  const root = await prisma.competition.findUnique({
    where: { id: rootIdOf(competition!) },
    select: { adminToken: true },
  });
  if (!root || root.adminToken !== token) {
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

  let synced = 0;
  try {
    synced = await syncCompetition(competition);
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
  const rawQualifier = String(formData.get("qualifier") ?? "");
  const rawDecidedBy = String(formData.get("decidedBy") ?? "");

  const toScore = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "");
    return s === "" ? null : Math.max(0, parseInt(s, 10) || 0);
  };
  const homeScore = toScore(formData.get("homeScore"));
  const awayScore = toScore(formData.get("awayScore"));
  let finalHomeScore = toScore(formData.get("finalHomeScore"));
  let finalAwayScore = toScore(formData.get("finalAwayScore"));

  const qualifier =
    rawQualifier === "HOME" || rawQualifier === "AWAY" ? rawQualifier : null;
  const decidedBy = ["REGULAR", "EXTRA_TIME", "PENALTIES"].includes(rawDecidedBy)
    ? rawDecidedBy
    : null;

  // For a match decided in normal time, the final score is the 90-minute score.
  if (decidedBy === "REGULAR" || decidedBy === null) {
    finalHomeScore = finalHomeScore ?? homeScore;
    finalAwayScore = finalAwayScore ?? awayScore;
  }

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
    data: {
      status,
      homeScore,
      awayScore,
      finalHomeScore,
      finalAwayScore,
      decidedBy,
      qualifier,
    },
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

/**
 * Add a new round to the group (e.g. Round of 16). It's a fresh, separate
 * leaderboard — no players or points carry over — reachable via the tabs and
 * managed with the same admin token.
 */
export async function addRound(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const round = String(formData.get("round") ?? "").trim() || "Round of 16";
  const competition = await requireAdmin(code, token);
  const rootId = rootIdOf(competition);

  const root = await prisma.competition.findUnique({ where: { id: rootId } });

  // Don't create the same round twice in one group.
  const existing = await prisma.competition.findFirst({
    where: { round, OR: [{ id: rootId }, { parentId: rootId }] },
  });
  if (existing) {
    redirect(adminPath(existing.joinCode, { token, msg: `${round} already exists.` }));
  }

  let joinCode = generateJoinCode();
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.competition.findUnique({ where: { joinCode } }))) break;
    joinCode = generateJoinCode();
  }

  const created = await prisma.competition.create({
    data: { name: root!.name, round, joinCode, parentId: rootId },
  });
  redirect(adminPath(created.joinCode, { token, msg: `${round} added.` }));
}

/** Remove a player and all of their predictions (e.g. a duplicate persona). */
export async function removePlayer(formData: FormData) {
  const code = String(formData.get("code"));
  const token = String(formData.get("token"));
  const playerId = String(formData.get("playerId"));
  const competition = await requireAdmin(code, token);
  // Predictions are removed automatically via the cascade on Player.
  await prisma.player.deleteMany({
    where: { id: playerId, competitionId: competition.id },
  });
  revalidatePath(`/c/${code}`);
  redirect(adminPath(code, { token, msg: "Player removed." }));
}
