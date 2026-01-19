
import { UserRepository } from "../src/repositories/userRepository";
import pool from "../src/database/db";

async function main() {
    try {
        const userRepo = new UserRepository();
        const userId = 832;
        console.log(`Fetching profile for user ${userId}...`);
        const profile = await userRepo.getFullProfile(userId);
        console.log("Profile Data:", JSON.stringify(profile, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error fetching profile:", error);
        process.exit(1);
    }
}

main();
