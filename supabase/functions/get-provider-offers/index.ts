import { createServiceClient, resolveUser } from "../_shared/auth.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const PRESENTATION_ACK_TIMEOUT_SECONDS = 15;

function presentationDeadlineIso(lastNotifiedAtRaw: unknown): string | null {
  const raw = `${lastNotifiedAtRaw ?? ""}`.trim();
  if (!raw) return null;
  const sentMs = Date.parse(raw);
  if (!Number.isFinite(sentMs)) return null;
  return new Date(sentMs + PRESENTATION_ACK_TIMEOUT_SECONDS * 1000)
    .toISOString();
}

function isSendingStillActive(
  row: Record<string, unknown>,
  nowMs: number,
): boolean {
  const deadlineIso = presentationDeadlineIso(row["last_notified_at"]);
  if (!deadlineIso) return true;
  const deadlineMs = Date.parse(deadlineIso);
  if (!Number.isFinite(deadlineMs)) return true;
  return deadlineMs > nowMs;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const user = await resolveUser(authHeader);
    if (!user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json();
    const providerUserId = body.provider_user_id?.toString().trim();
    if (!providerUserId) {
      return json({ error: "provider_user_id obrigatório" }, 400);
    }

    const client = createServiceClient();
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const { data } = await client
      .from("notificacao_de_servicos")
      .select(
        "id, service_id, status, response_deadline_at, last_notified_at, ciclo_atual, queue_order",
      )
      .eq("provider_user_id", providerUserId)
      .in("status", ["sending", "notified"])
      .order("last_notified_at", { ascending: false })
      .limit(10);

    const offers = (data ?? [])
      .filter((row) => {
        const status = `${row.status ?? ""}`.trim().toLowerCase();
        if (status === "sending") {
          return isSendingStillActive(row as Record<string, unknown>, nowMs);
        }
        const deadlineRaw = `${row.response_deadline_at ?? ""}`.trim();
        if (!deadlineRaw) return true;
        const deadlineMs = Date.parse(deadlineRaw);
        if (!Number.isFinite(deadlineMs)) return true;
        return deadlineMs > nowMs;
      })
      .map((row) => {
        const status = `${row.status ?? ""}`.trim().toLowerCase();
        const presentationDeadlineAt = status === "sending"
          ? presentationDeadlineIso(row.last_notified_at)
          : null;
        return {
          ...row,
          presentation_deadline_at: presentationDeadlineAt,
        };
      });

    return json({
      offers,
      total: offers.length,
      checked_at: nowIso,
    });
  } catch (err) {
    console.error("[get-provider-offers] Erro:", err);
    return json({ error: "Erro interno" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
