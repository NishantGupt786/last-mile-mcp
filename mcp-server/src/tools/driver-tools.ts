import { z } from "zod";
import { prisma } from "../lib/database.js";
import {
  getLatLngFromAddress,
  getTravelTime,
  haversineDistance,
} from "../utils.js";

export function registerDriverTools(mkTool: any) {
  mkTool(
    "assign_driver",
    "Automatically assign the nearest available driver to an order by calculating distances from the pickup location. Uses geolocation to find the closest idle driver and updates the order with the driver assignment. Use this when an order is ready for pickup and needs driver allocation.",
    z.object({
      orderId: z
        .string()
        .describe(
          "ID of the order that needs a driver assigned for pickup and delivery"
        ),
    }),
    {
      title: "Assign Driver",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    async (params: any) => {
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
          state: "idle",
        },
        select: { id: true, lat: true, lng: true },
      });

      if (drivers.length === 0)
        throw new Error("No drivers with location found");

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

      const updatedDriver = await prisma.driver.update({
        where: { id: nearestDriver.id },
        data: { state: "enroute" },
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
    "Check if a driver is currently assigned to an active order and retrieve order details including merchant preparation time, pickup location, and delivery destination. Use this to understand driver availability and current workload before making assignment decisions.",
    z.object({
      driverId: z
        .number()
        .describe("ID of the driver to check for current order status"),
    }),
    {
      title: "Check Driver Order Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ driverId }: { driverId: number }) => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          orders: {
            where: { status: "preparing" },
            include: { merchant: true },
          },
        },
      });

      if (!driver) throw new Error(`Driver ${driverId} not found`);

      const currentOrder = driver.orders[0];
      if (!currentOrder) return { hasOrder: false };

      return {
        hasOrder: true,
        orderId: currentOrder.id,
        prepMinutes: currentOrder.merchant.prepMinutes,
        source: currentOrder.source,
        destination: currentOrder.destination,
      };
    }
  );

  mkTool(
    "assign_nearby_order_to_driver",
    "Intelligently find and assign a nearby order with shorter preparation time to optimize driver efficiency and reduce waiting time. Searches within a specified radius for orders with faster prep times than the driver's current assignment. Use this for dynamic order optimization and reducing delivery delays.",
    z.object({
      driverId: z
        .number()
        .describe("ID of the driver to assign a new order to"),
      currentPrepMinutes: z
        .number()
        .describe(
          "Current order's preparation time in minutes (for comparison)"
        ),
      maxDistanceKm: z
        .number()
        .default(5)
        .describe("Maximum search radius in kilometers (default: 5km)"),
    }),
    {
      title: "Assign Nearby Order",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    async ({
      driverId,
      currentPrepMinutes,
      maxDistanceKm,
    }: {
      driverId: number;
      currentPrepMinutes: number;
      maxDistanceKm: number;
    }) => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });
      if (!driver) throw new Error(`Driver ${driverId} not found`);

      const candidateOrders = await prisma.order.findMany({
        where: { status: "preparing", driverId: null },
        include: { merchant: true },
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
            distanceKm: travel.distance.value / 1000,
          });
        }
      }

      if (nearbyOrders.length === 0) return { assigned: false };

      const selected = nearbyOrders.sort(
        (a, b) => a.prepMinutes - b.prepMinutes
      )[0];
      await prisma.order.update({
        where: { id: selected.id },
        data: { driverId },
      });

      return {
        assigned: true,
        orderId: selected.id,
        distanceKm: selected.distanceKm,
      };
    }
  );

  mkTool(
    "get_driver_status",
    "Retrieve current driver status including their location coordinates and operational state (idle, enroute, delivering, offline). Use this for dispatcher visibility, order assignment decisions, and tracking driver availability across the fleet.",
    z.object({
      driverId: z.number().describe("ID of the driver to check status for"),
    }),
    {
      title: "Get Driver Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ driverId }: { driverId: number }) => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true, lat: true, lng: true, state: true },
      });
      if (!driver) throw new Error(`Driver ${driverId} not found`);

      return {
        driverId: driver.id,
        location: { lat: driver.lat, lng: driver.lng },
        state: driver.state,
      };
    }
  );

  mkTool(
    "update_driver_state",
    "Update driver's operational status to track their current activity and availability. Use this to manage driver workflow states during order fulfillment, shift changes, or when drivers go offline. Essential for accurate dispatch and customer tracking.",
    z.object({
      driverId: z.number().describe("ID of the driver to update"),
      state: z
        .enum(["enroute", "idle", "delivering", "offline"])
        .describe(
          "New driver state: 'enroute' (going to pickup), 'idle' (available), 'delivering' (en route to customer), 'offline' (not available)"
        ),
    }),
    {
      title: "Update Driver State",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ driverId, state }: { driverId: number; state: string }) => {
      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: { state },
      });
      return { driverId: updated.id, state: updated.state };
    }
  );

  mkTool(
    "update_driver_location",
    "Update driver's current location by geocoding an address and storing the coordinates. Use this when drivers report their location, move to new areas, or when their GPS position needs to be updated for accurate distance calculations and order assignments.",
    z.object({
      driverId: z.number().describe("ID of the driver to update location for"),
      address: z.string().describe("Current address or location of the driver"),
    }),
    {
      title: "Update Driver Location",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ driverId, address }: { driverId: number; address: string }) => {
      const coords = await getLatLngFromAddress(address);
      if (!coords) {
        throw new Error(`Could not geocode address: ${address}`);
      }

      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: { lat: coords.lat, lng: coords.lng },
      });

      return {
        driverId: updated.id,
        location: { lat: updated.lat, lng: updated.lng },
      };
    }
  );

  mkTool(
    "get_driver_details",
    "Retrieve comprehensive driver information including their profile, all assigned orders (current and historical), delivery incidents, customer interactions, and performance data. Use this for driver management, performance analysis, incident investigation, or detailed driver support.",
    z.object({
      driverId: z
        .number()
        .int()
        .positive()
        .describe("ID of the driver to retrieve comprehensive details for"),
    }),
    {
      title: "Get Driver Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const driver = await prisma.driver.findUnique({
        where: {
          id: params.driverId,
        },
        include: {
          orders: {
            include: {
              merchant: true,
              user: true,
              incidents: true,
              packagingFeedbacks: true,
              conversations: true,
              humanEscalations: true,
            },
          },
        },
      });

      if (!driver) {
        return `Driver with ID ${params.driverId} not found`;
      }

      return `Driver details retrieved successfully: ${JSON.stringify(
        driver,
        null,
        2
      )}`;
    }
  );
}
