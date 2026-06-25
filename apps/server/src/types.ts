export type SensorType =
  | "temperature"
  | "humidity"
  | "smoke"
  | "energy"
  | "door"
  | "camera"
  | "waterPressure"
  | "alarm"
  | "aiRisk";

export type SensorStatus = "normal" | "warning" | "danger" | "offline";
export type BuildingType =
  | "library"
  | "annex"
  | "road"
  | "water"
  | "green"
  | "floor"
  | "room"
  | "stair"
  | "exit"
  | "plaza"
  | "corridor"
  | "equipment";

export type FireStatus = "inactive" | "active" | "controlled";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type LogLevel = "normal" | "warning" | "fire";
export type DemoMode = "normal" | "abnormal" | "fire" | "evacuation";
export type GridCellState = "safe" | "warning" | "danger" | "blocked";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BuildingObject {
  id: string;
  name: string;
  type: BuildingType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  floor?: number;
  floors?: number;
  color?: string;
  opacity?: number;
  visible?: boolean;
  editable: boolean;
}

export interface FloorState {
  id: string;
  name: string;
  floor: number;
  visible: boolean;
}

export interface SensorData {
  id: string;
  name: string;
  type: SensorType;
  buildingId: string;
  floor: number;
  areaName: string;
  position: Vector3;
  value: number | string;
  unit: string;
  status: SensorStatus;
  updateTime: string;
  samplingRate: number;
}

export interface FireEvent {
  id: string;
  status: FireStatus;
  origin: Vector3;
  floor: number;
  areaName: string;
  startTime: string;
  riskLevel: RiskLevel;
  spreadStep: number;
  affectedZones: string[];
}

export interface FireGridCell {
  id: string;
  floor: number;
  gridX: number;
  gridZ: number;
  center: Vector3;
  state: GridCellState;
  heat: number;
  smoke: number;
}

export interface AffectedZones {
  fireId: string;
  origin: string;
  affectedFloors: number[];
  dangerZones: string[];
  warningZones: string[];
  blockedZones: string[];
  estimatedAffectedPeople: number;
  riskLevel: RiskLevel;
}

export interface EvacuationRoute {
  id: string;
  name: string;
  type: "primary" | "backup";
  nodes: string[];
  labels: string[];
  points: Vector3[];
  distance: number;
  estimatedTime: number;
  safetyScore: number;
}

export interface SystemLog {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
}

export interface TrendPoint {
  time: string;
  temperature: number;
  humidity: number;
  smoke: number;
  energy: number;
  risk: number;
}

export interface DashboardStats {
  visitorCount: number;
  peopleInside: number;
  trafficTrips: number;
  alarms: number;
  deviceTotal: number;
  intactRate: number;
  energyTotal: number;
  waterTotal: number;
  powerTotal: number;
  pm25: number;
  temperature: number;
  humidity: number;
  airQuality: string;
  fireRiskIndex: number;
  deviceResponseRate: number;
}

export interface AiAdvice {
  level: RiskLevel;
  title: string;
  content: string;
  updatedAt: string;
}

export interface RealtimePayload {
  type:
    | "sensor_update"
    | "device_status"
    | "energy_update"
    | "risk_update"
    | "fire_event"
    | "fire_spread_update"
    | "evacuation_route_update"
    | "system_log"
    | "snapshot";
  data: unknown;
  time: string;
}

export interface StateSnapshot {
  buildings: BuildingObject[];
  sensors: SensorData[];
  floors: FloorState[];
  fire: FireEvent;
  spread: FireGridCell[];
  routes: EvacuationRoute[];
  affectedZones: AffectedZones;
  logs: SystemLog[];
  trends: TrendPoint[];
  stats: DashboardStats;
  advice: AiAdvice;
  demoMode: DemoMode;
}
