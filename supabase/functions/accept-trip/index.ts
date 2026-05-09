import { corsHeaders, json } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return json(
    {
      error: "not_implemented",
      message: "This function is registered but not implemented in this environment.",
      function: new URL(req.url).pathname.split('/').pop(),
      statusCode: 501,
    },
    501,
  );
});
