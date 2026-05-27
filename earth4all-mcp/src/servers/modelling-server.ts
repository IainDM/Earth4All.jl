import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_VERSION } from "../constants.js";
import { schemas, TOOL_METADATA } from "../shared/tool-schemas.js";
import { handleToolCall } from "../shared/tool-handlers.js";
import { GUIDES } from "../shared/guides.js";
import { logger } from "../shared/logger.js";

const MODELLING_TOOLS = [
  "list_scenarios",
  "list_projects",
  "create_project",
  "preview_model",
  "set_parameter",
  "reset_parameter",
  "set_turnaround",
  "run_simulation",
  "get_results",
  "compare_scenarios",
  "save_baseline",
  "restore_baseline",
];

const server = new McpServer({
  name: "earth4all-modelling",
  version: SERVER_VERSION,
});

for (const name of MODELLING_TOOLS) {
  const schema = schemas[name as keyof typeof schemas];
  const meta = TOOL_METADATA[name];
  server.tool(name, meta?.description ?? name, schema, async (args: Record<string, unknown>) => {
    logger.info(`Tool call: ${name}`);
    return await handleToolCall(name, args);
  });
}

for (const key of ["model-overview", "scenarios", "troubleshooting", "julia-api"]) {
  const guide = GUIDES[key];
  if (guide) {
    const uri = `earth4all://guides/${key}`;
    server.resource(uri, uri, async () => ({
      contents: [{ uri, mimeType: "text/markdown", text: guide.content }],
    }));
  }
}

server.prompt(
  "modelling-agent",
  "Step-by-step workflow for exploring Earth4All scenarios",
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are an Earth4All modelling assistant. Help the user explore global sustainability scenarios.

Workflow:
1. list_scenarios → show available scenarios
2. create_project → start from TLTL or Giant Leap
3. preview_model → review parameters
4. set_parameter / set_turnaround → modify configuration
5. run_simulation → execute and get results
6. Interpret dashboard values for the user
7. compare_scenarios → compare two configurations
8. Iterate based on findings

Always cite sources for parameter changes. Explain results in human terms.

Earth4All.jl API (underlying Julia library):
- Model structure: list_stocks(), stock_flows(name), list_flows(), list_auxiliaries() expose system dynamics structure
- Custom simulations: run_e4a_solution(; cli_pars=..., dem_pars=...) for fully customised scenarios
- Variable inspection: variable_list(sol), get_timeseries(sol, name) — Julia uses ₊ separator (pop₊POP), MCP uses . (pop.POP)
- Sector defaults: 12 sector modules each provide getparameters() and getinitialisations()
- Validation: check_solution(sol) validates against Vensim reference data
See earth4all://guides/julia-api for the full reference.`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Earth4All Modelling server started");
}

main().catch((err) => {
  logger.error("Failed to start modelling server", err);
  process.exit(1);
});
