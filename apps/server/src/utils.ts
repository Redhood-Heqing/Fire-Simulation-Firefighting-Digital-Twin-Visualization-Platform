import { customAlphabet } from "nanoid";
import type { Vector3 } from "./types.js";

const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export function id(prefix: string) {
  return `${prefix}-${nanoid()}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number, digits = 1) {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(digits));
}

export function int(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function choice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function nowIso() {
  return new Date().toISOString();
}

export function clock() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

export function distance(a: Vector3, b: Vector3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function vector(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

export function rounded(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}
