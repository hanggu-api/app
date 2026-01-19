import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const prisma = new PrismaClient();

export default prisma;
