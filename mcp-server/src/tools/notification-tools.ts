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
    "Send HTML-formatted email to a customer about order updates, delivery status changes, issues, or promotional messages. The message should use clean HTML with headings, bullet lists, and emphasis for readability.",
    z.object({
      customerId: z.string().describe("ID of the customer to notify"),
      message: z.string().describe("Main notification content/body text"),
      subject: z
        .string()
        .describe("Email subject line describing the notification purpose"),
    }),
    {
      title: "Notify Customer",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const user = await prisma.user.findUnique({
        where: { id: Number(params.customerId) },
        select: { email: true },
      });
      if (!user?.email) {
        throw new Error(`Email not found for customer ${params.customerId}`);
      }

      await sendEmail(user.email, params.subject, params.message, true);

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
    "Send HTML-formatted email to a merchant about new orders, order cancellations, delivery issues, feedback, or operational updates. The message should use clean HTML with headings, bullet lists, and emphasis for readability.",
    z.object({
      merchantId: z.string().describe("ID of the merchant to notify"),
      message: z.string().describe("Main notification content/body text"),
      subject: z
        .string()
        .describe("Email subject line describing the notification purpose"),
    }),
    {
      title: "Notify Merchant",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const merchant = await prisma.merchant.findUnique({
        where: { id: Number(params.merchantId) },
        select: { email: true },
      });
      if (!merchant?.email) {
        throw new Error(`Email not found for merchant ${params.merchantId}`);
      }

      await sendEmail(merchant.email, params.subject, params.message, true);

      return {
        merchantId: params.merchantId,
        delivered: true,
        message: params.message,
        subject: params.subject,
      };
    }
  );

  mkTool(
    "notify_driver",
    "Send HTML-formatted email to a driver about order assignments, delivery instructions, route changes, or operational updates. The message should use clean HTML with headings, bullet lists, and emphasis for readability.",
    z.object({
      driverId: z.string().describe("ID of the driver to notify"),
      message: z.string().describe("Main notification content/body text"),
      subject: z
        .string()
        .describe("Email subject line describing the notification purpose"),
    }),
    {
      title: "Notify Driver",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      // Note: Currently hardcoded to development email - should be updated to use driver's actual email
      const driver = await prisma.driver.findUnique({
        where: { id: Number(params.driverId) },
        select: { phone: true },
      });
      if (!driver) {
        throw new Error(`Driver with ID ${params.driverId} not found`);
      }

      await sendEmail(
        "nishantgupta2325@gmail.com",
        params.subject,
        params.message,
        true
      );

      return {
        driverId: params.driverId,
        delivered: true,
        message: params.message,
        subject: params.subject,
      };
    }
  );

  mkTool(
    "notify_resolution",
    "Send SMS notifications to all parties involved in an order (customer, merchant, driver) when an issue has been resolved or when providing important order updates. Use this for urgent communications that require immediate attention from all stakeholders.",
    z.object({
      orderId: z
        .string()
        .describe(
          "ID of the order that has been resolved or needs urgent notification"
        ),
      message: z
        .string()
        .optional()
        .describe(
          "Custom resolution message (optional - defaults to generic resolution notification)"
        ),
    }),
    {
      title: "Notify Resolution",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ orderId, message }: { orderId: string; message?: string }) => {
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
      await sendEmail("nishantgupta2325@gmail.com", "Resolution", text);

      return {
        notified: true,
        message: text,
        recipients: phoneNumbers,
      };
    }
  );

  mkTool(
    "contact_recipient_via_chat",
    "Create a conversation record in the system to initiate or continue chat communication with any recipient (customer, merchant, or driver). Use this for internal communication logging, customer support conversations, or when you need to maintain a record of chat interactions.",
    z.object({
      recipientId: z.string().describe("ID of the person to contact via chat"),
      message: z.string().describe("Chat message content to send"),
    }),
    {
      title: "Contact Recipient via Chat",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
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
