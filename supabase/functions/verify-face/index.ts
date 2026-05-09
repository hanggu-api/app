import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  CompareFacesCommand,
  RekognitionClient,
} from "npm:@aws-sdk/client-rekognition@3.385.0";
import {
  AnalyzeIDCommand,
  TextractClient,
} from "npm:@aws-sdk/client-textract@3.385.0";
import { corsHeaders, json, supabaseAdmin } from "../_shared/auth.ts";

// Configurações AWS
const awsConfig = {
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
};

const rekognition = new RekognitionClient(awsConfig);
const textract = new TextractClient(awsConfig);

async function loadImageBytes(
  supabase: ReturnType<typeof supabaseAdmin>,
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
  const { data, error } = await supabase.storage.from("id-verification")
    .download(normalized);
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

  console.log("🚀 Iniciando processamento verify-face (TEXTRACT UPGRADE)...");

  try {
    // Fluxo de cadastro: execução sempre anônima (sem JWT).
    // Usa service role apenas para acessar bucket privado com segurança no backend.
    const supabase = supabaseAdmin();
    console.log("✅ verify-face em modo anônimo (cadastro, sem JWT).");

    const body = await req.json();
    const { cnhPath: rawCnhPath, selfiePath: rawSelfiePath } = body;

    if (!rawCnhPath || !rawSelfiePath) {
      return json({ error: "cnhPath e selfiePath são obrigatórios" }, 400);
    }

    const [cnhBytes, selfieBytes] = await Promise.all([
      loadImageBytes(supabase, rawCnhPath),
      loadImageBytes(supabase, rawSelfiePath),
    ]);

    // 1. COMPARACAO FACIAL (Rekognition)
    // Aumentado para 85 conforme sugestão técnica para maior segurança
    const compareCommand = new CompareFacesCommand({
      SourceImage: { Bytes: cnhBytes },
      TargetImage: { Bytes: selfieBytes },
      SimilarityThreshold: 85,
    });

    const compareResponse = await rekognition.send(compareCommand);
    const faceMatches = compareResponse.FaceMatches || [];
    const match = faceMatches.length > 0;
    const similarity = match ? faceMatches[0].Similarity : 0;

    // 2. EXTRAÇÃO DE IDENTIDADE (AWS Textract AnalyzeID)
    // Muito mais preciso que DetectText para documentos
    let extractedData: any = null;
    try {
      console.log("📝 Chamando AWS Textract (AnalyzeID)...");
      const analyzeIdCommand = new AnalyzeIDCommand({
        DocumentPages: [
          { Bytes: cnhBytes },
        ],
      });
      const textractResponse = await textract.send(analyzeIdCommand);

      // Mapear campos do Textract
      extractedData = parseTextractResult(textractResponse);
      console.log("✅ Textract Concluído.");
    } catch (ocrError: any) {
      console.error("⚠️ Falha no Textract:", ocrError.message);
    }

    return json({
      success: true,
      match,
      similarity,
      confidence: similarity > 90 ? "high" : "medium",
      extractedData,
      details: { compare: compareResponse },
    });
  } catch (error: any) {
    console.error("❌ CRASH no verify-face:", error.message);
    return json({ error: error.message }, 500);
  }
});

/**
 * Converte a resposta complexa do Textract AnalyzeID em um objeto simples
 */
function parseTextractResult(response: any) {
  const data: any = {};
  const identityDocuments = response.IdentityDocuments || [];

  if (identityDocuments.length === 0) return null;

  const fields = identityDocuments[0].IdentityDocumentFields || [];

  fields.forEach((field: any) => {
    const type = field.Type?.Text;
    const value = field.ValueDetection?.Text;

    if (!type || !value) return;

    switch (type) {
      case "FIRST_NAME":
        data.firstName = value;
        break;
      case "LAST_NAME":
        data.lastName = value;
        break;
      case "ID_NUMBER": // Geralmente o CPF ou RG dependendo da leitura
        data.cpf = value.replace(/\D/g, "");
        break;
      case "DATE_OF_BIRTH":
        data.dob = value;
        break;
      case "EXPIRATION_DATE":
        data.expirationDate = value;
        break;
      case "CLASS":
        data.licenseCategory = value;
        break;
    }
  });

  // Combina nomes se separado
  if (data.firstName || data.lastName) {
    data.fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  }

  return data;
}
