import { ServiceRepository } from "../repositories/serviceRepository";

async function verify() {
  const repo = new ServiceRepository();
  const providerId = 528; // Test provider (Chaveiro only)
  const providerWithSkill = 835; // Provider with Refrigeração skill

  try {
    console.log("--- Verifying Filtering ---");

    // Check Chaveiro (Should NOT see Refrigeração)
    const services = await repo.findPendingForProviderWithDistance(providerId);
    console.log(`\nProvider ${providerId} (Chaveiro Only): Found ${services.length} services`);
    services.forEach(s => {
      console.log(`- Service: ${s.description}, Profession: ${s.profession}`);
      if (s.profession === 'Técnico de Refrigeração') {
        console.error("❌ FAILURE: Chaveiro saw Refrigeração service!");
      }
    });

    // Check Refrigeração Tech (Should SEE Refrigeração)
    const services2 = await repo.findPendingForProviderWithDistance(providerWithSkill);
    console.log(`\nProvider ${providerWithSkill} (Has Skill): Found ${services2.length} services`);
    const sawIt = services2.some(s => s.profession === 'Técnico de Refrigeração');

    if (sawIt) {
      console.log("✅ SUCCESS: Tech saw Refrigeração service.");
    } else {
      console.warn("⚠️ WARNING: Tech did NOT see Refrigeração service (maybe none pending?).");
    }

  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

verify();
