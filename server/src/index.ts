import express from "express";
import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@party/shared";
import { registerHandlers } from "./handlers.js";

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
registerHandlers(io);

app.get("/health", (_req, res) => res.json({ ok: true })); // usado pela hospedagem para checar se está de pé

// Em produção/túnel: o mesmo processo serve o front buildado e o Socket.io.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
