import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
let prompt = "";
let inputPath = "";
let outputPath = "";
let headless = false;
let loginMode = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--prompt" && i + 1 < args.length) prompt = args[++i];
  else if (a === "--input" && i + 1 < args.length) inputPath = args[++i];
  else if (a === "--output" && i + 1 < args.length) outputPath = args[++i];
  else if (a === "--headless") headless = true;
  else if (a === "--login") loginMode = true;
}

if (!prompt && inputPath) {
  try {
    const raw = fs.readFileSync(inputPath, "utf-8");
    const j = JSON.parse(raw);
    prompt = String(j.prompt || j.text || "").trim();
  } catch { }
}

if (!prompt && !loginMode) {
  console.error("missing prompt");
  process.exit(1);
}

const userDataDir = path.resolve(process.cwd(), ".qwen_profile");

async function isLoginRequired(page: any) {
  const markerTexts = [
    "Sign in",
    "Log in",
    "Entrar",
    "Iniciar sessão",
    "Faça login",
  ];
  const hasText = await page.evaluate((markers: string[]) => {
    const bodyText = (document.body?.innerText || "").toLowerCase();
    return markers.some((m: string) => bodyText.includes(m.toLowerCase()));
  }, markerTexts);
  const hasButton =
    (await page.$("button:has-text('Sign in')")) ||
    (await page.$("button:has-text('Log in')")) ||
    (await page.$("button:has-text('Entrar')")) ||
    (await page.$("a[href*='login']"));
  return Boolean(hasText || hasButton);
}

async function findInput(page: any) {
  const candidates = ["textarea", "div[contenteditable='true']", "input[type='text']"];
  for (let i = 0; i < 30; i++) {
    for (const sel of candidates) {
      try {
        const el = await page.$(sel);
        if (el) return { sel, el };
      } catch { }
    }
    for (const frame of page.frames()) {
      for (const sel of candidates) {
        try {
          const el = await frame.$(sel);
          if (el) return { sel, el, frame };
        } catch { }
      }
    }
    try {
      await page.waitForSelector("textarea, div[contenteditable='true'], input[type='text']", {
        timeout: 1000,
        state: "visible",
      });
      for (const sel of candidates) {
        const el = await page.$(sel);
        if (el) return { sel, el };
      }
    } catch { }
    await page.waitForTimeout(1000);
  }
  return null;
}

async function sendPrompt(page: any, target: { sel: string; el: any; frame?: any }, text: string) {
  const sel = target.sel;
  const ctx = target.frame || page;
  if (sel === "textarea" || sel === "input[type='text']") {
    await ctx.focus(sel);
    await ctx.fill(sel, text);
    await ctx.keyboard.press("Enter");
    for (const s of [
      "button:has-text('Enviar')",
      "button:has-text('Send')",
      "[aria-label='Enviar']",
      "[aria-label='Send']",
      "button[type='submit']",
    ]) {
      const sendBtn = await ctx.$(s);
      if (sendBtn) {
        await sendBtn.click();
        break;
      }
    }
    return;
  }
  if (sel === "div[contenteditable='true']") {
    await ctx.focus(sel);
    await ctx.keyboard.type(text);
    await ctx.keyboard.press("Enter");
    for (const s of [
      "button:has-text('Enviar')",
      "button:has-text('Send')",
      "[aria-label='Enviar']",
      "[aria-label='Send']",
      "button[type='submit']",
    ]) {
      const sendBtn = await ctx.$(s);
      if (sendBtn) {
        await sendBtn.click();
        break;
      }
    }
    return;
  }
}

async function extractLastReply(page: any, promptText: string) {
  const grab = async () =>
    page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll(
          ".markdown-body, .prose, .message-content, .assistant, .msg, .chat-message, .markdown, [data-message-role='assistant'], [data-role='assistant'], article"
        )
      );
      return nodes.map((n) => (n.textContent || "").trim()).filter((t) => t.length > 0);
    });
  const baseline = await grab();
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const texts: string[] = await grab();
    if (texts.length > baseline.length) {
      const last = texts[texts.length - 1];
      if (last && last.length > 5 && last !== promptText) return last;
    }
  }
  return "";
}

async function main() {
  if (loginMode) headless = false;
  const context = await chromium.launchPersistentContext(userDataDir, { headless });
  const page = await context.newPage();
  await page.goto("https://chat.qwen.ai/", { waitUntil: "networkidle" });

  if (loginMode) {
    for (let i = 0; i < 600; i++) {
      const needLogin = await isLoginRequired(page);
      if (!needLogin) break;
      await page.waitForTimeout(1000);
    }
    const inputLogin = await findInput(page);
    if (!inputLogin) {
      console.error("login not completed");
      await context.close();
      process.exit(5);
    }
    const testPrompt = prompt || "Olá Qwen, confirme login.";
    await sendPrompt(page, inputLogin, testPrompt);
    const replyLogin = await extractLastReply(page, testPrompt);
    const outLogin = { prompt: testPrompt, reply: replyLogin };
    console.log(JSON.stringify(outLogin));
    await context.close();
    process.exit(0);
  }

  const input = await findInput(page);
  if (!input) {
    console.error("input not found");
    await context.close();
    process.exit(2);
  }

  await sendPrompt(page, input, prompt);
  const reply = await extractLastReply(page, prompt);
  if (!reply) {
    console.error("reply not received");
    await context.close();
    process.exit(3);
  }

  const out = { prompt, reply };
  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
      console.log(outputPath);
    } catch {
      console.log(JSON.stringify(out));
    }
  } else {
    console.log(JSON.stringify(out));
  }
  await context.close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(10);
});
