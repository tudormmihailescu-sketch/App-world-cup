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
  homeScore: number | null;
  awayScore: number | null;
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

interface RawMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { name: string | null; crest: string | null } | null;
  awayTeam: { name: string | null; crest: string | null } | null;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}

/**
 * Fetch matches for the configured competition, optionally filtered to a single
 * stage. Throws a descriptive Error on misconfiguration or HTTP failure so the
 * admin UI can surface it.
 */
export async function fetchMatches(stage?: string): Promise<NormalizedMatch[]> {
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
    // Always fetch fresh data when an admin syncs.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `football-data.org returned ${res.status} ${res.statusText}. ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { matches?: RawMatch[] };
  const matches = data.matches ?? [];

  return matches.map((m) => ({
    externalId: String(m.id),
    stage: m.stage,
    isKnockout: m.stage !== "GROUP_STAGE",
    homeTeam: m.homeTeam?.name ?? "TBD",
    awayTeam: m.awayTeam?.name ?? "TBD",
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    kickoff: new Date(m.utcDate),
    status: mapStatus(m.status),
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    qualifier: mapQualifier(m.score?.winner),
  }));
}
