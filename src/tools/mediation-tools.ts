import { z } from "zod";
import { prisma } from "../lib/database.js";
import { randomUUID } from "crypto";

export function registerMediationTools(mkTool: any) {
  mkTool(
    "initiate_mediation_flow",
    "Start mediation session",
    z
      .object({
        scenarioId: z.string().optional(),
        reason: z.string().optional(),
      })
      .optional(),
    { title: "Initiate Mediation" },
    async (params: any) => {
      const session = {
        session_id: randomUUID(),
        scenarioId: params?.scenarioId ?? null,
      };
      await prisma.humanEscalation.create({
        data: {
          scenarioId: params?.scenarioId ?? null,
          reason: params?.reason ?? "mediation",
          createdAt: new Date(),
        },
      });
      return session;
    }
  );

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

  mkTool(
    "analyze_evidence",
    "Analyze evidence locally (simulated)",
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
    "send_survey_feedback_request",
    "Send feedback survey",
    z.object({ customerId: z.string() }),
    { title: "Send Survey" },
    async (params: any) => {
      return { sent: true, customerId: params.customerId };
    }
  );
  mkTool(
    "escalate_issue_to_human",
    "Escalate to human ops",
    z
      .object({
        scenarioId: z.string().optional(),
        reason: z.string().optional(),
      })
      .optional(),
    { title: "Escalate" },
    async (params: any) => {
      const ticket = await prisma.humanEscalation.create({
        data: {
          scenarioId: params?.scenarioId ?? null,
          reason: params?.reason ?? "escalation",
          createdAt: new Date(),
        },
      });
      return { ticketId: ticket.id };
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
    z.object({ incidentId: z.number().optional() }).optional(),
    { title: "Alert Authority" },
    async (params: any) => {
      return { alerted: true };
    }
  );
}
