import type { Room, Link, Ant, Move } from '@/types'
import { ParsedData } from '@/types/parsedData';

export function parseLemin(input: string): ParsedData {
	const parsed = new ParsedData();
	const lines = input.split("\n");

	let currentTurn = 0;
	let section: "rooms" | "links" | "ants" | "moves" | null = null;
	let isStartNext = false;
	let isEndNext = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			if (trimmed == "##start") isStartNext = true;
			else if (trimmed == "##end") isEndNext = true;
			continue;
		}

		if (/^\d+$/.test(trimmed) && parsed.ants.length === 0) {
			const count = parseInt(trimmed, 10);
			for (let i = 1; i <= count; i++) {
				parsed.ants.push({ id: i, position: " "});
			}
			continue;
		}

		if (trimmed.startsWith("L")) {
			currentTurn++;
			const moves = trimmed.split(" ");
			for (const move of moves) {
				const [antPart, room] = move.split("-");
				const antId = parseInt(antPart.slice(1), 10);
				parsed.moves.push({ turn: currentTurn, ant: antId, room: room});
			}
			continue;
		}

		if (trimmed.includes("-")) {
			const [from, to] = trimmed.split("-");
			parsed.links.push({ from, to });
			continue;
		}

		const parts = trimmed.split(" ");
		if (parts.length >= 3) {
			const [id, xs, ys, zs] = parts;
			const room: Room = {
				id,
				x: parseInt(xs, 10),
				y: parseInt(ys, 10),
				z: zs ? parseInt(zs, 10) : null,
				links: [],
			}
			parsed.rooms.push(room);
			if (isStartNext) {
				parsed.start = id;
				isStartNext = false;
			} else if (isEndNext) {
				parsed.end = id;
				isEndNext = false;
			}
		}
	}

	return parsed;
}
