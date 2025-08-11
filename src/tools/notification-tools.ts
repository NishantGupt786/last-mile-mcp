import { z } from "zod";
import { prisma } from "../lib/database.js";
import { sendEmail } from "../lib/email.js";
import axios from "axios";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;

async function sendSMS(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const data = new URLSearchParams({
    To: to,
    MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
    Body: body,
  });

  await axios.post(url, data.toString(), {
    auth: {
      username: TWILIO_ACCOUNT_SID,
      password: TWILIO_AUTH_TOKEN,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

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
    z.object({ orderId: z.string(), message: z.string().optional() }),
    { title: "Notify Resolution" },
    async ({ orderId, message }: { orderId: string; message: string }) => {
      const id = Number(orderId);
      if (isNaN(id)) throw new Error("Invalid orderId");

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: true,
          merchant: true,
          driver: true,
        },
      });

      if (!order) throw new Error(`Order ${orderId} not found`);

      const text = message ?? `Your order #${orderId} has been resolved.`;

      const phoneNumbers: string[] = [];
      if (order.user.phone) phoneNumbers.push(order.user.phone);
      if (order.merchant.phone) phoneNumbers.push(order.merchant.phone);
      if (order.driver?.phone) phoneNumbers.push(order.driver.phone);

      await Promise.all(phoneNumbers.map((num) => sendSMS(num, text)));

      return {
        notified: true,
        message: text,
        recipients: phoneNumbers,
      };
    }
  );
  // pending
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
