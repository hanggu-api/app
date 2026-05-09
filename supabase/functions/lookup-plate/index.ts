import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const ANYCAR_BASE = "https://api-v2.anycar.com.br";

function normalizePlate(raw: string): string {
  const cleaned = (raw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return cleaned;
}

async function fetchAnycarData(plate: string) {
  const initRes = await fetch(`${ANYCAR_BASE}/site/test-drive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placa: plate }),
  });

  const init = await initRes.json().catch(() => null);
  if (!init?.status || !init?.id) {
    return { error: "Falha ao iniciar consulta", details: init };
  }

  const id = init.id as string;
  let last: unknown = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${ANYCAR_BASE}/site/test-drive/${id}`);
    const data = await res.json().catch(() => null);
    last = data;

    if (data?.status && data?.aguardar === false && data?.data) {
      return { data: data.data };
    }

    await new Promise((resolve) => setTimeout(resolve, 800 + attempt * 400));
  }

  return { error: "Consulta não finalizada", details: last };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  // Tenta autenticar, mas permite falha se for uma chamada anônima durante o cadastro
  const auth = await getAuthenticatedUser(req, true);
  const user = ("error" in auth) ? null : (auth.appUser || null);

  const body = await req.json().catch(() => null);
  const inputPlate = normalizePlate(body?.plate ?? body?.placa ?? "");
  if (!inputPlate) {
    return json({ error: "Placa inválida" }, 400);
  }

  const anycar = await fetchAnycarData(inputPlate);
  if ("error" in anycar) {
    return json({ error: anycar.error, details: anycar.details }, 400);
  }

  const result = anycar.data as any;

  const model = [result.marca, result.modelo].filter(Boolean).join(" ");
  const year = Number(result.anoModelo ?? result.anoFabricacao) || null;

  let vehicle = null;
  // Só tenta salvar no banco se o usuário estiver autenticado
  if (user && user.id) {
    const payload = {
      driver_id: user.id,
      plate: result.placa ?? inputPlate,
      model: model || "Não informado",
      color: result.cor ?? null,
      year,
      updated_at: new Date().toISOString(),
    };

    const { data, error: upsertError } = await (auth as any).admin
      .from("vehicles")
      .upsert(payload, { onConflict: "driver_id" })
      .select("*")
      .single();

    if (!upsertError) vehicle = data;
  }

  return json({ success: true, vehicle, anycar: result });
});
