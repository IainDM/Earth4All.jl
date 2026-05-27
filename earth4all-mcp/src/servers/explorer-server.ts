import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_VERSION } from "../constants.js";
import { schemas, TOOL_METADATA } from "../shared/tool-schemas.js";
import { handleToolCall } from "../shared/tool-handlers.js";
import { GUIDES } from "../shared/guides.js";
import { logger } from "../shared/logger.js";

const EXPLORER_TOOLS = [
  "list_scenarios",
  "list_projects",
  "create_project",
  "preview_model",
  "set_parameter",
  "reset_parameter",
  "run_simulation",
  "get_results",
  "compare_scenarios",
  "get_variable_timeseries",
];

const server = new McpServer({
  name: "earth4all-explorer",
  version: SERVER_VERSION,
});

for (const name of EXPLORER_TOOLS) {
  const schema = schemas[name as keyof typeof schemas];
  const meta = TOOL_METADATA[name];
  server.tool(name, meta?.description ?? name, schema, async (args: Record<string, unknown>) => {
    logger.info(`Tool call: ${name}`);
    return await handleToolCall(name, args);
  });
}

for (const key of ["parameters", "variables", "troubleshooting", "julia-api"]) {
  const guide = GUIDES[key];
  if (guide) {
    const uri = `earth4all://guides/${key}`;
    server.resource(uri, uri, async () => ({
      contents: [{ uri, mimeType: "text/markdown", text: guide.content }],
    }));
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Earth4All Explorer server started");
}

main().catch((err) => {
  logger.error("Failed to start explorer server", err);
  process.exit(1);
});
