import { run as runServiceDispatches } from "./src/database/migrations/add_service_dispatches";
import { run as runProviderLocations } from "./src/database/migrations/add_provider_locations";
import { run as seedMedical } from "./src/database/migrations/seed_medical_professions";

async function main() {
  console.log("Running manual migrations...");
  try {
    // await runServiceDispatches();
    // await runProviderLocations();
    await seedMedical();
    console.log("Done.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
