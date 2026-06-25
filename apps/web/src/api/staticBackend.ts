import type {
  AffectedZones,
  AiAdvice,
  BuildingObject,
  DashboardStats,
  DemoMode,
  EvacuationRoute,
  FireEvent,
  FireGridCell,
  FloorState,
  RealtimePayload,
  SensorData,
  SensorType,
  StateSnapshot,
  SystemLog,
  TrendPoint,
  Vector3
} from "../types";

const STORAGE_KEY = "fire-twin-static-state-v1";

const sensorUnits: Record<SensorType, string> = {
  temperature: "degC",
  humidity: "%RH",
  smoke: "ppm",
  energy: "kW",
  door: "",
  camera: "stream",
  waterPressure: "MPa",
  alarm: "",
  aiRisk: "%"
};

const sensorNames: Record<SensorType, string> = {
  temperature: "温度传感器",
  humidity: "湿度传感器",
  smoke: "烟雾传感器",
  energy: "能耗传感器",
  door: "门禁传感器",
  camera: "智能摄像头",
  waterPressure: "消防水压",
  alarm: "声光报警器",
  aiRisk: "AI 风险节点"
};

function vector(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

function rounded(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function rand(min: number, max: number, digits = 1) {
  return rounded(min + Math.random() * (max - min), digits);
}

function int(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Vector3, b: Vector3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clock() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function defaultBuildings(): BuildingObject[] {
  const base = (item: Omit<BuildingObject, "rotation" | "editable"> & Partial<Pick<BuildingObject, "rotation" | "editable">>): BuildingObject => ({
    rotation: vector(0, 0, 0),
    editable: true,
    visible: true,
    ...item
  });

  return [
    base({ id: "library-main", name: "图书馆主楼", type: "library", position: vector(0, 9, 0), scale: vector(22, 18, 16), floors: 5, color: "#9cc7de", opacity: 0.82 }),
    base({ id: "library-atrium", name: "中央中庭", type: "room", position: vector(0, 20, -0.5), scale: vector(9, 20, 8), floors: 5, color: "#d8f4ff", opacity: 0.32 }),
    base({ id: "annex-east", name: "东侧附属楼", type: "annex", position: vector(28, 5, 2), scale: vector(20, 10, 12), floors: 3, color: "#a2b9c9", opacity: 0.86 }),
    base({ id: "annex-west", name: "西侧报告厅", type: "annex", position: vector(-25, 4, 4), scale: vector(16, 8, 14), floors: 2, color: "#90abc1", opacity: 0.86 }),
    base({ id: "equipment-room", name: "地下设备间", type: "equipment", position: vector(19, 1.8, 18), scale: vector(10, 3.6, 8), floor: -1, color: "#4f7a9f", opacity: 0.9 }),
    base({ id: "plaza-main", name: "中央广场", type: "plaza", position: vector(0, 0.05, 24), scale: vector(38, 0.1, 24), color: "#d5e4e8", opacity: 0.9, editable: false }),
    base({ id: "road-east", name: "东侧消防道路", type: "road", position: vector(46, 0.03, 18), rotation: vector(0, 0.05, 0), scale: vector(12, 0.08, 70), color: "#263948", opacity: 1, editable: false }),
    base({ id: "road-south", name: "南侧主干道", type: "road", position: vector(10, 0.04, 45), rotation: vector(0, -0.28, 0), scale: vector(74, 0.08, 10), color: "#283b48", opacity: 1, editable: false }),
    base({ id: "lake-west", name: "西侧湖面", type: "water", position: vector(-48, -0.05, -8), scale: vector(42, 0.08, 58), color: "#2ac7dc", opacity: 0.52, editable: false }),
    base({ id: "green-north", name: "北侧绿化", type: "green", position: vector(5, 0.02, -28), scale: vector(58, 0.05, 18), color: "#244f3c", opacity: 0.9, editable: false }),
    base({ id: "green-west", name: "湖滨绿化", type: "green", position: vector(-36, 0.02, 20), scale: vector(16, 0.05, 34), color: "#25543d", opacity: 0.9, editable: false }),
    base({ id: "stair-west", name: "西侧安全楼梯", type: "stair", position: vector(-12, 9, -7), scale: vector(3, 18, 4), floors: 5, color: "#5df2ff", opacity: 0.72 }),
    base({ id: "stair-south", name: "南侧楼梯间", type: "stair", position: vector(8, 9, 8), scale: vector(4, 18, 3), floors: 5, color: "#5df2ff", opacity: 0.72 }),
    base({ id: "exit-west", name: "1F 西门出口", type: "exit", position: vector(-14, 1.5, 14), scale: vector(4, 3, 2), floor: 1, color: "#22c55e", opacity: 0.9 }),
    base({ id: "exit-south", name: "1F 南门出口", type: "exit", position: vector(8, 1.5, 16), scale: vector(4, 3, 2), floor: 1, color: "#22c55e", opacity: 0.9 }),
    base({ id: "corridor-main-3f", name: "3F 中央走廊", type: "corridor", position: vector(0, 11.2, 0), scale: vector(20, 0.25, 3), floor: 3, color: "#70e4ff", opacity: 0.36 }),
    base({ id: "room-east-reading-3f", name: "3F 东侧阅览区", type: "room", position: vector(8, 11.4, -3), scale: vector(8, 0.35, 9), floor: 3, color: "#73b8ff", opacity: 0.28 }),
    base({ id: "room-west-reading-3f", name: "3F 西侧阅览区", type: "room", position: vector(-8, 11.4, -3), scale: vector(8, 0.35, 9), floor: 3, color: "#73b8ff", opacity: 0.28 }),
    base({ id: "safe-assembly", name: "室外安全集合点", type: "exit", position: vector(-8, 0.18, 36), scale: vector(9, 0.2, 6), color: "#22c55e", opacity: 0.44, editable: false })
  ];
}

function defaultFloors(): FloorState[] {
  return [-1, 1, 2, 3, 4, 5].map((floor) => ({ id: `floor-${floor}`, name: floor === -1 ? "B1" : `${floor}F`, floor, visible: true }));
}

function baseValue(type: SensorType) {
  if (type === "temperature") return rand(22, 29);
  if (type === "humidity") return rand(42, 68);
  if (type === "smoke") return rand(5, 22);
  if (type === "energy") return rand(18, 52);
  if (type === "waterPressure") return rand(0.32, 0.62, 2);
  if (type === "aiRisk") return rand(8, 28);
  if (type === "door") return "closed";
  if (type === "camera") return "online";
  return "standby";
}

function makeSensor(type: SensorType, index: number, floor: number, x: number, z: number, areaName: string): SensorData {
  return {
    id: `${type.slice(0, 2).toUpperCase()}-${floor}F-${String(index).padStart(2, "0")}`,
    name: `${sensorNames[type]} ${floor}F-${String(index).padStart(2, "0")}`,
    type,
    buildingId: "library-main",
    floor,
    areaName,
    position: vector(x, floor * 3.6 + 0.9, z),
    value: baseValue(type),
    unit: sensorUnits[type],
    status: "normal",
    updateTime: new Date().toISOString(),
    samplingRate: type === "camera" ? 5 : 1
  };
}

function defaultSensors(): SensorData[] {
  const types: SensorType[] = ["temperature", "humidity", "smoke", "energy", "door", "camera", "waterPressure", "alarm", "aiRisk"];
  const areas = ["东侧阅览区", "西侧阅览区", "中央中庭", "设备间", "南侧走廊", "西侧楼梯间"];
  const sensors: SensorData[] = [];
  let index = 1;
  for (const floor of [1, 2, 3, 4, 5]) {
    for (const type of types) {
      if (sensors.length >= 30) break;
      sensors.push(makeSensor(type, index, floor, rand(-10, 12), rand(-8, 10), `${floor}F ${areas[(index + floor) % areas.length]}`));
      index += 1;
    }
  }
  sensors.push({ ...makeSensor("temperature", 88, 3, 9, -4, "3F 东侧阅览区"), id: "T-3F-08", name: "温度传感器 T-3F-08" });
  sensors.push({ ...makeSensor("smoke", 2, 3, 10, -3, "3F 东侧阅览区"), id: "S-3F-02", name: "烟雾传感器 S-3F-02" });
  sensors.push({ ...makeSensor("alarm", 6, 3, 5, 2, "3F 中央走廊"), id: "AL-3F-06", name: "声光报警器 AL-3F-06" });
  return sensors;
}

function emptyFire(): FireEvent {
  return {
    id: "FIRE-IDLE",
    status: "inactive",
    origin: vector(9, 11.4, -4),
    floor: 3,
    areaName: "3F 东侧阅览区",
    startTime: "",
    riskLevel: "low",
    spreadStep: 0,
    affectedZones: []
  };
}

function createFire(origin?: Vector3, floor = 3): FireEvent {
  return {
    id: `FIRE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id("EVT").slice(-3)}`,
    status: "active",
    origin: origin ?? vector(9, floor * 3.6 + 0.8, -4),
    floor,
    areaName: "图书馆 3F 东侧阅览区",
    startTime: new Date().toISOString(),
    riskLevel: "high",
    spreadStep: 0,
    affectedZones: ["3F-East-Reading"]
  };
}

const zoneByGrid = (floor: number, x: number, z: number) => `${floor}F-${x < 5 ? "West" : x > 7 ? "East" : "Central"}-${z > 5 ? "South" : "Hall"}`;

function buildSpreadGrid(fire: FireEvent, exhaustEnabled = false): FireGridCell[] {
  if (fire.status !== "active") return [];
  const cells: FireGridCell[] = [];
  const maxRadius = exhaustEnabled ? 3.3 + fire.spreadStep * 0.78 : 4 + fire.spreadStep * 1.08;
  const floors = [fire.floor - 1, fire.floor, fire.floor + 1].filter((floor) => floor >= 1 && floor <= 5);
  for (const floor of floors) {
    for (let x = 0; x < 12; x += 1) {
      for (let z = 0; z < 10; z += 1) {
        const center = vector(-13.2 + x * 2.4, floor * 3.6 + 0.25, -9 + z * 2.1);
        const floorPenalty = floor === fire.floor ? 0 : 2.6;
        const d = distance({ ...center, y: fire.origin.y }, fire.origin) + floorPenalty;
        let state: FireGridCell["state"] = "safe";
        if (d < maxRadius * 0.48) state = "danger";
        else if (d < maxRadius * 0.78) state = "warning";
        if (state !== "safe" && z === 4 && x > 8 && fire.spreadStep > 4) state = "blocked";
        if (state !== "safe") {
          cells.push({ id: `${floor}-${x}-${z}`, floor, gridX: x, gridZ: z, center, state, heat: rounded(clamp(115 - d * 10 + fire.spreadStep * 8, 20, 260)), smoke: rounded(clamp(900 - d * 55 + fire.spreadStep * 44, 0, 1600)) });
        }
      }
    }
  }
  return cells;
}

function advanceFire(fire: FireEvent, exhaustEnabled = false): FireEvent {
  if (fire.status !== "active") return fire;
  const spreadStep = fire.spreadStep + 1;
  const grid = buildSpreadGrid({ ...fire, spreadStep }, exhaustEnabled);
  return {
    ...fire,
    spreadStep,
    riskLevel: spreadStep > 9 ? "critical" : spreadStep > 4 ? "high" : spreadStep > 1 ? "medium" : "low",
    affectedZones: Array.from(new Set(grid.map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ)))).slice(0, 12)
  };
}

function affectedZones(fire: FireEvent, spread: FireGridCell[]): AffectedZones {
  if (fire.status !== "active") return { fireId: fire.id, origin: "无", affectedFloors: [], dangerZones: [], warningZones: [], blockedZones: [], estimatedAffectedPeople: 0, riskLevel: "low" };
  const dangerZones = Array.from(new Set(spread.filter((cell) => cell.state === "danger").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));
  const warningZones = Array.from(new Set(spread.filter((cell) => cell.state === "warning").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));
  const blockedZones = Array.from(new Set(spread.filter((cell) => cell.state === "blocked").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));
  return { fireId: fire.id, origin: fire.areaName, affectedFloors: Array.from(new Set(spread.map((cell) => cell.floor))).sort(), dangerZones, warningZones, blockedZones, estimatedAffectedPeople: 48 + dangerZones.length * 18 + warningZones.length * 7, riskLevel: fire.riskLevel };
}

function statusFromReading(sensor: SensorData): SensorData["status"] {
  if (sensor.type === "temperature" && Number(sensor.value) > 62) return "danger";
  if (sensor.type === "temperature" && Number(sensor.value) > 38) return "warning";
  if (sensor.type === "smoke" && Number(sensor.value) > 520) return "danger";
  if (sensor.type === "smoke" && Number(sensor.value) > 80) return "warning";
  if (sensor.type === "aiRisk" && Number(sensor.value) > 78) return "danger";
  if (sensor.type === "alarm" && sensor.value === "active") return "danger";
  if (sensor.type === "energy" && Number(sensor.value) > 62) return "warning";
  return Math.random() < 0.003 ? "offline" : "normal";
}

function sensorFireValue(sensor: SensorData, fire: FireEvent) {
  if (fire.status !== "active") return null;
  const impact = clamp((18 - distance(sensor.position, fire.origin)) / 18, 0, 1) * (sensor.floor === fire.floor ? 1 : 0.45);
  if (impact <= 0.02) return null;
  const stepFactor = 1 + fire.spreadStep * 0.16;
  if (sensor.type === "temperature") return rounded(27 + impact * 74 * stepFactor);
  if (sensor.type === "smoke") return rounded(18 + impact * 850 * stepFactor);
  if (sensor.type === "aiRisk") return rounded(24 + impact * 80 * stepFactor);
  if (sensor.type === "alarm" && impact > 0.26) return "active";
  if (sensor.type === "waterPressure") return rounded(0.5 + impact * 0.18, 2);
  return null;
}

const routePoints = {
  origin: vector(9, 11.8, -4),
  center: vector(0, 11.8, 0),
  south: vector(5, 11.8, 8),
  westStair3: vector(-12, 11.8, -6),
  southStair3: vector(8, 11.8, 8),
  westStair1: vector(-12, 2.6, -6),
  southStair1: vector(8, 2.6, 8),
  westExit: vector(-14, 1.2, 15),
  southExit: vector(8, 1.2, 18),
  westAssembly: vector(-8, 0.4, 36),
  plazaAssembly: vector(12, 0.4, 34)
};

function evacuationRoutes(spread: FireGridCell[]): EvacuationRoute[] {
  const danger = spread.filter((cell) => cell.state === "danger").length;
  const primaryPoints = danger > 10 ? [routePoints.origin, routePoints.south, routePoints.southStair3, routePoints.southStair1, routePoints.southExit, routePoints.plazaAssembly] : [routePoints.origin, routePoints.center, routePoints.westStair3, routePoints.westStair1, routePoints.westExit, routePoints.westAssembly];
  const backupPoints = danger > 10 ? [routePoints.origin, routePoints.center, routePoints.westStair3, routePoints.westStair1, routePoints.westExit, routePoints.westAssembly] : [routePoints.origin, routePoints.south, routePoints.southStair3, routePoints.southStair1, routePoints.southExit, routePoints.plazaAssembly];
  const toRoute = (points: Vector3[], type: "primary" | "backup"): EvacuationRoute => {
    const distanceValue = points.reduce((sum, point, index) => (index === 0 ? 0 : sum + distance(points[index - 1], point)), 0);
    return {
      id: type === "primary" ? "ROUTE-A" : "ROUTE-B",
      name: type === "primary" ? "推荐路线 A" : "备用路线 B",
      type,
      nodes: points.map((_, index) => `${type}-${index}`),
      labels: type === "primary" ? ["3F 东侧阅览区", "中央/南侧走廊", "安全楼梯", "1F 出口", "室外集合点"] : ["3F 东侧阅览区", "备用走廊", "备用楼梯", "1F 出口", "广场集合点"],
      points,
      distance: rounded(distanceValue, 1),
      estimatedTime: Math.round(distanceValue / 1.2 + danger * 1.4),
      safetyScore: Math.max(42, 96 - danger * 2)
    };
  };
  return [toRoute(primaryPoints, "primary"), toRoute(backupPoints, "backup")];
}

const defaultStats: DashboardStats = {
  visitorCount: 2400,
  peopleInside: 1562,
  trafficTrips: 15200,
  alarms: 0,
  deviceTotal: 1193,
  intactRate: 98,
  energyTotal: 252355,
  waterTotal: 1193,
  powerTotal: 1193,
  pm25: 33,
  temperature: 26,
  humidity: 63,
  airQuality: "优",
  fireRiskIndex: 18,
  deviceResponseRate: 98.7
};

interface PersistedStaticState {
  buildings: BuildingObject[];
  sensors: SensorData[];
  floors: FloorState[];
}

class StaticBackend {
  buildings: BuildingObject[] = defaultBuildings();
  sensors: SensorData[] = defaultSensors();
  floors: FloorState[] = defaultFloors();
  fire: FireEvent = emptyFire();
  spread: FireGridCell[] = [];
  routes: EvacuationRoute[] = evacuationRoutes([]);
  affectedZones: AffectedZones = affectedZones(this.fire, this.spread);
  logs: SystemLog[] = [];
  trends: TrendPoint[] = [];
  stats: DashboardStats = { ...defaultStats };
  advice: AiAdvice = this.buildAdvice();
  demoMode: DemoMode = "normal";
  exhaustEnabled = false;
  private subscribers = new Set<(payload: RealtimePayload) => void>();
  private interval?: number;

  constructor() {
    this.load();
    for (let index = 16; index > 0; index -= 1) this.trends.push({ time: `${String(16 - index).padStart(2, "0")}s`, temperature: rand(24, 30), humidity: rand(48, 66), smoke: rand(8, 22), energy: rand(24, 48), risk: rand(12, 26) });
    this.addLog("normal", "浏览器静态演示模式已启动：无需后端服务和环境文件。");
  }

  connect(callback: (payload: RealtimePayload) => void) {
    this.subscribers.add(callback);
    this.ensureStarted();
    callback({ type: "snapshot", data: this.snapshot(), time: new Date().toISOString() });
    return () => {
      this.subscribers.delete(callback);
    };
  }

  snapshot(): StateSnapshot {
    return { buildings: this.buildings, sensors: this.sensors, floors: this.floors, fire: this.fire, spread: this.spread, routes: this.routes, affectedZones: this.affectedZones, logs: this.logs, trends: this.trends, stats: this.stats, advice: this.advice, demoMode: this.demoMode };
  }

  createSensor(input: Partial<SensorData>) {
    const type = input.type ?? "temperature";
    const sensor: SensorData = {
      id: input.id ?? id("SENSOR"),
      name: input.name ?? `${sensorNames[type]} 自定义`,
      type,
      buildingId: input.buildingId ?? "library-main",
      floor: input.floor ?? 1,
      areaName: input.areaName ?? "自定义区域",
      position: input.position ?? vector(0, 4.4, 0),
      value: input.value ?? baseValue(type),
      unit: input.unit ?? sensorUnits[type],
      status: input.status ?? "normal",
      updateTime: new Date().toISOString(),
      samplingRate: input.samplingRate ?? 1
    };
    this.sensors = [sensor, ...this.sensors];
    this.persist();
    this.addLog("normal", `新增传感器点位：${sensor.name}`);
    this.broadcast("snapshot", this.snapshot());
    return sensor;
  }

  updateSensor(sensorId: string, patch: Partial<SensorData>) {
    let updated: SensorData | undefined;
    this.sensors = this.sensors.map((sensor) => {
      if (sensor.id !== sensorId) return sensor;
      updated = { ...sensor, ...patch, updateTime: new Date().toISOString() };
      return updated;
    });
    this.persist();
    this.broadcast("snapshot", this.snapshot());
    return updated ?? null;
  }

  deleteSensor(sensorId: string) {
    const before = this.sensors.length;
    this.sensors = this.sensors.filter((sensor) => sensor.id !== sensorId);
    this.persist();
    this.broadcast("snapshot", this.snapshot());
    return before !== this.sensors.length;
  }

  updateBuilding(buildingId: string, patch: Partial<BuildingObject>) {
    let updated: BuildingObject | undefined;
    this.buildings = this.buildings.map((building) => {
      if (building.id !== buildingId) return building;
      updated = { ...building, ...patch };
      return updated;
    });
    this.persist();
    this.addLog("normal", `模型构件已保存：${updated?.name ?? buildingId}`);
    this.broadcast("snapshot", this.snapshot());
    return updated ?? null;
  }

  resetBuilding(buildingId: string) {
    const original = defaultBuildings().find((building) => building.id === buildingId);
    if (!original) return null;
    this.buildings = this.buildings.map((building) => (building.id === buildingId ? { ...original } : building));
    this.persist();
    this.addLog("normal", `模型构件已恢复初始值：${original.name}`);
    this.broadcast("snapshot", this.snapshot());
    return original;
  }

  setFloorVisible(floorId: string, visible: boolean) {
    this.floors = this.floors.map((floor) => (floor.id === floorId ? { ...floor, visible } : floor));
    this.persist();
    this.broadcast("snapshot", this.snapshot());
    return this.floors.find((floor) => floor.id === floorId) ?? null;
  }

  startFire(origin?: Vector3, floor = 3) {
    this.fire = createFire(origin, floor);
    this.demoMode = "fire";
    this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
    this.routes = evacuationRoutes(this.spread);
    this.affectedZones = affectedZones(this.fire, this.spread);
    this.advice = this.buildAdvice();
    this.addLog("fire", `火灾事件触发：${this.fire.id}`);
    this.addLog("fire", `起火位置锁定：${this.fire.areaName}`);
    this.broadcast("snapshot", this.snapshot());
    return this.fire;
  }

  stopFire() {
    this.fire = emptyFire();
    this.demoMode = "normal";
    this.exhaustEnabled = false;
    this.spread = [];
    this.routes = evacuationRoutes([]);
    this.affectedZones = affectedZones(this.fire, this.spread);
    this.advice = this.buildAdvice();
    this.addLog("normal", "火灾演示结束：系统恢复正常运行状态。");
    this.broadcast("snapshot", this.snapshot());
    return this.fire;
  }

  setDemoMode(mode: DemoMode) {
    this.demoMode = mode;
    if (mode === "fire" || mode === "evacuation") return this.startFire();
    if (mode === "normal") return this.stopFire();
    this.addLog("warning", "演示模式切换：设备异常场景。");
    this.broadcast("snapshot", this.snapshot());
    return this.snapshot();
  }

  setExhaust(enabled: boolean) {
    this.exhaustEnabled = enabled;
    if (this.fire.status === "active") {
      this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
      this.routes = evacuationRoutes(this.spread);
      this.affectedZones = affectedZones(this.fire, this.spread);
      this.advice = this.buildAdvice();
      this.addLog("fire", enabled ? "联动控制：已开启排烟系统。" : "联动控制：排烟系统恢复默认状态。");
      this.broadcast("snapshot", this.snapshot());
    }
    return { enabled, spread: this.spread };
  }

  clearLogs() {
    this.logs = [];
    this.broadcast("snapshot", this.snapshot());
    return [];
  }

  private ensureStarted() {
    if (this.interval) return;
    this.interval = window.setInterval(() => this.tick(), 1000);
  }

  private tick() {
    if (this.fire.status === "active") {
      this.fire = advanceFire(this.fire, this.exhaustEnabled);
      this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
      this.routes = evacuationRoutes(this.spread);
      this.affectedZones = affectedZones(this.fire, this.spread);
    }
    this.sensors = this.sensors.map((sensor) => this.nextSensor(sensor));
    this.stats = this.nextStats();
    this.advice = this.buildAdvice();
    this.trends = [...this.trends.slice(-23), { time: clock(), temperature: this.stats.temperature, humidity: this.stats.humidity, smoke: rounded(this.sensors.filter((sensor) => sensor.type === "smoke").reduce((sum, sensor) => sum + Number(sensor.value), 0) / 5), energy: rounded(this.sensors.filter((sensor) => sensor.type === "energy").reduce((sum, sensor) => sum + Number(sensor.value), 0) / 5), risk: this.stats.fireRiskIndex }];
    this.emitRoutineLog();
    this.broadcast("snapshot", this.snapshot());
  }

  private nextSensor(sensor: SensorData): SensorData {
    const fireValue = sensorFireValue(sensor, this.fire);
    let value = fireValue ?? sensor.value;
    if (fireValue === null) {
      if (sensor.type === "temperature") value = rounded(Number(sensor.value) * 0.82 + rand(22, 30) * 0.18);
      if (sensor.type === "humidity") value = rounded(Number(sensor.value) * 0.8 + rand(42, 68) * 0.2);
      if (sensor.type === "smoke") value = rounded(Number(sensor.value) * 0.75 + rand(4, 24) * 0.25);
      if (sensor.type === "energy") value = rounded(Number(sensor.value) * 0.7 + rand(18, this.demoMode === "abnormal" ? 76 : 54) * 0.3);
      if (sensor.type === "waterPressure") value = rounded(Number(sensor.value) * 0.7 + rand(0.32, 0.62, 2) * 0.3, 2);
      if (sensor.type === "aiRisk") value = rounded(Number(sensor.value) * 0.7 + rand(8, this.demoMode === "abnormal" ? 62 : 28) * 0.3);
      if (sensor.type === "door") value = Math.random() > 0.96 ? "open" : "closed";
      if (sensor.type === "camera") value = Math.random() > 0.985 ? "offline" : "online";
      if (sensor.type === "alarm") value = "standby";
    }
    const next = { ...sensor, value, updateTime: new Date().toISOString() };
    return { ...next, status: statusFromReading(next) };
  }

  private nextStats(): DashboardStats {
    const tempSensors = this.sensors.filter((sensor) => sensor.type === "temperature");
    const smokeSensors = this.sensors.filter((sensor) => sensor.type === "smoke");
    const riskSensors = this.sensors.filter((sensor) => sensor.type === "aiRisk");
    const dangerCount = this.sensors.filter((sensor) => sensor.status === "danger").length;
    const warningCount = this.sensors.filter((sensor) => sensor.status === "warning").length;
    const avg = (items: SensorData[]) => items.reduce((sum, sensor) => sum + Number(sensor.value), 0) / Math.max(items.length, 1);
    return {
      ...this.stats,
      visitorCount: 2400 + int(-36, 42),
      peopleInside: Math.max(200, this.stats.peopleInside + int(-18, 24)),
      trafficTrips: 15200 + int(-140, 180),
      alarms: dangerCount + warningCount + (this.fire.status === "active" ? 1 : 0),
      intactRate: rounded(98 - dangerCount * 1.5 - warningCount * 0.25),
      energyTotal: this.stats.energyTotal + rand(8, 28),
      waterTotal: 1193 + int(-8, 14),
      powerTotal: 1193 + int(-12, 20),
      pm25: rounded(this.fire.status === "active" ? 48 + Math.max(...smokeSensors.map((sensor) => Number(sensor.value)), 0) / 42 : rand(26, 42)),
      temperature: rounded(avg(tempSensors)),
      humidity: rounded(rand(54, 70)),
      airQuality: this.fire.status === "active" ? "警戒" : "优",
      fireRiskIndex: rounded(this.fire.status === "active" ? Math.min(99, avg(riskSensors) + this.fire.spreadStep * 4) : avg(riskSensors)),
      deviceResponseRate: rounded(98.7 - dangerCount * 0.6 - (this.demoMode === "abnormal" ? 5 : 0))
    };
  }

  private buildAdvice(): AiAdvice {
    if (this.fire.status === "active") return { level: this.fire.riskLevel, title: "AI 火灾应急建议", content: `当前起火点位于 ${this.fire.areaName}，烟雾正向中庭和楼梯间扩散。建议立即启动东侧声光报警器，开启排烟系统，关闭东侧防火门，并引导人员经西侧安全楼梯和南侧楼梯分流疏散。本系统为演示型辅助决策系统，不能替代正式消防报警系统和专业消防指挥。`, updatedAt: new Date().toISOString() };
    if (this.demoMode === "abnormal" || this.stats.fireRiskIndex > 55) return { level: "medium", title: "AI 设备异常建议", content: "检测到局部区域温度与能耗存在持续波动，但烟雾浓度未同步上升。建议检查空调机组、配电柜和局部热源，暂不判定为火灾。", updatedAt: new Date().toISOString() };
    return { level: "low", title: "AI 综合运行建议", content: "当前建筑运行状态稳定。建议保持常规巡检，重点关注 3F 西侧设备间能耗波动和消防水压趋势。", updatedAt: new Date().toISOString() };
  }

  private emitRoutineLog() {
    const sensor = this.sensors[Math.floor(Math.random() * this.sensors.length)];
    const message =
      this.fire.status === "active"
        ? [`周边温度异常升高：T-3F-08 = ${this.sensors.find((item) => item.id === "T-3F-08")?.value ?? 72.5} degC`, `烟雾浓度快速升高：S-3F-02 = ${this.sensors.find((item) => item.id === "S-3F-02")?.value ?? 860} ppm`, `已生成最佳逃生路线 A、B，预计影响人数 ${this.affectedZones.estimatedAffectedPeople}`][Math.floor(Math.random() * 3)]
        : [`${sensor.id} ${sensor.name} 更新：${sensor.value}${sensor.unit}`, `WebSocket 模拟推送完成：${this.sensors.length} 个点位`, `设备响应检测：${this.stats.deviceResponseRate}%`, `AI 风险评估完成：${this.stats.fireRiskIndex > 55 ? "中风险" : "低风险"}`][Math.floor(Math.random() * 4)];
    this.addLog(this.fire.status === "active" ? "fire" : this.demoMode === "abnormal" ? "warning" : "normal", message);
  }

  private addLog(level: SystemLog["level"], message: string) {
    const log: SystemLog = { id: id("LOG"), time: clock(), level, message };
    this.logs = [log, ...this.logs].slice(0, 160);
    this.broadcast("system_log", log);
  }

  private broadcast(type: RealtimePayload["type"], data: unknown) {
    const payload: RealtimePayload = { type, data, time: new Date().toISOString() };
    this.subscribers.forEach((subscriber) => subscriber(payload));
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ buildings: this.buildings, sensors: this.sensors, floors: this.floors }));
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as PersistedStaticState;
      this.buildings = state.buildings ?? this.buildings;
      this.sensors = state.sensors ?? this.sensors;
      this.floors = state.floors ?? this.floors;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export const staticBackend = new StaticBackend();
