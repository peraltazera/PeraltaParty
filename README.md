# Party Game

Party game de minigames para jogar com os amigos pelo navegador.
Monorepo: `shared` (contrato de eventos e regras comuns), `server` (Node + Socket.io) e `client` (React + Vite).

## Rodar no seu computador
```bash
npm install
npm run dev        # servidor em :3001, site em http://localhost:5173
```

## Testar com amigos sem hospedar (túnel temporário)
```bash
npm run build
npm start          # site + Socket.io em http://localhost:3001
cloudflared tunnel --url http://localhost:3001   # em outro terminal; mande o link gerado
```

## Colocar online de graça (Render)

1. **Suba o projeto para o GitHub** (precisa do Git instalado: `winget install --id Git.Git`).
   Crie um repositório vazio em github.com (ex.: `party-game`) e, na pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Party Game"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/party-game.git
   git push -u origin main
   ```
2. **Crie o serviço no Render** (render.com, pode entrar com a conta do GitHub):
   *New > Web Service*, escolha o repositório e preencha:
   - Language: **Node**
   - Build Command: `npm install --include=dev && npm run build`
   - Start Command: `npm start`
   - Instance Type: **Free**
   - (Advanced) Health Check Path: `/health`
   - (Advanced) Environment Variable: `NODE_VERSION` = `22`
   (O arquivo `render.yaml` já tem tudo isso, caso prefira *New > Blueprint*.)
3. Quando o deploy terminar, o Render mostra o link do site (algo como `https://party-game-xxxx.onrender.com`). É esse link que você manda para os amigos.

**Como o plano gratuito funciona:** o serviço "dorme" depois de 15 minutos sem ninguém usar e leva cerca de 1 minuto para acordar no próximo acesso (o site mostra "Conectando ao servidor…"). Enquanto há jogadores conectados ele fica acordado. O Render pode reiniciar o serviço a qualquer momento, o que encerra as salas em andamento.
Cada `git push` faz um novo deploy automático, então evite publicar no meio de uma partida.

## Em um servidor próprio (Docker)
```bash
docker build -t party-game .
docker run -p 3001:3001 party-game
```

## Adicionar um minigame novo
- Servidor: um módulo em `server/src/minigames/` (regras, validação, opções de configuração) e o registro em `index.ts`.
- Cliente: um componente em `client/src/minigames/`, o registro em `index.ts` e uma ilustração em `art.ts`.
