import { z } from "zod";
import { prisma } from "../lib/database.js";
import { randomUUID } from "crypto";

export function registerUserTools(mkTool: any) {
  mkTool(
    "create_user",
    "Create a new user in the database",
    z.object({
      name: z.string(),
      email: z.string(),
      address: z.string(),
      phone: z.string(),
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
    "create_random_user",
    "Create a random user with fake data",
    z.object({}),
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
      return `User ${id} created successfully`;
    }
  );
}
