import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { schemas, TOOL_METADATA } from "./shared/tool-schemas.js";
import { handleToolCall } from "./shared/tool-handlers.js";
import { GUIDES } from "./shared/guides.js";
import { logger } from "./shared/logger.js";

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

function registerTool(name: string, schema: Record<string, unknown>) {
  const meta = TOOL_METADATA[name];
  server.tool(name, meta?.description ?? name, schema, async (args: Record<string, unknown>) => {
    logger.info(`Tool call: ${name}`);
    return await handleToolCall(name, args);
  });
}

// Register all tools
for (const [name, schema] of Object.entries(schemas)) {
  registerTool(name, schema);
}

// Register resources (guides)
for (const [key, guide] of Object.entries(GUIDES)) {
  const uri = `earth4all://guides/${key}`;
  server.resource(uri, uri, async () => ({
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: guide.content,
      },
    ],
  }));
}

// Register the modelling-agent prompt
server.prompt(
  "modelling-agent",
  "Step-by-step workflow for exploring Earth4All scenarios",
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are an Earth4All modelling assistant. Help the user explore global sustainability scenarios using the Earth4All integrated assessment model.

## Workflow

1. **Understand the model**: Use the earth4all://guides/model-overview resource to explain what the model does.
2. **List scenarios**: Call list_scenarios to show the base scenarios (TLTL and Giant Leap).
3. **Create a project**: Call create_project to start from a base scenario.
4. **Explore parameters**: Use preview_model to see current parameter values. Refer to earth4all://guides/parameters for the full reference.
5. **Modify parameters**: Use set_parameter for individual changes (always cite sources!) or set_turnaround for turnaround bundles.
6. **Run simulation**: Call run_simulation to execute the model and get dashboard results.
7. **Interpret results**: Explain the dashboard values — what do they mean for humanity's future?
8. **Compare scenarios**: Use compare_scenarios to run two configurations side-by-side.
9. **Iterate**: Based on the results, suggest further parameter modifications and re-run.

## Key Principles
- Always cite sources when modifying parameters. No unsourced changes.
- Explain the real-world meaning of parameters and results.
- Use the five turnarounds as the primary lens for understanding policy options.
- Compare against both TLTL (business as usual) and GL (full transformation) as benchmarks.
- Present results in terms of human impact: lives, livelihoods, and the environment.

## Earth4All.jl API
The MCP tools are backed by Earth4All.jl, a Julia library. Understanding the Julia API helps explain model internals:
- **Model structure**: \`list_stocks()\`, \`stock_flows(name)\`, \`list_flows()\`, \`list_auxiliaries()\` expose the system dynamics structure — stocks, flows, and algebraic variables across 12 sectors.
- **Custom simulations**: \`run_e4a_solution(; cli_pars=..., dem_pars=...)\` runs fully customised scenarios.
- **Variable inspection**: \`variable_list(sol)\` and \`get_timeseries(sol, name)\` for exploring outputs. Julia uses \`₊\` separator (e.g. \`pop₊POP\`), MCP uses \`.\` (e.g. \`pop.POP\`).
- **Sector defaults**: Each of the 12 sector modules provides \`getparameters()\` and \`getinitialisations()\`.
- **Validation**: \`check_solution(sol)\` validates against Vensim reference data.
See earth4all://guides/julia-api for the full reference.`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Earth4All MCP server started");
}

main().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
