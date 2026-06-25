import type { BuildingObject, DemoMode, SensorData, StateSnapshot, Vector3 } from "../types";
import { staticBackend } from "./staticBackend";
import type { RealtimePayload } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const staticOnly = import.meta.env.VITE_STATIC_ONLY === "true";
let useStaticBackend =
  staticOnly ||
  window.location.protocol === "file:" ||
  (!API_BASE && window.location.hostname.endsWith("github.io"));

interface ApiResponse<T> {
  ok: boolean;
  data: T;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (useStaticBackend) return requestStatic<T>(path, init);

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.ok) throw new Error(body.message ?? `Request failed: ${path}`);
  return body.data;
}

async function requestWithFallback<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (API_BASE && !staticOnly) throw error;
    useStaticBackend = true;
    return requestStatic<T>(path, init);
  }
}

function readBody<T>(init?: RequestInit): T {
  if (!init?.body || typeof init.body !== "string") return {} as T;
  return JSON.parse(init.body) as T;
}

async function requestStatic<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();

  if (path === "/api/snapshot") return staticBackend.snapshot() as T;
  if (path === "/api/sensors" && method === "POST") return staticBackend.createSensor(readBody<Partial<SensorData>>(init)) as T;
  if (path.startsWith("/api/sensors/") && method === "PUT") return staticBackend.updateSensor(path.split("/").pop() ?? "", readBody<Partial<SensorData>>(init)) as T;
  if (path.startsWith("/api/sensors/") && method === "DELETE") return { deleted: staticBackend.deleteSensor(path.split("/").pop() ?? "") } as T;
  if (path.startsWith("/api/model/buildings/") && path.endsWith("/transform")) {
    const id = path.split("/").at(-2) ?? "";
    return staticBackend.updateBuilding(id, readBody<Partial<BuildingObject>>(init)) as T;
  }
  if (path.startsWith("/api/model/buildings/") && path.endsWith("/reset")) {
    const id = path.split("/").at(-2) ?? "";
    return staticBackend.resetBuilding(id) as T;
  }
  if (path.startsWith("/api/model/floors/") && path.endsWith("/visible")) {
    const id = path.split("/").at(-2) ?? "";
    return staticBackend.setFloorVisible(id, Boolean(readBody<{ visible: boolean }>(init).visible)) as T;
  }
  if (path === "/api/fire/start") return staticBackend.startFire() as T;
  if (path === "/api/fire/start-at-point") {
    const body = readBody<{ origin?: Vector3; floor?: number }>(init);
    return staticBackend.startFire(body.origin, body.floor ?? 3) as T;
  }
  if (path === "/api/fire/stop") return staticBackend.stopFire() as T;
  if (path === "/api/fire/exhaust") return staticBackend.setExhaust(Boolean(readBody<{ enabled: boolean }>(init).enabled)) as T;
  if (path === "/api/demo/mode") return staticBackend.setDemoMode(readBody<{ mode: DemoMode }>(init).mode) as T;
  if (path === "/api/logs" && method === "DELETE") return staticBackend.clearLogs() as T;

  throw new Error(`Static API route not implemented: ${method} ${path}`);
}

export const api = {
  isStaticMode: () => useStaticBackend,
  snapshot: () => requestWithFallback<StateSnapshot>("/api/snapshot"),
  createSensor: (sensor: Partial<SensorData>) =>
    requestWithFallback<SensorData>("/api/sensors", {
      method: "POST",
      body: JSON.stringify(sensor)
    }),
  updateSensor: (id: string, patch: Partial<SensorData>) =>
    requestWithFallback<SensorData>(`/api/sensors/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    }),
  deleteSensor: (id: string) => requestWithFallback<{ deleted: boolean }>(`/api/sensors/${id}`, { method: "DELETE" }),
  updateBuilding: (id: string, patch: Partial<BuildingObject>) =>
    requestWithFallback<BuildingObject>(`/api/model/buildings/${id}/transform`, {
      method: "PUT",
      body: JSON.stringify(patch)
    }),
  resetBuilding: (id: string) =>
    requestWithFallback<BuildingObject>(`/api/model/buildings/${id}/reset`, {
      method: "POST"
    }),
  setFloorVisible: (id: string, visible: boolean) =>
    requestWithFallback(`/api/model/floors/${id}/visible`, {
      method: "PUT",
      body: JSON.stringify({ visible })
    }),
  startFire: () => requestWithFallback("/api/fire/start", { method: "POST" }),
  startFireAtPoint: (origin: Vector3, floor = 3) =>
    requestWithFallback("/api/fire/start-at-point", {
      method: "POST",
      body: JSON.stringify({ origin, floor })
    }),
  stopFire: () => requestWithFallback("/api/fire/stop", { method: "POST" }),
  setExhaust: (enabled: boolean) =>
    requestWithFallback("/api/fire/exhaust", {
      method: "POST",
      body: JSON.stringify({ enabled })
    }),
  setDemoMode: (mode: DemoMode) =>
    requestWithFallback("/api/demo/mode", {
      method: "POST",
      body: JSON.stringify({ mode })
    }),
  clearLogs: () => requestWithFallback("/api/logs", { method: "DELETE" }),
  connectRealtime: (onPayload: (payload: RealtimePayload) => void, onStatus: (connected: boolean, staticMode: boolean) => void) => {
    if (useStaticBackend) {
      onStatus(true, true);
      return staticBackend.connect(onPayload);
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = API_BASE ? API_BASE.replace(/^http/, "ws") : `${protocol}//${window.location.host}`;
    const ws = new WebSocket(`${wsBase}/ws/realtime`);
    let staticDisconnect: (() => void) | undefined;
    let switchedToStatic = false;

    const switchToStatic = () => {
      if (switchedToStatic) return;
      switchedToStatic = true;
      useStaticBackend = true;
      staticDisconnect = staticBackend.connect(onPayload);
      onStatus(true, true);
    };

    ws.onopen = () => onStatus(true, false);
    ws.onclose = () => {
      if (!useStaticBackend && !API_BASE) {
        switchToStatic();
        return;
      }
      onStatus(false, false);
    };
    ws.onerror = () => {
      if (!API_BASE) {
        switchToStatic();
      } else {
        onStatus(false, false);
      }
    };
    ws.onmessage = (event) => onPayload(JSON.parse(event.data as string) as RealtimePayload);

    return () => {
      staticDisconnect?.();
      ws.close();
    };
  }
};
