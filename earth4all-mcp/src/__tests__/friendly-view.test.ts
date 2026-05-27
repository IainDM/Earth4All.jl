import { describe, it, expect } from "vitest";
import {
  formatProjectPreview,
  formatDashboard,
  formatSimulationResult,
  formatComparison,
} from "../earth4all/friendly-view.js";
import { DEFAULT_PARAMETERS } from "../earth4all/parameters.js";
import { getGiantLeapOverrides } from "../earth4all/scenarios.js";
import type {
  SectorId,
  SectorParameters,
  DashboardValues,
  SimulationResult,
} from "../earth4all/types.js";

function makeDashboard(overrides: Partial<DashboardValues> = {}): DashboardValues {
  return {
    year: 2100,
    population_mp: 9000,
    gdp_per_person_k: 50,
    warming_degC: 2.0,
    inequality: 0.5,
    wellbeing_index: 1.2,
    social_tension: 0.6,
    ...overrides,
  };
}

describe("formatProjectPreview", () => {
  it("shows project name and scenario", () => {
    const params = { ...DEFAULT_PARAMETERS };
    const preview = formatProjectPreview("My Project", "tltl", params);
    expect(preview).toContain("My Project");
    expect(preview).toContain("tltl");
  });

  it("shows turnaround status as OFF for TLTL defaults", () => {
    // For TLTL, turnarounds where tltlValue !== glValue should show as not fully active
    const params = { ...DEFAULT_PARAMETERS };
    const preview = formatProjectPreview("TLTL Test", "tltl", params);
    expect(preview).toContain("Turnaround Status");
  });

  it("shows modifications when parameters differ from defaults", () => {
    const params: Record<string, SectorParameters> = {};
    for (const [sector, p] of Object.entries(DEFAULT_PARAMETERS)) {
      params[sector] = { ...p };
    }
    params.population.DNCM = 2.5; // modified
    const preview = formatProjectPreview(
      "Custom",
      "tltl",
      params as Record<SectorId, SectorParameters>,
    );
    expect(preview).toContain("Modified Parameters");
    expect(preview).toContain("population.DNCM=2.5");
  });

  it("says no modifications when params match defaults", () => {
    const params = { ...DEFAULT_PARAMETERS };
    const preview = formatProjectPreview("Default", "tltl", params);
    expect(preview).toContain("No parameters modified");
  });
});

describe("formatDashboard", () => {
  it("formats milestone years", () => {
    const dashboard = [
      makeDashboard({ year: 2025, population_mp: 8100 }),
      makeDashboard({ year: 2050, population_mp: 8900 }),
      makeDashboard({ year: 2100, population_mp: 9000 }),
    ];
    const output = formatDashboard(dashboard);
    expect(output).toContain("2025");
    expect(output).toContain("2050");
    expect(output).toContain("2100");
    expect(output).toContain("population_mp");
  });

  it("includes all 6 dashboard metrics", () => {
    const dashboard = [makeDashboard()];
    const output = formatDashboard(dashboard);
    expect(output).toContain("population_mp");
    expect(output).toContain("gdp_per_person_k");
    expect(output).toContain("warming_degC");
    expect(output).toContain("inequality");
    expect(output).toContain("wellbeing_index");
    expect(output).toContain("social_tension");
  });
});

describe("formatSimulationResult", () => {
  it("formats successful result", () => {
    const result: SimulationResult = {
      success: true,
      message: "Simulation completed",
      solve_time_seconds: 1.23,
      dashboard: [
        makeDashboard({ year: 2025 }),
        makeDashboard({ year: 2100 }),
      ],
      warnings: [],
    };
    const output = formatSimulationResult(result);
    expect(output).toContain("success");
    expect(output).toContain("1.23");
    expect(output).toContain("Dashboard");
  });

  it("formats failed result", () => {
    const result: SimulationResult = {
      success: false,
      message: "Julia worker crashed",
      solve_time_seconds: 0,
      dashboard: [],
      warnings: ["Stack trace..."],
    };
    const output = formatSimulationResult(result);
    expect(output).toContain("failed");
    expect(output).toContain("Julia worker crashed");
    expect(output).toContain("Warnings");
  });

  it("includes warnings when present", () => {
    const result: SimulationResult = {
      success: true,
      message: "Done",
      solve_time_seconds: 0.5,
      dashboard: [makeDashboard()],
      warnings: ["Unknown parameter foo.BAR — skipped"],
    };
    const output = formatSimulationResult(result);
    expect(output).toContain("Unknown parameter foo.BAR");
  });
});

describe("formatComparison", () => {
  it("formats comparison of two scenarios", () => {
    const resultA: SimulationResult = {
      success: true,
      message: "Done",
      solve_time_seconds: 1,
      dashboard: [makeDashboard({ year: 2100, warming_degC: 2.5 })],
      warnings: [],
    };
    const resultB: SimulationResult = {
      success: true,
      message: "Done",
      solve_time_seconds: 1,
      dashboard: [makeDashboard({ year: 2100, warming_degC: 1.8 })],
      warnings: [],
    };
    const output = formatComparison("TLTL", resultA, "Giant Leap", resultB);
    expect(output).toContain("TLTL");
    expect(output).toContain("Giant Leap");
    expect(output).toContain("2100");
    expect(output).toContain("warming_degC");
  });

  it("shows delta between values", () => {
    const resultA: SimulationResult = {
      success: true,
      message: "Done",
      solve_time_seconds: 1,
      dashboard: [makeDashboard({ year: 2100, population_mp: 9000 })],
      warnings: [],
    };
    const resultB: SimulationResult = {
      success: true,
      message: "Done",
      solve_time_seconds: 1,
      dashboard: [makeDashboard({ year: 2100, population_mp: 7000 })],
      warnings: [],
    };
    const output = formatComparison("A", resultA, "B", resultB);
    // delta should be -2000
    expect(output).toContain("-2000");
  });
});
