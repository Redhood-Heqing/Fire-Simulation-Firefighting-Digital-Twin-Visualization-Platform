import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createApiRouter } from "./routes/api.js";
import { StateService } from "./services/state.js";
import { setupRealtimeSocket } from "./websocket/realtime.js";

const port = Number(process.env.PORT ?? 3001);
const app = express();
const state = new StateService();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", createApiRouter(state));

const webDist = resolve(process.cwd(), "../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api") || request.path.startsWith("/ws")) {
      next();
      return;
    }
    response.sendFile(resolve(webDist, "index.html"));
  });
}

const server = createServer(app);
setupRealtimeSocket(server, state);

server.listen(port, () => {
  state.start();
  console.log(`Smart Building Fire Twin API listening on http://localhost:${port}`);
  console.log(`Realtime stream available at ws://localhost:${port}/ws/realtime`);
});

process.on("SIGINT", () => {
  state.stop();
  server.close(() => process.exit(0));
});
