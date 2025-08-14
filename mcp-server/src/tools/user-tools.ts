import { z } from "zod";
import { prisma } from "../lib/database.js";
import { randomUUID } from "crypto";

export function registerUserTools(mkTool: any) {
  mkTool(
    "create_user",
    "Register a new customer in the system with their contact and delivery information. Use this when onboarding new customers who want to place orders through the delivery platform.",
    z.object({
      name: z.string().describe("Full name of the customer"),
      email: z
        .string()
        .email()
        .describe("Customer's email address (must be unique)"),
      address: z.string().describe("Customer's delivery address"),
      phone: z.string().describe("Customer's contact phone number"),
    }),
    {
      title: "Create User",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async (params: any) => {
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

      return `User ${id} created successfully`;
    }
  );

  mkTool(
    "get_user_details",
    "Retrieve comprehensive customer information including their complete order history, ongoing incidents, escalations, and all related delivery data. Use this for customer support, order investigation, or when analyzing customer patterns and issues.",
    z.object({
      userId: z
        .number()
        .int()
        .positive()
        .describe("Unique identifier of the customer to retrieve details for"),
    }),
    {
      title: "Get User Details",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (params: any) => {
      const user = await prisma.user.findUnique({
        where: {
          id: params.userId,
        },
        include: {
          orders: {
            include: {
              merchant: true,
              driver: true,
              incidents: true,
              packagingFeedbacks: true,
              conversations: true,
              humanEscalations: true,
            },
          },
          humanEscalations: {
            include: {
              order: true,
            },
          },
        },
      });

      if (!user) {
        return `User with ID ${params.userId} not found`;
      }

      return `User details retrieved successfully: ${JSON.stringify(
        user,
        null,
        2
      )}`;
    }
  );
}
