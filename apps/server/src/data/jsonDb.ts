import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { BuildingObject, FloorState, SensorData } from "../types.js";

export interface PersistedState {
  buildings: BuildingObject[];
  sensors: SensorData[];
  floors: FloorState[];
}

const dbFile = resolve(process.cwd(), "mock-data/state.json");

export function loadPersistedState(): PersistedState | null {
  if (!existsSync(dbFile)) return null;

  try {
    return JSON.parse(readFileSync(dbFile, "utf-8")) as PersistedState;
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedState) {
  mkdirSync(dirname(dbFile), { recursive: true });
  writeFileSync(dbFile, JSON.stringify(state, null, 2), "utf-8");
}
