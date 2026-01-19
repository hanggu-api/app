import pool from "../database/db";
import { ServiceRepository } from "../repositories/serviceRepository";

async function run() {
    try {
        const repo = new ServiceRepository();
        console.log("=== TESTING REPO FOR PROVIDER 835 (Chaveiro Silva) ===");
        const services = await repo.findPendingForProviderWithDistance(835);
        console.log("Found services:", services.length);
        console.dir(services, { depth: null });

        console.log("\n=== TESTING REPO FOR PROVIDER 528 (Test1) ===");
        const services2 = await repo.findPendingForProviderWithDistance(528);
        console.log("Found services:", services2.length);
        console.dir(services2, { depth: null });

    } catch (e) {
        console.error(e);
    }
    process.exit();
}

run();
