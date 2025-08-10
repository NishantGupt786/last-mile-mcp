import { z } from "zod";
import { prisma } from "../lib/database.js";
import { getLatLngFromAddress, haversineDistance } from "../utils.js";

export function registerMerchantTools(mkTool: any) {
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
    "Find nearby merchants who sell the same items",
    z.object({
      address: z.string(),
      items: z.array(z.string()).min(1),
      radiusMeters: z.number().default(5000),
    }),
    { title: "Get Nearby Merchants With Same Items" },
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
    "Cancel an existing order and create a new one with a different merchant",
    z.object({
      orderId: z.string(),
      newMerchantId: z.string(),
    }),
    { title: "Reassign Order" },
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
}
