import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/database.js";

export function registerOrderResources(server: McpServer) {
  server.resource(
    "orders",
    "orders://all",
    {
      description: "Get all orders from the database",
      title: "Orders",
      mimeType: "application/json",
    },
    async (uri) => {
      const orders = await prisma.order.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(orders),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
  server.resource(
    "order-details",
    new ResourceTemplate("orders://{orderId}/profile", { list: undefined }),
    {
      description: "Get details of a specific order",
      title: "Order Details",
      mimeType: "application/json",
    },
    async (uri, { orderId }) => {
      const order = await prisma.order.findUnique({
        where: { id: Number(orderId) },
      });
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(order ?? { error: "Not found" }),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
