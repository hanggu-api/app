import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;

    const body = await req.json().catch(() => ({}));
    const role = clean(body?.role || "passenger").toLowerCase();

    const userId = Number(appUser?.id ?? NaN);
    if (!Number.isFinite(userId)) {
      return json(
        {
          success: false,
          error: "Usuário inválido",
          step: "authenticate",
          reason_code: "INVALID_USER",
        },
        401,
      );
    }

    const clientId = clean(Deno.env.get("MP_CLIENT_ID"));
    if (!clientId) {
      return json(
        {
          success: false,
          error: "MP_CLIENT_ID não configurado",
          step: "validate_env",
          reason_code: "MISSING_MP_CLIENT_ID",
        },
        500,
      );
    }

    const targetTable = role === "driver"
      ? "driver_mercadopago_accounts"
      : "passenger_mercadopago_accounts";

    const mpAccount = await admin
      .from(targetTable)
      .select("id, mp_user_id, access_token, refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mpAccount.data) {
      return json({
        success: true,
        already_disconnected: true,
        step: "load_account",
      });
    }

    const mpUserId = clean(mpAccount.data.mp_user_id);
    const accessToken = clean(mpAccount.data.access_token);

    let revokeStatus: number | null = null;
    let revokeBody: unknown = null;

    if (mpUserId && accessToken) {
      // Revoga a autorização da aplicação no ecossistema Mercado Livre/Mercado Pago.
      // Isso invalida access_token/refresh_token e obriga novo consentimento na próxima conexão.
      const revokeUrl =
        `https://api.mercadolibre.com/users/${encodeURIComponent(mpUserId)}/applications/${encodeURIComponent(clientId)}`;
      const revokeResp = await fetch(revokeUrl, {
        method: "DELETE",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      revokeStatus = revokeResp.status;
      revokeBody = await revokeResp.json().catch(() => ({}));

      // Mesmo se o revoke falhar (token já inválido), seguimos removendo do banco para "desconectar" no app.
      console.log(
        "[MP-DISCONNECT] revoke",
        JSON.stringify({ userId, role, revokeStatus }),
      );
    }

    const { error: dbError } = await admin
      .from(targetTable)
      .delete()
      .eq("user_id", userId);

    if (dbError) {
      return json(
        {
          success: false,
          error: "Falha ao remover conexão no banco",
          step: "delete_db",
          reason_code: "DB_DELETE_FAILED",
          details: dbError,
          revoke_status: revokeStatus,
          revoke_details: revokeBody,
        },
        500,
      );
    }

    return json({
      success: true,
      revoked: true,
      revoke_status: revokeStatus,
      revoke_details: revokeBody,
      step: "done",
    });
  } catch (error: any) {
    return json(
      {
        success: false,
        error: error?.message ?? "Falha ao desconectar Mercado Pago",
        step: "internal_error",
        reason_code: "UNEXPECTED_EXCEPTION",
      },
      500,
    );
  }
});

