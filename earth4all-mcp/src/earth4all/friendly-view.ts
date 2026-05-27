import type {
  SectorId,
  SectorParameters,
  DashboardValues,
  SimulationResult,
} from "./types.js";
import { SECTOR_LABELS } from "./types.js";
import { getDefaultParameters } from "./parameters.js";
import { getGiantLeapOverrides } from "./scenarios.js";
import { TURNAROUNDS } from "./scenarios.js";

export function formatProjectPreview(
  projectName: string,
  baseScenario: string,
  allParams: Record<SectorId, SectorParameters>,
): string {
  const lines: string[] = [];
  lines.push(`=== Project: ${projectName} ===`);
  lines.push(`base_scenario=${baseScenario}`);
  lines.push("");

  // Find modified parameters (different from TLTL defaults)
  const modifications: string[] = [];
  for (const [sector, params] of Object.entries(allParams)) {
    const defaults = getDefaultParameters(sector as SectorId);
    for (const [param, value] of Object.entries(params)) {
      if (defaults[param] !== undefined && defaults[param] !== value) {
        modifications.push(`${sector}.${param}=${value} (default=${defaults[param]})`);
      }
    }
  }

  if (modifications.length > 0) {
    lines.push(`=== Modified Parameters (${modifications.length}) ===`);
    for (const mod of modifications) {
      lines.push(mod);
    }
  } else {
    lines.push("No parameters modified from defaults.");
  }

  lines.push("");
  lines.push("=== Turnaround Status ===");
  const glOverrides = getGiantLeapOverrides();

  for (const turnaround of Object.values(TURNAROUNDS)) {
    let active = 0;
    let total = turnaround.parameters.length;
    for (const tp of turnaround.parameters) {
      const currentVal = allParams[tp.sector]?.[tp.parameter];
      if (currentVal !== undefined && currentVal === tp.glValue) {
        active++;
      }
    }
    const status =
      active === total ? "FULL" : active > 0 ? "PARTIAL" : "OFF";
    lines.push(
      `${turnaround.name}: ${status} (${active}/${total} GL parameters active)`,
    );
  }

  return lines.join("\n");
}

export function formatDashboard(dashboard: DashboardValues[]): string {
  const lines: string[] = [];
  lines.push("=== Dashboard ===");

  const years = dashboard.map((d) => d.year);
  const header = `year=${years.join(" → ")}`;
  lines.push(header);

  const metrics: [string, keyof DashboardValues, string][] = [
    ["population_mp", "population_mp", "Mp"],
    ["gdp_per_person_k", "gdp_per_person_k", "k$/p"],
    ["warming_degC", "warming_degC", "°C"],
    ["inequality", "inequality", "ratio"],
    ["wellbeing_index", "wellbeing_index", "index"],
    ["social_tension", "social_tension", "index"],
  ];

  for (const [label, key, unit] of metrics) {
    const values = dashboard.map((d) => {
      const val = d[key] as number;
      return typeof val === "number" ? val.toFixed(2) : "N/A";
    });
    lines.push(`${label}=${values.join(" → ")} ${unit}`);
  }

  return lines.join("\n");
}

export function formatSimulationResult(result: SimulationResult): string {
  const lines: string[] = [];
  lines.push("=== Earth4All Simulation Results ===");
  lines.push(`status=${result.success ? "success" : "failed"}`);
  lines.push(`message=${result.message}`);
  lines.push(`solve_time=${result.solve_time_seconds.toFixed(2)}s`);
  lines.push("");

  if (result.dashboard.length > 0) {
    lines.push(formatDashboard(result.dashboard));
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("=== Warnings ===");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}

export function formatComparison(
  nameA: string,
  resultA: SimulationResult,
  nameB: string,
  resultB: SimulationResult,
): string {
  const lines: string[] = [];
  lines.push(`=== Comparison: ${nameA} vs ${nameB} ===`);
  lines.push("");

  const metrics: [string, keyof DashboardValues, string][] = [
    ["population_mp", "population_mp", "Mp"],
    ["gdp_per_person_k", "gdp_per_person_k", "k$/p"],
    ["warming_degC", "warming_degC", "°C"],
    ["inequality", "inequality", "ratio"],
    ["wellbeing_index", "wellbeing_index", "index"],
    ["social_tension", "social_tension", "index"],
  ];

  // Compare at 2100 (last dashboard entry)
  const dashA = resultA.dashboard[resultA.dashboard.length - 1];
  const dashB = resultB.dashboard[resultB.dashboard.length - 1];

  if (dashA && dashB) {
    lines.push("=== Values at 2100 ===");
    lines.push(`${"metric".padEnd(22)} ${nameA.padEnd(12)} ${nameB.padEnd(12)} delta`);
    lines.push("-".repeat(60));

    for (const [label, key, unit] of metrics) {
      const valA = dashA[key] as number;
      const valB = dashB[key] as number;
      const delta = valB - valA;
      const sign = delta >= 0 ? "+" : "";
      lines.push(
        `${label.padEnd(22)} ${valA.toFixed(2).padEnd(12)} ${valB.toFixed(2).padEnd(12)} ${sign}${delta.toFixed(2)} ${unit}`,
      );
    }
  }

  return lines.join("\n");
}
