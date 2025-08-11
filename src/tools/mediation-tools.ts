import { z } from "zod";
import { prisma } from "../lib/database.js";
import { randomUUID } from "crypto";
import { sendEmail } from "../lib/email.js";

export function registerMediationTools(mkTool: any) {
  mkTool(
    "escalate_issue_to_human",
    "Escalate to human ops",
    z.object({
      reason: z.string().optional(),
      userId: z.string(),
    }),
    { title: "Escalate" },
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

  // pending
  mkTool(
    "collect_evidence",
    "Collect photos/videos/text evidence",
    z
      .object({
        scenarioId: z.string().optional(),
        evidence: z.any().optional(),
      })
      .optional(),
    { title: "Collect Evidence" },
    async (params: any) => {
      const rec = await prisma.incident.create({
        data: {
          scenarioId: params?.scenarioId ?? null,
          description: "evidence_collected",
          metadata: params?.evidence ? JSON.stringify(params.evidence) : null,
          createdAt: new Date(),
        },
      });
      return { uploaded: true, recordId: rec.id };
    }
  );
  // pending
  mkTool(
    "analyze_evidence",
    "Analyze evidence locally",
    z.object({ recordId: z.number().optional() }).optional(),
    { title: "Analyze Evidence" },
    async (params: any) => {
      return {
        verdict: "inconclusive",
        confidence: 0.5,
        recordId: params?.recordId ?? null,
      };
    }
  );
  mkTool(
    "issue_instant_refund",
    "Issue instant refund (simulated)",
    z.object({ orderId: z.string(), amount: z.number().optional() }),
    { title: "Issue Refund" },
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
  // pending
  mkTool(
    "exonerate_driver",
    "Exonerate driver",
    z.object({ driverId: z.string() }),
    { title: "Exonerate Driver" },
    async (params: any) => {
      return { driverId: params.driverId, exonerated: true };
    }
  );

  mkTool(
    "log_merchant_packaging_feedback",
    "Log packaging feedback",
    z.object({ merchantId: z.number(), feedback: z.string() }),
    { title: "Packaging Feedback" },
    async (params: any) => {
      const f = await prisma.packagingFeedback.create({
        data: {
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
    "Log incident report",
    z
      .object({
        scenarioId: z.string().optional(),
        description: z.string().optional(),
        metadata: z.any().optional(),
      })
      .optional(),
    { title: "Log Incident" },
    async (params: any) => {
      const rec = await prisma.incident.create({
        data: {
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
    "Record conversation/transcript",
    z.object({ transcript: z.string(), metadata: z.any().optional() }),
    { title: "Record Conversation" },
    async (params: any) => {
      const c = await prisma.conversation.create({
        data: {
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
    "Alert local authority",
    z.object({ incidentId: z.number().optional() }),
    { title: "Alert Authority" },
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
