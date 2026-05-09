import { json, supabaseAdmin } from "./auth.ts";

type JsonMap = Record<string, unknown>;

type GuardOptions = {
  action: string;
  maxAttempts: number;
  windowSeconds: number;
  requireCaptchaForWeb?: boolean;
  captchaToken?: string | null;
};

function shouldEnforceWebCaptcha(): boolean {
  const raw = (Deno.env.get("PUBLIC_SIGNUP_REQUIRE_WEB_CAPTCHA") ?? "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes", "sim", "on"].includes(raw);
}

function isMissingGuardTableError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("public_signup_guard_events") &&
      (normalized.includes("does not exist") ||
        normalized.includes("could not find the table") ||
        normalized.includes("relation") && normalized.includes("does not exist"));
}

function getHeader(req: Request, name: string): string {
  return (req.headers.get(name) ?? "").trim();
}

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function hostFromUrl(raw: string): string {
  try {
    return new URL(raw).host.trim().toLowerCase();
  } catch (_) {
    return raw.trim().toLowerCase();
  }
}

function getAllowedOriginHosts(): Set<string> {
  const raw = Deno.env.get("PUBLIC_WEB_ORIGIN_ALLOWLIST") ?? "";
  return new Set(splitCsv(raw).map(hostFromUrl));
}

function getClientIp(req: Request): string {
  const candidates = [
    getHeader(req, "cf-connecting-ip"),
    getHeader(req, "x-real-ip"),
    getHeader(req, "x-forwarded-for").split(",")[0] ?? "",
  ];
  for (const candidate of candidates) {
    const value = candidate.trim();
    if (value.length > 0) return value;
  }
  return "unknown";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
): Promise<boolean> {
  const secret = (Deno.env.get("TURNSTILE_SECRET_KEY") ?? "").trim();
  if (secret.length == 0) return true;
  if (token.trim().length == 0) return false;

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token.trim());
  if (remoteIp.length > 0 && remoteIp != "unknown") {
    form.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );

  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({} as JsonMap));
  return payload["success"] === true;
}

export async function enforcePublicAbuseGuard(
  req: Request,
  options: GuardOptions,
) {
  const admin = supabaseAdmin();
  const origin = getHeader(req, "origin");
  const ip = getClientIp(req);
  const userAgent = getHeader(req, "user-agent");
  const isWebRequest = origin.length > 0;

  if (isWebRequest) {
    const allowedHosts = getAllowedOriginHosts();
    if (allowedHosts.size > 0) {
      const requestHost = hostFromUrl(origin);
      if (!allowedHosts.has(requestHost)) {
        return {
          error: json(
            {
              error: "origin_not_allowed",
              message: "Origem não autorizada para este endpoint público.",
            },
            403,
          ),
        };
      }
    }
  }

  const ipHash = await sha256Hex(ip);
  const userAgentHash = await sha256Hex(userAgent);
  const threshold = new Date(
    Date.now() - options.windowSeconds * 1000,
  ).toISOString();

  const { count, error: countError } = await admin
    .from("public_signup_guard_events")
    .select("*", { count: "exact", head: true })
    .eq("action", options.action)
    .eq("ip_hash", ipHash)
    .gte("created_at", threshold);

  if (countError) {
    if (isMissingGuardTableError(countError.message)) {
      console.warn(
        "⚠️ [public-security] tabela public_signup_guard_events ausente; seguindo sem rate limit persistente.",
      );
    } else {
      return {
        error: json(
          {
            error: "guard_count_failed",
            message: countError.message,
          },
          500,
        ),
      };
    }
  }

  if (!countError && (count ?? 0) >= options.maxAttempts) {
    return {
      error: json(
        {
          error: "too_many_requests",
          message: "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.",
        },
        429,
      ),
    };
  }

  if (
    isWebRequest &&
    options.requireCaptchaForWeb &&
    shouldEnforceWebCaptcha()
  ) {
    const validCaptcha = await verifyTurnstileToken(
      options.captchaToken ?? "",
      ip,
    );
    if (!validCaptcha) {
      return {
        error: json(
          {
            error: "captcha_required",
            message: "Falha na verificação anti-bot do cadastro.",
          },
          403,
        ),
      };
    }
  }

  const insertAttempt = await admin.from("public_signup_guard_events").insert({
    action: options.action,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
    origin_host: origin.length == 0 ? null : hostFromUrl(origin),
    metadata: {
      is_web_request: isWebRequest,
      path: new URL(req.url).pathname,
    },
  });

  if (insertAttempt.error) {
    if (isMissingGuardTableError(insertAttempt.error.message)) {
      console.warn(
        "⚠️ [public-security] tabela public_signup_guard_events ausente; evento de rate limit não foi gravado.",
      );
      return { ok: true };
    }
    return {
      error: json(
        {
          error: "guard_log_failed",
          message: insertAttempt.error.message,
        },
        500,
      ),
    };
  }

  return { ok: true };
}
