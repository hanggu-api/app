import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { json } from "../_shared/auth.ts";

serve(async () => {
  return json({ 
    error: "SIMULATION_DISABLED", 
    message: "Simulação de pagamento desativada em ambiente de PRODUÇÃO." 
  }, 403);
});
