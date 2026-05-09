import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function getCloudinaryConfig() {
  const cloudinaryUrl = Deno.env.get("CLOUDINARY_URL")?.trim() ?? "";
  const explicitCloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")?.trim() ?? "";
  const explicitApiKey = Deno.env.get("CLOUDINARY_API_KEY")?.trim() ?? "";
  const explicitApiSecret = Deno.env.get("CLOUDINARY_API_SECRET")?.trim() ?? "";

  if (explicitCloudName && explicitApiKey && explicitApiSecret) {
    return {
      cloudName: explicitCloudName,
      apiKey: explicitApiKey,
      apiSecret: explicitApiSecret,
    };
  }

  if (!cloudinaryUrl.startsWith("cloudinary://")) {
    throw new Error(
      "CLOUDINARY_URL não configurada. Defina CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
    );
  }

  const parsed = new URL(cloudinaryUrl);
  const cloudName = parsed.hostname.trim();
  const apiKey = decodeURIComponent(parsed.username.trim());
  const apiSecret = decodeURIComponent(parsed.password.trim());

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_URL inválida para assinatura de upload.");
  }

  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = await getAuthenticatedUser(req, true);
  if ("error" in auth) return auth.error;

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const body = await req.json().catch(() => ({}));
    const resourceType = `${body?.resourceType ?? "image"}`.trim() || "image";
    const folder = `${body?.folder ?? "service_media/general"}`.trim();
    const publicId = `${body?.publicId ?? Date.now().toString()}`.trim();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paramsToSign =
      `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1Hex(paramsToSign);

    return json({
      success: true,
      cloud_name: cloudName,
      api_key: apiKey,
      timestamp,
      signature,
      folder,
      public_id: publicId,
      resource_type: resourceType,
    });
  } catch (error: any) {
    console.error("❌ [cloudinary-sign-upload] erro:", error?.message ?? error);
    return json(
      {
        error: error?.message ?? "Falha ao assinar upload do Cloudinary",
      },
      500,
    );
  }
});
