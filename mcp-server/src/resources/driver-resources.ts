import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/database.js";

export function registerDriverResources(server: McpServer) {
  server.resource(
    "drivers",
    "drivers://all",
    {
      description: "Get all drivers from the database",
      title: "Drivers",
      mimeType: "application/json",
    },
    async (uri) => {
      const drivers = await prisma.driver.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            title: "List of Drivers",
            description: "A list of all drivers available in the system",
            text: JSON.stringify(drivers),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "driver-details",
    new ResourceTemplate("drivers://{driverId}/profile", { list: undefined }),
    {
      description: "Get details of a specific driver",
      title: "Driver Details",
      mimeType: "application/json",
    },
    async (uri, { driverId }) => {
      const driver = await prisma.driver.findUnique({
        where: { id: Number(driverId) },
      });
      return {
        contents: [
          {
            uri: uri.href,
            title: `Driver Details for ${driver?.name ?? "Unknown"}`,
            description: `Details of driver with ID ${driverId}`,
            text: JSON.stringify(driver ?? { error: "Not found" }),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
