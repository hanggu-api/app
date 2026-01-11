
import pool from "./src/database/db";

async function setupProviders() {
  try {
    const professionId = 4196; // Barbeiro
    const providerIds = [723, 724, 725];

    for (const userId of providerIds) {
      console.log(`Setting up provider ${userId}...`);

      // 1. Assign Profession
      await pool.query(
        "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
        [userId, professionId]
      );

      // 2. Ensure Provider Details (commercial name, etc.)
      const [provRows] = await pool.query("SELECT user_id FROM providers WHERE user_id = ?", [userId]) as [any[], any];
      
      if (provRows.length === 0) {
        await pool.query(
          "INSERT INTO providers (user_id, commercial_name, address, bio) VALUES (?, ?, ?, ?)",
          [userId, `Barbearia do ${userId}`, 'Rua Exemplo, 123', 'Cortes modernos e clássicos.']
        );
      } else {
          // Update commercial name to ensure it's set
          await pool.query(
              "UPDATE providers SET commercial_name = ? WHERE user_id = ?",
              [`Barbearia do ${userId}`, userId]
          );
      }
      
      // 3. Set Location (Mock) - using userId as provider_id
      await pool.query(
          "INSERT IGNORE INTO provider_locations (provider_id, latitude, longitude) VALUES (?, ?, ?)",
          [userId, -23.550520 + (Math.random() * 0.01), -46.633308 + (Math.random() * 0.01)]
      );

      // 4. Set Schedule (Mon-Fri, 9-18)
      // Check if schedule exists
      const [schedRows] = await pool.query("SELECT id FROM provider_schedules WHERE provider_id = ?", [userId]) as [any[], any];
      if (schedRows.length === 0) {
          const days = [1, 2, 3, 4, 5]; // Mon-Fri
          for (const day of days) {
              await pool.query(
                  "INSERT INTO provider_schedules (provider_id, day_of_week, start_time, end_time, is_enabled) VALUES (?, ?, '09:00', '18:00', 1)",
                  [userId, day]
              );
          }
      }
    }

    console.log("Providers setup complete!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

setupProviders();
