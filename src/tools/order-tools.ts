import { z } from "zod";
import { prisma } from "../lib/database.js";

export function registerOrderTools(mkTool: any) {
  mkTool(
    "create_order",
    "Create an order with user and merchant details",
    z.object({
      userId: z.string(),
      merchantId: z.string(),
      destination: z.string().optional(),
      items: z.array(z.string()).min(1),
    }),
    { title: "Create Order" },
    async (params: any) => {
      const userId = Number(params.userId);
      const merchantId = Number(params.merchantId);

      if ([userId, merchantId].some((id) => isNaN(id))) {
        throw new Error("userId and merchantId must be valid numbers");
      }

      const [user, merchant] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.merchant.findUnique({ where: { id: merchantId } }),
      ]);
      if (!user) throw new Error(`User with id ${userId} not found`);
      if (!merchant)
        throw new Error(`Merchant with id ${merchantId} not found`);

      if (!Array.isArray(merchant.inventory)) {
        throw new Error("Merchant inventory is not available");
      }

      const missingItems = params.items.filter(
        (item: string) => !merchant.inventory.includes(item)
      );

      if (missingItems.length > 0) {
        throw new Error(
          `Merchant does not have the following items: ${missingItems.join(
            ", "
          )}`
        );
      }

      const order = await prisma.order.create({
        data: {
          status: "preparing",
          merchantId,
          userId,
          source: merchant.address,
          destination: params.destination ?? null,
          items: params.items,
        },
      });

      return {
        orderId: order.id,
        message: "Order created successfully",
        order,
      };
    }
  );

  //done
  mkTool(
    "change_order_status",
    "Change the status of an order. This should be called at every change of event.",
    z.object({
      orderId: z.string(),
      status: z.enum([
        "preparing",
        "pending",
        "delivered",
        "failed",
        "cancelled",
      ]),
    }),
    { title: "Change Order Status" },
    async (params: any) => {
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
    "unassign_order_from_driver",
    "Unassign a driver from an order",
    z.object({ orderId: z.string() }),
    { title: "Unassign Order From Driver" },
    async ({ orderId }: { orderId: string }) => {
      const id = Number(orderId);
      if (isNaN(id)) throw new Error("orderId must be a valid number");

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new Error(`Order with id ${id} not found`);
      if (order.driverId === null) {
        return {
          unassigned: false,
          message: "No driver was assigned to this order",
        };
      }

      await prisma.order.update({
        where: { id },
        data: { driverId: null },
      });

      return {
        unassigned: true,
        orderId: id,
        message: "Driver unassigned successfully",
      };
    }
  );
}
