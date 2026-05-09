import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabaseAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ScreenRequest = {
  screen_key?: string;
  app_role?: string;
  platform?: string;
  app_version?: string;
  patch_version?: string;
  environment?: string;
  locale?: string;
  feature_set?: Record<string, boolean>;
  context?: Record<string, unknown>;
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function buildHelpScreen() {
  return {
    version: 1,
    screen: "help",
    revision: "2026-04-29-help-v1",
    ttl_seconds: 300,
    features: {
      enabled: true,
      kill_switch: false,
      flags: {
        help_screen_v1: true,
      },
    },
    layout: {
      kind: "scroll",
    },
    fallback_policy: {
      mode: "use_cache_then_native",
      allow_cache: true,
    },
    components: [
      {
        id: "help_intro",
        type: "section",
        props: {
          eyebrow: "Suporte",
          title: "Resolva ajustes sem esperar nova release",
          subtitle:
            "Os atalhos abaixo podem ser atualizados remotamente para corrigir links, CTAs e mensagens com segurança.",
          margin: [0, 0, 0, 16],
        },
      },
      {
        id: "help_chat_card",
        type: "card",
        props: {
          icon_key: "message_circle",
          title: "Conversar no chat",
          subtitle: "Fale com o suporte via mensagens.",
          action_label: "Abrir chat",
        },
        action: {
          type: "open_chat",
        },
      },
      {
        id: "help_phone_card",
        type: "card",
        props: {
          icon_key: "phone",
          title: "Ligar para suporte",
          subtitle: "Telefone: 0800-000-1010",
          action_label: "Ligar agora",
        },
        action: {
          type: "open_external_url",
          link_key: "support_phone",
        },
      },
      {
        id: "help_security_card",
        type: "card",
        props: {
          icon_key: "shield_check",
          title: "Segurança e privacidade",
          subtitle: "Dicas para viagens e serviços seguros.",
          action_label: "Ver orientações",
        },
        action: {
          type: "navigate_internal",
          route_key: "client_settings",
        },
      },
      {
        id: "help_home_button",
        type: "button",
        props: {
          label: "Voltar para Início",
          style: "secondary",
          icon_key: "home",
          padding: [0, 12, 0, 0],
        },
        action: {
          type: "navigate_internal",
          route_key: "home",
        },
      },
    ],
  };
}

function buildExploreScreen() {
  return {
    version: 1,
    screen: "home_explore",
    revision: "2026-04-29-explore-v1",
    ttl_seconds: 300,
    features: {
      enabled: true,
      kill_switch: false,
      flags: {
        explore_screen_v1: true,
      },
    },
    layout: {
      kind: "scroll",
    },
    fallback_policy: {
      mode: "use_cache_then_native",
      allow_cache: true,
    },
    components: [
      {
        id: "explore_hero",
        type: "banner",
        props: {
          eyebrow: "Descoberta guiada",
          title: "Serviços e reservas com visual remoto",
          subtitle:
            "A plataforma pode atualizar destaques, links e CTAs sem depender do ciclo lento da loja.",
          image_url:
            "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200",
          highlights: [
            "Correção rápida de links",
            "Campanhas e banners dinâmicos",
            "Kernel nativo preservado",
          ],
          primary_action: {
            label: "Pedir serviço agora",
            type: "navigate_internal",
            route_key: "service_request_mobile",
          },
          secondary_action: {
            label: "Preciso de ajuda",
            type: "navigate_internal",
            route_key: "help",
          },
          margin: [0, 0, 0, 24],
        },
      },
      {
        id: "explore_platform_section",
        type: "section",
        props: {
          eyebrow: "Fluxo da plataforma",
          title: "Como funciona a experiência híbrida",
          subtitle:
            "A composição visual pode mudar remotamente, enquanto as decisões críticas continuam no backend e no kernel nativo.",
          margin: [0, 0, 0, 24],
        },
        children: [
          {
            id: "explore_platform_highlights",
            type: "list",
            props: {
              style: "chips",
              items: [
                "Server-driven para conteúdo e CTAs",
                "Maps e pagamentos continuam nativos",
                "Fallback local em caso de falha",
              ],
            },
          },
        ],
      },
      {
        id: "explore_beauty_section",
        type: "section",
        props: {
          eyebrow: "Destaques em produção",
          title: "Serviços em evidência hoje",
          subtitle:
            "Esses cards podem mudar de ordem, texto ou CTA em minutos.",
          margin: [0, 0, 0, 24],
          background_color: "#FFFBF5",
          border_color: "#E8D9C0",
        },
        children: [
          {
            id: "explore_card_beauty",
            type: "card",
            props: {
              icon_key: "sparkles",
              title: "Salao e estetica",
              subtitle:
                "Escolha um espaco proximo, veja horarios livres e reserve com praticidade.",
              footnote:
                "Reserva com taxa Pix e restante pago no estabelecimento.",
              image_url:
                "https://images.pexels.com/photos/705255/pexels-photo-705255.jpeg?auto=compress&cs=tinysrgb&w=1200",
              action_label: "Ver opções próximas",
            },
            action: {
              type: "navigate_internal",
              route_key: "service_request_fixed",
            },
          },
          {
            id: "explore_card_barber",
            type: "card",
            props: {
              icon_key: "scissors",
              title: "Barbearia",
              subtitle:
                "Encontre uma barbearia próxima e reserve o horário ideal.",
              footnote:
                "A plataforma pode ajustar esse CTA em tempo real se algum link quebrar.",
              image_url:
                "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=1200",
              action_label: "Buscar serviços móveis",
            },
            action: {
              type: "navigate_internal",
              route_key: "service_request_mobile",
            },
          },
        ],
      },
      {
        id: "explore_security_section",
        type: "section",
        props: {
          eyebrow: "Confianca e suporte",
          title: "Sua proteção em primeiro lugar",
          subtitle:
            "Perfis verificados, chat com prestador e acompanhamento de atendimento.",
          margin: [0, 0, 0, 16],
        },
        children: [
          {
            id: "explore_security_list",
            type: "list",
            props: {
              style: "chips",
              items: [
                "Perfis verificados",
                "Chat com prestador",
                "Acompanhamento do atendimento",
              ],
            },
          },
          {
            id: "explore_help_button",
            type: "button",
            props: {
              label: "Preciso de ajuda",
              style: "primary",
              icon_key: "badge_help",
              padding: [0, 14, 0, 0],
            },
            action: {
              type: "navigate_internal",
              route_key: "help",
            },
          },
        ],
      },
    ],
  };
}

function buildDriverHomeScreen() {
  return {
    version: 1,
    screen: "driver_home",
    revision: "2026-04-29-driver-home-v1",
    ttl_seconds: 120,
    features: {
      enabled: true,
      kill_switch: false,
      flags: {
        driver_home_v1: true,
      },
    },
    layout: {
      kind: "scroll",
    },
    fallback_policy: {
      mode: "use_cache_then_native",
      allow_cache: true,
    },
    commands_used: [
      "accept_ride",
      "reject_ride",
      "open_offer",
      "open_support",
      "toggle_dispatch_availability",
      "refresh_home",
    ],
    components: [
      {
        id: "driver_home_banner",
        type: "banner",
        props: {
          eyebrow: "Operação remota",
          title: "Painel do prestador guiado pelo backend",
          subtitle:
            "Links, blocos, CTAs e comandos podem ser ajustados sem depender do ciclo da loja.",
          image_url:
            "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200",
          highlights: [
            "Correções rápidas de CTA",
            "Comandos whitelistados",
            "Fallback nativo seguro",
          ],
          primary_action: {
            label: "Atualizar painel",
            type: "command",
            command_key: "refresh_home",
            arguments: {
              revision: "2026-04-29-driver-home-v1",
            },
          },
          secondary_action: {
            label: "Suporte",
            type: "command",
            command_key: "open_support",
            arguments: {
              revision: "2026-04-29-driver-home-v1",
            },
          },
          margin: [0, 0, 0, 20],
        },
      },
      {
        id: "driver_home_availability",
        type: "status_block",
        props: {
          title: "Disponibilidade operacional",
          value: "Modo despacho remoto",
          subtitle:
            "Se o backend identificar instabilidade, você pode desligar a operação por comando remoto sem nova release.",
          status: "online",
          action_label: "Ficar online",
          margin: [0, 0, 0, 16],
        },
        action: {
          type: "command",
          command_key: "toggle_dispatch_availability",
          arguments: {
            online: true,
            revision: "2026-04-29-driver-home-v1",
          },
        },
      },
      {
        id: "driver_home_offer_card",
        type: "status_block",
        props: {
          title: "Nova corrida",
          value: "R$ 25,00",
          subtitle:
            "Exemplo de bloco remoto com CTA seguro. O backend escolhe o comando; o app executa apenas se ele estiver na whitelist.",
          status: "aguardando resposta",
          action_label: "Aceitar oferta",
          margin: [0, 0, 0, 16],
        },
        action: {
          type: "command",
          command_key: "open_offer",
          arguments: {
            service_id: "remote_demo_offer",
            revision: "2026-04-29-driver-home-v1",
          },
        },
      },
      {
        id: "driver_home_links_section",
        type: "section",
        props: {
          eyebrow: "Acessos remotos",
          title: "Atalhos operacionais",
          subtitle:
            "Os links continuam controlados por allowlist local para manter compliance com a loja.",
          margin: [0, 0, 0, 16],
        },
        children: [
          {
            id: "driver_home_support_email",
            type: "card",
            props: {
              icon_key: "mail",
              title: "Falar com o suporte por e-mail",
              subtitle: "Canal alternativo para suporte operacional.",
              action_label: "Enviar e-mail",
            },
            action: {
              type: "open_external_url",
              link_key: "support_email",
            },
          },
          {
            id: "driver_home_provider_home",
            type: "card",
            props: {
              icon_key: "home",
              title: "Abrir home nativa",
              subtitle:
                "Atalho seguro para retornar ao fluxo local se necessário.",
              action_label: "Abrir home",
            },
            action: {
              type: "navigate_internal",
              route_key: "provider_home",
            },
          },
        ],
      },
      {
        id: "driver_home_feedback_form",
        type: "form",
        props: {
          title: "Feedback rápido",
          submit_label: "Enviar feedback",
          margin: [0, 0, 0, 16],
        },
        action: {
          type: "command",
          command_key: "show_command_feedback",
          message: "Feedback capturado no app. Integração final fica no próximo passo do backend.",
          arguments: {
            revision: "2026-04-29-driver-home-v1",
          },
        },
        children: [
          {
            id: "driver_feedback_group",
            type: "field_group",
            props: {
              title: "O que precisa ser ajustado agora?",
            },
            children: [
              {
                id: "driver_feedback_text",
                type: "input",
                props: {
                  field_key: "feedback_message",
                  label: "Mensagem",
                  hint: "Ex: link do suporte não abriu",
                  required: true,
                  multiline: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

async function loadPublishedScreen(params: {
  screenKey: string;
  role: string;
  platform: string;
}): Promise<Record<string, unknown> | null> {
  const admin = supabaseAdmin();

  const { data: publication } = await admin
    .from("remote_screen_publications")
    .select("screen_key, revision")
    .eq("screen_key", params.screenKey)
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!publication) return null;

  const revision = Number(publication.revision ?? 0);
  if (!Number.isFinite(revision) || revision <= 0) return null;

  const { data: variant } = await admin
    .from("remote_screen_variants")
    .select(
      "screen_key, revision, schema_version, layout_json, meta_json, commands_used, fallback_policy, status_scope, role_scope, platform_scope",
    )
    .eq("screen_key", params.screenKey)
    .eq("revision", revision)
    .eq("is_active", true)
    .or(`role_scope.eq.all,role_scope.eq.${params.role}`)
    .or(`platform_scope.eq.all,platform_scope.eq.${params.platform}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!variant) return null;

  const layout = (variant.layout_json ?? {}) as Record<string, unknown>;
  const meta = (variant.meta_json ?? {}) as Record<string, unknown>;
  const components = Array.isArray(layout.components) ? layout.components : [];
  const features = (meta.features ?? {
    enabled: true,
    kill_switch: false,
    flags: {},
  }) as Record<string, unknown>;
  const fallbackPolicy = (variant.fallback_policy ?? {
    mode: "use_cache_then_native",
    allow_cache: true,
  }) as Record<string, unknown>;

  return {
    version: Number(variant.schema_version ?? 1),
    screen: params.screenKey,
    revision: String(variant.revision),
    ttl_seconds: Number(meta.ttl_seconds ?? 180),
    features,
    layout: (meta.layout ?? { kind: "scroll" }) as Record<string, unknown>,
    fallback_policy: fallbackPolicy,
    commands_used: Array.isArray(variant.commands_used)
      ? variant.commands_used
      : [],
    meta,
    components,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "method_not_allowed" },
      { status: 405 },
    );
  }

  let payload: ScreenRequest;
  try {
    payload = await req.json();
  } catch (_) {
    return jsonResponse(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const screenKey = (payload.screen_key ?? "").trim();
  const role = (payload.app_role ?? "guest").trim() || "guest";
  const platform = (payload.platform ?? "unknown").trim() || "unknown";
  const featureSet = payload.feature_set ?? {};

  if (!featureSet.remote_ui) {
    return jsonResponse({
      success: true,
      screen: {
        version: 1,
        screen: screenKey,
        revision: "disabled",
        ttl_seconds: 60,
        features: { enabled: false, kill_switch: false, flags: {} },
        layout: { kind: "scroll" },
        fallback_policy: {
          mode: "use_native",
          allow_cache: false,
        },
        components: [],
      },
    });
  }

  const publishedScreen = await loadPublishedScreen({
    screenKey,
    role,
    platform,
  });
  if (publishedScreen) {
    return jsonResponse({
      success: true,
      screen: publishedScreen,
      source: "database",
    });
  }

  switch (screenKey) {
    case "help":
      return jsonResponse({
        success: true,
        screen: buildHelpScreen(),
      });
    case "home_explore":
      return jsonResponse({
        success: true,
        screen: buildExploreScreen(),
      });
    case "driver_home":
      return jsonResponse({
        success: true,
        screen: buildDriverHomeScreen(),
      });
    default:
      return jsonResponse(
        { success: false, error: "screen_not_found" },
        { status: 404 },
      );
  }
});
