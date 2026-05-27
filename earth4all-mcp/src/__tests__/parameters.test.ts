import { describe, it, expect } from "vitest";
import {
  DEFAULT_PARAMETERS,
  getDefaultParameters,
  getAllDefaultParameters,
} from "../earth4all/parameters.js";
import { SECTOR_IDS, type SectorId } from "../earth4all/types.js";

describe("parameters", () => {
  it("has entries for all 12 sectors", () => {
    for (const sector of SECTOR_IDS) {
      expect(DEFAULT_PARAMETERS[sector]).toBeDefined();
      expect(Object.keys(DEFAULT_PARAMETERS[sector]).length).toBeGreaterThan(0);
    }
  });

  it("has the correct number of sectors", () => {
    expect(Object.keys(DEFAULT_PARAMETERS)).toHaveLength(12);
  });

  it("has correct total parameter count (~301)", () => {
    let total = 0;
    for (const sector of SECTOR_IDS) {
      total += Object.keys(DEFAULT_PARAMETERS[sector]).length;
    }
    // The actual Earth4All.jl has 301 parameters
    expect(total).toBeGreaterThanOrEqual(250);
    expect(total).toBeLessThanOrEqual(350);
  });

  describe("per-sector parameter counts", () => {
    const expectedCounts: Partial<Record<SectorId, number>> = {
      climate: 43,
      demand: 33,
      energy: 41,
      finance: 13,
      foodland: 35,
      inventory: 16,
      labourmarket: 18,
      other: 3,
      output: 34,
      population: 23,
      public: 17,
      wellbeing: 25,
    };

    for (const [sector, expected] of Object.entries(expectedCounts)) {
      it(`${sector} has ${expected} parameters`, () => {
        expect(Object.keys(DEFAULT_PARAMETERS[sector as SectorId])).toHaveLength(
          expected,
        );
      });
    }
  });

  describe("key parameter values (TLTL defaults)", () => {
    it("population.GEFR = 0 (no extra fertility reduction in TLTL)", () => {
      expect(DEFAULT_PARAMETERS.population.GEFR).toBe(0);
    });

    it("population.DNC80 = 4.3 (desired children in 1980)", () => {
      expect(DEFAULT_PARAMETERS.population.DNC80).toBe(4.3);
    });

    it("population.DNCM = 1.2 (minimum desired children)", () => {
      expect(DEFAULT_PARAMETERS.population.DNCM).toBe(1.2);
    });

    it("population.LEMAX = 85 (max life expectancy)", () => {
      expect(DEFAULT_PARAMETERS.population.LEMAX).toBe(85);
    });

    it("climate.DACCO22100 = 0 (no direct air capture in TLTL)", () => {
      expect(DEFAULT_PARAMETERS.climate.DACCO22100).toBe(0);
    });

    it("climate.OBWA2022 = 1.35 (observed warming in 2022)", () => {
      expect(DEFAULT_PARAMETERS.climate.OBWA2022).toBe(1.35);
    });

    it("energy.GFNE = 0.5 (50% electrification in TLTL)", () => {
      expect(DEFAULT_PARAMETERS.energy.GFNE).toBe(0.5);
    });

    it("energy.GREF = 0.5 (50% renewable in TLTL)", () => {
      expect(DEFAULT_PARAMETERS.energy.GREF).toBe(0.5);
    });

    it("demand.EETF2022 = 0 (no extra employee tax in TLTL)", () => {
      expect(DEFAULT_PARAMETERS.demand.EETF2022).toBe(0);
    });

    it("demand.INEQ1980 = 0.61 (inequality in 1980)", () => {
      expect(DEFAULT_PARAMETERS.demand.INEQ1980).toBe(0.61);
    });

    it("demand.FETPO = 0.5 (TLTL default, not 0)", () => {
      expect(DEFAULT_PARAMETERS.demand.FETPO).toBe(0.5);
    });

    it("foodland.GCWR = 0.05 (TLTL default, not 0)", () => {
      expect(DEFAULT_PARAMETERS.foodland.GCWR).toBe(0.05);
    });

    it("energy.GFCO2SCCS = 0.2 (TLTL default, not 0)", () => {
      expect(DEFAULT_PARAMETERS.energy.GFCO2SCCS).toBe(0.2);
    });
  });

  describe("all parameter values are finite numbers", () => {
    for (const sector of SECTOR_IDS) {
      it(`${sector} has all finite numeric values`, () => {
        for (const [key, value] of Object.entries(DEFAULT_PARAMETERS[sector])) {
          expect(typeof value).toBe("number");
          expect(Number.isFinite(value)).toBe(true);
        }
      });
    }
  });

  describe("getDefaultParameters", () => {
    it("returns a copy, not a reference", () => {
      const params = getDefaultParameters("population");
      params.GEFR = 999;
      expect(DEFAULT_PARAMETERS.population.GEFR).toBe(0);
    });

    it("returns correct values for each sector", () => {
      for (const sector of SECTOR_IDS) {
        const params = getDefaultParameters(sector);
        expect(params).toEqual(DEFAULT_PARAMETERS[sector]);
      }
    });
  });

  describe("getAllDefaultParameters", () => {
    it("returns copies for all sectors", () => {
      const all = getAllDefaultParameters();
      all.population.GEFR = 999;
      expect(DEFAULT_PARAMETERS.population.GEFR).toBe(0);
    });

    it("includes all 12 sectors", () => {
      const all = getAllDefaultParameters();
      expect(Object.keys(all)).toHaveLength(12);
      for (const sector of SECTOR_IDS) {
        expect(all[sector]).toBeDefined();
      }
    });
  });
});
