import type { EvacuationRoute, FireGridCell, Vector3 } from "../types.js";
import { distance, rounded, vector } from "../utils.js";

interface GraphNode {
  id: string;
  label: string;
  point: Vector3;
  zone: string;
}

interface GraphEdge {
  from: string;
  to: string;
  baseCost: number;
}

const nodes: GraphNode[] = [
  { id: "origin-east-3f", label: "3F 东侧阅览区", point: vector(9, 11.8, -4), zone: "3F-East-Reading" },
  { id: "corridor-center-3f", label: "3F 中央走廊", point: vector(0, 11.8, 0), zone: "3F-Central-Hall" },
  { id: "corridor-south-3f", label: "3F 南侧走廊", point: vector(5, 11.8, 8), zone: "3F-South-Corridor" },
  { id: "stair-west-3f", label: "西侧安全楼梯 3F", point: vector(-12, 11.8, -6), zone: "3F-West-Stair" },
  { id: "stair-south-3f", label: "南侧楼梯 3F", point: vector(8, 11.8, 8), zone: "3F-South-Stair" },
  { id: "stair-west-1f", label: "西侧安全楼梯 1F", point: vector(-12, 2.6, -6), zone: "1F-West-Stair" },
  { id: "stair-south-1f", label: "南侧楼梯 1F", point: vector(8, 2.6, 8), zone: "1F-South-Stair" },
  { id: "exit-west", label: "1F 西门出口", point: vector(-14, 1.2, 15), zone: "1F-West-Exit" },
  { id: "exit-south", label: "1F 南门出口", point: vector(8, 1.2, 18), zone: "1F-South-Exit" },
  { id: "assembly-west", label: "室外安全集合点", point: vector(-8, 0.4, 36), zone: "Outdoor-Assembly" },
  { id: "assembly-plaza", label: "广场集合点", point: vector(12, 0.4, 34), zone: "Plaza-Assembly" }
];

const edges: GraphEdge[] = [
  { from: "origin-east-3f", to: "corridor-center-3f", baseCost: 9 },
  { from: "origin-east-3f", to: "corridor-south-3f", baseCost: 8 },
  { from: "corridor-center-3f", to: "stair-west-3f", baseCost: 13 },
  { from: "corridor-center-3f", to: "stair-south-3f", baseCost: 11 },
  { from: "corridor-south-3f", to: "stair-south-3f", baseCost: 5 },
  { from: "stair-west-3f", to: "stair-west-1f", baseCost: 18 },
  { from: "stair-south-3f", to: "stair-south-1f", baseCost: 16 },
  { from: "stair-west-1f", to: "exit-west", baseCost: 11 },
  { from: "stair-south-1f", to: "exit-south", baseCost: 8 },
  { from: "exit-west", to: "assembly-west", baseCost: 14 },
  { from: "exit-south", to: "assembly-plaza", baseCost: 12 },
  { from: "exit-south", to: "assembly-west", baseCost: 20 }
];

function affectedZonePenalty(zone: string, spread: FireGridCell[]) {
  let penalty = 0;
  for (const cell of spread) {
    const cellDistance = distance(cell.center, zonePoint(zone));
    if (cellDistance < 7 && cell.state === "danger") penalty += 80;
    if (cellDistance < 9 && cell.state === "warning") penalty += 18;
    if (cellDistance < 6 && cell.state === "blocked") penalty += 999;
  }
  return penalty;
}

function zonePoint(zone: string) {
  const found = nodes.find((node) => node.zone === zone);
  return found?.point ?? vector(0, 0, 0);
}

function neighbors(nodeId: string, spread: FireGridCell[], blockedEdge?: string) {
  return edges
    .filter((edge) => edge.from === nodeId || edge.to === nodeId)
    .map((edge) => {
      const to = edge.from === nodeId ? edge.to : edge.from;
      const node = nodes.find((item) => item.id === to)!;
      const edgeKey = [edge.from, edge.to].sort().join(":");
      const blockPenalty = blockedEdge === edgeKey ? 240 : 0;
      return {
        to,
        cost: edge.baseCost + affectedZonePenalty(node.zone, spread) + blockPenalty
      };
    });
}

function shortestPath(spread: FireGridCell[], blockedEdge?: string) {
  const start = "origin-east-3f";
  const targets = new Set(["assembly-west", "assembly-plaza"]);
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const open = new Set(nodes.map((node) => node.id));

  for (const node of nodes) dist.set(node.id, Number.POSITIVE_INFINITY);
  dist.set(start, 0);

  while (open.size > 0) {
    const current = Array.from(open).sort((a, b) => (dist.get(a) ?? 0) - (dist.get(b) ?? 0))[0];
    open.delete(current);

    if (targets.has(current)) break;

    for (const next of neighbors(current, spread, blockedEdge)) {
      if (!open.has(next.to)) continue;
      const alt = (dist.get(current) ?? 0) + next.cost;
      if (alt < (dist.get(next.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(next.to, alt);
        prev.set(next.to, current);
      }
    }
  }

  const target = Array.from(targets).sort((a, b) => (dist.get(a) ?? 0) - (dist.get(b) ?? 0))[0];
  const path = [target];
  let cursor = target;
  while (prev.has(cursor)) {
    cursor = prev.get(cursor)!;
    path.unshift(cursor);
  }

  return { path, cost: dist.get(target) ?? 0 };
}

function toRoute(path: string[], cost: number, type: "primary" | "backup"): EvacuationRoute {
  const routeNodes = path.map((nodeId) => nodes.find((node) => node.id === nodeId)!);
  const distanceValue = routeNodes.reduce((sum, node, index) => {
    if (index === 0) return 0;
    return sum + distance(routeNodes[index - 1].point, node.point);
  }, 0);

  return {
    id: type === "primary" ? "ROUTE-A" : "ROUTE-B",
    name: type === "primary" ? "推荐路线 A" : "备用路线 B",
    type,
    nodes: routeNodes.map((node) => node.id),
    labels: routeNodes.map((node) => node.label),
    points: routeNodes.map((node) => node.point),
    distance: rounded(distanceValue, 1),
    estimatedTime: Math.max(1, Math.round(cost / 1.2)),
    safetyScore: Math.max(42, Math.round(100 - cost * 0.72))
  };
}

export function calculateEvacuationRoutes(spread: FireGridCell[]) {
  const primary = shortestPath(spread);
  const firstBranch = primary.path.length > 2 ? [primary.path[0], primary.path[1]].sort().join(":") : undefined;
  const backup = shortestPath(spread, firstBranch);
  return [toRoute(primary.path, primary.cost, "primary"), toRoute(backup.path, backup.cost, "backup")];
}
