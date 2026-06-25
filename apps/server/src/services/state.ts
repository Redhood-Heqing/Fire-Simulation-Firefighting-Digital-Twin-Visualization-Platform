import { EventEmitter } from "node:events";
import type {
  AiAdvice,
  AffectedZones,
  BuildingObject,
  DashboardStats,
  DemoMode,
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
} from "../types.js";
import { calculateAffectedZones, advanceFire, buildSpreadGrid, createFire, sensorFireValue, statusFromReading } from "../simulation/fire.js";
import { calculateEvacuationRoutes } from "../simulation/pathfinding.js";
import { defaultStats, emptyFire, generateBuildings, generateFloors, generateSensors, makeEditableSensor } from "../data/seed.js";
import { loadPersistedState, savePersistedState } from "../data/jsonDb.js";
import { choice, clock, id, int, nowIso, rand, rounded } from "../utils.js";

export class StateService extends EventEmitter {
  buildings: BuildingObject[];
  sensors: SensorData[];
  floors: FloorState[];
  fire: FireEvent;
  spread: FireGridCell[];
  routes = calculateEvacuationRoutes([]);
  affectedZones: AffectedZones;
  logs: SystemLog[] = [];
  trends: TrendPoint[] = [];
  stats: DashboardStats = { ...defaultStats };
  advice: AiAdvice;
  demoMode: DemoMode = "normal";
  exhaustEnabled = false;
  private tickHandle?: NodeJS.Timeout;
  private logHandle?: NodeJS.Timeout;
  private persistenceTimer?: NodeJS.Timeout;

  constructor() {
    super();
    const persisted = loadPersistedState();
    this.buildings = persisted?.buildings ?? generateBuildings();
    this.sensors = persisted?.sensors ?? generateSensors();
    this.floors = persisted?.floors ?? generateFloors();
    this.fire = emptyFire();
    this.spread = [];
    this.affectedZones = calculateAffectedZones(this.fire, this.spread);
    this.advice = this.buildAdvice();
    this.seedTrends();
    this.addLog("normal", "系统初始化完成：加载图书馆数字孪生模型与 33 个模拟点位");
  }

  start() {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tick(), 1000);
    this.logHandle = setInterval(() => this.emitRoutineLog(), 500);
  }

  stop() {
    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.logHandle) clearInterval(this.logHandle);
  }

  snapshot(): StateSnapshot {
    return {
      buildings: this.buildings,
      sensors: this.sensors,
      floors: this.floors,
      fire: this.fire,
      spread: this.spread,
      routes: this.routes,
      affectedZones: this.affectedZones,
      logs: this.logs,
      trends: this.trends,
      stats: this.stats,
      advice: this.advice,
      demoMode: this.demoMode
    };
  }

  createSensor(input: Partial<SensorData>) {
    const sensor = makeEditableSensor(input);
    this.sensors = [sensor, ...this.sensors];
    this.addLog("normal", `新增传感器点位：${sensor.name}，位置 ${sensor.areaName}`);
    this.persistSoon();
    this.broadcast("sensor_update", this.sensors);
    return sensor;
  }

  updateSensor(sensorId: string, patch: Partial<SensorData>) {
    let updated: SensorData | undefined;
    this.sensors = this.sensors.map((sensor) => {
      if (sensor.id !== sensorId) return sensor;
      updated = { ...sensor, ...patch, updateTime: nowIso() };
      return updated;
    });
    if (!updated) return null;
    this.addLog("normal", `传感器点位已更新：${updated.name}`);
    this.persistSoon();
    this.broadcast("sensor_update", this.sensors);
    return updated;
  }

  deleteSensor(sensorId: string) {
    const found = this.sensors.find((sensor) => sensor.id === sensorId);
    this.sensors = this.sensors.filter((sensor) => sensor.id !== sensorId);
    if (found) {
      this.addLog("warning", `传感器点位已删除：${found.name}`);
      this.persistSoon();
      this.broadcast("sensor_update", this.sensors);
    }
    return Boolean(found);
  }

  updateBuilding(buildingId: string, patch: Partial<BuildingObject>) {
    let updated: BuildingObject | undefined;
    this.buildings = this.buildings.map((building) => {
      if (building.id !== buildingId) return building;
      updated = { ...building, ...patch };
      return updated;
    });
    if (!updated) return null;
    this.addLog("normal", `模型构件已保存：${updated.name}`);
    this.persistSoon();
    this.broadcast("snapshot", this.snapshot());
    return updated;
  }

  resetBuilding(buildingId: string) {
    const defaultBuilding = generateBuildings().find((building) => building.id === buildingId);
    if (!defaultBuilding) return null;

    this.buildings = this.buildings.map((building) => (building.id === buildingId ? { ...defaultBuilding } : building));
    this.addLog("normal", `模型构件已恢复初始值：${defaultBuilding.name}`);
    this.persistSoon();
    this.broadcast("snapshot", this.snapshot());
    return defaultBuilding;
  }

  setFloorVisible(floorId: string, visible: boolean) {
    this.floors = this.floors.map((floor) => (floor.id === floorId ? { ...floor, visible } : floor));
    this.persistSoon();
    this.broadcast("snapshot", this.snapshot());
    return this.floors.find((floor) => floor.id === floorId) ?? null;
  }

  startFire(origin?: Vector3, floor = 3) {
    this.fire = createFire(origin, floor);
    this.demoMode = "fire";
    this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
    this.affectedZones = calculateAffectedZones(this.fire, this.spread);
    this.routes = calculateEvacuationRoutes(this.spread);
    this.advice = this.buildAdvice();
    this.addLog("fire", `火灾事件触发：${this.fire.id}`);
    this.addLog("fire", `起火位置锁定：${this.fire.areaName}`);
    this.addLog("fire", "正在计算受影响区域和安全疏散路线");
    this.broadcast("fire_event", this.fire);
    this.broadcast("fire_spread_update", this.spread);
    this.broadcast("evacuation_route_update", this.routes);
    return this.fire;
  }

  stopFire() {
    this.fire = emptyFire();
    this.demoMode = "normal";
    this.exhaustEnabled = false;
    this.spread = [];
    this.affectedZones = calculateAffectedZones(this.fire, this.spread);
    this.routes = calculateEvacuationRoutes([]);
    this.advice = this.buildAdvice();
    this.addLog("normal", "火灾演示结束：系统恢复正常运行状态");
    this.broadcast("snapshot", this.snapshot());
    return this.fire;
  }

  setDemoMode(mode: DemoMode) {
    this.demoMode = mode;
    if (mode === "fire") return this.startFire();
    if (mode === "normal") return this.stopFire();
    if (mode === "abnormal") {
      this.addLog("warning", "演示模式切换：设备异常场景");
      this.advice = this.buildAdvice();
    }
    if (mode === "evacuation" && this.fire.status !== "active") {
      this.startFire();
      this.demoMode = "evacuation";
    }
    this.broadcast("snapshot", this.snapshot());
    return this.snapshot();
  }

  toggleExhaust(enabled: boolean) {
    this.exhaustEnabled = enabled;
    if (this.fire.status === "active") {
      this.addLog("fire", enabled ? "联动控制：已开启东侧排烟系统" : "联动控制：排烟系统恢复默认状态");
      this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
      this.affectedZones = calculateAffectedZones(this.fire, this.spread);
      this.routes = calculateEvacuationRoutes(this.spread);
      this.advice = this.buildAdvice();
      this.broadcast("snapshot", this.snapshot());
    }
  }

  logsByLevel(level?: string) {
    if (!level || level === "all") return this.logs;
    return this.logs.filter((log) => log.level === level);
  }

  clearLogs() {
    this.logs = [];
    this.broadcast("system_log", this.logs);
  }

  private tick() {
    if (this.fire.status === "active") {
      this.fire = advanceFire(this.fire, this.exhaustEnabled);
      this.spread = buildSpreadGrid(this.fire, this.exhaustEnabled);
      this.affectedZones = calculateAffectedZones(this.fire, this.spread);
      this.routes = calculateEvacuationRoutes(this.spread);
      if (this.fire.spreadStep % 2 === 0) this.addLog("fire", `火势蔓延推演更新：第 ${this.fire.spreadStep} 秒，风险等级 ${this.fire.riskLevel}`);
    }

    this.sensors = this.sensors.map((sensor) => this.nextSensor(sensor));
    this.stats = this.nextStats();
    this.advice = this.buildAdvice();
    this.addTrend();
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

    const next = { ...sensor, value, updateTime: nowIso() };
    return { ...next, status: statusFromReading(next) };
  }

  private nextStats(): DashboardStats {
    const tempSensors = this.sensors.filter((sensor) => sensor.type === "temperature");
    const smokeSensors = this.sensors.filter((sensor) => sensor.type === "smoke");
    const riskSensors = this.sensors.filter((sensor) => sensor.type === "aiRisk");
    const maxSmoke = Math.max(...smokeSensors.map((sensor) => Number(sensor.value)), 0);
    const avgRisk = riskSensors.reduce((sum, sensor) => sum + Number(sensor.value), 0) / Math.max(riskSensors.length, 1);
    const avgTemp = tempSensors.reduce((sum, sensor) => sum + Number(sensor.value), 0) / Math.max(tempSensors.length, 1);
    const dangerCount = this.sensors.filter((sensor) => sensor.status === "danger").length;
    const warningCount = this.sensors.filter((sensor) => sensor.status === "warning").length;

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
      pm25: rounded(this.fire.status === "active" ? 48 + maxSmoke / 42 : rand(26, 42)),
      temperature: rounded(avgTemp),
      humidity: rounded(rand(54, 70)),
      airQuality: this.fire.status === "active" ? "警戒" : "优",
      fireRiskIndex: rounded(this.fire.status === "active" ? Math.min(99, avgRisk + this.fire.spreadStep * 4) : avgRisk),
      deviceResponseRate: rounded(98.7 - dangerCount * 0.6 - (this.demoMode === "abnormal" ? 5 : 0))
    };
  }

  private buildAdvice(): AiAdvice {
    if (this.fire.status === "active") {
      return {
        level: this.fire.riskLevel,
        title: "AI 火灾应急建议",
        content: `当前起火点位于 ${this.fire.areaName}，烟雾正向中庭和楼梯间扩散。建议立即启动东侧声光报警器，开启排烟系统，关闭东侧防火门，并引导人员经西侧安全楼梯和南侧楼梯分流疏散。本系统为演示型辅助决策系统，不能替代正式消防报警系统和专业消防指挥。`,
        updatedAt: nowIso()
      };
    }

    if (this.demoMode === "abnormal" || this.stats.fireRiskIndex > 55) {
      return {
        level: "medium",
        title: "AI 设备异常建议",
        content: "检测到 2F 南侧区域温度与能耗存在持续波动，但烟雾浓度未同步上升。建议检查空调机组、配电柜和局部热源，暂不判定为火灾。",
        updatedAt: nowIso()
      };
    }

    return {
      level: "low",
      title: "AI 综合运行建议",
      content: "当前建筑运行状态稳定。建议保持常规巡检，重点关注 3F 西侧设备间能耗波动和消防水压趋势。",
      updatedAt: nowIso()
    };
  }

  private seedTrends() {
    for (let index = 16; index > 0; index -= 1) {
      this.trends.push({
        time: `${String(16 - index).padStart(2, "0")}s`,
        temperature: rand(24, 30),
        humidity: rand(48, 66),
        smoke: rand(8, 22),
        energy: rand(24, 48),
        risk: rand(12, 26)
      });
    }
  }

  private addTrend() {
    this.trends = [
      ...this.trends.slice(-23),
      {
        time: clock(),
        temperature: this.stats.temperature,
        humidity: this.stats.humidity,
        smoke: rounded(this.sensors.filter((sensor) => sensor.type === "smoke").reduce((sum, sensor) => sum + Number(sensor.value), 0) / 5),
        energy: rounded(this.sensors.filter((sensor) => sensor.type === "energy").reduce((sum, sensor) => sum + Number(sensor.value), 0) / 5),
        risk: this.stats.fireRiskIndex
      }
    ];
  }

  private emitRoutineLog() {
    if (this.fire.status === "active") {
      const fireLogs = [
        `周边温度异常升高：T-3F-08 = ${this.sensors.find((sensor) => sensor.id === "T-3F-08")?.value ?? 72.5} degC`,
        `烟雾浓度快速升高：S-3F-02 = ${this.sensors.find((sensor) => sensor.id === "S-3F-02")?.value ?? 860} ppm`,
        `已生成最佳逃生路线 A、B，预计影响人数 ${this.affectedZones.estimatedAffectedPeople}`,
        "AI 建议：优先开启东侧排烟系统，封闭 3F 东侧防火门"
      ];
      this.addLog("fire", choice(fireLogs));
      return;
    }

    const sensor = choice(this.sensors);
    const normalLogs = [
      `${sensor.id} ${sensor.name} 更新：${sensor.value}${sensor.unit}`,
      `WebSocket 推送完成：${this.sensors.length} 个点位`,
      `设备响应检测：${this.stats.deviceResponseRate}%`,
      `AI 风险评估完成：${this.stats.fireRiskIndex > 55 ? "中风险" : "低风险"}`,
      `Energy-02 当前功率：${rand(32, 48)} kW`
    ];
    this.addLog(this.demoMode === "abnormal" ? "warning" : "normal", choice(normalLogs));
  }

  private addLog(level: SystemLog["level"], message: string) {
    const log: SystemLog = {
      id: id("LOG"),
      time: clock(),
      level,
      message
    };
    this.logs = [log, ...this.logs].slice(0, 160);
    this.broadcast("system_log", log);
  }

  private broadcast(type: RealtimePayload["type"], data: unknown) {
    const payload: RealtimePayload = { type, data, time: nowIso() };
    this.emit("broadcast", payload);
  }

  private persistSoon() {
    if (this.persistenceTimer) clearTimeout(this.persistenceTimer);
    this.persistenceTimer = setTimeout(() => {
      savePersistedState({ buildings: this.buildings, sensors: this.sensors, floors: this.floors });
    }, 350);
  }
}
