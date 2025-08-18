import type { NodeObject } from "3d-force-graph";

export interface Room {
	id:			string;
	x:			number;
	y:			number;
	z?:			number | null;
	links?:		string[];
}

export interface Link {
	from:		string;
	to:			string;
}

export interface Ant {
	id: 		number;
	position:	string;
}

export interface Move {
	turn:		number;
	ant:		number;
	room:		string;
}

export interface GraphNode extends NodeObject {
	id?:			string | number;
	x?:			number;
	y?:			number;
	z?:			number;
	type?:		"start" | "end" | "normal";
	ants?:		number[];
	color?:		string;
}

export interface GraphLink {
	source:		string;
	target:		string;
}

export interface GraphData {
	nodes:		GraphNode[];
	links:		GraphLink[];
	turns:		Map<number, { [roomId: string]: number[] }>;
}
