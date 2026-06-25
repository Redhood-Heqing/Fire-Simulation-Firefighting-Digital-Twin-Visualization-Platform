import { create } from "zustand";
import { api } from "../api/client";
import type {
  BuildingObject,
  DemoMode,
  FloorState,
  RealtimePayload,
  SceneViewMode,
  SensorData,
  SensorType,
  StateSnapshot,
  SystemLog,
  Vector3
} from "../types";

interface TwinState extends StateSnapshot {
  connected: boolean;
  selectedBuildingId?: string;
  selectedSensorId?: string;
  sceneViewMode: SceneViewMode;
  showSensors: boolean;
  transparentMode: boolean;
  sensorPlacementType?: SensorType;
  loadSnapshot: () => Promise<void>;
  connectRealtime: () => () => void;
  applySnapshot: (snapshot: StateSnapshot) => void;
  selectBuilding: (id?: string) => void;
  selectSensor: (id?: string) => void;
  patchBuildingLocal: (id: string, patch: Partial<BuildingObject>) => void;
  saveBuilding: (id: string) => Promise<void>;
  resetBuilding: (id: string) => Promise<void>;
  patchSensorLocal: (id: string, patch: Partial<SensorData>) => void;
  saveSensor: (id: string) => Promise<void>;
  addSensorAt: (position: Vector3, floor?: number) => Promise<void>;
  deleteSelectedSensor: () => Promise<void>;
  setSensorPlacementType: (type?: SensorType) => void;
  setViewMode: (mode: SceneViewMode) => void;
  setShowSensors: (visible: boolean) => void;
  setTransparentMode: (enabled: boolean) => void;
  setFloorVisible: (floorId: string, visible: boolean) => Promise<void>;
  startFire: () => Promise<void>;
  startFireAtPoint: (origin: Vector3, floor?: number) => Promise<void>;
  stopFire: () => Promise<void>;
  setDemoMode: (mode: DemoMode) => Promise<void>;
  setExhaust: (enabled: boolean) => Promise<void>;
  clearLogs: () => Promise<void>;
}

const emptySnapshot: StateSnapshot = {
  buildings: [],
  sensors: [],
  floors: [],
  fire: {
    id: "FIRE-IDLE",
    status: "inactive",
    origin: { x: 9, y: 11.4, z: -4 },
    floor: 3,
    areaName: "3F 东侧阅览区",
    startTime: "",
    riskLevel: "low",
    spreadStep: 0,
    affectedZones: []
  },
  spread: [],
  routes: [],
  affectedZones: {
    fireId: "FIRE-IDLE",
    origin: "无",
    affectedFloors: [],
    dangerZones: [],
    warningZones: [],
    blockedZones: [],
    estimatedAffectedPeople: 0,
    riskLevel: "low"
  },
  logs: [],
  trends: [],
  stats: {
    visitorCount: 0,
    peopleInside: 0,
    trafficTrips: 0,
    alarms: 0,
    deviceTotal: 0,
    intactRate: 0,
    energyTotal: 0,
    waterTotal: 0,
    powerTotal: 0,
    pm25: 0,
    temperature: 0,
    humidity: 0,
    airQuality: "-",
    fireRiskIndex: 0,
    deviceResponseRate: 0
  },
  advice: {
    level: "low",
    title: "AI 建议",
    content: "正在连接后端数据服务。",
    updatedAt: ""
  },
  demoMode: "normal"
};

export const useTwinStore = create<TwinState>((set, get) => ({
  ...emptySnapshot,
  connected: false,
  sceneViewMode: "overview",
  showSensors: true,
  transparentMode: false,

  loadSnapshot: async () => {
    const snapshot = await api.snapshot();
    get().applySnapshot(snapshot);
  },

  connectRealtime: () => {
    return api.connectRealtime(
      (payload: RealtimePayload) => {
      if (payload.type === "snapshot") {
        get().applySnapshot(payload.data as StateSnapshot);
      }
      if (payload.type === "system_log") {
        if (Array.isArray(payload.data)) {
          set({ logs: payload.data as SystemLog[] });
        } else {
          const log = payload.data as SystemLog;
          set((state) => ({ logs: [log, ...state.logs].slice(0, 160) }));
        }
      }
      },
      (connected) => set({ connected })
    );
  },

  applySnapshot: (snapshot) =>
    set((state) => ({
      ...snapshot,
      selectedBuildingId: snapshot.buildings.some((item) => item.id === state.selectedBuildingId) ? state.selectedBuildingId : undefined,
      selectedSensorId: snapshot.sensors.some((item) => item.id === state.selectedSensorId) ? state.selectedSensorId : undefined
    })),

  selectBuilding: (id) => set({ selectedBuildingId: id, selectedSensorId: undefined }),
  selectSensor: (id) => set({ selectedSensorId: id, selectedBuildingId: undefined }),

  patchBuildingLocal: (id, patch) =>
    set((state) => ({
      buildings: state.buildings.map((building) => (building.id === id ? { ...building, ...patch } : building))
    })),

  saveBuilding: async (id) => {
    const building = get().buildings.find((item) => item.id === id);
    if (!building) return;
    await api.updateBuilding(id, building);
    await get().loadSnapshot();
  },

  resetBuilding: async (id) => {
    await api.resetBuilding(id);
    await get().loadSnapshot();
  },

  patchSensorLocal: (id, patch) =>
    set((state) => ({
      sensors: state.sensors.map((sensor) => (sensor.id === id ? { ...sensor, ...patch } : sensor))
    })),

  saveSensor: async (id) => {
    const sensor = get().sensors.find((item) => item.id === id);
    if (!sensor) return;
    await api.updateSensor(id, sensor);
    await get().loadSnapshot();
  },

  addSensorAt: async (position, floor = 3) => {
    const type = get().sensorPlacementType ?? "temperature";
    const sensor = await api.createSensor({
      type,
      floor,
      areaName: `${floor}F 自定义点位`,
      position: {
        x: Number(position.x.toFixed(2)),
        y: Number((floor * 3.6 + 0.9).toFixed(2)),
        z: Number(position.z.toFixed(2))
      }
    });
    set((state) => ({
      selectedSensorId: sensor.id,
      sensorPlacementType: undefined,
      sensors: [sensor, ...state.sensors]
    }));
  },

  deleteSelectedSensor: async () => {
    const id = get().selectedSensorId;
    if (!id) return;
    await api.deleteSensor(id);
    set((state) => ({ selectedSensorId: undefined, sensors: state.sensors.filter((sensor) => sensor.id !== id) }));
  },

  setSensorPlacementType: (type) => set({ sensorPlacementType: type }),
  setViewMode: (mode) => set({ sceneViewMode: mode }),
  setShowSensors: (visible) => set({ showSensors: visible }),
  setTransparentMode: (enabled) => set({ transparentMode: enabled }),

  setFloorVisible: async (floorId, visible) => {
    set((state) => ({
      floors: state.floors.map((floor: FloorState) => (floor.id === floorId ? { ...floor, visible } : floor))
    }));
    await api.setFloorVisible(floorId, visible);
  },

  startFire: async () => {
    await api.startFire();
    await get().loadSnapshot();
  },
  startFireAtPoint: async (origin, floor = 3) => {
    await api.startFireAtPoint(origin, floor);
    await get().loadSnapshot();
  },
  stopFire: async () => {
    await api.stopFire();
    await get().loadSnapshot();
  },
  setDemoMode: async (mode) => {
    await api.setDemoMode(mode);
    await get().loadSnapshot();
  },
  setExhaust: async (enabled) => {
    await api.setExhaust(enabled);
    await get().loadSnapshot();
  },
  clearLogs: async () => {
    await api.clearLogs();
    set({ logs: [] });
  }
}));
