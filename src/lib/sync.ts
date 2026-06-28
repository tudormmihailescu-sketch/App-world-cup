/**
 * Syncing live data into competitions. Used by:
 *  - the scheduled cron route (`/api/cron/sync`), which refreshes every
 *    competition, and
 *  - the competition page, which opportunistically refreshes a single
 *    competition when its data is stale (so match days feel live without
 *    needing a sub-daily cron).
 */

import { prisma } from "./prisma";
import {
  fetchMatches,
  isFootballDataConfigured,
  STAGE_BY_ROUND,
  type NormalizedMatch,
} from "./footballData";

// Don't re-hit the API for the same competition more often than this.
const SYNC_THROTTLE_MS = 2 * 60 * 1000;

export function isSyncStale(lastSyncedAt: Date | null | undefined): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - lastSyncedAt.getTime() > SYNC_THROTTLE_MS;
}

/** Upsert a set of fetched matches into one competition. Returns the count. */
async function applyMatches(
  competitionId: string,
  matches: NormalizedMatch[],
): Promise<number> {
  for (const m of matches) {
    await prisma.match.upsert({
      where: {
        competitionId_externalId: { competitionId, externalId: m.externalId },
      },
      create: { competitionId, ...m },
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
        finalHomeScore: m.finalHomeScore,
        finalAwayScore: m.finalAwayScore,
        decidedBy: m.decidedBy,
        qualifier: m.qualifier,
      },
    });
  }
  return matches.length;
}

/** Sync one competition's round from the live API. */
export async function syncCompetition(competition: {
  id: string;
  round: string;
}): Promise<number> {
  const stage = STAGE_BY_ROUND[competition.round];
  const matches = await fetchMatches(stage);
  const count = await applyMatches(competition.id, matches);
  await prisma.competition.update({
    where: { id: competition.id },
    data: { lastSyncedAt: new Date() },
  });
  return count;
}

/**
 * Sync every competition. Fetches the API once per distinct round (stage) to
 * stay within the free tier's rate limit, then applies the results to each
 * competition on that round.
 */
export async function syncAllCompetitions(): Promise<{
  skipped?: true;
  competitions?: number;
  matchesUpdated?: number;
}> {
  if (!isFootballDataConfigured()) return { skipped: true };

  const competitions = await prisma.competition.findMany({
    select: { id: true, round: true },
  });

  // Group competitions by the stage they need.
  const byStage = new Map<string, string[]>();
  for (const c of competitions) {
    const stage = STAGE_BY_ROUND[c.round] ?? "";
    const list = byStage.get(stage) ?? [];
    list.push(c.id);
    byStage.set(stage, list);
  }

  let matchesUpdated = 0;
  for (const [stage, competitionIds] of byStage) {
    const matches = await fetchMatches(stage || undefined);
    for (const competitionId of competitionIds) {
      matchesUpdated += await applyMatches(competitionId, matches);
      await prisma.competition.update({
        where: { id: competitionId },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  return { competitions: competitions.length, matchesUpdated };
}
