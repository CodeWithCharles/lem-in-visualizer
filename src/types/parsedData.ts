import type { Room, Link, Move } from './index';

export interface ParsedData {
	rooms: Room[];
	links: Link[];
	numberOfAnts: number;
	moves: Move[];
	turns?: Map<number, { [roomId: string]: number[] }>;
}
