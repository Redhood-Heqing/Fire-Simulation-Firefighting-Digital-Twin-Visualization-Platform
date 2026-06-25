import type { AffectedZones, FireEvent, FireGridCell, RiskLevel, SensorData, Vector3 } from "../types.js";
import { clamp, distance, id, nowIso, rounded, vector } from "../utils.js";

const zoneByGrid = (floor: number, x: number, z: number) => `${floor}F-${x < 5 ? "West" : x > 7 ? "East" : "Central"}-${z > 5 ? "South" : "Hall"}`;

export function createFire(origin?: Partial<Vector3>, floor = 3): FireEvent {
  return {
    id: `FIRE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id("EVT").slice(-3)}`,
    status: "active",
    origin: {
      x: origin?.x ?? 9,
      y: origin?.y ?? floor * 3.6 + 0.8,
      z: origin?.z ?? -4
    },
    floor,
    areaName: "图书馆 3F 东侧阅览区",
    startTime: nowIso(),
    riskLevel: "high",
    spreadStep: 0,
    affectedZones: ["3F-East-Reading"]
  };
}

export function buildSpreadGrid(fire: FireEvent, exhaustEnabled = false): FireGridCell[] {
  if (fire.status === "inactive") return [];

  const cells: FireGridCell[] = [];
  const maxRadius = exhaustEnabled ? 3.3 + fire.spreadStep * 0.78 : 4 + fire.spreadStep * 1.08;
  const floors = [fire.floor - 1, fire.floor, fire.floor + 1].filter((floor) => floor >= 1 && floor <= 5);

  for (const floor of floors) {
    for (let x = 0; x < 12; x += 1) {
      for (let z = 0; z < 10; z += 1) {
        const center = vector(-13.2 + x * 2.4, floor * 3.6 + 0.25, -9 + z * 2.1);
        const floorPenalty = floor === fire.floor ? 0 : 2.6;
        const d = distance({ ...center, y: fire.origin.y }, fire.origin) + floorPenalty;
        const heat = clamp(115 - d * 10 + fire.spreadStep * 8, 20, 260);
        const smoke = clamp(900 - d * 55 + fire.spreadStep * 44, 0, 1600);
        let state: FireGridCell["state"] = "safe";

        if (d < maxRadius * 0.48) state = "danger";
        else if (d < maxRadius * 0.78) state = "warning";
        if (state !== "safe" && z === 4 && x > 8 && fire.spreadStep > 4) state = "blocked";

        if (state !== "safe") {
          cells.push({
            id: `${floor}-${x}-${z}`,
            floor,
            gridX: x,
            gridZ: z,
            center,
            state,
            heat: rounded(heat),
            smoke: rounded(smoke)
          });
        }
      }
    }
  }

  return cells;
}

function riskFromStep(step: number): RiskLevel {
  if (step > 9) return "critical";
  if (step > 4) return "high";
  if (step > 1) return "medium";
  return "low";
}

export function advanceFire(fire: FireEvent, exhaustEnabled = false): FireEvent {
  if (fire.status !== "active") return fire;
  const nextStep = fire.spreadStep + 1;
  const grid = buildSpreadGrid({ ...fire, spreadStep: nextStep }, exhaustEnabled);
  const affectedZones = Array.from(new Set(grid.map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ)))).slice(0, 12);
  return {
    ...fire,
    spreadStep: nextStep,
    riskLevel: riskFromStep(nextStep),
    affectedZones
  };
}

export function calculateAffectedZones(fire: FireEvent, spread: FireGridCell[]): AffectedZones {
  if (fire.status === "inactive") {
    return {
      fireId: fire.id,
      origin: "无",
      affectedFloors: [],
      dangerZones: [],
      warningZones: [],
      blockedZones: [],
      estimatedAffectedPeople: 0,
      riskLevel: "low"
    };
  }

  const dangerZones = Array.from(new Set(spread.filter((cell) => cell.state === "danger").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));
  const warningZones = Array.from(new Set(spread.filter((cell) => cell.state === "warning").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));
  const blockedZones = Array.from(new Set(spread.filter((cell) => cell.state === "blocked").map((cell) => zoneByGrid(cell.floor, cell.gridX, cell.gridZ))));

  return {
    fireId: fire.id,
    origin: fire.areaName,
    affectedFloors: Array.from(new Set(spread.map((cell) => cell.floor))).sort(),
    dangerZones,
    warningZones,
    blockedZones,
    estimatedAffectedPeople: 48 + dangerZones.length * 18 + warningZones.length * 7,
    riskLevel: fire.riskLevel
  };
}

export function sensorFireValue(sensor: SensorData, fire: FireEvent) {
  if (fire.status !== "active") return null;

  const d = distance(sensor.position, fire.origin);
  const floorFactor = sensor.floor === fire.floor ? 1 : 0.45;
  const impact = clamp((18 - d) / 18, 0, 1) * floorFactor;
  const stepFactor = 1 + fire.spreadStep * 0.16;

  if (impact <= 0.02) return null;

  if (sensor.type === "temperature") return rounded(27 + impact * 74 * stepFactor);
  if (sensor.type === "smoke") return rounded(18 + impact * 850 * stepFactor);
  if (sensor.type === "aiRisk") return rounded(24 + impact * 80 * stepFactor);
  if (sensor.type === "alarm" && impact > 0.26) return "active";
  if (sensor.type === "waterPressure") return rounded(0.5 + impact * 0.18, 2);
  return null;
}

export function statusFromReading(sensor: SensorData): SensorData["status"] {
  if (Math.random() < 0.004) return "offline";
  if (sensor.type === "temperature" && Number(sensor.value) > 62) return "danger";
  if (sensor.type === "temperature" && Number(sensor.value) > 38) return "warning";
  if (sensor.type === "smoke" && Number(sensor.value) > 520) return "danger";
  if (sensor.type === "smoke" && Number(sensor.value) > 80) return "warning";
  if (sensor.type === "aiRisk" && Number(sensor.value) > 78) return "danger";
  if (sensor.type === "alarm" && sensor.value === "active") return "danger";
  if (sensor.type === "energy" && Number(sensor.value) > 62) return "warning";
  return "normal";
}
