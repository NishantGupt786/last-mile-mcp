import { z } from "zod";
import { prisma } from "../lib/database.js";

export function registerOrderTools(mkTool: any) {
  mkTool(
    "create_order",
    `Create a new delivery order by validating customer and merchant exist, 
   checking item availability in merchant's inventory, and initializing 
   the order with 'preparing' status.
   
   Rules for items:
   - Array of product names exactly as they appear in merchant's inventory.
   - Strip out quantities, sizes, or extra descriptors unless they are part of the actual inventory name.
   - If quantity > 1, repeat the product name that many times.
   - Singularize plural words unless plural is part of the inventory name.
   
   Destination is always required. This is either specified in the prompt or is supposed to be taken from the users address.
   `,
    z.object({
      userId: z.string().describe("ID of the customer placing the order"),
      merchantId: z
        .string()
        .describe("ID of the merchant who will prepare the order"),
      destination: z
        .string()
        .describe(
          "Customer's delivery address"
        ),
      items: z
        .array(z.string())
        .min(1)
        .describe(
          "List of items to order (must be available in merchant's inventory)"
        ),
    }),
    {
      title: "Create Order",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
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

      const inventoryLower = merchant.inventory.map((i: string) =>
        i.toLowerCase()
      );
      const missingItems = params.items.filter(
        (item: string) => !inventoryLower.includes(item.toLowerCase())
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

  mkTool(
    "change_order_status",
    "Update an order's status to reflect its current state in the delivery lifecycle. Use this to track order progression from preparation through delivery, or to mark orders as failed/cancelled when issues occur. Call this at every significant status change.",
    z.object({
      orderId: z.string().describe("ID of the order to update"),
      status: z
        .enum(["preparing", "pending", "delivered", "failed", "cancelled"])
        .describe(
          "New status: 'preparing' (merchant cooking), 'pending' (ready for pickup), 'delivered' (completed), 'failed' (delivery issues), 'cancelled' (order cancelled)"
        ),
    }),
    {
      title: "Change Order Status",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    "Remove the assigned driver from an order, making it available for reassignment to another driver. Use this when a driver cancels, becomes unavailable, or when order needs to be reassigned due to delivery issues or delays.",
    z.object({
      orderId: z
        .string()
        .describe("ID of the order to unassign the driver from"),
    }),
    {
      title: "Unassign Order From Driver",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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

  mkTool(
    "get_order_details",
    "Retrieve comprehensive order information including customer details, merchant info, assigned driver, delivery addresses, ordered items, and current status. Use this for order tracking, customer support, delivery coordination, or incident investigation.",
    z.object({
      orderId: z.string().describe("ID of the order to retrieve details for"),
    }),
    {
      title: "Get Order Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ orderId }: { orderId: string }) => {
      const id = Number(orderId);
      if (isNaN(id)) throw new Error("orderId must be a valid number");

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: true,
          merchant: true,
          driver: true,
        },
      });

      if (!order) throw new Error(`Order with id ${id} not found`);

      return {
        orderId: order.id,
        status: order.status,
        user: order.user,
        merchant: order.merchant,
        driver: order.driver,
        items: order.items,
        source: order.source,
        destination: order.destination,
      };
    }
  );
}
