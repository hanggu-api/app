import prisma from "./src/database/prismaClient";
import { firebaseAuth } from "./src/config/firebase";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("\nUsage: npx ts-node delete_user.ts <email>");
    console.error("Example: npx ts-node delete_user.ts test@example.com\n");
    process.exit(1);
  }

  console.log(`\n🔍 Searching for user: ${email}...`);

  try {
    // 1. Delete from Firebase
    let firebaseUid = "";
    try {
      const firebaseUser = await firebaseAuth.getUserByEmail(email);
      firebaseUid = firebaseUser.uid;
      await firebaseAuth.deleteUser(firebaseUid);
      console.log(`✅ [Firebase] User deleted (UID: ${firebaseUid})`);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        console.log("⚠️ [Firebase] User not found.");
      } else {
        console.error("❌ [Firebase] Error:", error.message);
      }
    }

    // 2. Delete from Local Database (MySQL via Prisma)
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (user) {
      // If we didn't get UID from Firebase but found it in DB, log it
      if (!firebaseUid) firebaseUid = user.firebase_uid || "unknown";

      await prisma.users.delete({
        where: { id: user.id },
      });
      console.log(`✅ [Database] User deleted (ID: ${user.id})`);
    } else {
      console.log("⚠️ [Database] User not found.");
    }

    console.log("\n🎉 Cleanup complete.\n");
  } catch (error) {
    console.error("\n❌ An unexpected error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
