import { z } from "zod";
import { prisma } from "../lib/database.js";
import { randomUUID } from "crypto";
import { sendEmail } from "../lib/email.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

const EvidenceSchema = z.object({
  type: z.enum(["photo", "video", "text", "audio", "document"]),
  url: z.string().optional(),
  description: z.string().optional(),
  timestamp: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

type Evidence = z.infer<typeof EvidenceSchema>;

export function registerMediationTools(mkTool: any, server: McpServer) {
  async function getAITagsFromDescription(
    description: string
  ): Promise<string[]> {
    const res = await server.server.request(
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are a tagging assistant. Given the following evidence description, return a concise JSON array of relevant keyword tags. 
Only return valid JSON, no extra text or formatting. 
Description: "${description}"`,
              },
            },
          ],
          maxTokens: 256,
        },
      },
      CreateMessageResultSchema
    );

    if (res.content.type !== "text") {
      return [];
    }

    try {
      const tags = JSON.parse(
        res.content.text
          .trim()
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .trim()
      );

      if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) {
        return tags;
      }
      return [];
    } catch {
      return [];
    }
  }

  mkTool(
    "escalate_issue_to_human",
    "Escalate complex or sensitive issues that cannot be resolved through automated processes to human customer service representatives. Use this when AI resolution attempts have failed, when legal/safety concerns arise, or when customers specifically request human intervention. Creates a support ticket and notifies the customer.",
    z.object({
      reason: z
        .string()
        .optional()
        .describe(
          "Detailed reason for escalation explaining why human intervention is needed"
        ),
      userId: z
        .string()
        .describe("ID of the customer whose issue needs human attention"),
      orderId: z
        .string()
        .optional()
        .describe("ID of the order related to the issue (if applicable)"),
    }),
    {
      title: "Escalate to Human Support",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const userId = Number(params.userId);
      if (isNaN(userId)) throw new Error("Invalid userId");

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user?.email) {
        throw new Error(`Email not found for user with id ${userId}`);
      }

      const ticket = await prisma.humanEscalation.create({
        data: {
          orderId: params.orderId ? Number(params.orderId) : null,
          scenarioId: params.scenarioId ?? null,
          reason: params.reason ?? "escalation",
          userId,
        },
      });

      await sendEmail(
        user.email,
        params.reason ?? "Support Escalation",
        `Hello,\n\nA customer support specialist will be in touch with you soon regarding your issue.\n\nTicket ID: ${ticket.id}\n\nThank you for your patience.`
      );

      return { ticketId: ticket.id };
    }
  );

  mkTool(
    "collect_evidence",
    "Systematically collect and catalog digital evidence (photos, videos, documents, audio recordings, text descriptions) related to delivery incidents, disputes, or quality issues. Automatically generates AI-powered tags for evidence categorization and creates structured incident records for investigation.",
    z.object({
      scenarioId: z
        .string()
        .optional()
        .describe(
          "Unique identifier for the incident scenario this evidence relates to"
        ),
      evidence: z
        .array(EvidenceSchema)
        .min(1)
        .describe(
          "Array of evidence items including photos, videos, documents, audio, or text descriptions"
        ),
      orderId: z
        .string()
        .optional()
        .describe("ID of the order this evidence relates to (if applicable)"),
    }),
    {
      title: "Collect Evidence",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({
      scenarioId,
      evidence,
      orderId,
    }: {
      scenarioId?: string;
      evidence: Evidence[];
      orderId?: string;
    }) => {
      const enrichedEvidence = await Promise.all(
        evidence.map(async (e) => {
          if (e.description && !e.tags) {
            const aiTags = await getAITagsFromDescription(e.description);
            return { ...e, tags: aiTags };
          }
          return e;
        })
      );

      const rec = await prisma.incident.create({
        data: {
          orderId: orderId ? Number(orderId) : null,
          scenarioId: scenarioId ?? null,
          description: `Evidence collected: ${enrichedEvidence
            .map((e) => e.type)
            .join(", ")}`,
          metadata: JSON.stringify(enrichedEvidence, null, 2),
          createdAt: new Date(),
        },
      });

      return {
        uploaded: true,
        recordId: rec.id,
        items: enrichedEvidence.length,
      };
    }
  );

  mkTool(
    "issue_instant_refund",
    "Process an immediate refund to the customer for order issues, service failures, or quality problems. Use this for quick resolution of justified customer complaints to maintain satisfaction and trust. Simulates payment processing and creates audit trail.",
    z.object({
      orderId: z.string().describe("ID of the order to refund"),
      amount: z
        .number()
        .optional()
        .describe("Refund amount (optional - defaults to 0 if not specified)"),
    }),
    {
      title: "Issue Instant Refund",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    async (params: any) => {
      const refund = {
        orderId: params.orderId,
        refunded: true,
        amount: params.amount ?? 0,
      };
      await prisma.toolCall.create({
        data: {
          runId: randomUUID(),
          tool: "issue_instant_refund",
          args: JSON.stringify(params),
          result: JSON.stringify(refund),
          createdAt: new Date(),
        },
      });
      return refund;
    }
  );

  mkTool(
    "exonerate_driver",
    "Officially clear a driver of fault or responsibility in a delivery incident after investigation determines they were not at fault. Use this when evidence shows the driver followed proper procedures and the incident was due to external factors, customer error, or merchant issues.",
    z.object({
      driverId: z.string().describe("ID of the driver to exonerate from fault"),
      incidentId: z
        .string()
        .optional()
        .describe(
          "ID of the specific incident to clear the driver from (optional)"
        ),
    }),
    {
      title: "Exonerate Driver",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({
      driverId,
      incidentId,
    }: {
      driverId: string;
      incidentId?: string;
    }) => {
      if (incidentId) {
        const incident = await prisma.incident.findUnique({
          where: { id: Number(incidentId) },
        });

        if (incident) {
          const updatedDescription = incident.description
            ? `${incident.description} | Driver cleared of fault`
            : "Driver cleared of fault";

          await prisma.incident.update({
            where: { id: Number(incidentId) },
            data: { description: updatedDescription },
          });
        }
      }

      return { driverId, exonerated: true, incidentId: incidentId ?? null };
    }
  );

  mkTool(
    "log_merchant_packaging_feedback",
    "Record feedback about merchant packaging quality, food safety, presentation, or packaging-related delivery issues. Use this to track packaging problems for merchant improvement, identify recurring issues, and maintain quality standards across the platform.",
    z.object({
      merchantId: z
        .number()
        .describe("ID of the merchant receiving the packaging feedback"),
      feedback: z
        .string()
        .describe(
          "Detailed feedback about packaging quality, safety, or presentation issues"
        ),
      orderId: z
        .string()
        .optional()
        .describe(
          "ID of the specific order this packaging feedback relates to"
        ),
    }),
    {
      title: "Log Packaging Feedback",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (params: any) => {
      const f = await prisma.packagingFeedback.create({
        data: {
          orderId: params.orderId ? Number(params.orderId) : null,
          merchantId: params.merchantId,
          feedback: params.feedback,
          createdAt: new Date(),
        },
      });
      return f;
    }
  );

  mkTool(
    "log_incident_report",
    "Create an official incident report for delivery problems, safety issues, service failures, disputes, or any anomalous events requiring documentation. Use this to maintain records for investigation, pattern analysis, and compliance reporting.",
    z
      .object({
        scenarioId: z
          .string()
          .optional()
          .describe(
            "Unique identifier linking this incident to a specific scenario or case"
          ),
        description: z
          .string()
          .optional()
          .describe(
            "Detailed description of what occurred during the incident"
          ),
        metadata: z
          .record(z.any())
          .optional()
          .describe(
            "Additional structured data about the incident (timestamps, locations, parties involved, etc.)"
          ),
        orderId: z
          .string()
          .optional()
          .describe("ID of the order this incident relates to (if applicable)"),
      })
      .optional(),
    {
      title: "Log Incident Report",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (params: any) => {
      const rec = await prisma.incident.create({
        data: {
          orderId: params?.orderId ? Number(params.orderId) : null,
          scenarioId: params?.scenarioId ?? null,
          description: params?.description ?? "",
          metadata: params?.metadata ? JSON.stringify(params.metadata) : null,
          createdAt: new Date(),
        },
      });
      return rec;
    }
  );

  mkTool(
    "record_conversation",
    "Save conversation transcripts and communication records between customers, drivers, merchants, and support agents. Use this to maintain audit trails of customer interactions, preserve important communications for dispute resolution, and track conversation history.",
    z.object({
      transcript: z
        .string()
        .describe("Full conversation transcript or communication content"),
      metadata: z
        .any()
        .optional()
        .describe(
          "Additional context about the conversation (participants, channel, timestamps, etc.)"
        ),
      orderId: z
        .string()
        .optional()
        .describe(
          "ID of the order this conversation relates to (if applicable)"
        ),
    }),
    {
      title: "Record Conversation",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (params: any) => {
      const c = await prisma.conversation.create({
        data: {
          orderId: params.orderId ? Number(params.orderId) : null,
          transcript: params.transcript,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          createdAt: new Date(),
        },
      });
      return { conversationId: c.id };
    }
  );

  mkTool(
    "alert_local_authority",
    "Send emergency notifications to local authorities (police, fire department, health inspectors) for serious incidents requiring immediate official intervention. Use only for genuine emergencies involving safety threats, criminal activity, health violations, or situations requiring law enforcement response.",
    z.object({
      incidentId: z
        .number()
        .optional()
        .describe(
          "ID of the incident requiring emergency authority notification"
        ),
    }),
    {
      title: "Alert Local Authority",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    async (params: any) => {
      const incidentId = params?.incidentId ?? null;
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        select: { id: true, description: true, metadata: true },
      });

      if (!incident)
        throw new Error(`Incident with ID ${incidentId} not found`);

      const emailBody = `
🚨 **Emergency Incident Report** 🚨

Incident ID: ${incident.id}
Description: ${incident.description || "No description provided."}

Additional Details:
${
  incident.metadata
    ? JSON.stringify(incident.metadata, null, 2)
    : "No metadata available."
}

Please take immediate action.
    `.trim();

      await sendEmail(
        "nishantgupta2325@gmail.com",
        `🚨 Alert SOS - Incident #${incident.id}`,
        emailBody
      );

      return { alerted: true };
    }
  );
}
