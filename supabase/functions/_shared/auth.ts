import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
} from "https://deno.land/x/jose@v4.15.5/index.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signup-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function supabaseAdmin() {
  // Prioriza chaves/URL canônicas atuais e mantém fallback legado.
  const url = Deno.env.get("SUPABASE_URL") ??
    Deno.env.get("PROJECT_URL");
  const serviceRole = Deno.env.get("PROJECT_SERVICE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRole) {
    console.error("❌ [auth.ts] Variáveis de ambiente ausentes!");
    throw new Error("Variáveis de ambiente do Supabase não configuradas");
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    },
  });
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _firebaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function getJwks() {
  if (_jwks) return _jwks;

  const baseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  if (!baseUrl) throw new Error("SUPABASE_URL não definida");

  const jwksUri = `${baseUrl}/auth/v1/jwks`;

  _jwks = createRemoteJWKSet(new URL(jwksUri), {
    cooldownDuration: 60000,
    timeoutDuration: 5000,
  });
  return _jwks;
}

async function getFirebaseJwks() {
  if (_firebaseJwks) return _firebaseJwks;

  const jwksUri = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

  _firebaseJwks = createRemoteJWKSet(new URL(jwksUri), {
    cooldownDuration: 60000,
    timeoutDuration: 5000,
  });
  return _firebaseJwks;
}

export async function getAuthenticatedUser(req: Request, optional = false) {
  console.log("📡 [auth.ts] Verificando autenticação...");

  // Log de todos os headers para depuração
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (
      key.toLowerCase() !== "authorization" && key.toLowerCase() !== "apikey"
    ) {
      allHeaders[key] = value;
    }
  });
  console.log(
    "📋 [auth.ts] Headers (exceto auth):",
    JSON.stringify(allHeaders),
  );

  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKeyHeader = req.headers.get("apikey") ?? "";
  console.log(
    "🔑 [auth.ts] Authorization Header bruto:",
    authHeader ? `${authHeader.substring(0, 20)}...` : "AUSENTE",
  );
  console.log(
    "🔑 [auth.ts] ApiKey Header:",
    apiKeyHeader ? "PRESENTE" : "AUSENTE",
  );

  let token = authHeader.trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  // Limpeza de tokens que possam vir com prefixos acidentais de logs
  if (token.includes("Bearer ")) {
    token = token.split("Bearer ").pop()?.trim() || "";
  }

  console.log(
    "🔎 [auth.ts] Token detectado (tamanho):",
    token ? token.length : 0,
  );
  // Em alguns cenários mobile, logs podem contaminar headers.
  // No modo opcional (cadastro), tratamos isso como ausência de token.
  const looksPolluted = token.toLowerCase().includes("i/flutter") ||
    token.toLowerCase().includes("status: 401");
  if (optional && looksPolluted) {
    console.warn(
      "⚠️ [auth.ts] Token poluído detectado em modo opcional; ignorando Authorization.",
    );
    token = "";
  }
  console.log(
    "🔎 [auth.ts] Token length:",
    token ? token.length : 0,
  );

  // 🛡️ Bypass de Autenticação para testes (Permitir se tiver a apikey correta)
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceRoleLegacy = Deno.env.get("SERVICE_ROLE_KEY");
  const projectService = Deno.env.get("PROJECT_SERVICE_KEY");
  const projectAnon = Deno.env.get("PROJECT_ANON_KEY");
  console.log(
    "🧩 [auth.ts] Env flags:",
    JSON.stringify({
      hasProjectUrl: !!Deno.env.get("PROJECT_URL"),
      hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
      hasProjectAnon: !!projectAnon,
      hasProjectService: !!projectService,
      hasServiceRoleLegacy: !!serviceRoleLegacy,
      hasSupabaseAnon: !!Deno.env.get("SUPABASE_ANON_KEY"),
      hasSupabaseService: !!serviceRole,
    }),
  );
  const isServiceRole = apiKeyHeader &&
    (apiKeyHeader === serviceRole || apiKeyHeader === projectService);
  const isAnonKey = apiKeyHeader &&
    (apiKeyHeader === Deno.env.get("SUPABASE_ANON_KEY") ||
      apiKeyHeader === projectAnon);
  const tokenIsAnonKey = !!token && !!isAnonKey && token === apiKeyHeader;

  if (isServiceRole || (!token && isAnonKey)) {
    console.log("⚡ [auth.ts] Autenticação via API Key segura");
    return {
      admin: supabaseAdmin(),
      appUser: isServiceRole
        ? { id: "service_role", role: "admin" } as any
        : null,
    };
  }

  // Em chamadas públicas (optional=true), o SDK web pode enviar
  // Authorization: Bearer <anonKey>. Não é JWT e deve ser tratado como guest.
  if (optional && tokenIsAnonKey) {
    console.log(
      "ℹ️ [auth.ts] Authorization contém anonKey em modo opcional; tratando como guest.",
    );
    return { admin: supabaseAdmin() };
  }

  if (!token) {
    if (optional) {
      console.log("ℹ️ [auth.ts] Token ausente, mas modo opcional ativado.");
      return { admin: supabaseAdmin() };
    }
    return {
      error: json({ error: "Authorization header ausente ou inválido" }, 401),
    };
  }

  const admin = supabaseAdmin();

  // 1. Tentar via Supabase Auth SDK
  try {
    console.log("🔍 [auth.ts] Tentando admin.auth.getUser()...");
    const { data: { user: authUser }, error: authError } = await admin.auth
      .getUser(token);

    if (authError) {
      console.warn(
        "⚠️ [auth.ts] admin.auth.getUser() falhou:",
        authError.message,
      );
      // Se o erro for explicitamente "Invalid JWT", vamos logar os claims do token para entender
      try {
        const decoded = decodeJwt(token);
        console.log(
          "ℹ️ [auth.ts] Claims do token rejeitado:",
          JSON.stringify({
            iss: decoded.iss,
            aud: decoded.aud,
            sub: decoded.sub,
            role: (decoded as any).role,
            exp: decoded.exp,
          }),
        );
      } catch (_) {}
    } else if (authUser) {
      console.log("✅ [auth.ts] auth.getUser OK, authUser:", authUser.id);
      const { data: appUser, error: appUserError } = await admin
        .from("users")
        .select("id, role, is_active, supabase_uid")
        .eq("supabase_uid", authUser.id)
        .maybeSingle();

      if (appUserError) {
        console.error("❌ [auth.ts] Erro ao buscar perfil:", appUserError);
      }

      if (!appUser) {
        console.warn(
          "⚠️ [auth.ts] Perfil não encontrado para supabase_uid:",
          authUser.id,
        );
        if (optional) {
          return { admin, authUser, appUser: null };
        }
        return {
          error: json({ error: "Perfil do usuário não encontrado" }, 403),
        };
      }
      return { admin, authUser, appUser };
    }
  } catch (err: any) {
    console.warn("⚠️ [auth.ts] Exception em auth.getUser():", err.message);
  }

  // 1.5 Tentar via Firebase Auth (Manual)
  try {
    const decoded = decodeJwt(token);
    const firebaseProjectId = "cardapyia-service-2025"; // Vindo do config.toml
    const firebaseIssuer = `https://securetoken.google.com/${firebaseProjectId}`;

    if (decoded.iss === firebaseIssuer) {
      console.log("🔍 [auth.ts] Token Firebase detectado. Verificando...");
      const firebaseJwks = await getFirebaseJwks();
      const { payload } = await jwtVerify(token, firebaseJwks, {
        issuer: firebaseIssuer,
        audience: firebaseProjectId,
      });

      console.log("✅ [auth.ts] Token Firebase verificado. UID:", payload.sub);
      const { data: appUser, error: appUserError } = await admin
        .from("users")
        .select("id, role, is_active, supabase_uid, firebase_uid")
        .eq("firebase_uid", payload.sub)
        .maybeSingle();

      if (appUserError) {
        console.error("❌ [auth.ts] Erro ao buscar perfil Firebase:", appUserError);
      }

      if (appUser) {
        console.log("✅ [auth.ts] Usuário Firebase encontrado no BD:", appUser.id);
        return { admin, appUser };
      } else {
        console.warn("⚠️ [auth.ts] Usuário Firebase verificado mas não encontrado no BD.");
        // Se for opcional, podemos seguir, senão erro 403
        if (!optional) {
          return { error: json({ error: "Usuário Firebase não registrado" }, 403) };
        }
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [auth.ts] Falha na verificação Firebase:", err.message);
  }

  // 2. Fallback JWKS
  try {
    const baseUrl = Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("PROJECT_URL") ?? "";
    console.log("🔍 [auth.ts] SUPABASE_URL detectado:", baseUrl);

    const issuer = baseUrl.includes("localhost")
      ? baseUrl
      : `${baseUrl}/auth/v1`;

    console.log(
      "🔍 [auth.ts] Tentando fallback JWKS com issuer esperado:",
      issuer,
    );
    const jwks = await getJwks();

    let result;
    try {
      console.log("🔍 [auth.ts] Verificando token com jose.jwtVerify...");
      // Verificamos o token e o issuer explicitamente
      result = await jwtVerify(token, jwks, {
        issuer: issuer,
        audience: "authenticated",
      });
      console.log("✅ [auth.ts] JWT verificado manualmente com sucesso.");
    } catch (verifyErr: any) {
      console.error(
        "❌ [auth.ts] Erro na verificação manual do JWT:",
        verifyErr.message,
      );
      console.error(
        "❌ [auth.ts] Causa provável:",
        verifyErr.code || "Desconhecida",
      );

      try {
        const decoded = decodeJwt(token);
        let alg = "unknown";
        try {
          const tokenParts = token.split(".");
          if (tokenParts.length > 0) {
            const hdr = JSON.parse(
              new TextDecoder().decode(
                Uint8Array.from(
                  atob(tokenParts[0].replace(/-/g, "+").replace(/_/g, "/")),
                  (c) => c.charCodeAt(0),
                ),
              ),
            );
            alg = hdr?.alg ?? "unknown";
          }
        } catch (_) {
          // noop: loga alg=unknown
        }
        console.log(
          "ℹ️ [auth.ts] Dados do Token Decodificado (Payload):",
          JSON.stringify(decoded),
        );
        console.log("ℹ️ [auth.ts] Algoritmo detectado (Headers):", alg);
        console.log(
          "ℹ️ [auth.ts] Expiração:",
          new Date((decoded.exp || 0) * 1000).toISOString(),
        );
        console.log("ℹ️ [auth.ts] Agora:", new Date().toISOString());

        if (decoded.iss !== issuer) {
          console.warn(
            `⚠️ [auth.ts] Mismatch de Issuer! Token.iss: ${decoded.iss} vs Esperado: ${issuer}`,
          );
        }
      } catch (decodeErr) {
        console.error(
          "❌ [auth.ts] Falha crítica ao decodificar token:",
          decodeErr,
        );
      }
      throw verifyErr;
    }

    const { payload } = result;
    console.log("✅ [auth.ts] Payload Verificado - UUID:", payload.sub);

    const userId = payload.sub as string | undefined;
    if (!userId) {
      throw new Error("Claim 'sub' (User UUID) ausente no token JWT");
    }

    const { data: appUser, error: appUserError } = await admin
      .from("users")
      .select("id, role, is_active, supabase_uid")
      .eq("supabase_uid", userId)
      .maybeSingle();

    if (appUserError) {
      console.error(
        "❌ [auth.ts] Erro ao buscar perfil (fallback):",
        appUserError,
      );
      return {
        error: json({
          error: "Erro ao buscar perfil do usuário no banco",
          details: appUserError.message,
        }, 500),
      };
    }

    if (!appUser) {
      console.warn(
        "⚠️ [auth.ts] Perfil (users) não encontrado para Supabase UID:",
        userId,
      );
      return {
        error: json(
          { error: "Perfil do usuário não encontrado no sistema" },
          403,
        ),
      };
    }

    console.log(
      "✅ [auth.ts] Usuário autenticado via Fallback com sucesso:",
      appUser.id,
    );
    return { admin, appUser };
  } catch (err: any) {
    console.error("❌ [auth.ts] Falha total na autenticação:", err.message);
    if (optional) {
      console.warn(
        "ℹ️ [auth.ts] Falha de auth em modo opcional; seguindo com acesso anônimo.",
      );
      return { admin: supabaseAdmin() };
    }
    return {
      error: json({
        error: `Não autorizado (401): ${err.message}`,
        code: 401,
        technicalDetail: err.toString(),
      }, 401),
    };
  }
}
