import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "crypto";
import { prisma } from "./database.js";

export function createToolFactory(server: McpServer) {
  return function mkTool<T extends z.ZodTypeAny>(
    name: string,
    desc: string,
    inputSchema: T,
    options: any,
    handler: (p: z.infer<T>, ctx: { runId: string }) => Promise<any>
  ) {
    const shape = inputSchema instanceof z.ZodObject ? inputSchema.shape : {};
    server.tool(name, desc, shape, options, async (params, extra) => {
      const runId = randomUUID();
      const out = await handler(params as any, { runId });

      await prisma.toolCall
        .create({
          data: {
            runId,
            tool: name,
            args: JSON.stringify(params ?? {}),
            result: JSON.stringify(out),
            createdAt: new Date(),
          },
        })
        .catch(() => null);

      return {
        content: [
          {
            type: "text",
            text: typeof out === "string" ? out : JSON.stringify(out),
          },
        ],
      };
    });
  };
}
