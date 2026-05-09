#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./supabase/scripts/mp_cutover_delete_legacy_functions.sh mroesvsmylnaxelrhqtl dry-run
#   ./supabase/scripts/mp_cutover_delete_legacy_functions.sh mroesvsmylnaxelrhqtl apply

PROJECT_REF="${1:-}"
MODE="${2:-dry-run}"

if [[ -z "${PROJECT_REF}" ]]; then
  echo "Uso: $0 <project-ref> [dry-run|apply]"
  exit 1
fi

if [[ "${MODE}" != "dry-run" && "${MODE}" != "apply" ]]; then
  echo "Modo inválido: ${MODE}. Use dry-run ou apply."
  exit 1
fi

LEGACY_FUNCTIONS=(
  "asaas-create-customer"
  "asaas-create-driver-account"
  "asaas-create-charge"
  "asaas-get-pix-qrcode"
  "asaas-webhook"
  "asaas-tokenize-card"
  "asaas-process-payment"
  "asaas-customer-manager"
  "asaas-driver-balance"
  "asaas-driver-statement"
  "asaas-request-payout"
  "confirm-cash-payment"
  "uber-get-pix-data"
  "stripe-payments"
  "stripe-webhook"
  "stripe-connect-onboarding"
  "stripe-onboarding-handler"
  "stripe-setup-intent"
  "stripe-customer-sync"
  "stripe-list-cards"
  "stripe-payout-handler"
  "pagarme-create-or-update-recipient"
  "pagarme-tokenize-card"
  "pagarme-create-charge"
  "pagarme-create-or-update-customer"
  "pagarme-auth-diagnostic"
)

echo "Projeto: ${PROJECT_REF}"
echo "Modo: ${MODE}"
echo "Total funções legadas listadas: ${#LEGACY_FUNCTIONS[@]}"
echo

for fn in "${LEGACY_FUNCTIONS[@]}"; do
  if [[ "${MODE}" == "dry-run" ]]; then
    echo "[dry-run] supabase functions delete ${fn} --project-ref ${PROJECT_REF}"
  else
    echo "[apply] removendo ${fn}..."
    supabase functions delete "${fn}" --project-ref "${PROJECT_REF}" --yes || true
  fi
done

echo
echo "Concluído."
