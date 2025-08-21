import { defineStore } from 'pinia';
import { computed, readonly, ref } from "vue";
import type { GraphNode, GraphLink } from '@/types';
import { type ParsedData } from '@/types/parsedData';

export const useGraphStore = defineStore('graph', () => {
	const nodes = ref<GraphNode[]>([]);
	const links = ref<GraphLink[]>([]);
	const turns = ref<Map<number, { [roomId: string]: number[] }>>(new Map());
	const parsedData = ref<ParsedData | null>(null);
	const scale = ref<number>(10);

	const graphCenter = computed(() => {
		if (nodes.value.length === 0) return { x: 0, y: 0, z: 0, size: 0 }

		const xs = nodes.value.map(n => n.x ?? 0);
		const ys = nodes.value.map(n => n.y ?? 0);
		const zs = nodes.value.map(n => n.z ?? 0);

		const minX = Math.min(...xs), maxX = Math.max(...xs);
		const minY = Math.min(...ys), maxY = Math.max(...ys);
		const minZ = Math.min(...zs), maxZ = Math.max(...zs);

		return {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
			z: (minZ + maxZ) / 2,
			size: Math.max(maxX - minX, maxY - minY, maxZ - minZ)
		};
	});

	const startNode = computed(() =>
		nodes.value.find(n => n.type === 'start')
	);

	const endNode = computed(() =>
		nodes.value.find(n => n.type === 'end')
	);

	const totalRooms = computed(() => nodes.value.length);

	const totalConnections = computed(() => links.value.length);

	const setGraphData = (newNodes: GraphNode[], newLinks: GraphLink[], newTurns: Map<number, { [roomId: string]: number[] }>) => {
		nodes.value = newNodes.map(node => ({
			...node,
			x: Number(node.x ?? 0) * scale.value,
			y: Number(node.y ?? 0) * scale.value,
			z: (Number(node.z ?? 0) + Math.random() * 0.5 * newNodes.length) * scale.value,
			type: node.type ?? "normal",
			ants: [],
			color: node.type === 'start' ? 'green' : node.type === 'end' ? 'red' : 'lightblue',
			fx: Number(node.x ?? 0) * scale.value,
			fy: Number(node.y ?? 0) * scale.value,
			fz: (Number(node.z ?? 0) + Math.random() * 0.5 * newNodes.length) * scale.value,
		}));

		links.value = [...newLinks];
		turns.value = new Map(newTurns);
	};

	const updateNodeAnts = (nodeId: string, antIds: number[]) => {
		const node = nodes.value.find(n => n.id === nodeId);
		if (node) {
			node.ants = [...antIds];
		}
	};

	const clearAllNodeAnts = () => {
		nodes.value.forEach(node => {
			node.ants = [];
		});
	};

	const getRoomPosition = (roomId: string) => {
		const room = nodes.value.find(n => n.id === roomId);
		return room ? { x: room.x!, y: room.y!, z: room.z! } : null;
	}

	const setScale = (newScale: number) => {
		if (newScale <= 0) return;

		const scaleRatio = newScale / scale.value;
		scale.value = newScale;

		nodes.value.forEach(node => {
			if (node.x !== undefined) node.x *= scaleRatio;
			if (node.y !== undefined) node.y *= scaleRatio;
			if (node.z !== undefined) node.z *= scaleRatio;
			if (node.fx !== undefined) node.fx *= scaleRatio;
			if (node.fy !== undefined) node.fy *= scaleRatio;
			if (node.fz !== undefined) node.fz *= scaleRatio;
		});
	};

	const reset = () => {
		nodes.value = [];
		links.value = [];
		turns.value.clear();
		turns.value = new Map();
		parsedData.value = null;
		scale.value = 10;
	};

	return {
		// State (readonly for complex objects, direct access for primitives)
		nodes: readonly(nodes),
		links: readonly(links),
		turns: readonly(turns),
		parsedData: readonly(parsedData),
		scale,

		// Computed
		graphCenter,
		startNode,
		endNode,
		totalRooms,
		totalConnections,

		// Actions
		setGraphData,
		updateNodeAnts,
		clearAllNodeAnts,
		getRoomPosition,
		setScale,
		reset,
	};
})
