import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export async function closeDatabaseConnection() {
  await prisma.$disconnect();
}
