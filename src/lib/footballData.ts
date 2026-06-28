/**
 * Thin client for football-data.org (v4) used to sync World Cup fixtures and
 * results. Everything here is best-effort: if no token is configured, or the
 * free tier does not expose the competition, admins fall back to entering
 * matches and scores by hand.
 *
 * Docs: https://www.football-data.org/documentation/quickstart
 */

import type { Side } from "./scoring";

const BASE_URL = "https://api.football-data.org/v4";

export interface NormalizedMatch {
  externalId: string;
  stage: string;
  isKnockout: boolean;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoff: Date;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED";
  // Score after 90 minutes (used for exact-score and goal-difference points).
  homeScore: number | null;
  awayScore: number | null;
  // Final score incl. extra time / penalties (for display).
  finalHomeScore: number | null;
  finalAwayScore: number | null;
  decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  qualifier: Side | null;
}

// Friendly round labels -> football-data stage codes.
export const STAGE_BY_ROUND: Record<string, string> = {
  "Group stage": "GROUP_STAGE",
  "Round of 32": "LAST_32",
  "Round of 16": "LAST_16",
  "Quarter-finals": "QUARTER_FINALS",
  "Semi-finals": "SEMI_FINALS",
  "Third-place play-off": "THIRD_PLACE",
  Final: "FINAL",
};

export const ROUND_OPTIONS = Object.keys(STAGE_BY_ROUND);

export function isFootballDataConfigured(): boolean {
  return !!process.env.FOOTBALL_DATA_TOKEN;
}

function mapStatus(s: string): NormalizedMatch["status"] {
  switch (s) {
    case "IN_PLAY":
    case "PAUSED":
      return "IN_PLAY";
    case "FINISHED":
      return "FINISHED";
    default:
      return "SCHEDULED";
  }
}

function mapQualifier(winner: string | null | undefined): Side | null {
  if (winner === "HOME_TEAM") return "HOME";
  if (winner === "AWAY_TEAM") return "AWAY";
  return null;
}

type ScorePair = { home: number | null; away: number | null } | null;

export interface RawMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { name: string | null; crest: string | null } | null;
  awayTeam: { name: string | null; crest: string | null } | null;
  score: {
    winner: string | null;
    duration?: string | null;
    fullTime: ScorePair;
    regularTime?: ScorePair;
  };
}

function mapDecidedBy(duration: string | null | undefined): NormalizedMatch["decidedBy"] {
  switch (duration) {
    case "PENALTY_SHOOTOUT":
      return "PENALTIES";
    case "EXTRA_TIME":
      return "EXTRA_TIME";
    case "REGULAR":
      return "REGULAR";
    default:
      return null;
  }
}

/**
 * Convert one raw football-data match into our normalized shape.
 *
 * The 90-minute score comes from `score.regularTime` when present (i.e. when a
 * match went to extra time / penalties) and otherwise from `score.fullTime`
 * (which, for a match decided in normal time, *is* the 90-minute score). The
 * final score for display always comes from `score.fullTime`.
 */
export function normalizeMatch(m: RawMatch): NormalizedMatch {
  const regular = m.score?.regularTime;
  const full = m.score?.fullTime;
  return {
    externalId: String(m.id),
    stage: m.stage,
    isKnockout: m.stage !== "GROUP_STAGE",
    homeTeam: m.homeTeam?.name ?? "TBD",
    awayTeam: m.awayTeam?.name ?? "TBD",
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    kickoff: new Date(m.utcDate),
    status: mapStatus(m.status),
    homeScore: regular?.home ?? full?.home ?? null,
    awayScore: regular?.away ?? full?.away ?? null,
    finalHomeScore: full?.home ?? null,
    finalAwayScore: full?.away ?? null,
    decidedBy: mapDecidedBy(m.score?.duration),
    qualifier: mapQualifier(m.score?.winner),
  };
}

/**
 * Fetch matches for the configured competition, optionally filtered to a single
 * stage. Throws a descriptive Error on misconfiguration or HTTP failure so the
 * admin UI can surface it.
 */
export async function fetchMatches(
  stage?: string,
  timeoutMs = 8000,
): Promise<NormalizedMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error(
      "No FOOTBALL_DATA_TOKEN configured — add matches manually instead.",
    );
  }
  const competition = process.env.FOOTBALL_DATA_COMPETITION || "WC";

  const url = new URL(`${BASE_URL}/competitions/${competition}/matches`);
  if (stage) url.searchParams.set("stage", stage);

  const res = await fetch(url, {
    headers: { "X-Auth-Token": token },
    // Always fetch fresh data when syncing.
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `football-data.org returned ${res.status} ${res.statusText}. ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { matches?: RawMatch[] };
  return (data.matches ?? []).map(normalizeMatch);
}
