import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUserResources } from "./user-resources.js";
import { registerMerchantResources } from "./merchant-resources.js";
import { registerDriverResources } from "./driver-resources.js";
import { registerOrderResources } from "./order-resources.js";
import { registerSystemResources } from "./system-resources.js";

export function registerResources(server: McpServer) {
  registerUserResources(server);
  registerMerchantResources(server);
  registerDriverResources(server);
  registerOrderResources(server);
  registerSystemResources(server);
}