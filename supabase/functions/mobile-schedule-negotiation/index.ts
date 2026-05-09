import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const PROPOSAL_EXPIRY_HOURS = 12;
const REMINDER_WINDOW_MINUTES = 30;
const SCHEDULE_PAST_GRACE_MINUTES = 2;
const SERVICE_SELECT =
  "id,client_id,provider_id,profession,description,location_type,status,scheduled_at,schedule_round,schedule_client_rounds,schedule_provider_rounds,schedule_expires_at,schedule_proposed_by_user_id,schedule_confirmed_at,schedule_reminder_sent_at";

type ServiceRow = {
  id: string;
  client_id: number | null;
  provider_id: number | null;
  profession: string | null;
  description: string | null;
  location_type: string | null;
  status: string | null;
  scheduled_at: string | null;
  schedule_round: number | null;
  schedule_client_rounds: number | null;
  schedule_provider_rounds: number | null;
  schedule_expires_at: string | null;
  schedule_proposed_by_user_id: number | null;
  schedule_confirmed_at: string | null;
  schedule_reminder_sent_at: string | null;
};

function normalizeRole(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseScheduledAt(raw: unknown): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const message = String(candidate.message ?? "").trim();
    const details = String(candidate.details ?? "").trim();
    const hint = String(candidate.hint ?? "").trim();
    const code = String(candidate.code ?? "").trim();
    const parts = [message, details, hint, code].filter((part) =>
      part.length > 0
    );
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(candidate);
    } catch (_) {
      // Fall through to generic stringification below.
    }
  }
  return String(error);
}

function proposalExpiryIso(from = new Date()): string {
  return new Date(
    from.getTime() + PROPOSAL_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

function formatPtBr(dateIso: string | null): string {
  const date = parseScheduledAt(dateIso);
  if (!date) return "horário a definir";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Araguaina",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", " às");
}

function currentMinuteFloor(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0,
  );
}

function ensureScheduleNotInPast(date: Date) {
  const minimum = currentMinuteFloor();
  const graceFloor = new Date(
    minimum.getTime() - SCHEDULE_PAST_GRACE_MINUTES * 60 * 1000,
  );
  if (date.getTime() < graceFloor.getTime()) {
    throw new Error(
      "O agendamento não pode ser definido para um horário que já passou.",
    );
  }
}

function buildServiceLabel(service: ServiceRow): string {
  const profession = String(service.profession ?? "").trim();
  if (profession) return profession;
  const description = String(service.description ?? "").trim();
  if (description) return description;
  return "Serviço";
}

function hasExpiredProposal(service: ServiceRow, now = new Date()): boolean {
  if (normalizeRole(service.status) !== "schedule_proposed") return false;
  const expiresAt = parseScheduledAt(service.schedule_expires_at);
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

async function pushNotification(
  title: string,
  body: string,
  userId: number,
  type: string,
  data: Record<string, unknown>,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  if (!supabaseUrl || !serviceKey || !userId) return;

  const payload = {
    user_id: userId,
    title,
    body,
    data: {
      ...data,
      type,
    },
  };

  try {
    await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[mobile-schedule-negotiation] push error:", error);
  }
}

async function loadService(
  admin: any,
  serviceId: string,
): Promise<ServiceRow | null> {
  const { data, error } = await admin
    .from("service_requests")
    .select(SERVICE_SELECT)
    .eq("id", serviceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as ServiceRow;
}

async function updateService(
  admin: any,
  serviceId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("service_requests")
    .update(updates)
    .eq("id", serviceId)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data as ServiceRow | null;
}

async function releaseExpiredProposal(
  admin: any,
  service: ServiceRow,
  nowIso: string,
): Promise<ServiceRow | null> {
  if (!hasExpiredProposal(service, new Date(nowIso))) return service;

  let query = admin
    .from("service_requests")
    .update({
      provider_id: null,
      status: "open_for_schedule",
      scheduled_at: null,
      status_updated_at: nowIso,
      updated_at: nowIso,
      schedule_proposed_by_user_id: null,
      schedule_expires_at: null,
      schedule_confirmed_at: null,
      schedule_reminder_sent_at: null,
    })
    .eq("id", service.id)
    .eq("status", "schedule_proposed")
    .eq("schedule_round", service.schedule_round ?? 0)
    .select(SERVICE_SELECT);

  if (service.schedule_expires_at) {
    query = query.eq("schedule_expires_at", service.schedule_expires_at);
  } else {
    query = query.is("schedule_expires_at", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as ServiceRow | null) ?? null;
}

async function handleProviderPropose(
  admin: any,
  actor: { id: number; role: string },
  serviceId: string,
  scheduledAt: Date,
) {
  ensureScheduleNotInPast(scheduledAt);
  const now = new Date();
  const nowIso = now.toISOString();
  let service = await loadService(admin, serviceId);
  if (!service) return json({ error: "Serviço não encontrado." }, 404);

  if (hasExpiredProposal(service, now)) {
    await releaseExpiredProposal(admin, service, nowIso);
    service = await loadService(admin, serviceId);
    if (!service) return json({ error: "Serviço não encontrado." }, 404);
  }

  const currentStatus = normalizeRole(service.status);
  if (
    !["open_for_schedule", "schedule_proposed", "accepted"].includes(
      currentStatus,
    )
  ) {
    return json({ error: "Serviço não está disponível para negociação." }, 409);
  }

  if (service.provider_id != null && service.provider_id !== actor.id) {
    return json(
      { error: "Serviço já está reservado para outro prestador." },
      409,
    );
  }

  const nextRound = (service.schedule_round ?? 0) + 1;
  const nextClientRounds = service.schedule_client_rounds ?? 0;
  const nextProviderRounds = (service.schedule_provider_rounds ?? 0) + 1;
  const scheduledIso = scheduledAt.toISOString();
  const expiresAt = proposalExpiryIso();

  const updatePayload = {
    provider_id: actor.id,
    scheduled_at: scheduledIso,
    status: "schedule_proposed",
    status_updated_at: nowIso,
    updated_at: nowIso,
    schedule_proposed_by_user_id: actor.id,
    schedule_expires_at: expiresAt,
    schedule_confirmed_at: null,
    schedule_reminder_sent_at: null,
    schedule_round: nextRound,
    schedule_client_rounds: nextClientRounds,
    schedule_provider_rounds: nextProviderRounds,
  };

  let query = admin
    .from("service_requests")
    .update(updatePayload)
    .eq("id", serviceId)
    .eq("schedule_round", service.schedule_round ?? 0)
    .select(SERVICE_SELECT);

  if (service.provider_id == null) {
    query = query.is("provider_id", null).eq("status", "open_for_schedule");
  } else {
    query = query.eq("provider_id", actor.id).in("status", [
      "open_for_schedule",
      "accepted",
      "schedule_proposed",
    ]);
  }

  const { data, error: updateError } = await query;
  if (updateError) throw updateError;
  const updated = Array.isArray(data) && data.length > 0
    ? data[0] as ServiceRow
    : null;

  if (!updated) {
    return json({ error: "Não foi possível salvar a proposta." }, 409);
  }

  if (updated.client_id) {
    await pushNotification(
      "Proposta de agendamento",
      `${buildServiceLabel(updated)} sugerido para ${
        formatPtBr(scheduledIso)
      }. Responda até ${formatPtBr(expiresAt)}.`,
      updated.client_id,
      "schedule_proposal",
      {
        id: serviceId,
        service_id: serviceId,
        scheduled_at: scheduledIso,
        schedule_expires_at: expiresAt,
        proposed_by_user_id: actor.id,
        schedule_round: nextRound,
        schedule_client_rounds: nextClientRounds,
        schedule_provider_rounds: nextProviderRounds,
        location_type: updated.location_type ?? "",
      },
    );
  }

  return json({ success: true, service: updated });
}

async function handleClientCounterPropose(
  admin: any,
  actor: { id: number; role: string },
  serviceId: string,
  scheduledAt: Date,
) {
  ensureScheduleNotInPast(scheduledAt);
  const now = new Date();
  const nowIso = now.toISOString();
  const service = await loadService(admin, serviceId);
  if (!service) return json({ error: "Serviço não encontrado." }, 404);
  if (service.client_id !== actor.id) {
    return json({ error: "Cliente não autorizado para este serviço." }, 403);
  }
  if (!service.provider_id) {
    return json({
      error: "Ainda não há prestador reservado para este serviço.",
    }, 409);
  }

  const currentStatus = normalizeRole(service.status);
  if (currentStatus !== "schedule_proposed") {
    return json({ error: "Não há proposta ativa para responder." }, 409);
  }
  if (hasExpiredProposal(service, now)) {
    return json({
      error: "A proposta ativa expirou. Atualize a tela e tente novamente.",
    }, 409);
  }

  const nextRound = (service.schedule_round ?? 0) + 1;
  const nextClientRounds = (service.schedule_client_rounds ?? 0) + 1;
  const nextProviderRounds = service.schedule_provider_rounds ?? 0;
  const scheduledIso = scheduledAt.toISOString();
  const expiresAt = proposalExpiryIso();

  const { data: updated, error: updateError } = await admin
    .from("service_requests")
    .update({
      scheduled_at: scheduledIso,
      status: "schedule_proposed",
      status_updated_at: nowIso,
      updated_at: nowIso,
      schedule_proposed_by_user_id: actor.id,
      schedule_expires_at: expiresAt,
      schedule_confirmed_at: null,
      schedule_reminder_sent_at: null,
      schedule_round: nextRound,
      schedule_client_rounds: nextClientRounds,
      schedule_provider_rounds: nextProviderRounds,
    })
    .eq("id", serviceId)
    .eq("client_id", actor.id)
    .eq("provider_id", service.provider_id)
    .eq("status", "schedule_proposed")
    .eq("schedule_round", service.schedule_round ?? 0)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (updateError) throw updateError;

  if (!updated) {
    return json({ error: "Não foi possível salvar a contraproposta." }, 409);
  }

  await pushNotification(
    "Cliente sugeriu outro horário",
    `Novo horário sugerido para ${formatPtBr(scheduledIso)}. Responda até ${
      formatPtBr(expiresAt)
    }.`,
    updated.provider_id!,
    "schedule_proposal",
    {
      id: serviceId,
      service_id: serviceId,
      scheduled_at: scheduledIso,
      schedule_expires_at: expiresAt,
      proposed_by_user_id: actor.id,
      schedule_round: nextRound,
      schedule_client_rounds: nextClientRounds,
      schedule_provider_rounds: nextProviderRounds,
      location_type: updated.location_type ?? "",
    },
  );

  return json({ success: true, service: updated });
}

async function finalizeSchedule(
  admin: any,
  serviceId: string,
  actor: { id: number; role: string },
  expectedProposerId: number | null,
) {
  const service = await loadService(admin, serviceId);
  if (!service) return json({ error: "Serviço não encontrado." }, 404);

  const status = normalizeRole(service.status);
  if (status !== "schedule_proposed" || !service.scheduled_at) {
    return json({ error: "Não há proposta ativa para confirmar." }, 409);
  }
  if (hasExpiredProposal(service)) {
    return json({
      error: "A proposta ativa expirou. Atualize a tela e tente novamente.",
    }, 409);
  }

  if (
    expectedProposerId != null &&
    service.schedule_proposed_by_user_id !== expectedProposerId
  ) {
    return json({
      error:
        "A proposta ativa foi alterada. Atualize a tela e tente novamente.",
    }, 409);
  }

  if (actor.role === "client" && service.client_id !== actor.id) {
    return json({ error: "Cliente não autorizado para este serviço." }, 403);
  }
  if (actor.role === "provider" && service.provider_id !== actor.id) {
    return json({ error: "Prestador não autorizado para este serviço." }, 403);
  }

  const nowIso = new Date().toISOString();
  let query = admin
    .from("service_requests")
    .update({
      status: "scheduled",
      status_updated_at: nowIso,
      updated_at: nowIso,
      schedule_confirmed_at: nowIso,
      schedule_expires_at: null,
      schedule_reminder_sent_at: null,
    })
    .eq("id", serviceId)
    .eq("status", "schedule_proposed")
    .eq("schedule_round", service.schedule_round ?? 0)
    .select(SERVICE_SELECT);

  if (expectedProposerId != null) {
    query = query.eq("schedule_proposed_by_user_id", expectedProposerId);
  }
  if (actor.role === "client") {
    query = query.eq("client_id", actor.id);
  } else {
    query = query.eq("provider_id", actor.id);
  }

  const { data: updated, error: updateError } = await query.maybeSingle();
  if (updateError) throw updateError;

  if (!updated) {
    return json({ error: "Não foi possível confirmar o agendamento." }, 409);
  }

  const payload = {
    id: serviceId,
    service_id: serviceId,
    scheduled_at: updated.scheduled_at ?? "",
    location_type: updated.location_type ?? "",
  };
  const body = `${buildServiceLabel(updated)} confirmado para ${
    formatPtBr(updated.scheduled_at)
  }.`;

  if (updated.client_id) {
    await pushNotification(
      "Agendamento confirmado",
      body,
      updated.client_id,
      "schedule_confirmed",
      payload,
    );
  }
  if (updated.provider_id) {
    await pushNotification(
      "Agendamento confirmado",
      body,
      updated.provider_id,
      "schedule_confirmed",
      payload,
    );
  }

  return json({ success: true, service: updated });
}

async function handleExpirePending(admin: any) {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("service_requests")
    .select(SERVICE_SELECT)
    .eq("status", "schedule_proposed")
    .lte("schedule_expires_at", nowIso)
    .limit(100);

  if (error) throw error;

  const expired = (data ?? []) as ServiceRow[];
  for (const item of expired) {
    const { data: released, error: releaseError } = await admin
      .from("service_requests")
      .update({
        provider_id: null,
        status: "open_for_schedule",
        scheduled_at: null,
        status_updated_at: nowIso,
        updated_at: nowIso,
        schedule_proposed_by_user_id: null,
        schedule_expires_at: null,
        schedule_confirmed_at: null,
        schedule_reminder_sent_at: null,
      })
      .eq("id", item.id)
      .eq("status", "schedule_proposed")
      .eq("schedule_round", item.schedule_round ?? 0)
      .select(SERVICE_SELECT)
      .maybeSingle();

    if (releaseError) throw releaseError;
    if (!released) continue;

    const body = `${
      buildServiceLabel(released)
    } voltou para a vitrine porque a proposta expirou.`;
    if (released.client_id) {
      await pushNotification(
        "Proposta expirada",
        body,
        released.client_id,
        "schedule_proposal_expired",
        {
          id: released.id,
          service_id: released.id,
          location_type: released.location_type ?? "",
        },
      );
    }
    if (item.provider_id) {
      await pushNotification(
        "Proposta expirada",
        body,
        item.provider_id,
        "schedule_proposal_expired",
        {
          id: released.id,
          service_id: released.id,
          location_type: released.location_type ?? "",
        },
      );
    }
  }

  return json({ success: true, expired_count: expired.length });
}

async function handleSend30mReminders(admin: any) {
  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const { data, error } = await admin
    .from("service_requests")
    .select(SERVICE_SELECT)
    .eq("status", "scheduled")
    .is("schedule_reminder_sent_at", null)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", until.toISOString())
    .limit(100);

  if (error) throw error;

  const pending = (data ?? []) as ServiceRow[];
  let reminderCount = 0;

  for (const item of pending) {
    const reminderSentAt = new Date().toISOString();
    const { data: locked, error: reminderError } = await admin
      .from("service_requests")
      .update({
        schedule_reminder_sent_at: reminderSentAt,
        updated_at: reminderSentAt,
      })
      .eq("id", item.id)
      .eq("status", "scheduled")
      .eq("schedule_round", item.schedule_round ?? 0)
      .is("schedule_reminder_sent_at", null)
      .select(SERVICE_SELECT)
      .maybeSingle();

    if (reminderError) throw reminderError;
    if (!locked) continue;

    reminderCount++;
    const when = formatPtBr(locked.scheduled_at);
    const payload = {
      id: locked.id,
      service_id: locked.id,
      scheduled_at: locked.scheduled_at ?? "",
      minutes_before: REMINDER_WINDOW_MINUTES,
      location_type: locked.location_type ?? "",
    };
    const body = `${
      buildServiceLabel(locked)
    } começa em até ${REMINDER_WINDOW_MINUTES} minutos (${when}).`;

    if (locked.client_id) {
      await pushNotification(
        "Lembrete do serviço",
        body,
        locked.client_id,
        "schedule_30m_reminder",
        payload,
      );
    }
    if (locked.provider_id) {
      await pushNotification(
        "Lembrete do serviço",
        body,
        locked.provider_id,
        "schedule_30m_reminder",
        payload,
      );
    }
  }

  return json({ success: true, reminder_count: reminderCount });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const auth = await getAuthenticatedUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").trim();
  const serviceId = String(body?.service_id ?? body?.serviceId ?? "").trim();
  const scheduledAt = parseScheduledAt(
    body?.scheduled_at ?? body?.scheduledAt,
  );

  const isServiceRole = auth.appUser?.id === "service_role";
  const actorId = asNumber(auth.appUser?.id);
  const actorRole = normalizeRole(auth.appUser?.role);
  const actor = actorId != null ? { id: actorId, role: actorRole } : null;

  try {
    switch (action) {
      case "provider_propose":
        if (!actor || actor.role !== "provider") {
          return json(
            { error: "Somente prestadores podem propor horário." },
            403,
          );
        }
        if (!serviceId || !scheduledAt) {
          return json(
            { error: "service_id e scheduled_at são obrigatórios." },
            400,
          );
        }
        return await handleProviderPropose(
          auth.admin,
          actor,
          serviceId,
          scheduledAt,
        );

      case "client_counter_propose":
        if (!actor || actor.role !== "client") {
          return json({
            error: "Somente clientes podem sugerir outro horário.",
          }, 403);
        }
        if (!serviceId || !scheduledAt) {
          return json(
            { error: "service_id e scheduled_at são obrigatórios." },
            400,
          );
        }
        return await handleClientCounterPropose(
          auth.admin,
          actor,
          serviceId,
          scheduledAt,
        );

      case "client_accept": {
        if (!actor || actor.role !== "client") {
          return json(
            { error: "Somente clientes podem aceitar a proposta." },
            403,
          );
        }
        if (!serviceId) {
          return json({ error: "service_id é obrigatório." }, 400);
        }
        const service = await loadService(auth.admin, serviceId);
        const providerId = service?.provider_id ?? null;
        return await finalizeSchedule(auth.admin, serviceId, actor, providerId);
      }

      case "provider_accept_counter": {
        if (!actor || actor.role !== "provider") {
          return json({
            error: "Somente prestadores podem aceitar contraproposta.",
          }, 403);
        }
        if (!serviceId) {
          return json({ error: "service_id é obrigatório." }, 400);
        }
        const service = await loadService(auth.admin, serviceId);
        const clientId = service?.client_id ?? null;
        return await finalizeSchedule(auth.admin, serviceId, actor, clientId);
      }

      case "expire_pending":
        if (!isServiceRole) {
          return json({ error: "Ação reservada ao service role." }, 403);
        }
        return await handleExpirePending(auth.admin);

      case "send_30m_reminders":
        if (!isServiceRole) {
          return json({ error: "Ação reservada ao service role." }, 403);
        }
        return await handleSend30mReminders(auth.admin);

      default:
        return json({ error: "Ação inválida." }, 400);
    }
  } catch (error) {
    const message = describeError(error);
    console.error("[mobile-schedule-negotiation] failure:", error);
    return json({ error: message }, 400);
  }
});
