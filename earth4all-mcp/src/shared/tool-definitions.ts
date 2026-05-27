import { z } from "zod";
import { SECTOR_IDS, TURNAROUND_IDS } from "../earth4all/types.js";

export const ListScenariosSchema = z.object({});

export const ListProjectsSchema = z.object({});

export const CreateProjectSchema = z.object({
  name: z.string().describe("Human-readable project name"),
  description: z
    .string()
    .describe("Brief description of what this project variant explores"),
  base_scenario: z
    .enum(["tltl", "giant-leap"])
    .describe("Base scenario to start from: 'tltl' (Too Little Too Late) or 'giant-leap' (Giant Leap)"),
});

export const PreviewModelSchema = z.object({
  project_id: z.string().describe("Project ID to preview"),
});

export const SetParameterSchema = z.object({
  project_id: z.string().describe("Project ID to modify"),
  sector: z
    .enum(SECTOR_IDS as unknown as [string, ...string[]])
    .describe("Sector containing the parameter"),
  parameter: z.string().describe("Parameter name (e.g., 'DNCM', 'GREF')"),
  value: z.number().describe("New parameter value"),
  source_name: z
    .string()
    .describe("Citation: name of the source justifying this value (required)"),
  source_url: z.string().optional().describe("Citation: URL of the source"),
  source_year: z.number().optional().describe("Citation: publication year"),
  source_notes: z
    .string()
    .optional()
    .describe("Citation: notes explaining the rationale"),
});

export const ResetParameterSchema = z.object({
  project_id: z.string().describe("Project ID"),
  sector: z
    .enum(SECTOR_IDS as unknown as [string, ...string[]])
    .describe("Sector containing the parameter"),
  parameter: z.string().describe("Parameter name to reset to scenario default"),
});

export const SetTurnaroundSchema = z.object({
  project_id: z.string().describe("Project ID to modify"),
  turnaround: z
    .enum(TURNAROUND_IDS as unknown as [string, ...string[]])
    .describe("Turnaround to enable/disable: 'poverty', 'inequality', 'empowerment', 'food', 'energy'"),
  enabled: z
    .boolean()
    .describe("true to apply Giant Leap values, false to reset to TLTL defaults"),
});

export const RunSimulationSchema = z.object({
  project_id: z.string().describe("Project ID to simulate"),
});

export const GetResultsSchema = z.object({
  project_id: z.string().describe("Project ID to get results for"),
});

export const CompareScenariosSchema = z.object({
  project_id_a: z.string().describe("First project ID"),
  project_id_b: z.string().describe("Second project ID"),
});

export const SaveBaselineSchema = z.object({
  project_id: z.string().describe("Project ID"),
  baseline_name: z
    .string()
    .describe("Name for this baseline snapshot (e.g., 'before-energy-turnaround')"),
});

export const RestoreBaselineSchema = z.object({
  project_id: z.string().describe("Project ID"),
  baseline_name: z.string().describe("Name of the baseline to restore"),
});

export const GetVariableTimeseriesSchema = z.object({
  project_id: z.string().describe("Project ID (must have simulation results)"),
  variable: z
    .string()
    .describe("Variable name in 'prefix.VAR' format, e.g., 'pop.POP', 'cli.OW'"),
});

export const TOOL_DEFINITIONS = [
  {
    name: "list_scenarios",
    description:
      "List available base scenarios (Too Little Too Late and Giant Leap) and their descriptions. Use this as a starting point to understand what the Earth4All model can simulate.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "list_projects",
    description:
      "List all user-created project variants. Each project is based on a scenario with custom parameter modifications.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "create_project",
    description:
      "Create a new project from a base scenario (TLTL or Giant Leap). The project starts with the scenario's default parameters and can be modified before running a simulation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Human-readable project name" },
        description: {
          type: "string",
          description: "Brief description of what this project variant explores",
        },
        base_scenario: {
          type: "string",
          enum: ["tltl", "giant-leap"],
          description: "Base scenario: 'tltl' or 'giant-leap'",
        },
      },
      required: ["name", "description", "base_scenario"],
    },
  },
  {
    name: "preview_model",
    description:
      "Get a human-readable summary of a project's current parameters, showing which parameters differ from defaults and which turnarounds are active.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID to preview" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "set_parameter",
    description:
      "Modify a single parameter in any sector. Requires a source citation explaining why this value was chosen. Use the parameter reference guide to find valid parameter names.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID to modify" },
        sector: {
          type: "string",
          enum: [...SECTOR_IDS],
          description: "Sector containing the parameter",
        },
        parameter: {
          type: "string",
          description: "Parameter name (e.g., 'DNCM', 'GREF')",
        },
        value: { type: "number", description: "New parameter value" },
        source_name: {
          type: "string",
          description: "Citation: name of the source justifying this value",
        },
        source_url: { type: "string", description: "Citation: URL (optional)" },
        source_year: { type: "number", description: "Citation: publication year (optional)" },
        source_notes: { type: "string", description: "Citation: explanatory notes (optional)" },
      },
      required: ["project_id", "sector", "parameter", "value", "source_name"],
    },
  },
  {
    name: "reset_parameter",
    description:
      "Reset a parameter to its scenario default value (TLTL or Giant Leap, depending on the project's base scenario).",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID" },
        sector: {
          type: "string",
          enum: [...SECTOR_IDS],
          description: "Sector containing the parameter",
        },
        parameter: { type: "string", description: "Parameter name to reset" },
      },
      required: ["project_id", "sector", "parameter"],
    },
  },
  {
    name: "set_turnaround",
    description:
      "Enable or disable one of the five extraordinary turnarounds (poverty, inequality, empowerment, food, energy). Enabling applies the Giant Leap parameter values; disabling resets them to TLTL defaults.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID to modify" },
        turnaround: {
          type: "string",
          enum: [...TURNAROUND_IDS],
          description: "Turnaround ID",
        },
        enabled: {
          type: "boolean",
          description: "true to enable (GL values), false to disable (TLTL values)",
        },
      },
      required: ["project_id", "turnaround", "enabled"],
    },
  },
  {
    name: "run_simulation",
    description:
      "Run the Earth4All ODE simulation via Julia with the project's current parameters. Returns a dashboard with key indicators at milestone years (2025, 2050, 2075, 2100). The first run may take 30-60 seconds for Julia compilation; subsequent runs are fast (1-5 seconds).",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID to simulate" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_results",
    description:
      "Retrieve results from the last simulation for a project, without re-running. Returns null if no simulation has been run yet.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "compare_scenarios",
    description:
      "Run simulations for two projects and return a side-by-side comparison of key indicators at 2100. Useful for understanding the impact of different parameter choices.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id_a: { type: "string", description: "First project ID" },
        project_id_b: { type: "string", description: "Second project ID" },
      },
      required: ["project_id_a", "project_id_b"],
    },
  },
  {
    name: "save_baseline",
    description:
      "Snapshot a project's current parameter state with a named label. Use this before making experimental changes so you can restore later.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID" },
        baseline_name: {
          type: "string",
          description: "Name for this snapshot (e.g., 'before-energy-turnaround')",
        },
      },
      required: ["project_id", "baseline_name"],
    },
  },
  {
    name: "restore_baseline",
    description:
      "Restore a project to a previously saved baseline (parameter snapshot).",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID" },
        baseline_name: { type: "string", description: "Name of the baseline to restore" },
      },
      required: ["project_id", "baseline_name"],
    },
  },
  {
    name: "get_variable_timeseries",
    description:
      "Get the full time series (1980-2100) for a specific variable from the last simulation. Variable format: 'prefix.VAR', e.g., 'pop.POP' for population, 'cli.OW' for observed warming.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "string", description: "Project ID" },
        variable: {
          type: "string",
          description: "Variable name, e.g., 'pop.POP', 'cli.OW', 'wel.AWBI'",
        },
      },
      required: ["project_id", "variable"],
    },
  },
];
