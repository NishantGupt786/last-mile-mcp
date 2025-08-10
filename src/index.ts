import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";
import { getLatLngFromAddress, getTravelTime, haversineDistance } from "./utils.js";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const prisma = new PrismaClient();
await prisma.$connect();
const server = new McpServer({
  name: "last-mile-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});
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

server.resource(
  "merchants",
  "merchants://all",
  {
    description: "Get all merchants from the database",
    title: "Merchants",
    mimeType: "application/json",
  },
  async (uri) => {
    const merchants = await prisma.merchant.findMany();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(merchants),
          mimeType: "application/json",
        },
      ],
    };
  }
);
server.resource(
  "merchant-details",
  new ResourceTemplate("merchants://{merchantId}/profile", { list: undefined }),
  {
    description: "Get details of a specific merchant",
    title: "Merchant Details",
    mimeType: "application/json",
  },
  async (uri, { merchantId }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { id: Number(merchantId) },
    });
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(merchant ?? { error: "Not found" }),
          mimeType: "application/json",
        },
      ],
    };
  }
);

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
          text: JSON.stringify(driver ?? { error: "Not found" }),
          mimeType: "application/json",
        },
      ],
    };
  }
);

server.resource(
  "orders",
  "orders://all",
  {
    description: "Get all orders from the database",
    title: "Orders",
    mimeType: "application/json",
  },
  async (uri) => {
    const orders = await prisma.order.findMany();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(orders),
          mimeType: "application/json",
        },
      ],
    };
  }
);
server.resource(
  "order-details",
  new ResourceTemplate("orders://{orderId}/profile", { list: undefined }),
  {
    description: "Get details of a specific order",
    title: "Order Details",
    mimeType: "application/json",
  },
  async (uri, { orderId }) => {
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(order ?? { error: "Not found" }),
          mimeType: "application/json",
        },
      ],
    };
  }
);

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

server.tool(
  "create_user",
  "Create a new user in the database",
  {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async (params) => {
    const id = await prisma.user
      .create({
        data: {
          name: params.name,
          email: params.email,
          address: params.address,
          phone: params.phone,
        },
      })
      .then((r) => r.id);
    await prisma.toolCall.create({
      data: {
        runId: randomUUID(),
        tool: "create-user",
        args: JSON.stringify(params),
        result: JSON.stringify({ id }),
        createdAt: new Date(),
      },
    });
    return {
      content: [{ type: "text", text: `User ${id} created successfully` }],
    };
  }
);
server.tool(
  "create_random_user",
  "Create a random user with fake data",
  {},
  {
    title: "Create Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async () => {
    const fake = {
      name: `User ${randomUUID().slice(0, 6)}`,
      email: `user${Date.now()}@example.com`,
      address: "123 Example St",
      phone: "9999999999",
    };
    const id = await prisma.user.create({ data: fake }).then((r) => r.id);
    await prisma.toolCall.create({
      data: {
        runId: randomUUID(),
        tool: "create-random-user",
        args: JSON.stringify({}),
        result: JSON.stringify({ id, fake }),
        createdAt: new Date(),
      },
    });
    return {
      content: [{ type: "text", text: `User ${id} created successfully` }],
    };
  }
);

const mkTool = <T extends z.ZodTypeAny>(
  name: string,
  desc: string,
  inputSchema: T,
  options: any,
  handler: (p: z.infer<T>, ctx: { runId: string }) => Promise<any>
) => {
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

mkTool(
  "get_merchant_status",
  "Check merchant operational status",
  z.object({ merchantId: z.string() }),
  {
    title: "Get Merchant Status",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async (params) => {
    const merchant = await prisma.merchant.findUnique({
      where: { id: params.merchantId as unknown as number },
      select: {
        id: true,
        status: true,
        prepMinutes: true,
      },
    });
    if (!merchant) {
      throw new Error(`Merchant with ID ${params.merchantId} not found`);
    }
    return {
      merchantId: merchant.id,
      status: merchant.status,
      prep_minutes: merchant.prepMinutes,
    };
  }
);

mkTool(
  "notify_customer",
  "Notify customer via preferred channel",
  z.object({
    customerId: z.string(),
    message: z.string(),
    subject: z.string(),
  }),
  { title: "Notify Customer" },
  async (params) => {
    const user = await prisma.user.findUnique({
      where: { id: Number(params.customerId) },
      select: { email: true },
    });
    if (!user?.email) {
      throw new Error(`Email not found for customer ${params.customerId}`);
    }

    await transporter.sendMail({
      from: '"The Last Mile" <no-reply@lastmile.com>',
      to: user.email,
      subject: params.subject,
      text: params.message,
    });

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
  async (params) => {
    const merchant = await prisma.merchant.findUnique({
      where: { id: Number(params.merchantId) },
      select: { email: true },
    })
    if (!merchant?.email) {
      throw new Error(`Email not found for merchant ${params.merchantId}`)
    }

    await transporter.sendMail({
      from: '"The Last Mile" <no-reply@lastmile.com>',
      to: merchant.email,
      subject: params.subject,
      text: params.message,
    })

    return {
      merchantId: params.merchantId,
      delivered: true,
      message: params.message,
      subject: params.subject,
    }
  }
)

mkTool(
  "create_order",
  "Create an order with user and merchant details",
  z.object({
    userId: z.string(),
    merchantId: z.string(),
    destination: z.string().optional(),
    items: z.array(z.string()).min(1)
  }),
  { title: "Create Order" },
  async (params) => {
    const userId = Number(params.userId)
    const merchantId = Number(params.merchantId)

    if ([userId, merchantId].some((id) => isNaN(id))) {
      throw new Error("userId and merchantId must be valid numbers")
    }

    const [user, merchant] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.merchant.findUnique({ where: { id: merchantId } }),
    ])
    if (!user) throw new Error(`User with id ${userId} not found`)
    if (!merchant) throw new Error(`Merchant with id ${merchantId} not found`)

    if (!Array.isArray(merchant.inventory)) {
      throw new Error("Merchant inventory is not available")
    }

    const missingItems = params.items.filter(
      (item) => !merchant.inventory.includes(item)
    )

    if (missingItems.length > 0) {
      throw new Error(`Merchant does not have the following items: ${missingItems.join(", ")}`)
    }

    const order = await prisma.order.create({
      data: {
        status: "preparing",
        merchantId,
        userId,
        source: merchant.address,
        destination: params.destination ?? null,
        items: params.items
      },
    })

    return {
      orderId: order.id,
      message: "Order created successfully",
      order,
    }
  }
)


mkTool(
  "change_order_status",
  "Change the status of an order. This should be called at every change of event.",
  z.object({
    orderId: z.string(),
    status: z.enum(["preparing", "pending", "delivered", "failed", "cancelled"]),
  }),
  { title: "Change Order Status" },
  async (params) => {
    const orderId = Number(params.orderId);
    if (isNaN(orderId)) throw new Error("Invalid orderId");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order with id ${orderId} not found`);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: params.status },
    });

    return {
      orderId: updatedOrder.id,
      newStatus: updatedOrder.status,
      message: `Order status changed to ${updatedOrder.status}`,
    };
  }
);

mkTool(
  "assign_driver",
  "Assign nearest driver to an order based on order source location",
  z.object({ orderId: z.string() }),
  { title: "Assign Driver" },
  async (params) => {
    const orderId = Number(params.orderId);
    if (isNaN(orderId)) throw new Error("Invalid orderId");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        source: true,
      },
    });
    if (!order) throw new Error(`Order with id ${orderId} not found`);
    if (!order.source) throw new Error(`Order source address not set`);

    const sourceLocation = await getLatLngFromAddress(order.source);
    if (!sourceLocation)
      throw new Error(`Could not get location from source address`);

    const drivers = await prisma.driver.findMany({
      where: {
        lat: { not: undefined },
        lng: { not: undefined },
        state: "idle"
      },
      select: { id: true, lat: true, lng: true },
    });

    if (drivers.length === 0) throw new Error("No drivers with location found");

    let nearestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      const dist = haversineDistance(
        { latitude: sourceLocation.lat, longitude: sourceLocation.lng },
        { latitude: driver.lat, longitude: driver.lng }
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestDriver = driver;
      }
    }

    if (!nearestDriver) throw new Error("No nearest driver found");

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { driverId: nearestDriver.id },
    });

    return {
      orderId: updatedOrder.id,
      driverId: nearestDriver.id,
      distanceMeters: minDistance,
      message: `Driver ${nearestDriver.id} assigned to order ${orderId}`,
    };
  }
);

mkTool(
  "check_driver_current_order_status",
  "Check if a driver has an active order and return prep time",
  z.object({ driverId: z.number() }),
  { title: "Check Driver Order Status" },
  async ({ driverId }) => {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { orders: { where: { status: "preparing" }, include: { merchant: true } } }
    });

    if (!driver) throw new Error(`Driver ${driverId} not found`);

    const currentOrder = driver.orders[0];
    if (!currentOrder) return { hasOrder: false };

    return {
      hasOrder: true,
      orderId: currentOrder.id,
      prepMinutes: currentOrder.merchant.prepMinutes,
      source: currentOrder.source,
      destination: currentOrder.destination
    };
  }
);

mkTool(
  "assign_nearby_order_to_driver",
  "Find and assign a nearby order with shorter prep time to driver",
  z.object({
    driverId: z.number(),
    currentPrepMinutes: z.number(),
    maxDistanceKm: z.number().default(5)
  }),
  { title: "Assign Nearby Order" },
  async ({ driverId, currentPrepMinutes, maxDistanceKm }) => {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error(`Driver ${driverId} not found`);

    const candidateOrders = await prisma.order.findMany({
      where: { status: "preparing", driverId: null },
      include: { merchant: true }
    });

    const nearbyOrders = [];
    for (const order of candidateOrders) {
      if (!order.source) continue;

      const [lat, lng] = order.source.split(",").map(Number);
      const travel = await getTravelTime(driver.lat, driver.lng, lat, lng);

      if (
        travel.status === "OK" &&
        travel.distance.value / 1000 <= maxDistanceKm &&
        order.merchant.prepMinutes <= currentPrepMinutes - 5
      ) {
        nearbyOrders.push({
          id: order.id,
          prepMinutes: order.merchant.prepMinutes,
          distanceKm: travel.distance.value / 1000
        });
      }
    }

    if (nearbyOrders.length === 0) return { assigned: false };

    const selected = nearbyOrders.sort((a, b) => a.prepMinutes - b.prepMinutes)[0];
    await prisma.order.update({ where: { id: selected.id }, data: { driverId } });

    return { assigned: true, orderId: selected.id, distanceKm: selected.distanceKm };
  }
);

mkTool(
  "get_nearby_merchants_with_same_items",
  "Find nearby merchants who sell the same items",
  z.object({
    address: z.string(),
    items: z.array(z.string()).min(1),
    radiusMeters: z.number().default(5000)
  }),
  { title: "Get Nearby Merchants With Same Items" },
  async ({ address, items, radiusMeters }) => {
    const coords = await getLatLngFromAddress(address);
    if (!coords) {
      throw new Error(`Could not geocode address: ${address}`);
    }

    const merchants = await prisma.merchant.findMany({
      where: { status: "open" }
    });

    const results: any[] = [];

    for (const merchant of merchants) {
      if (!Array.isArray(merchant.inventory)) continue;

      const hasAllItems = items.every((item) =>
        merchant.inventory.includes(item)
      );
      if (!hasAllItems) continue;

      if (!merchant.address) continue;

      const merchantCoords = await getLatLngFromAddress(merchant.address);
      if (!merchantCoords) continue;

      const dist = haversineDistance(
        { latitude: coords.lat, longitude: coords.lng },
        { latitude: merchantCoords.lat, longitude: merchantCoords.lng }
      );

      if (dist <= radiusMeters) {
        results.push({
          ...merchant,
          distanceMeters: dist
        });
      }
    }

    return {
      origin: coords,
      merchants: results
    };
  }
);

mkTool(
  "reassign_order_to_new_merchant",
  "Cancel an existing order and create a new one with a different merchant",
  z.object({
    orderId: z.string(),
    newMerchantId: z.string()
  }),
  { title: "Reassign Order" },
  async ({ orderId, newMerchantId }) => {
    const id = Number(orderId)
    const merchantId = Number(newMerchantId)

    if ([id, merchantId].some((n) => isNaN(n))) {
      throw new Error("orderId and newMerchantId must be valid numbers")
    }

    const oldOrder = await prisma.order.findUnique({ where: { id } })
    if (!oldOrder) throw new Error(`Order ${id} not found`)

    const newMerchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!newMerchant) throw new Error(`Merchant ${merchantId} not found`)

    await prisma.order.update({
      where: { id },
      data: { status: "cancelled" }
    })

    const newOrder = await prisma.order.create({
      data: {
        status: "preparing",
        merchantId: newMerchant.id,
        userId: oldOrder.userId,
        source: newMerchant.address,
        destination: oldOrder.destination,
        items: oldOrder.items
      }
    })

    return {
      message: `Order reassigned from merchant ${oldOrder.merchantId} to ${newMerchant.id}`,
      oldOrderId: id,
      newOrderId: newOrder.id
    }
  }
)

mkTool(
  "check_traffic",
  "Check traffic conditions",
  z
    .object({ origin: z.any().optional(), destination: z.any().optional() })
    .optional(),
  { title: "Check Traffic", readOnlyHint: true },
  async (params) => {
    return { congestion: "moderate", delay_mins: 12 };
  }
);

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
  async (params) => {
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
    .object({ scenarioId: z.string().optional(), evidence: z.any().optional() })
    .optional(),
  { title: "Collect Evidence" },
  async (params) => {
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
  async (params) => {
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
  async (params) => {
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
  async (params) => {
    return { driverId: params.driverId, exonerated: true };
  }
);
mkTool(
  "log_merchant_packaging_feedback",
  "Log packaging feedback",
  z.object({ merchantId: z.number(), feedback: z.string() }),
  { title: "Packaging Feedback" },
  async (params) => {
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
  "notify_resolution",
  "Notify all parties of a resolution",
  z
    .object({ runId: z.string().optional(), message: z.string().optional() })
    .optional(),
  { title: "Notify Resolution" },
  async (params) => {
    return { notified: true, message: params?.message ?? "resolved" };
  }
);
mkTool(
  "contact_recipient_via_chat",
  "Contact recipient via chat",
  z.object({ recipientId: z.string(), message: z.string() }),
  { title: "Contact Recipient" },
  async (params) => {
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
mkTool(
  "suggest_safe_drop_off",
  "Suggest safe drop-off options",
  z.object({ location: z.any().optional() }).optional(),
  { title: "Suggest Dropoff" },
  async (params) => {
    return { option: "concierge", details: "Leave with concierge" };
  }
);
mkTool(
  "find_nearby_locker",
  "Find parcel lockers nearby",
  z
    .object({ lat: z.number().optional(), lng: z.number().optional() })
    .optional(),
  { title: "Find Locker" },
  async (params) => {
    return [{ id: "locker_1", distance_m: 120 }];
  }
);
mkTool(
  "calculate_alternative_route",
  "Calculate alternative route",
  z
    .object({ origin: z.any().optional(), destination: z.any().optional() })
    .optional(),
  { title: "Alt Route" },
  async (params) => {
    return { eta_minutes: 18, route: ["A", "B", "C"] };
  }
);
mkTool(
  "notify_passenger_and_driver",
  "Notify passenger and driver",
  z
    .object({
      passengerId: z.string().optional(),
      driverId: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  { title: "Notify Both" },
  async (params) => {
    return { notified: true };
  }
);

mkTool(
  "get_driver_status",
  "Get driver status",
  z.object({ driverId: z.number() }),
  { title: "Driver Status", readOnlyHint: true },
  async ({ driverId }) => {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, lat: true, lng: true, state: true }
    });
    if (!driver) throw new Error(`Driver ${driverId} not found`);

    return {
      driverId: driver.id,
      location: { lat: driver.lat, lng: driver.lng },
      state: driver.state
    };
  }
);

mkTool(
  "update_driver_state",
  "Update driver state",
  z.object({ driverId: z.number(), state: z.enum(["enroute", "idle", "delivering", "offline"]) }),
  { title: "Update Driver State" },
  async ({ driverId, state }) => {
    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: { state }
    });
    return { driverId: updated.id, state: updated.state };
  }
);

mkTool(
  "update_driver_location",
  "Update driver location from address",
  z.object({
    driverId: z.number(),
    address: z.string()
  }),
  { title: "Update Driver Location" },
  async ({ driverId, address }) => {
    const coords = await getLatLngFromAddress(address);
    if (!coords) {
      throw new Error(`Could not geocode address: ${address}`);
    }

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: { lat: coords.lat, lng: coords.lng }
    });

    return {
      driverId: updated.id,
      location: { lat: updated.lat, lng: updated.lng }
    };
  }
);

mkTool(
  "predict_delivery_delay",
  "Predict likely delay",
  z.object({ orderId: z.string().optional() }).optional(),
  { title: "Predict Delay", readOnlyHint: true },
  async (params) => {
    return { predicted_delay_mins: 15, confidence: 0.79 };
  }
);

mkTool(
  "unassign_order_from_driver",
  "Unassign a driver from an order",
  z.object({ orderId: z.string() }),
  { title: "Unassign Order From Driver" },
  async ({ orderId }) => {
    const id = Number(orderId);
    if (isNaN(id)) throw new Error("orderId must be a valid number");

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error(`Order with id ${id} not found`);
    if (order.driverId === null) {
      return { unassigned: false, message: "No driver was assigned to this order" };
    }

    await prisma.order.update({
      where: { id },
      data: { driverId: null }
    });

    return { unassigned: true, orderId: id, message: "Driver unassigned successfully" };
  }
);

mkTool(
  "send_survey_feedback_request",
  "Send feedback survey",
  z.object({ customerId: z.string() }),
  { title: "Send Survey" },
  async (params) => {
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
  async (params) => {
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
  "verify_address",
  "Verify and normalize address",
  z.object({ address: z.string() }),
  { title: "Verify Address", readOnlyHint: true },
  async (params) => {
    return { valid: true, normalized: params.address };
  }
);

mkTool(
  "estimate_delivery_time",
  "Estimate delivery time",
  z
    .object({ origin: z.any().optional(), destination: z.any().optional() })
    .optional(),
  { title: "Estimate ETA" },
  async (params) => {
    return { eta_minutes: 25 };
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
  async (params) => {
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
  "perform_quality_check",
  "Perform quality check",
  z.object({ targetId: z.string().optional() }).optional(),
  { title: "Quality Check" },
  async (params) => {
    return { queued: true };
  }
);
mkTool(
  "send_promotional_offer",
  "Send promotional offer",
  z.object({ customerId: z.string(), offer: z.string() }),
  { title: "Send Offer" },
  async (params) => {
    return { offer_sent: true };
  }
);

mkTool(
  "track_package_location",
  "Track package",
  z.object({ trackingId: z.string() }),
  { title: "Track Package", readOnlyHint: true },
  async (params) => {
    return {
      trackingId: params.trackingId,
      lat: 0,
      lng: 0,
      timestamp: Date.now(),
    };
  }
);

mkTool(
  "record_conversation",
  "Record conversation/transcript",
  z.object({ transcript: z.string(), metadata: z.any().optional() }),
  { title: "Record Conversation" },
  async (params) => {
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
  async (params) => {
    return { alerted: true };
  }
);
mkTool(
  "optimize_fleet_usage",
  "Optimize fleet usage (simulated)",
  z.object({ horizon_minutes: z.number().optional() }).optional(),
  { title: "Optimize Fleet" },
  async (params) => {
    return { optimized: true };
  }
);
mkTool(
  "monitor_driver_behavior",
  "Monitor driver behavior (simulated)",
  z.object({ driverId: z.string().optional() }).optional(),
  { title: "Monitor Driver" },
  async (params) => {
    return { flagged: false };
  }
);
mkTool(
  "auto_scale_resources",
  "Auto scale internal resources",
  z.object({ target: z.string().optional() }).optional(),
  { title: "Auto Scale" },
  async (params) => {
    return { scaled: true };
  }
);
mkTool(
  "integrate_weather_alerts",
  "Integrate weather alerts (simulated)",
  z.object({ location: z.any().optional() }).optional(),
  { title: "Weather Alerts" },
  async (params) => {
    return { condition: "clear" };
  }
);
mkTool(
  "multi_modal_route_planning",
  "Multi-modal route planning",
  z
    .object({ origin: z.any().optional(), destination: z.any().optional() })
    .optional(),
  { title: "Multi Modal Route" },
  async (params) => {
    return { plan: ["bike", "walk", "car"] };
  }
);
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((e) => process.exit(1));
