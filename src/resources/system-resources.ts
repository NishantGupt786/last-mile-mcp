import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/database.js";

export function registerSystemResources(server: McpServer) {
  server.resource(
    "packaging-feedback",
    "packaging-feedback://all",
    {
      description: "Get all packaging feedback entries",
      title: "Packaging Feedback",
      mimeType: "application/json",
    },
    async (uri) => {
      const feedback = await prisma.packagingFeedback.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(feedback),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "incidents",
    "incidents://all",
    {
      description: "Get all incidents",
      title: "Incidents",
      mimeType: "application/json",
    },
    async (uri) => {
      const incidents = await prisma.incident.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(incidents),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "human-escalations",
    "human-escalations://all",
    {
      description: "Get all human escalations",
      title: "Human Escalations",
      mimeType: "application/json",
    },
    async (uri) => {
      const escalations = await prisma.humanEscalation.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(escalations),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "conversations",
    "conversations://all",
    {
      description: "Get all conversations",
      title: "Conversations",
      mimeType: "application/json",
    },
    async (uri) => {
      const conversations = await prisma.conversation.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(conversations),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "tool-calls",
    "tool-calls://all",
    {
      description: "Get all tool calls",
      title: "Tool Calls",
      mimeType: "application/json",
    },
    async (uri) => {
      const calls = await prisma.toolCall.findMany();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(calls),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
