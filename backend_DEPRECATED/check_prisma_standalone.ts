import { PrismaClient } from "./src/generated/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.users.count();
    console.log(`User count: ${userCount}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
