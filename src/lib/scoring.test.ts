import { describe, expect, it } from "vitest";
import { scorePrediction, hasResult, maxPoints } from "./scoring";

describe("scorePrediction", () => {
  it("awards a perfect knockout prediction the full 4 points", () => {
    const r = scorePrediction(
      { homeScore: 2, awayScore: 1, qualifier: "HOME" },
      { homeScore: 2, awayScore: 1, qualifier: "HOME" },
      true,
    );
    expect(r).toEqual({
      exactScore: 1,
      goalDifference: 1,
      qualifier: 2,
      total: 4,
    });
  });

  it("awards goal difference + qualifier but not exact score", () => {
    // Predicted 2-1 (GD +1, home wins), actual 3-2 (GD +1, home wins).
    const r = scorePrediction(
      { homeScore: 2, awayScore: 1, qualifier: "HOME" },
      { homeScore: 3, awayScore: 2, qualifier: "HOME" },
      true,
    );
    expect(r.exactScore).toBe(0);
    expect(r.goalDifference).toBe(1);
    expect(r.qualifier).toBe(2);
    expect(r.total).toBe(3);
  });

  it("awards only the qualifier point when score and GD are wrong", () => {
    const r = scorePrediction(
      { homeScore: 1, awayScore: 0, qualifier: "AWAY" },
      { homeScore: 0, awayScore: 2, qualifier: "AWAY" },
      true,
    );
    expect(r.total).toBe(2);
    expect(r.qualifier).toBe(2);
    expect(r.goalDifference).toBe(0);
  });

  it("gives the qualifier point on penalties even when 90-min was a draw", () => {
    // Predicted a 1-1 draw with away advancing; actual 1-1, away wins on pens.
    const r = scorePrediction(
      { homeScore: 1, awayScore: 1, qualifier: "AWAY" },
      { homeScore: 1, awayScore: 1, qualifier: "AWAY" },
      true,
    );
    expect(r.total).toBe(4); // exact(1) + GD(1) + qualifier(2)
  });

  it("does not award the qualifier point for non-knockout matches", () => {
    const r = scorePrediction(
      { homeScore: 2, awayScore: 1, qualifier: "HOME" },
      { homeScore: 2, awayScore: 1, qualifier: "HOME" },
      false,
    );
    expect(r.qualifier).toBe(0);
    expect(r.total).toBe(2);
  });

  it("does not award the qualifier point when the wrong side was picked", () => {
    const r = scorePrediction(
      { homeScore: 0, awayScore: 0, qualifier: "HOME" },
      { homeScore: 1, awayScore: 1, qualifier: "AWAY" },
      true,
    );
    expect(r.qualifier).toBe(0);
    expect(r.goalDifference).toBe(1); // both 0 GD
    expect(r.total).toBe(1);
  });

  it("handles a completely wrong prediction as zero", () => {
    const r = scorePrediction(
      { homeScore: 3, awayScore: 0, qualifier: "HOME" },
      { homeScore: 0, awayScore: 1, qualifier: "AWAY" },
      true,
    );
    expect(r.total).toBe(0);
  });
});

describe("hasResult", () => {
  it("is false for null / partial results", () => {
    expect(hasResult(null)).toBe(false);
    expect(hasResult(undefined)).toBe(false);
    expect(hasResult({ homeScore: 1 })).toBe(false);
  });
  it("is true when both scores are present", () => {
    expect(hasResult({ homeScore: 0, awayScore: 0 })).toBe(true);
  });
});

describe("maxPoints", () => {
  it("is 4 for knockout and 2 for group matches", () => {
    expect(maxPoints(true)).toBe(4);
    expect(maxPoints(false)).toBe(2);
  });
});
