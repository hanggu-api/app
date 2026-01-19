const main = async () => {
  const baseUrl = "http://localhost:4011";
  console.log(`Checking backend at ${baseUrl}...`);

  const check = async (name, path, options = {}) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      const status = res.status;
      const passed = status >= 200 && status < 300;
      console.log(`[${passed ? "PASS" : "FAIL"}] ${name} (${path}): ${status}`);
      if (!passed) console.log("Response:", text.substring(0, 300));
      else if (path.includes("classify"))
        console.log("Result:", JSON.stringify(data, null, 2));
      else if (path.includes("health"))
        console.log("Result:", JSON.stringify(data));

      return { success: passed, data };
    } catch (e) {
      console.log(`[ERROR] ${name} (${path}):`, e.message);
      return { success: false, error: e.message };
    }
  };

  await check("Health Check", "/health");
  await check("Debug Env", "/debug/env");
  await check("Debug DB", "/debug/db");

  // Test Classification
  await check("Classification (Pneu)", "/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "estou com um pneu furado" }),
  });

  await check("Classification (Eletricista)", "/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "tomada com curto" }),
  });

  // Test Payment Routes
  await check("Payment Webhook (GET)", "/payment/webhook");
  await check("Payment Webhook (POST)", "/payment/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test" }),
  });

  // Test Auth Protection
  const res = await check("Payment Process (No Auth)", "/payment/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (
    res.data &&
    (res.data.status === 401 ||
      res.data.message?.includes("token") ||
      res.data.error?.includes("token"))
  ) {
    console.log("[PASS] Auth Protection Verified (Got 401/403 as expected)");
  }

  // --- FULL FLOW SIMULATION ---
  console.log("\n--- Starting Full Flow Simulation ---");

  // 1. Register User
  const randomEmail = `test_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = "password123";
  console.log(`Registering user: ${randomEmail}`);

  const regRes = await check("Register User", "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: randomEmail,
      password: password,
      name: "Test User",
      role: "client",
    }),
  });

  if (!regRes.success && regRes.data.message !== "User already exists") {
    console.log("Skipping rest of flow due to registration failure");
    return;
  }

  // 2. Login
  const loginRes = await check("Login User", "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: randomEmail, password: password }),
  });

  if (!loginRes.success || !loginRes.data.token) {
    console.log("Skipping rest of flow due to login failure");
    return;
  }
  const token = loginRes.data.token;
  console.log("Got Token:", token.substring(0, 20) + "...");

  // 3. Get Professions (to get a valid ID)
  const profRes = await check("Get Professions", "/services/professions");
  if (
    !profRes.success ||
    !profRes.data.professions ||
    profRes.data.professions.length === 0
  ) {
    console.log("Skipping rest of flow due to professions failure");
    return;
  }
  // Use category_id from profession if available, otherwise default to 1 (Encanamento) or 6 (Geral)
  const categoryId = profRes.data.professions[0].category_id || 6;
  console.log("Using Category ID:", categoryId);

  // 4. Create Service
  const serviceRes = await check("Create Service", "/services", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category_id: categoryId,
      description: "Preciso de um eletricista urgente para trocar disjuntor",
      latitude: -23.55052,
      longitude: -46.633308,
      address: "Rua Teste, 123",
      price_estimated: 100,
    }),
  });

  if (serviceRes.success) {
    console.log("[PASS] Service Created Successfully!");
    console.log("Service ID:", serviceRes.data.id);
  }
};

main();
