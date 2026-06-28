import { describe, expect, it } from "vitest";
import { normalizeMatch, type RawMatch } from "./footballData";

const base = {
  id: 42,
  utcDate: "2026-06-28T18:00:00Z",
  stage: "LAST_16",
  homeTeam: { name: "France", crest: "https://x/fr.png" },
  awayTeam: { name: "Poland", crest: "https://x/pl.png" },
};

describe("normalizeMatch", () => {
  it("uses fullTime as the 90-minute score for a regular-time win", () => {
    const raw = {
      ...base,
      status: "FINISHED",
      score: {
        winner: "HOME_TEAM",
        duration: "REGULAR",
        fullTime: { home: 3, away: 1 },
        regularTime: null,
      },
    } as RawMatch;

    const m = normalizeMatch(raw);
    expect(m.homeScore).toBe(3);
    expect(m.awayScore).toBe(1);
    expect(m.finalHomeScore).toBe(3);
    expect(m.finalAwayScore).toBe(1);
    expect(m.decidedBy).toBe("REGULAR");
    expect(m.qualifier).toBe("HOME");
    expect(m.isKnockout).toBe(true);
  });

  it("uses regularTime (not fullTime) as the 90-minute score after penalties", () => {
    // 1-1 at 90'; settled on penalties, fullTime reflects the shootout.
    const raw = {
      ...base,
      status: "FINISHED",
      score: {
        winner: "AWAY_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 4, away: 5 },
        regularTime: { home: 1, away: 1 },
      },
    } as RawMatch;

    const m = normalizeMatch(raw);
    // Scoring must use the 90-minute score:
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    // Display keeps the final score:
    expect(m.finalHomeScore).toBe(4);
    expect(m.finalAwayScore).toBe(5);
    expect(m.decidedBy).toBe("PENALTIES");
    expect(m.qualifier).toBe("AWAY");
  });

  it("uses regularTime as the 90-minute score after extra time", () => {
    const raw = {
      ...base,
      status: "FINISHED",
      score: {
        winner: "HOME_TEAM",
        duration: "EXTRA_TIME",
        fullTime: { home: 2, away: 1 },
        regularTime: { home: 1, away: 1 },
      },
    } as RawMatch;

    const m = normalizeMatch(raw);
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    expect(m.finalHomeScore).toBe(2);
    expect(m.finalAwayScore).toBe(1);
    expect(m.decidedBy).toBe("EXTRA_TIME");
  });

  it("handles an unplayed match with no scores", () => {
    const raw = {
      ...base,
      status: "TIMED",
      score: {
        winner: null,
        duration: "REGULAR",
        fullTime: { home: null, away: null },
        regularTime: null,
      },
    } as RawMatch;

    const m = normalizeMatch(raw);
    expect(m.status).toBe("SCHEDULED");
    expect(m.homeScore).toBeNull();
    expect(m.awayScore).toBeNull();
    expect(m.qualifier).toBeNull();
  });

  it("marks group-stage matches as non-knockout", () => {
    const m = normalizeMatch({
      ...base,
      stage: "GROUP_STAGE",
      status: "FINISHED",
      score: {
        winner: "HOME_TEAM",
        duration: "REGULAR",
        fullTime: { home: 2, away: 0 },
      },
    } as RawMatch);
    expect(m.isKnockout).toBe(false);
  });
});
