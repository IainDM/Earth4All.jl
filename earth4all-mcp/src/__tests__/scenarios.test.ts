import { describe, it, expect } from "vitest";
import {
  SCENARIOS,
  TURNAROUNDS,
  getGiantLeapOverrides,
  getTurnaroundOverrides,
} from "../earth4all/scenarios.js";
import { DEFAULT_PARAMETERS } from "../earth4all/parameters.js";
import { TURNAROUND_IDS, SECTOR_IDS, type SectorId } from "../earth4all/types.js";

describe("scenarios", () => {
  it("defines TLTL and Giant Leap", () => {
    expect(SCENARIOS.tltl).toBeDefined();
    expect(SCENARIOS["giant-leap"]).toBeDefined();
    expect(SCENARIOS.tltl.name).toBe("Too Little Too Late");
    expect(SCENARIOS["giant-leap"].name).toBe("Giant Leap");
  });

  it("scenarios have descriptions", () => {
    expect(SCENARIOS.tltl.description.length).toBeGreaterThan(20);
    expect(SCENARIOS["giant-leap"].description.length).toBeGreaterThan(20);
  });
});

describe("turnarounds", () => {
  it("defines all 5 turnarounds", () => {
    expect(Object.keys(TURNAROUNDS)).toHaveLength(5);
    for (const id of TURNAROUND_IDS) {
      expect(TURNAROUNDS[id]).toBeDefined();
      expect(TURNAROUNDS[id].name.length).toBeGreaterThan(0);
      expect(TURNAROUNDS[id].description.length).toBeGreaterThan(0);
      expect(TURNAROUNDS[id].parameters.length).toBeGreaterThan(0);
    }
  });

  it("poverty turnaround has 4 parameters", () => {
    expect(TURNAROUNDS.poverty.parameters).toHaveLength(4);
  });

  it("inequality turnaround has 6 parameters", () => {
    expect(TURNAROUNDS.inequality.parameters).toHaveLength(6);
  });

  it("empowerment turnaround has 1 parameter", () => {
    expect(TURNAROUNDS.empowerment.parameters).toHaveLength(1);
  });

  it("food turnaround has 3 parameters", () => {
    expect(TURNAROUNDS.food.parameters).toHaveLength(3);
  });

  it("energy turnaround has 7 parameters", () => {
    expect(TURNAROUNDS.energy.parameters).toHaveLength(7);
  });

  it("total GL parameters across all turnarounds is 21", () => {
    let total = 0;
    for (const t of Object.values(TURNAROUNDS)) {
      total += t.parameters.length;
    }
    expect(total).toBe(21);
  });

  it("all turnaround parameters reference valid sectors", () => {
    for (const turnaround of Object.values(TURNAROUNDS)) {
      for (const param of turnaround.parameters) {
        expect(SECTOR_IDS).toContain(param.sector);
      }
    }
  });

  it("all turnaround parameters exist in DEFAULT_PARAMETERS", () => {
    for (const turnaround of Object.values(TURNAROUNDS)) {
      for (const param of turnaround.parameters) {
        const sectorParams = DEFAULT_PARAMETERS[param.sector];
        expect(
          sectorParams,
          `sector ${param.sector} should exist`,
        ).toBeDefined();
        expect(
          param.parameter in sectorParams,
          `${param.sector}.${param.parameter} should exist in defaults`,
        ).toBe(true);
      }
    }
  });

  it("tltlValue matches DEFAULT_PARAMETERS for all turnaround params", () => {
    for (const turnaround of Object.values(TURNAROUNDS)) {
      for (const param of turnaround.parameters) {
        const defaultVal = DEFAULT_PARAMETERS[param.sector][param.parameter];
        expect(
          param.tltlValue,
          `${param.sector}.${param.parameter}: tltlValue=${param.tltlValue} should equal default=${defaultVal}`,
        ).toBe(defaultVal);
      }
    }
  });

  it("glValue differs from tltlValue for all turnaround params", () => {
    for (const turnaround of Object.values(TURNAROUNDS)) {
      for (const param of turnaround.parameters) {
        expect(
          param.glValue,
          `${param.sector}.${param.parameter}: GL value should differ from TLTL`,
        ).not.toBe(param.tltlValue);
      }
    }
  });

  describe("specific Giant Leap values", () => {
    it("population.GEFR GL = 0.2", () => {
      const p = TURNAROUNDS.empowerment.parameters.find(
        (p) => p.parameter === "GEFR",
      );
      expect(p?.glValue).toBe(0.2);
    });

    it("energy.GREF GL = 1", () => {
      const p = TURNAROUNDS.energy.parameters.find(
        (p) => p.parameter === "GREF",
      );
      expect(p?.glValue).toBe(1);
    });

    it("climate.DACCO22100 GL = 8", () => {
      const p = TURNAROUNDS.energy.parameters.find(
        (p) => p.parameter === "DACCO22100",
      );
      expect(p?.glValue).toBe(8);
    });

    it("demand.EETF2022 GL = 0.02", () => {
      const p = TURNAROUNDS.inequality.parameters.find(
        (p) => p.parameter === "EETF2022",
      );
      expect(p?.glValue).toBe(0.02);
    });

    it("foodland.GFRA GL = 0.5", () => {
      const p = TURNAROUNDS.food.parameters.find(
        (p) => p.parameter === "GFRA",
      );
      expect(p?.glValue).toBe(0.5);
    });
  });
});

describe("getGiantLeapOverrides", () => {
  it("returns overrides grouped by sector", () => {
    const overrides = getGiantLeapOverrides();
    expect(typeof overrides).toBe("object");
    // Should have entries for affected sectors
    expect(overrides.climate).toBeDefined();
    expect(overrides.demand).toBeDefined();
    expect(overrides.energy).toBeDefined();
    expect(overrides.foodland).toBeDefined();
    expect(overrides.output).toBeDefined();
    expect(overrides.population).toBeDefined();
    expect(overrides.public).toBeDefined();
  });

  it("contains correct override values", () => {
    const overrides = getGiantLeapOverrides();
    expect(overrides.population.GEFR).toBe(0.2);
    expect(overrides.energy.GREF).toBe(1);
    expect(overrides.climate.DACCO22100).toBe(8);
    expect(overrides.demand.EETF2022).toBe(0.02);
    expect(overrides.foodland.GFRA).toBe(0.5);
  });

  it("total overrides count is 21", () => {
    const overrides = getGiantLeapOverrides();
    let total = 0;
    for (const sectorOverrides of Object.values(overrides)) {
      total += Object.keys(sectorOverrides).length;
    }
    expect(total).toBe(21);
  });
});

describe("getTurnaroundOverrides", () => {
  it("returns overrides for a specific turnaround", () => {
    const overrides = getTurnaroundOverrides("energy");
    expect(overrides.energy).toBeDefined();
    expect(overrides.climate).toBeDefined();
    expect(overrides.energy.GREF).toBe(1);
    expect(overrides.climate.DACCO22100).toBe(8);
  });

  it("empowerment only affects population", () => {
    const overrides = getTurnaroundOverrides("empowerment");
    expect(Object.keys(overrides)).toEqual(["population"]);
    expect(overrides.population.GEFR).toBe(0.2);
  });

  it("food only affects foodland", () => {
    const overrides = getTurnaroundOverrides("food");
    expect(Object.keys(overrides)).toEqual(["foodland"]);
  });
});
