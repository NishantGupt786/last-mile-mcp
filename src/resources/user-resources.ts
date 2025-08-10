import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/database.js";

export function registerUserResources(server: McpServer) {
  server.resource(
    "users",
    "users://all",
    {
      description: "Get all users data from the database",
      title: "Users",
      mimeType: "application/json",
    },
    async (uri) => {
      const users = await prisma.user.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(users),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "user-details",
    new ResourceTemplate("users://{userId}/profile", { list: undefined }),
    {
      description: "Get a user's details from the database",
      title: "User Details",
      mimeType: "application/json",
    },
    async (uri, { userId }) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });
      if (!user) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: "User not found" }),
              mimeType: "application/json",
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(user),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
