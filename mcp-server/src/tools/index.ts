import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createToolFactory } from "../lib/tool-factory.js";
import { registerUserTools } from "./user-tools.js";
import { registerMerchantTools } from "./merchant-tools.js";
import { registerDriverTools } from "./driver-tools.js";
import { registerOrderTools } from "./order-tools.js";
import { registerNotificationTools } from "./notification-tools.js";
import { registerMediationTools } from "./mediation-tools.js";
import { registerLogisticsTools } from "./logistics-tools.js.js";

// TODO: Literally every possible retrieval tool

export function registerTools(server: McpServer) {
  const mkTool = createToolFactory(server);
  
  registerUserTools(mkTool);
  registerMerchantTools(mkTool);
  registerDriverTools(mkTool);
  registerOrderTools(mkTool);
  registerNotificationTools(mkTool);
  registerMediationTools(mkTool, server);
  registerLogisticsTools(mkTool);
}