import { Router } from "express";
import type { Request, Response } from "express";
import type { DemoMode, Vector3 } from "../types.js";
import { StateService } from "../services/state.js";

export function createApiRouter(state: StateService) {
  const router = Router();

  const ok = (response: Response, data: unknown) => response.json({ ok: true, data });

  router.get("/health", (_request, response) => ok(response, { status: "ok", time: new Date().toISOString() }));
  router.get("/snapshot", (_request, response) => ok(response, state.snapshot()));

  router.get("/sensors", (_request, response) => ok(response, state.sensors));
  router.get("/sensors/realtime", (_request, response) => ok(response, state.sensors));
  router.get("/sensors/history", (_request, response) => ok(response, state.trends));
  router.get("/sensors/:id", (request, response) => {
    const sensor = state.sensors.find((item) => item.id === request.params.id);
    if (!sensor) return response.status(404).json({ ok: false, message: "Sensor not found" });
    return ok(response, sensor);
  });
  router.post("/sensors", (request, response) => ok(response, state.createSensor(request.body)));
  router.put("/sensors/:id", (request, response) => {
    const sensor = state.updateSensor(request.params.id, request.body);
    if (!sensor) return response.status(404).json({ ok: false, message: "Sensor not found" });
    return ok(response, sensor);
  });
  router.delete("/sensors/:id", (request, response) => ok(response, { deleted: state.deleteSensor(request.params.id) }));

  router.get("/model/buildings", (_request, response) => ok(response, state.buildings));
  router.put("/model/buildings/:id/transform", (request, response) => {
    const building = state.updateBuilding(request.params.id, request.body);
    if (!building) return response.status(404).json({ ok: false, message: "Building not found" });
    return ok(response, building);
  });
  router.post("/model/buildings/:id/reset", (request, response) => {
    const building = state.resetBuilding(request.params.id);
    if (!building) return response.status(404).json({ ok: false, message: "Default building not found" });
    return ok(response, building);
  });
  router.post("/model/import", (_request, response) =>
    ok(response, {
      importPath: "/public/models/library_complex.glb",
      message: "将 Revit 模型导出为 GLB 后放入 apps/web/public/models/library_complex.glb，前端会优先加载该模型。"
    })
  );
  router.get("/model/floors", (_request, response) => ok(response, state.floors));
  router.put("/model/floors/:id/visible", (request, response) => ok(response, state.setFloorVisible(request.params.id, Boolean(request.body.visible))));

  router.post("/fire/start", (_request, response) => ok(response, state.startFire()));
  router.post("/fire/start-at-point", (request: Request<unknown, unknown, { origin?: Vector3; floor?: number }>, response) => {
    ok(response, state.startFire(request.body.origin, request.body.floor ?? 3));
  });
  router.post("/fire/stop", (_request, response) => ok(response, state.stopFire()));
  router.get("/fire/status", (_request, response) => ok(response, state.fire));
  router.get("/fire/spread", (_request, response) => ok(response, state.spread));
  router.get("/fire/routes", (_request, response) => ok(response, state.routes));
  router.get("/fire/affected-zones", (_request, response) => ok(response, state.affectedZones));
  router.post("/fire/exhaust", (request, response) => {
    state.toggleExhaust(Boolean(request.body.enabled));
    ok(response, { enabled: state.exhaustEnabled, spread: state.spread });
  });

  router.get("/ai/advice", (_request, response) => ok(response, state.advice));
  router.post("/ai/analyze", (_request, response) => ok(response, state.advice));

  router.get("/logs", (request, response) => ok(response, state.logsByLevel(String(request.query.level ?? "all"))));
  router.delete("/logs", (_request, response) => {
    state.clearLogs();
    ok(response, []);
  });

  router.post("/demo/mode", (request: Request<unknown, unknown, { mode: DemoMode }>, response) => ok(response, state.setDemoMode(request.body.mode)));

  return router;
}
