import type { BuildingObject, FloorState, SensorData, SensorType } from "../types.js";
import { id, rand, vector } from "../utils.js";

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

export function generateBuildings(): BuildingObject[] {
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

export function generateFloors(): FloorState[] {
  return [-1, 1, 2, 3, 4, 5].map((floor) => ({
    id: `floor-${floor}`,
    name: floor === -1 ? "B1" : `${floor}F`,
    floor,
    visible: true
  }));
}

function baseValue(type: SensorType) {
  switch (type) {
    case "temperature":
      return rand(22, 29);
    case "humidity":
      return rand(42, 68);
    case "smoke":
      return rand(5, 22);
    case "energy":
      return rand(18, 52);
    case "door":
      return "closed";
    case "camera":
      return "online";
    case "waterPressure":
      return rand(0.32, 0.62, 2);
    case "alarm":
      return "standby";
    case "aiRisk":
      return rand(8, 28);
  }
}

export function makeSensor(type: SensorType, index: number, floor: number, x: number, z: number, areaName: string): SensorData {
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

export function generateSensors(): SensorData[] {
  const types: SensorType[] = ["temperature", "humidity", "smoke", "energy", "door", "camera", "waterPressure", "alarm", "aiRisk"];
  const areas = ["东侧阅览区", "西侧阅览区", "中央中庭", "设备间", "南侧走廊", "西侧楼梯间"];
  const sensors: SensorData[] = [];
  let index = 1;

  for (const floor of [1, 2, 3, 4, 5]) {
    for (const type of types) {
      if (sensors.length >= 30) break;
      const area = areas[(index + floor) % areas.length];
      const x = rand(-10, 12);
      const z = rand(-8, 10);
      sensors.push(makeSensor(type, index, floor, x, z, `${floor}F ${area}`));
      index += 1;
    }
  }

  sensors.push({
    ...makeSensor("temperature", 88, 3, 9, -4, "3F 东侧阅览区"),
    id: "T-3F-08",
    name: "温度传感器 T-3F-08"
  });
  sensors.push({
    ...makeSensor("smoke", 2, 3, 10, -3, "3F 东侧阅览区"),
    id: "S-3F-02",
    name: "烟雾传感器 S-3F-02"
  });
  sensors.push({ ...makeSensor("alarm", 6, 3, 5, 2, "3F 中央走廊"), id: "AL-3F-06", name: "声光报警器 AL-3F-06" });

  return sensors;
}

export const defaultStats = {
  visitorCount: 2400,
  peopleInside: 1562,
  trafficTrips: 15200,
  alarms: 2,
  deviceTotal: 1193,
  intactRate: 88,
  energyTotal: 252355,
  waterTotal: 1193,
  powerTotal: 1193,
  pm25: 33,
  temperature: 31,
  humidity: 67,
  airQuality: "优",
  fireRiskIndex: 18,
  deviceResponseRate: 98.7
};

export function emptyFire() {
  return {
    id: "FIRE-IDLE",
    status: "inactive" as const,
    origin: vector(9, 11.4, -4),
    floor: 3,
    areaName: "3F 东侧阅览区",
    startTime: "",
    riskLevel: "low" as const,
    spreadStep: 0,
    affectedZones: []
  };
}

export function makeEditableSensor(partial: Partial<SensorData>): SensorData {
  const type = partial.type ?? "temperature";
  return {
    id: partial.id ?? id("SENSOR"),
    name: partial.name ?? `${sensorNames[type]} 自定义`,
    type,
    buildingId: partial.buildingId ?? "library-main",
    floor: partial.floor ?? 1,
    areaName: partial.areaName ?? "自定义区域",
    position: partial.position ?? vector(0, 4.4, 0),
    value: partial.value ?? baseValue(type),
    unit: partial.unit ?? sensorUnits[type],
    status: partial.status ?? "normal",
    updateTime: partial.updateTime ?? new Date().toISOString(),
    samplingRate: partial.samplingRate ?? 1
  };
}
