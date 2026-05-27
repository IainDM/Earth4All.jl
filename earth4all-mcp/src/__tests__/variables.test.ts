import { describe, it, expect } from "vitest";
import {
  DASHBOARD_VARIABLES,
  EXTENDED_VARIABLES,
} from "../earth4all/variables.js";
import { SECTOR_IDS } from "../earth4all/types.js";

describe("DASHBOARD_VARIABLES", () => {
  it("has 6 dashboard variables", () => {
    expect(DASHBOARD_VARIABLES).toHaveLength(6);
  });

  it("includes population, GDP/person, warming, inequality, wellbeing, tension", () => {
    const names = DASHBOARD_VARIABLES.map((v) => v.juliaVar);
    expect(names).toContain("POP");
    expect(names).toContain("GDPP");
    expect(names).toContain("OW");
    expect(names).toContain("INEQ");
    expect(names).toContain("AWBI");
    expect(names).toContain("STE");
  });

  it("all variables reference valid sectors", () => {
    for (const v of DASHBOARD_VARIABLES) {
      expect(SECTOR_IDS).toContain(v.sector);
    }
  });

  it("all variables have required fields", () => {
    for (const v of DASHBOARD_VARIABLES) {
      expect(v.name.length).toBeGreaterThan(0);
      expect(v.juliaPrefix.length).toBeGreaterThan(0);
      expect(v.juliaVar.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
      expect(v.unit.length).toBeGreaterThan(0);
      expect(typeof v.minRange).toBe("number");
      expect(typeof v.maxRange).toBe("number");
      expect(v.maxRange).toBeGreaterThan(v.minRange);
    }
  });
});

describe("EXTENDED_VARIABLES", () => {
  it("includes all dashboard variables plus extras", () => {
    expect(EXTENDED_VARIABLES.length).toBeGreaterThan(
      DASHBOARD_VARIABLES.length,
    );
    // All dashboard vars should be in extended
    for (const dv of DASHBOARD_VARIABLES) {
      const found = EXTENDED_VARIABLES.find(
        (ev) => ev.juliaVar === dv.juliaVar && ev.sector === dv.sector,
      );
      expect(found, `${dv.juliaVar} should be in extended`).toBeTruthy();
    }
  });

  it("all extended variables reference valid sectors", () => {
    for (const v of EXTENDED_VARIABLES) {
      expect(SECTOR_IDS).toContain(v.sector);
    }
  });
});
