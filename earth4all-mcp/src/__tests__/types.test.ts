import { describe, it, expect } from "vitest";
import {
  SECTOR_IDS,
  SECTOR_LABELS,
  JULIA_SECTOR_NAMES,
  JULIA_PARAM_KEYS,
  JULIA_INIT_KEYS,
  TURNAROUND_IDS,
} from "../earth4all/types.js";

describe("SECTOR_IDS", () => {
  it("has 12 sectors", () => {
    expect(SECTOR_IDS).toHaveLength(12);
  });

  it("contains expected sectors", () => {
    expect(SECTOR_IDS).toContain("climate");
    expect(SECTOR_IDS).toContain("demand");
    expect(SECTOR_IDS).toContain("energy");
    expect(SECTOR_IDS).toContain("finance");
    expect(SECTOR_IDS).toContain("foodland");
    expect(SECTOR_IDS).toContain("inventory");
    expect(SECTOR_IDS).toContain("labourmarket");
    expect(SECTOR_IDS).toContain("other");
    expect(SECTOR_IDS).toContain("output");
    expect(SECTOR_IDS).toContain("population");
    expect(SECTOR_IDS).toContain("public");
    expect(SECTOR_IDS).toContain("wellbeing");
  });
});

describe("SECTOR_LABELS", () => {
  it("has a label for every sector", () => {
    for (const id of SECTOR_IDS) {
      expect(SECTOR_LABELS[id]).toBeTruthy();
      expect(SECTOR_LABELS[id].length).toBeGreaterThan(0);
    }
  });
});

describe("JULIA_SECTOR_NAMES", () => {
  it("maps every sector to a Julia module name", () => {
    for (const id of SECTOR_IDS) {
      expect(JULIA_SECTOR_NAMES[id]).toBeTruthy();
    }
  });

  it("has correct Julia module names", () => {
    expect(JULIA_SECTOR_NAMES.climate).toBe("Climate");
    expect(JULIA_SECTOR_NAMES.foodland).toBe("FoodLand");
    expect(JULIA_SECTOR_NAMES.labourmarket).toBe("LabourMarket");
  });
});

describe("JULIA_PARAM_KEYS", () => {
  it("maps every sector to a Julia parameter keyword", () => {
    for (const id of SECTOR_IDS) {
      expect(JULIA_PARAM_KEYS[id]).toBeTruthy();
      expect(JULIA_PARAM_KEYS[id]).toMatch(/_pars$/);
    }
  });
});

describe("JULIA_INIT_KEYS", () => {
  it("maps every sector to a Julia init keyword", () => {
    for (const id of SECTOR_IDS) {
      expect(JULIA_INIT_KEYS[id]).toBeTruthy();
      expect(JULIA_INIT_KEYS[id]).toMatch(/_inits$/);
    }
  });
});

describe("TURNAROUND_IDS", () => {
  it("has 5 turnarounds", () => {
    expect(TURNAROUND_IDS).toHaveLength(5);
  });

  it("contains the five extraordinary turnarounds", () => {
    expect(TURNAROUND_IDS).toContain("poverty");
    expect(TURNAROUND_IDS).toContain("inequality");
    expect(TURNAROUND_IDS).toContain("empowerment");
    expect(TURNAROUND_IDS).toContain("food");
    expect(TURNAROUND_IDS).toContain("energy");
  });
});
