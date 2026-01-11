const bool = (v: unknown, def: boolean) => {
  if (v === undefined || v === null) return def;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
};

const LOG_SERVICES = bool(process.env.LOG_SERVICES, true);
const LOG_ERRORS = bool(process.env.LOG_ERRORS, true);
const LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

const cyan = "\x1b[36m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const gray = "\x1b[90m";
const reset = "\x1b[0m";

const ts = () => new Date().toISOString();

export const logger = {
  service(event: string, payload?: Record<string, unknown>) {
    if (!LOG_SERVICES) return;
    if (LEVEL === "silent") return;
    const meta = payload ? ` ${JSON.stringify(payload)}` : "";
    console.log(
      `${cyan}[SERVICE]${reset} ${gray}${ts()}${reset} ${event}${meta}`,
    );
  },
  info(message: string, meta?: unknown) {
    if (LEVEL === "silent" || LEVEL === "error") return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.log(
      `${green}[INFO]${reset}    ${gray}${ts()}${reset} ${message}${metaStr}`,
    );
  },
  warn(message: string, meta?: unknown) {
    if (LEVEL === "silent" || LEVEL === "error") return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    console.warn(
      `${yellow}[WARN]${reset}    ${gray}${ts()}${reset} ${message}${metaStr}`,
    );
  },
  error(event: string, err?: unknown) {
    if (!LOG_ERRORS) return;
    const e = err as { message?: string; stack?: string };
    const detail = e?.message ? ` ${e.message}` : "";
    const stack = e?.stack ? `\n${e.stack}` : "";
    console.error(
      `${red}[ERROR]${reset} ${gray}${ts()}${reset} ${event}${detail}${stack}`,
    );
  },
};

export default logger;
