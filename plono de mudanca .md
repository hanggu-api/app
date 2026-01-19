# Plano de Mudança - Refinamento de Busca e Filtro de Raio

## 📝 Resumo das Alterações

Este documento registra as melhorias implementadas para otimizar a experiência de busca de endereços e garantir que os resultados sejam relevantes para a localização atual do usuário.

---

## 1. Backend (Cloudflare Worker)

### Filtro de Distância (Raio de 50km)
- **Cálculo Haversine**: Implementada a fórmula de Haversine em `worker/index.ts` para calcular a distância real entre as coordenadas do usuário e os resultados da busca.
- **Filtro Estrito**: Adicionado um filtro que remove qualquer resultado que esteja a mais de **50km** da posição enviada pelo aplicativo.
- **Logs de Auditoria**: Adicionados logs (`console.log`) que mostram o termo pesquisado, a proximidade capturada e quais locais foram filtrados por estarem longe.

### Reestruturação da Resposta (Estilo Google)
- **Campos Estruturados**: A resposta foi alterada de uma string única para uma estrutura de objeto contendo:
  - `main_text`: Nome principal do local (ex: "Estádio Beira-Rio").
  - `secondary_text`: Endereço complementar (ex: "Porto Alegre - RS").
  - `distance_km`: Distância calculada em quilômetros.

---

## 2. Frontend (Mobile App - Flutter)

### Redesign da UI de Resultados
- **Estilo Google Maps**: Atualizada a `HomeScreen.dart` para utilizar um layout de Título (em negrito) e Subtítulo (cinza claro), facilitando a leitura rápida dos endereços.
- **Identidade Visual**: Ajustados espaçamentos, ícones e cores para um visual mais "premium" e limpo.

### Otimização de Performance
- **Debounce Ajustado**: Aumentado o tempo de espera da digitação para **600ms**, reduzindo chamadas desnecessárias à API e economizando recursos.
- **Segurança de Tipos**: Melhorado o tratamento de dados no cache do autocomplete para evitar erros de cast em tempo de execução.

---

## 3. Verificação Técnica
- [x] Teste via Linha de Comando (`curl`) com coordenadas reais.
- [x] Verificação de logs no Cloudflare (`wrangler tail`).
- [x] Validação da estrutura JSON no endpoint `/api/location/search`.

---

## ⚠️ Próximos Passos (Depuração Atual)
- **Validação de GPS**: Investigar se o aplicativo está capturando as coordenadas corretas antes de enviá-las para a API.
- **Logs de GPS**: Adicionar prints no terminal do Flutter para ver o que o app está enviando como `lat/lon`.
