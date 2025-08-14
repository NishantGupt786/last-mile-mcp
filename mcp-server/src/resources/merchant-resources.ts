import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/database.js";

export function registerMerchantResources(server: McpServer) {
  server.resource(
    "merchants",
    "merchants://all",
    {
      description: "Get all merchants from the database",
      title: "Merchants",
      mimeType: "application/json",
    },
    async (uri) => {
      const merchants = await prisma.merchant.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            title: "List of Merchants",
            description: "A list of all merchants available in the system",
            text: JSON.stringify(merchants),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
  server.resource(
    "merchant-details",
    new ResourceTemplate("merchants://{merchantId}/profile", {
      list: undefined,
    }),
    {
      description: "Get details of a specific merchant",
      title: "Merchant Details",
      mimeType: "application/json",
    },
    async (uri, { merchantId }) => {
      const merchant = await prisma.merchant.findUnique({
        where: { id: Number(merchantId) },
      });
      return {
        contents: [
          {
            uri: uri.href,
            title: `Merchant Details for ${merchant?.name ?? "Unknown"}`,
            description: `Details of merchant with ID ${merchantId}`,
            text: JSON.stringify(merchant ?? { error: "Not found" }),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
