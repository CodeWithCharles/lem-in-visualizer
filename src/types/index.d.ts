import type { NodeObject } from "3d-force-graph";

export interface GraphNode {
  id?: string | number | undefined;
  x?: number;
  y?: number;
  z?: number;
  type?: 'start' | 'end' | 'normal';
  color?: string;
  ants?: number[];
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  source: string | number;
  target: string | number;
  color?: string;
}

export interface Move {
  ant: number;
  room: string;
  turn: number;
}

export interface Room {
  name: string;
  x: number;
  y: number;
  z: number;
  type: 'start' | 'end' | 'normal';
}

export interface Link {
  from: string;
  to: string;
}
export interface Ant {
	id: 		number;
	position:	string;
}

export interface SimStats {
	totalTurns:		number;
	currentTurn:	number;
	totalAnts:		number;
	movingAnts:		number;
	isComplete:		boolean;
}

export interface ParseResults {
	rooms:		number;
	tunnels:	number;
	ants:		number;
	turns:		number;
}
