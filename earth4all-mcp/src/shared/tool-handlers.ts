import type { SectorId, TurnaroundId, ScenarioId } from "../earth4all/types.js";
import { SECTOR_IDS } from "../earth4all/types.js";
import {
  listScenarios,
  listProjects,
  createProject,
  getProject,
  getProjectParameters,
  setParameter,
  resetParameter,
  saveProjectBaseline,
  restoreProjectBaseline,
  getProjectDir,
} from "../project/index.js";
import { readAllParameters, readSimulationResults, readTimeseries } from "../earth4all/reader.js";
import { writeSimulationResults, writeTimeseries } from "../earth4all/writer.js";
import { trackParameterChange } from "../earth4all/source-tracker.js";
import { TURNAROUNDS, getTurnaroundOverrides } from "../earth4all/scenarios.js";
import { getDefaultParameters } from "../earth4all/parameters.js";
import {
  formatProjectPreview,
  formatSimulationResult,
  formatComparison,
} from "../earth4all/friendly-view.js";
import { runSimulation } from "./julia-runner.js";
import { logger } from "./logger.js";

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function textResult(text: string, isError = false): ToolResult {
  return { content: [{ type: "text" as const, text }], isError };
}

export async function handleListScenarios(): Promise<ToolResult> {
  const scenarios = await listScenarios();
  const lines = scenarios.map(
    (s) => `**${s.name}** (${s.id})\n${s.description}`,
  );
  return textResult(lines.join("\n\n"));
}

export async function handleListProjects(): Promise<ToolResult> {
  const projects = await listProjects();
  if (projects.length === 0) {
    return textResult(
      "No projects yet. Use create_project to create one from a base scenario.",
    );
  }
  const lines = projects.map(
    (p) =>
      `- **${p.name}** (id=${p.id}, base=${p.baseScenario})\n  ${p.description}\n  Updated: ${p.updatedAt}`,
  );
  return textResult(lines.join("\n"));
}

export async function handleCreateProject(args: {
  name: string;
  description: string;
  base_scenario: string;
}): Promise<ToolResult> {
  const config = await createProject(
    args.name,
    args.description,
    args.base_scenario as ScenarioId,
  );
  return textResult(
    `Project created successfully.\nid=${config.id}\nname=${config.name}\nbase_scenario=${config.baseScenario}\n\nUse preview_model to see the current parameter state, or set_parameter / set_turnaround to modify parameters before running a simulation.`,
  );
}

export async function handlePreviewModel(args: {
  project_id: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }
  const params = await getProjectParameters(args.project_id);
  const preview = formatProjectPreview(
    project.name,
    project.baseScenario,
    params,
  );
  return textResult(preview);
}

export async function handleSetParameter(args: {
  project_id: string;
  sector: string;
  parameter: string;
  value: number;
  source_name: string;
  source_url?: string;
  source_year?: number;
  source_notes?: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const sector = args.sector as SectorId;
  if (!SECTOR_IDS.includes(sector)) {
    return textResult(`Invalid sector: ${args.sector}`, true);
  }

  const { previousValue } = await setParameter(
    args.project_id,
    sector,
    args.parameter,
    args.value,
  );

  // Track the source citation
  const projectDir = getProjectDir(args.project_id);
  await trackParameterChange(
    projectDir,
    sector,
    args.parameter,
    args.value,
    previousValue ?? args.value,
    {
      name: args.source_name,
      url: args.source_url,
      year: args.source_year,
      notes: args.source_notes,
    },
  );

  return textResult(
    `Parameter updated: ${sector}.${args.parameter} = ${args.value}${previousValue !== undefined ? ` (was ${previousValue})` : ""}\nSource: ${args.source_name}`,
  );
}

export async function handleResetParameter(args: {
  project_id: string;
  sector: string;
  parameter: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const sector = args.sector as SectorId;
  const { previousValue, defaultValue } = await resetParameter(
    args.project_id,
    sector,
    args.parameter,
  );

  return textResult(
    `Parameter reset: ${sector}.${args.parameter} = ${defaultValue} (was ${previousValue})`,
  );
}

export async function handleSetTurnaround(args: {
  project_id: string;
  turnaround: string;
  enabled: boolean;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const turnaroundId = args.turnaround as TurnaroundId;
  const turnaround = TURNAROUNDS[turnaroundId];
  if (!turnaround) {
    return textResult(`Invalid turnaround: ${args.turnaround}`, true);
  }

  const changes: string[] = [];

  for (const param of turnaround.parameters) {
    const value = args.enabled ? param.glValue : param.tltlValue;
    await setParameter(args.project_id, param.sector, param.parameter, value);
    changes.push(`${param.sector}.${param.parameter} = ${value}`);
  }

  const action = args.enabled ? "enabled" : "disabled";
  return textResult(
    `Turnaround "${turnaround.name}" ${action}.\nParameters changed:\n${changes.map((c) => `  ${c}`).join("\n")}`,
  );
}

export async function handleRunSimulation(args: {
  project_id: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const params = await getProjectParameters(args.project_id);
  logger.info(`Running simulation for project ${args.project_id}`);

  try {
    const result = await runSimulation(params);
    const projectDir = getProjectDir(args.project_id);

    // Save results
    await writeSimulationResults(projectDir, result as unknown as Record<string, unknown>);
    if (result.timeseries) {
      await writeTimeseries(projectDir, result.timeseries as unknown as Record<string, unknown>);
    }

    return textResult(formatSimulationResult(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return textResult(`Simulation failed: ${message}`, true);
  }
}

export async function handleGetResults(args: {
  project_id: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const projectDir = getProjectDir(args.project_id);
  const results = await readSimulationResults(projectDir);
  if (!results) {
    return textResult(
      "No simulation results found. Run the simulation first with run_simulation.",
    );
  }

  return textResult(
    formatSimulationResult(results as unknown as import("../earth4all/types.js").SimulationResult),
  );
}

export async function handleCompareScenarios(args: {
  project_id_a: string;
  project_id_b: string;
}): Promise<ToolResult> {
  const projectA = await getProject(args.project_id_a);
  if (!projectA) {
    return textResult(`Project not found: ${args.project_id_a}`, true);
  }
  const projectB = await getProject(args.project_id_b);
  if (!projectB) {
    return textResult(`Project not found: ${args.project_id_b}`, true);
  }

  const paramsA = await getProjectParameters(args.project_id_a);
  const paramsB = await getProjectParameters(args.project_id_b);

  logger.info(`Running comparison: ${args.project_id_a} vs ${args.project_id_b}`);

  try {
    const [resultA, resultB] = await Promise.all([
      runSimulation(paramsA),
      runSimulation(paramsB),
    ]);

    // Save results for both projects
    const dirA = getProjectDir(args.project_id_a);
    const dirB = getProjectDir(args.project_id_b);
    await writeSimulationResults(dirA, resultA as unknown as Record<string, unknown>);
    await writeSimulationResults(dirB, resultB as unknown as Record<string, unknown>);

    const comparison = formatComparison(
      projectA.name,
      resultA,
      projectB.name,
      resultB,
    );
    return textResult(comparison);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return textResult(`Comparison failed: ${message}`, true);
  }
}

export async function handleSaveBaseline(args: {
  project_id: string;
  baseline_name: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  await saveProjectBaseline(args.project_id, args.baseline_name);
  return textResult(
    `Baseline "${args.baseline_name}" saved for project "${project.name}".`,
  );
}

export async function handleRestoreBaseline(args: {
  project_id: string;
  baseline_name: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  try {
    await restoreProjectBaseline(args.project_id, args.baseline_name);
    return textResult(
      `Baseline "${args.baseline_name}" restored for project "${project.name}".`,
    );
  } catch {
    return textResult(
      `Baseline "${args.baseline_name}" not found for project "${project.name}".`,
      true,
    );
  }
}

export async function handleGetVariableTimeseries(args: {
  project_id: string;
  variable: string;
}): Promise<ToolResult> {
  const project = await getProject(args.project_id);
  if (!project) {
    return textResult(`Project not found: ${args.project_id}`, true);
  }

  const projectDir = getProjectDir(args.project_id);
  const timeseries = await readTimeseries(projectDir);
  if (!timeseries) {
    return textResult(
      "No simulation results found. Run the simulation first with run_simulation.",
    );
  }

  const varData = (timeseries as Record<string, unknown>)[args.variable];
  if (!varData) {
    const available = Object.keys(timeseries as Record<string, unknown>).join(", ");
    return textResult(
      `Variable "${args.variable}" not found in results. Available: ${available}`,
      true,
    );
  }

  const data = varData as { times: number[]; values: number[] };
  // Format as compact tabular output
  const lines: string[] = [];
  lines.push(`=== Time Series: ${args.variable} ===`);
  lines.push(`points=${data.times.length}`);
  lines.push("");

  // Sample at key years for readability
  const sampleYears = [1980, 1990, 2000, 2010, 2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];
  lines.push("year\tvalue");
  for (const year of sampleYears) {
    const idx = data.times.findIndex((t) => Math.abs(t - year) < 0.5);
    if (idx >= 0) {
      lines.push(`${year}\t${data.values[idx].toFixed(4)}`);
    }
  }

  return textResult(lines.join("\n"));
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "list_scenarios":
      return handleListScenarios();
    case "list_projects":
      return handleListProjects();
    case "create_project":
      return handleCreateProject(args as Parameters<typeof handleCreateProject>[0]);
    case "preview_model":
      return handlePreviewModel(args as Parameters<typeof handlePreviewModel>[0]);
    case "set_parameter":
      return handleSetParameter(args as Parameters<typeof handleSetParameter>[0]);
    case "reset_parameter":
      return handleResetParameter(args as Parameters<typeof handleResetParameter>[0]);
    case "set_turnaround":
      return handleSetTurnaround(args as Parameters<typeof handleSetTurnaround>[0]);
    case "run_simulation":
      return handleRunSimulation(args as Parameters<typeof handleRunSimulation>[0]);
    case "get_results":
      return handleGetResults(args as Parameters<typeof handleGetResults>[0]);
    case "compare_scenarios":
      return handleCompareScenarios(args as Parameters<typeof handleCompareScenarios>[0]);
    case "save_baseline":
      return handleSaveBaseline(args as Parameters<typeof handleSaveBaseline>[0]);
    case "restore_baseline":
      return handleRestoreBaseline(args as Parameters<typeof handleRestoreBaseline>[0]);
    case "get_variable_timeseries":
      return handleGetVariableTimeseries(args as Parameters<typeof handleGetVariableTimeseries>[0]);
    default:
      return textResult(`Unknown tool: ${name}`, true);
  }
}
