import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  CompareFacesCommand,
  RekognitionClient,
} from "npm:@aws-sdk/client-rekognition@3.385.0";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

// Configurações AWS
const awsConfig = {
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
};

const rekognition = new RekognitionClient(awsConfig);

async function loadImageBytes(
  admin: any,
  source: string,
): Promise<Uint8Array> {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticar usuário
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { admin, appUser } = auth;
    const body = await req.json();
    const { newSelfiePath, newPassword } = body;

    if (!newSelfiePath) {
      console.error("❌ Erro: newSelfiePath não fornecido no body");
      return json({
        error: "Nova selfie é obrigatória para a validação biométrica.",
      }, 400);
    }

    // 2. Buscar a selfie original do usuário (do KYC de registro)
    const { data: kyc, error: kycError } = await admin
      .from("driver_biometric_validations")
      .select("documents")
      .eq("user_id", appUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError || !kyc || !kyc.documents?.selfie_path) {
      return json({
        error:
          "Biometria original não encontrada. Por favor, realize o seu cadastro biométrico primeiro.",
      }, 404);
    }

    // 3. Baixar imagens do Storage ou por URL externa
    const [originalData, newData] = await Promise.all([
      loadImageBytes(admin, kyc.documents.selfie_path),
      loadImageBytes(admin, newSelfiePath),
    ]);
    const originalBytes = originalData;
    const newBytes = newData;

    // 4. Comparar Faces no AWS Rekognition
    const compareCommand = new CompareFacesCommand({
      SourceImage: { Bytes: originalBytes },
      TargetImage: { Bytes: newBytes },
      SimilarityThreshold: 85, // Threshold alto para segurança
    });

    const compareResponse = await rekognition.send(compareCommand);
    const faceMatches = compareResponse.FaceMatches || [];

    if (faceMatches.length === 0) {
      return json({
        success: false,
        error:
          "Divergência biométrica. A selfie não corresponde ao titular da conta.",
      }, 401);
    }

    const similarity = faceMatches[0].Similarity;
    console.log(
      `✅ Biometria validada com sucesso! Similaridade: ${similarity}%`,
    );

    // 5. Atualizar Senha no Supabase Auth (Opcional, apenas se fornecida)
    if (newPassword) {
      console.log("🔐 Atualizando senha do usuário...");
      const { error: updateError } = await admin.auth.admin.updateUserById(
        appUser.supabase_uid,
        { password: newPassword },
      );

      if (updateError) {
        console.error(
          "❌ Erro ao atualizar senha no Supabase Auth:",
          updateError.message,
        );
        throw new Error("Erro ao atualizar senha. Tente novamente.");
      }
    }

    return json({
      success: true,
      message: newPassword
        ? "Senha alterada com sucesso!"
        : "Biometria validada com sucesso!",
      similarity,
    });
  } catch (error: any) {
    console.error(
      "❌ Erro no processo de troca de senha:",
      error.stack || error.message || error,
    );
    return json({
      error: String(error.message || error) +
        (error.stack ? "\n" + error.stack : ""),
    }, 500);
  }
});
