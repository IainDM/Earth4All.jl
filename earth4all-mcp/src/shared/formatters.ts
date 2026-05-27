import type { SimulationResult, DashboardValues } from "../earth4all/types.js";

export function formatLlmSummary(result: SimulationResult): string {
  if (!result.success) {
    return `Simulation failed: ${result.message}`;
  }

  const lines: string[] = [];
  lines.push("=== Earth4All Simulation Summary ===");
  lines.push(`solve_time=${result.solve_time_seconds.toFixed(2)}s`);
  lines.push("");

  if (result.dashboard.length > 0) {
    const years = result.dashboard.map((d) => d.year);
    lines.push(`=== Dashboard (${years.join(" → ")}) ===`);

    const format = (vals: number[]) => vals.map((v) => v.toFixed(1)).join(" → ");

    lines.push(`population_mp=${format(result.dashboard.map((d) => d.population_mp))}`);
    lines.push(`gdp_per_person_k=${format(result.dashboard.map((d) => d.gdp_per_person_k))}`);
    lines.push(`warming_degC=${format(result.dashboard.map((d) => d.warming_degC))}`);
    lines.push(`inequality=${format(result.dashboard.map((d) => d.inequality))}`);
    lines.push(`wellbeing_index=${format(result.dashboard.map((d) => d.wellbeing_index))}`);
    lines.push(`social_tension=${format(result.dashboard.map((d) => d.social_tension))}`);
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("=== Warnings ===");
    for (const w of result.warnings) {
      lines.push(`- ${w}`);
    }
  }

  return lines.join("\n");
}

export function formatTimeseriesSample(
  variable: string,
  times: number[],
  values: number[],
  samplePoints = 13,
): string {
  const lines: string[] = [];
  lines.push(`=== ${variable} ===`);

  // Sample evenly across the time range
  const step = Math.max(1, Math.floor(times.length / samplePoints));
  lines.push("year\tvalue");
  for (let i = 0; i < times.length; i += step) {
    lines.push(`${times[i].toFixed(0)}\t${values[i].toFixed(4)}`);
  }
  // Always include the last point
  const last = times.length - 1;
  if (last % step !== 0) {
    lines.push(`${times[last].toFixed(0)}\t${values[last].toFixed(4)}`);
  }

  return lines.join("\n");
}
