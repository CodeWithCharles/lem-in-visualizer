import type {Ant, Room, Link, Move} from '@/types'

export class ParsedData {
	ants: Ant[];
	rooms: Room[];
	links: Link[];
	moves: Move[];
	start: string;
	end: string;

	constructor() {
		this.ants = [];
		this.rooms = [];
		this.links = [];
		this.moves = [];
		this.start = "";
		this.end = "";
	}
}
