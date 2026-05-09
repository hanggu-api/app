import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Using npm specifier to let Deno/Supabase Edge resolve the AWS SDK module.
// Supabase Edge Runtime supports npm modules via the "npm:" specifier.
import { RekognitionClient, CompareFacesCommand } from 'npm:@aws-sdk/client-rekognition@3.515.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const REGION = Deno.env.get('REKOGNITION_REGION') ?? 'sa-east-1';
const SIMILARITY_THRESHOLD = Number(Deno.env.get('REKOGNITION_SIMILARITY')) || 90;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const rekClient = new RekognitionClient({
  region: REGION,
  credentials: {
    accessKeyId: Deno.env.get('REKOGNITION_ACCESS_KEY') ?? '',
    secretAccessKey: Deno.env.get('REKOGNITION_SECRET_KEY') ?? '',
  },
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await req.json().catch(() => ({}));
  const { serviceId, cnhImageUrl, selfieImageUrl } = payload;

  if (!serviceId || !cnhImageUrl || !selfieImageUrl) {
    return new Response(JSON.stringify({ error: 'serviceId, cnhImageUrl e selfieImageUrl são obrigatórios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const source = buildS3Object(cnhImageUrl);
  const target = buildS3Object(selfieImageUrl);
  if (!source || !target) {
    return new Response(JSON.stringify({ error: 'URLs devem apontar para o Supabase Storage público' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const command = new CompareFacesCommand({
      SourceImage: source,
      TargetImage: target,
      SimilarityThreshold: SIMILARITY_THRESHOLD,
    });
    const result = await rekClient.send(command);
    const similarity = result.FaceMatches?.[0]?.Similarity ?? 0;
    const passed = similarity >= SIMILARITY_THRESHOLD;

    await supabase
      .from('driver_biometric_validations')
      .update({
        rekognition_status: passed ? 'aprovado' : 'rejeitado',
        rekognition_similarity: similarity,
        documents: result,
      })
      .eq('service_id', serviceId);

    return new Response(
      JSON.stringify({ passed, similarity, threshold: SIMILARITY_THRESHOLD, rekognition: result }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('rekognition error', error);
    return new Response(JSON.stringify({ error: 'Erro no Rekognition', detail: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function buildS3Object(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const publicIndex = parts.indexOf('public');
    if (publicIndex === -1 || publicIndex + 1 >= parts.length) return null;
    const bucket = parts[publicIndex + 1];
    const name = parts.slice(publicIndex + 2).join('/');
    if (!bucket || !name) return null;
    return { Bucket: bucket, Name: name };
  } catch {
    return null;
  }
}
