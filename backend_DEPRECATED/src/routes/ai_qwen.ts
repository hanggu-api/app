import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const router = Router();

function runBridge(prompt: string, headless: boolean): Promise<{ prompt?: string; reply?: string; raw: string; code: number }> {
  return new Promise((resolve) => {
    const distScript = path.resolve(process.cwd(), "dist", "src", "scripts", "qwen_bridge.js");
    const tsScript = path.resolve(process.cwd(), "src", "scripts", "qwen_bridge.ts");
    const useDist = fs.existsSync(distScript);
    const args = useDist
      ? [distScript, "--prompt", prompt].concat(headless ? ["--headless"] : [])
      : ["-r", "ts-node/register/transpile-only", tsScript, "--prompt", prompt].concat(headless ? ["--headless"] : []);
    const child = spawn("node", args, { cwd: process.cwd(), shell: false });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += String(d);
    });
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    child.on("close", (code) => {
      let promptStr: string | undefined;
      let replyStr: string | undefined;
      const raw = (out || err || "").trim();
      try {
        const j = JSON.parse(out.trim());
        promptStr = String(j.prompt || "");
        replyStr = String(j.reply || "");
      } catch {}
      resolve({ prompt: promptStr, reply: replyStr, raw, code: code ?? 1 });
    });
  });
}

router.post("/ask", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { prompt, headless = true } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ success: false, message: "Prompt inválido" });
      return;
    }
    const result = await runBridge(prompt.trim(), Boolean(headless));
    if (result.code !== 0) {
      if ((result.raw || "").toLowerCase().includes("login required")) {
        res.status(403).json({ success: false, message: "Login requerido no Qwen Chat" });
        return;
      }
      res.status(502).json({ success: false, message: "Falha ao obter resposta do Qwen", error: result.raw });
      return;
    }
    res.json({ success: true, data: { prompt: result.prompt, reply: result.reply } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: "Erro interno" });
  }
});

export default router;
