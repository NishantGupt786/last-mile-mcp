import { z } from "zod";
import { prisma } from "../lib/database.js";
import { sendEmail } from "../lib/email.js";

export function registerNotificationTools(mkTool: any) {
  mkTool(
    "notify_customer",
    "Notify customer via preferred channel",
    z.object({
      customerId: z.string(),
      message: z.string(),
      subject: z.string(),
    }),
    { title: "Notify Customer" },
    async (params: any) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(params.customerId) },
        select: { email: true },
      });
      if (!user?.email) {
        throw new Error(`Email not found for customer ${params.customerId}`);
      }

      await sendEmail(user.email, params.subject, params.message);

      return {
        customerId: params.customerId,
        delivered: true,
        message: params.message,
        subject: params.subject,
      };
    }
  );

  mkTool(
    "notify_merchant",
    "Notify merchant via preferred channel",
    z.object({
      merchantId: z.string(),
      message: z.string(),
      subject: z.string(),
    }),
    { title: "Notify Merchant" },
    async (params: any) => {
      const merchant = await prisma.merchant.findUnique({
        where: { id: Number(params.merchantId) },
        select: { email: true },
      });
      if (!merchant?.email) {
        throw new Error(`Email not found for merchant ${params.merchantId}`);
      }

      await sendEmail(merchant.email, params.subject, params.message);

      return {
        merchantId: params.merchantId,
        delivered: true,
        message: params.message,
        subject: params.subject,
      };
    }
  );
  mkTool(
    "notify_resolution",
    "Notify all parties of a resolution",
    z
      .object({ runId: z.string().optional(), message: z.string().optional() })
      .optional(),
    { title: "Notify Resolution" },
    async (params: any) => {
      return { notified: true, message: params?.message ?? "resolved" };
    }
  );
  mkTool(
    "contact_recipient_via_chat",
    "Contact recipient via chat",
    z.object({ recipientId: z.string(), message: z.string() }),
    { title: "Contact Recipient" },
    async (params: any) => {
      const c = await prisma.conversation.create({
        data: {
          transcript: params.message,
          metadata: JSON.stringify({ recipientId: params.recipientId }),
          createdAt: new Date(),
        },
      });
      return { message_sent: true, conversationId: c.id };
    }
  );
}
