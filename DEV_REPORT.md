# Relatório de Desenvolvimento e Mudanças

Este documento rastreia todas as alterações significativas, correções de bugs e evoluções no código do projeto.

## 2026-01-08 - Organização do Fluxo de Solicitação de Serviço

### Mudanças Iniciais
- **service_card.dart**: Adicionado destaque visual (borda colorida) para serviços com status `accepted`, `scheduled` ou `confirmed`.
- **service_request_screen.dart**:
  - Removido `_buildScheduleStep` da Etapa 1.
  - Removidas importações não utilizadas (`app_bottom_nav.dart`).
  - Removidas variáveis mock não utilizadas (`_priceUpfront`, `_mockProfessions`, `_mockServices`, `_mockTimeSlots`).
  - Ajuste na lógica para preparar navegação automática entre etapas.

### Próximos Passos
- Corrigir erros de compilação resultantes da remoção de dados mock em `service_request_screen.dart`.
- Implementar fluxo automático: Seleção de Local -> Etapa 2.
- Implementar Etapa 2: Agendamento -> Botão Confirmar -> Etapa 3.
- Verificar integração com `ApiService`.
