import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeDatabase } from "./lib/database.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "last-mile-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

async function main() {
  await initializeDatabase();
  
  registerResources(server);
  
  // 13 tools pending to finish base mcp
  // more tools required
  registerTools(server);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("Failed to start MCP server:", e);
  process.exit(1);
});