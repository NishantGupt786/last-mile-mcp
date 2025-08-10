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
    "Assign nearest driver to an order based on order source location",
    z.object({ orderId: z.string() }),
    { title: "Assign Driver" },
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
    "Find and assign a nearby order with shorter prep time to driver",
    z.object({
      driverId: z.number(),
      currentPrepMinutes: z.number(),
      maxDistanceKm: z.number().default(5),
    }),
    { title: "Assign Nearby Order" },
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
    "Get driver status",
    z.object({ driverId: z.number() }),
    { title: "Driver Status", readOnlyHint: true },
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
    "Update driver state",
    z.object({
      driverId: z.number(),
      state: z.enum(["enroute", "idle", "delivering", "offline"]),
    }),
    { title: "Update Driver State" },
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
    "Update driver location from address",
    z.object({
      driverId: z.number(),
      address: z.string(),
    }),
    { title: "Update Driver Location" },
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
}
