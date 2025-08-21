// import type { Ant, Move, GraphData, GraphNode, GraphLink } from "@/types";
// import { type ParsedData } from "@/types/parsedData";

// export function parsedDataTo3DForceGraph(parsed: ParsedData): GraphData {
// 	const nodes: GraphNode[] = parsed.rooms.map(r => ({
// 		id: r.id,
// 		x: r.x,
// 		y: r.y,
// 		z: r.z ?? 0,
// 		type: r.id === parsed.start ? "start": r.id === parsed.end ? "end" : "normal",
// 		ants: [],
// 	}));

// 	const links: GraphLink[] = parsed.links.map(l => ({
// 		source: l.from,
// 		target: l.to,
// 	}));

// 	const turns: Map<number, {[ roomId: string]: number[] }> = new Map();

// 	for (const move of parsed.moves) {
// 		const prevTurn = turns.get(move.turn - 1) || {};
// 		const newTurn: { [roomId: string]: number[] } = {};
// 		for (const [roomId, antIds] of Object.entries(prevTurn)) {
// 			newTurn[roomId] = [...antIds];
// 		}

// 		for (const [roomId, antIds] of Object.entries(newTurn)) {
// 			const idx = antIds.indexOf(move.ant);
// 			if (idx >= 0) antIds.splice(idx, 1);
// 		}

// 		if (!newTurn[move.room]) newTurn[move.room] = [];
// 		newTurn[move.room].push(move.ant);

// 		turns.set(move.turn, newTurn);
// 	}
// 	return {nodes, links, turns};
// }
