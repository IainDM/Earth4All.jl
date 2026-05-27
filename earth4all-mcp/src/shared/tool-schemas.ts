import { z } from "zod";
import { SECTOR_IDS, TURNAROUND_IDS } from "../earth4all/types.js";

export const schemas = {
  list_scenarios: {},
  list_projects: {},
  create_project: {
    name: z.string().describe("Human-readable project name"),
    description: z.string().describe("Brief description of what this project variant explores"),
    base_scenario: z
      .enum(["tltl", "giant-leap"])
      .describe("Base scenario: 'tltl' (Too Little Too Late) or 'giant-leap' (Giant Leap)"),
  },
  preview_model: {
    project_id: z.string().describe("Project ID to preview"),
  },
  set_parameter: {
    project_id: z.string().describe("Project ID to modify"),
    sector: z.enum(SECTOR_IDS as unknown as [string, ...string[]]).describe("Sector containing the parameter"),
    parameter: z.string().describe("Parameter name (e.g., 'DNCM', 'GREF')"),
    value: z.number().describe("New parameter value"),
    source_name: z.string().describe("Citation: name of the source justifying this value (required)"),
    source_url: z.string().optional().describe("Citation: URL of the source"),
    source_year: z.number().optional().describe("Citation: publication year"),
    source_notes: z.string().optional().describe("Citation: notes explaining the rationale"),
  },
  reset_parameter: {
    project_id: z.string().describe("Project ID"),
    sector: z.enum(SECTOR_IDS as unknown as [string, ...string[]]).describe("Sector containing the parameter"),
    parameter: z.string().describe("Parameter name to reset to scenario default"),
  },
  set_turnaround: {
    project_id: z.string().describe("Project ID to modify"),
    turnaround: z.enum(TURNAROUND_IDS as unknown as [string, ...string[]]).describe("Turnaround: 'poverty', 'inequality', 'empowerment', 'food', 'energy'"),
    enabled: z.boolean().describe("true to apply Giant Leap values, false to reset to TLTL defaults"),
  },
  run_simulation: {
    project_id: z.string().describe("Project ID to simulate"),
  },
  get_results: {
    project_id: z.string().describe("Project ID to get results for"),
  },
  compare_scenarios: {
    project_id_a: z.string().describe("First project ID"),
    project_id_b: z.string().describe("Second project ID"),
  },
  save_baseline: {
    project_id: z.string().describe("Project ID"),
    baseline_name: z.string().describe("Name for this baseline snapshot (e.g., 'before-energy-turnaround')"),
  },
  restore_baseline: {
    project_id: z.string().describe("Project ID"),
    baseline_name: z.string().describe("Name of the baseline to restore"),
  },
  get_variable_timeseries: {
    project_id: z.string().describe("Project ID (must have simulation results)"),
    variable: z.string().describe("Variable name in 'prefix.VAR' format, e.g., 'pop.POP', 'cli.OW'"),
  },
} as const;

export const TOOL_METADATA: Record<string, { description: string }> = {
  list_scenarios: {
    description: "List available base scenarios (Too Little Too Late and Giant Leap) and their descriptions.",
  },
  list_projects: {
    description: "List all user-created project variants.",
  },
  create_project: {
    description: "Create a new project from a base scenario (TLTL or Giant Leap) for modification and simulation.",
  },
  preview_model: {
    description: "Human-readable summary of a project's current parameters, grouped by turnaround status.",
  },
  set_parameter: {
    description: "Modify a single parameter in any sector. Requires a source citation.",
  },
  reset_parameter: {
    description: "Reset a parameter to its scenario default value.",
  },
  set_turnaround: {
    description: "Enable or disable one of the five extraordinary turnarounds by applying its parameter bundle.",
  },
  run_simulation: {
    description: "Run the Earth4All ODE simulation via Julia and return dashboard results at milestone years (2025, 2050, 2075, 2100). First run may take 30-60s for Julia compilation.",
  },
  get_results: {
    description: "Retrieve results from the last simulation without re-running.",
  },
  compare_scenarios: {
    description: "Run two project configurations side-by-side and compare key indicators.",
  },
  save_baseline: {
    description: "Snapshot a project's current parameter state for later restoration.",
  },
  restore_baseline: {
    description: "Restore a project to a previously saved baseline.",
  },
  get_variable_timeseries: {
    description: "Get the full time series (1980-2100) for a specific variable from the last simulation.",
  },
};
