import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import type { StateService } from "../services/state.js";
import type { RealtimePayload } from "../types.js";

export function setupRealtimeSocket(server: Server, state: StateService) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (!request.url?.startsWith("/ws/realtime")) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit("connection", client, request);
    });
  });

  wss.on("connection", (client) => {
    client.send(JSON.stringify({ type: "snapshot", data: state.snapshot(), time: new Date().toISOString() } satisfies RealtimePayload));
  });

  state.on("broadcast", (payload: RealtimePayload) => {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(message);
    }
  });

  return wss;
}
