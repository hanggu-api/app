# Guia de Deploy para Servidor Linux (VPS/VPN)

Este guia explica como colocar o backend do Conserta em produção em um servidor Linux (Ubuntu/Debian) usando PM2 e Nginx.

## 1. Atualização dos Arquivos (IMPORTANTE)

Para corrigir os erros de "trust proxy" e "serviceAccountKey", você **PRECISA** enviar os arquivos atualizados para o servidor.

Copie os seguintes arquivos/pastas da sua máquina local para a pasta do projeto no servidor (ex: `/var/www/cardapyia`):

1.  **Pasta `dist/` COMPLETA** (Delete a antiga no servidor e envie a nova que acabamos de compilar).
    *   *Isso corrige o erro `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.*
2.  **Arquivo `serviceAccountKey.json`** (Está na raiz do backend).
    *   *Isso corrige o erro `Arquivo serviceAccountKey.json não encontrado`.*
3.  `package.json` e `package-lock.json` (Caso tenha mudado dependências).
4.  `ecosystem.config.js` (Se houver alterações).

## 2. Reiniciar o Servidor

Após enviar os arquivos, acesse o servidor via SSH e execute:

```bash
pm2 restart conserta-api
```

Acesse seu servidor via SSH e instale as dependências básicas:

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (Versão 18 ou 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (Gerenciador de Processos)
sudo npm install -g pm2
```

## 3. Instalação do Projeto

No diretório onde você enviou os arquivos (ex: `/var/www/conserta-backend`):

```bash
# Instalar apenas dependências de produção
npm install --production
```

## 4. Configuração do Banco de Dados

Certifique-se de que o arquivo `.env` está configurado corretamente com os dados do seu banco MySQL.

```env
DB_HOST=seu_host_mysql
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco
PORT=4011
# ... outras variáveis
```

## 5. Iniciar o Backend

Use o PM2 para iniciar e manter o backend rodando:

```bash
# Iniciar usando o arquivo de configuração
pm2 start ecosystem.config.js

# Salvar a lista de processos para iniciar no boot
pm2 save
pm2 startup
```

## 6. Configurar Nginx (Proxy Reverso)

Para acessar o backend via domínio (ex: `api.seudominio.com`) e HTTPS, instale o Nginx:

```bash
sudo apt install nginx -y
```

Crie um arquivo de configuração: `sudo nano /etc/nginx/sites-available/conserta-api`

```nginx
server {
    listen 80;
    server_name api.seudominio.com; # Substitua pelo seu domínio ou IP

    location / {
        proxy_pass http://localhost:4011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e reinicie o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/conserta-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. Comandos Úteis

- Ver logs: `pm2 logs conserta-api`
- Reiniciar: `pm2 restart conserta-api`
- Parar: `pm2 stop conserta-api`
