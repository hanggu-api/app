import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";
import {
  CompareFacesCommand,
  RekognitionClient,
} from "npm:@aws-sdk/client-rekognition@3.385.0";

const awsConfig = {
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
};

const rekognition = new RekognitionClient(awsConfig);

async function loadImageBytes(admin: any, source: string): Promise<Uint8Array> {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("Caminho/URL da imagem ausente");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const response = await fetch(trimmed);
    if (!response.ok) {
      throw new Error(
        `Falha ao baixar imagem externa (${response.status}): ${trimmed}`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const normalized = trimmed.startsWith("id-verification/")
    ? trimmed.replace("id-verification/", "")
    : trimmed;
  const { data, error } = await admin.storage.from("id-verification").download(
    normalized,
  );
  if (error || !data) {
    throw new Error(
      `Falha ao baixar imagem do Storage: ${error?.message ?? normalized}`,
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

Deno.serve(async (req) => {
  console.log(`🚀 [verify-card-face] Request recebido: ${req.method}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      console.error("❌ Erro de autenticação:", auth.error);
      return auth.error;
    }

    const { admin, appUser } = auth;
    const body = await req.json();
    const { selfiePath } = body;

    console.log(`👤 Usuário: ${appUser.id}, Selfie: ${selfiePath}`);

    if (!selfiePath) {
      return json({ error: "selfiePath é obrigatório" }, 400);
    }

    // Recuperar imagem do banco via user_metadata do Auth
    console.log(`🔍 Buscando metadados para uid: ${appUser.supabase_uid}`);
    const { data: authUser, error: authError } = await admin.auth.admin
      .getUserById(appUser.supabase_uid);
    if (authError || !authUser) {
      console.error("❌ Erro ao buscar perfil no Auth:", authError);
      return json({ error: "Falha ao consultar perfil de autenticação" }, 500);
    }

    const registeredFaceUrl = authUser.user.user_metadata?.face_image_url;

    if (!registeredFaceUrl) {
      console.log("📝 Primeira biometria do usuário! Registrando rosto...");
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(
        appUser.supabase_uid,
        {
          user_metadata: {
            ...authUser.user.user_metadata,
            face_image_url: selfiePath,
          },
        },
      );

      if (updateAuthError) {
        console.error(
          "❌ Erro ao salvar rosto nos metadados Auth:",
          updateAuthError,
        );
        return json({ error: "Falha ao registrar a biometria inicial." }, 500);
      }

      await admin.from("users").update({ face_image_url: selfiePath }).eq(
        "id",
        appUser.id,
      );

      return json({
        success: true,
        match: true,
        isFirstTime: true,
        message: "Primeiro registro facial concluído com sucesso.",
      });
    }

    // Segunda vez em diante: Verificar rosto existente contra o novo
    console.log(
      `🔍 Verificando identidade. Registrada: ${registeredFaceUrl} vs Nova: ${selfiePath}`,
    );

    console.log(`📦 Fazendo download das imagens/URLs para validação...`);
    const [registeredData, newData] = await Promise.all([
      loadImageBytes(admin, registeredFaceUrl),
      loadImageBytes(admin, selfiePath),
    ]);

    console.log(`🖼️ Imagens carregadas. Convertendo para bytes...`);
    const registeredBytes = registeredData;
    const newBytes = newData;

    console.log(`🤖 Chamando AWS Rekognition CompareFaces...`);
    const compareCommand = new CompareFacesCommand({
      SourceImage: { Bytes: registeredBytes },
      TargetImage: { Bytes: newBytes },
      SimilarityThreshold: 85,
    });

    const compareResponse = await rekognition.send(compareCommand);
    const faceMatches = compareResponse.FaceMatches || [];

    if (faceMatches.length === 0) {
      console.log("⚠️ Divergência biométrica!");
      return json({
        success: false,
        match: false,
        error:
          "Divergência biométrica. A foto não confere com o titular da conta.",
      }, 200);
    }

    const similarity = faceMatches[0].Similarity;
    console.log(`✅ Identidade confirmada! Similaridade: ${similarity}%`);

    return json({
      success: true,
      match: true,
      isFirstTime: false,
      similarity,
      message: "Identidade validada com sucesso.",
    });
  } catch (error: any) {
    console.error("❌ Erro fatal verify-card-face:", error);
    return json({
      error: "Erro interno no servidor de validação biométrica",
      details: error.message || String(error),
    }, 500);
  }
});
