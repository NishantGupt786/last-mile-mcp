import { z } from "zod";
import { prisma } from "../lib/database.js";
import { getLatLngFromAddress, haversineDistance } from "../utils.js";

export function registerMerchantTools(mkTool: any) {
  mkTool(
    "get_merchant_status",
    "Check if a merchant is currently open/closed and get their food preparation time. Use this to verify merchant availability before placing or reassigning orders.",
    z.object({ merchantId: z.string() }),
    {
      title: "Get Merchant Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
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
    "get_nearby_merchants_with_same_items",
    "Find alternative merchants within a specified radius who have all the required items in stock. Use this when the original merchant is unavailable, closed, or has issues. Returns merchants sorted by distance with their inventory and preparation times.",
    z.object({
      address: z
        .string()
        .describe(
          "Customer delivery address or current location to search from"
        ),
      items: z
        .array(z.string())
        .min(1)
        .describe(
          "List of items that the merchant must have in their inventory"
        ),
      radiusMeters: z
        .number()
        .default(5000)
        .describe("Search radius in meters (default: 5km)"),
    }),
    {
      title: "Get Nearby Merchants With Same Items",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({
      address,
      items,
      radiusMeters,
    }: {
      address: string;
      items: string[];
      radiusMeters: number;
    }) => {
      const coords = await getLatLngFromAddress(address);
      if (!coords) {
        throw new Error(`Could not geocode address: ${address}`);
      }

      const merchants = await prisma.merchant.findMany({
        where: { status: "open" },
      });

      const results: any[] = [];

      for (const merchant of merchants) {
        if (!Array.isArray(merchant.inventory)) continue;

        const hasAllItems = items.every((item: string) =>
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
            distanceMeters: dist,
          });
        }
      }

      return {
        origin: coords,
        merchants: results,
      };
    }
  );

  mkTool(
    "reassign_order_to_new_merchant",
    "Cancel an existing order and immediately create a new order with a different merchant. Use this when the original merchant cannot fulfill the order (closed, out of stock, too busy, etc.). The new order will preserve all original items and customer details but use the new merchant's location and prep time.",
    z.object({
      orderId: z
        .string()
        .describe("ID of the existing order to cancel and reassign"),
      newMerchantId: z
        .string()
        .describe("ID of the merchant who will fulfill the new order"),
    }),
    {
      title: "Reassign Order",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    async ({
      orderId,
      newMerchantId,
    }: {
      orderId: string;
      newMerchantId: string;
    }) => {
      const id = Number(orderId);
      const merchantId = Number(newMerchantId);

      if ([id, merchantId].some((n) => isNaN(n))) {
        throw new Error("orderId and newMerchantId must be valid numbers");
      }

      const oldOrder = await prisma.order.findUnique({ where: { id } });
      if (!oldOrder) throw new Error(`Order ${id} not found`);

      const newMerchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
      });
      if (!newMerchant) throw new Error(`Merchant ${merchantId} not found`);

      await prisma.order.update({
        where: { id },
        data: { status: "cancelled" },
      });

      const newOrder = await prisma.order.create({
        data: {
          status: "preparing",
          merchantId: newMerchant.id,
          userId: oldOrder.userId,
          source: newMerchant.address,
          destination: oldOrder.destination,
          items: oldOrder.items,
        },
      });

      return {
        message: `Order reassigned from merchant ${oldOrder.merchantId} to ${newMerchant.id}`,
        oldOrderId: id,
        newOrderId: newOrder.id,
      };
    }
  );

  mkTool(
    "get_merchant_details",
    "Get comprehensive information about a merchant including their profile, all current and past orders, customer feedback, incidents, and operational data. Use this for detailed merchant analysis, performance review, or when investigating merchant-related issues.",
    z.object({
      merchantId: z
        .number()
        .int()
        .positive()
        .describe("Unique identifier of the merchant to retrieve details for"),
    }),
    {
      title: "Get Merchant Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const merchant = await prisma.merchant.findUnique({
        where: {
          id: params.merchantId,
        },
        include: {
          orders: {
            include: {
              user: true,
              driver: true,
              incidents: true,
              packagingFeedbacks: true,
              conversations: true,
              humanEscalations: true,
            },
          },
          packagingFeedback: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!merchant) {
        return `Merchant with ID ${params.merchantId} not found`;
      }

      return `Merchant details retrieved successfully: ${JSON.stringify(
        merchant,
        null,
        2
      )}`;
    }
  );
}
