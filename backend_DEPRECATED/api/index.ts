export default async function handler(req: any, res: any) {
  // Forçar fuso horário de Brasília (UTC-3)
  process.env.TZ = "America/Sao_Paulo";

  try {
    // URL rewrite removed to match Express routes which include /api prefix
    // if (typeof req.url === "string") {
    //   req.url = req.url.replace(/^\/api(\/|$)/, "/");
    // }
  } catch (e) {
    console.error("URL Rewrite error:", e);
  }

  try {
    // Dynamic import to catch initialization errors
    const appModule = await import("../src/server");
    const app = appModule.default;
    (app as any)(req, res);
  } catch (e: any) {
    console.error("App invocation/initialization error:", e);
    res
      .status(500)
      .json({
        error: "Function Invocation Failed",
        message: e.message,
        stack: e.stack
      });
  }
}
