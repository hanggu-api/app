-- Allow Asaas/Pagar.me cards without Stripe method id
ALTER TABLE public.user_payment_methods
  ALTER COLUMN stripe_payment_method_id DROP NOT NULL;
