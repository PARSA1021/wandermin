import { getCity, LEGS, type Leg } from "@/data";
import { haversineKm } from "@/lib/geo";

export type Graph = Map<string, Map<string, number>>;

export function legDistanceKm(fromId: string, toId: string): number {
  return haversineKm(getCity(fromId), getCity(toId));
}

/** Undirected flight graph; edge weight = great-circle distance in km. */
export function buildGraph(legs: readonly Leg[] = LEGS): Graph {
  const g: Graph = new Map();
  const link = (a: string, b: string, km: number) => {
    if (!g.has(a)) g.set(a, new Map());
    g.get(a)!.set(b, km);
  };
  for (const { from, to } of legs) {
    const km = legDistanceKm(from, to);
    link(from, to, km);
    link(to, from, km);
  }
  return g;
}

export const GRAPH = buildGraph();

export function hasLeg(a: string, b: string, graph: Graph = GRAPH): boolean {
  return graph.get(a)?.has(b) ?? false;
}

/** Shortest flight path (Dijkstra). Returns city ids from `from` to `to` inclusive, or null. */
export function shortestPath(from: string, to: string, graph: Graph = GRAPH): string[] | null {
  if (from === to) return [from];
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([from]);
  while (open.size) {
    let cur = "";
    let best = Infinity;
    for (const id of open) {
      const d = dist.get(id)!;
      if (d < best) { best = d; cur = id; }
    }
    open.delete(cur);
    if (cur === to) break;
    for (const [next, km] of graph.get(cur) ?? []) {
      const nd = best + km;
      if (nd < (dist.get(next) ?? Infinity)) {
        dist.set(next, nd);
        prev.set(next, cur);
        open.add(next);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

/** Guided mode: nearest directly-connected cities not yet visited. */
export function suggestNext(
  currentId: string,
  visited: ReadonlySet<string>,
  count: number,
  graph: Graph = GRAPH,
): { cityId: string; km: number }[] {
  return [...(graph.get(currentId) ?? [])]
    .filter(([id]) => !visited.has(id))
    .sort((a, b) => a[1] - b[1])
    .slice(0, count)
    .map(([cityId, km]) => ({ cityId, km }));
}
