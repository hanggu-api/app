import db from "./database/db";

async function updateProviderTheme() {
  try {
    const themeConfig = {
      client: {
        primary: "#FFE600", // Yellow
        secondary: "#EF6C00", // Orange
        background: "#FFE600",
        text_primary: "#2E5C99" // Blue
      },
      provider: {
        primary: "#4CAF50", // Green
        secondary: "#2E7D32", // Dark Green
        background: "#E8F5E9", // Light Green
        text_primary: "#1B5E20" // Dark Green Text
      }
    };

    await db.query(
      `INSERT INTO system_settings (key_name, value, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value = ?`,
      [
        "theme_config",
        JSON.stringify(themeConfig),
        "App theme colors for client and provider apps",
        JSON.stringify(themeConfig)
      ]
    );

    console.log("✅ Provider theme updated to Green scheme.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updateProviderTheme();
