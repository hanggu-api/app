# Backend Worker (Hono + Cloudflare Workers)

Este projeto foi criado seguindo o guia para migração para Cloudflare Workers.

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Para fazer deploy:
   ```bash
   npm run deploy
   ```

## Estrutura

- `src/index.ts`: Ponto de entrada usando framework Hono.
- `wrangler.toml`: Configuração do Cloudflare Workers com compatibilidade Node.js.

## Notas sobre Migração

O backend original (Express) possui dependências como `sharp` (processamento de imagem nativo) e `socket.io` (WebSockets com estado) que não são diretamente compatíveis com o runtime padrão do Workers. Por isso, este projeto foi criado separadamente.
