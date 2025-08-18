<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { parsedDataTo3DForceGraph } from './utils/converter';
import { parseLemin } from './utils/parser';
import type { GraphNode } from '@/types';
import { ParsedData } from './types/parsedData';

const SCALE = 10; // Increased scale for better visibility

// --- Parse input ---
const parsed: ParsedData = parseLemin(`2
1 0 2
##start
0 2 0
##end
4 2 6
2 4 2
3 4 4
0-1
0-2
2-3
3-4
4-1
L1-1
L1-4 L2-1
L2-4`);

const { nodes, links, turns } = parsedDataTo3DForceGraph(parsed);

// --- Ensure numeric coordinates and default values ---
nodes.forEach(node => {
	node.x = Number(node.x ?? 0) * SCALE;
	node.y = Number(node.y ?? 0) * SCALE;
	node.z = Number(node.z ?? 0) * SCALE;
	node.type = node.type ?? "normal";
	node.ants = [];
	node.color = node.type === 'start' ? 'green' : node.type === 'end' ? 'red' : 'lightblue';

	// Add fixed positions - this is crucial!
	node.fx = node.x;
	node.fy = node.y;
	node.fz = node.z;
});

// --- Graph container ---
const graphContainer = ref<HTMLDivElement | null>(null);
let Graph: ForceGraph3DInstance<GraphNode, any> | null = null;

onMounted(() => {
	if (!graphContainer.value) return;

	Graph = new ForceGraph3D(graphContainer.value);

	// --- Completely disable physics simulation ---
	Graph
		.d3Force('charge', null)
		.d3Force('center', null)
		.d3Force('link', null)
		.numDimensions(3)
		.enableNodeDrag(false)
		.enableNavigationControls(true);

	// --- Node rendering with ants ---
	Graph.nodeThreeObject(node => {
		const group = new THREE.Group();

		// Base node sphere - made larger for better visibility
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(2), // Increased size
			new THREE.MeshStandardMaterial({ color: node.color })
		);
		group.add(sphere);

		// Add node label
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (context) {
			canvas.width = 64;
			canvas.height = 64;
			context.fillStyle = 'white';
			context.font = '12px Arial';
			context.textAlign = 'center';
			context.fillText(String(node.id), 32, 32);
		}

		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.position.set(0, 3, 0);
		sprite.scale.set(4, 4, 1);
		group.add(sprite);

		// Render ants above node in a circle
		if (node.ants && node.ants.length > 0) {
			node.ants.forEach((antId, i) => {
				const ant = new THREE.Mesh(
					new THREE.SphereGeometry(0.5),
					new THREE.MeshStandardMaterial({ color: 'orange' })
				);
				const angle = (i / (node.ants?.length ?? 0)) * Math.PI * 2;
				ant.position.x = Math.cos(angle) * 3;
				ant.position.y = 4;
				ant.position.z = Math.sin(angle) * 3;
				group.add(ant);
			});
		}

		return group;
	});

	// --- Enhanced link rendering ---
	Graph
		.linkColor(() => 'white')
		.linkWidth(2)
		.linkOpacity(0.8)
		.linkDirectionalParticles(0)
		.linkThreeObject(link => {
			// Create a custom link with better visibility
			const material = new THREE.LineBasicMaterial({
				color: 'cyan',
				linewidth: 3,
				opacity: 0.9,
				transparent: true
			});

			const geometry = new THREE.BufferGeometry();
			return new THREE.Line(geometry, material);
		})
		.linkPositionUpdate((obj, coords) => {
			const { start, end } = coords;
			if (obj instanceof THREE.Line) {
				const positions = [start.x, start.y, start.z, end.x, end.y, end.z];
				obj.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
			}
		});

	// --- Set initial graph data ---
	Graph.graphData({ nodes, links });

	// --- Position camera for better view ---
	setTimeout(() => {
		if (Graph) {
			Graph.cameraPosition(
				{ x: 0, y: 0, z: 100 }, // Camera position
				{ x: 0, y: 0, z: 0 },   // Look at center
				1000 // Animation duration
			);
		}
	}, 100);

	// --- Add better lighting ---
	const scene = Graph.scene();
	scene.add(new THREE.AmbientLight(0x404040, 0.6));
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
	directionalLight.position.set(1, 1, 1);
	scene.add(directionalLight);

	// --- Turn-based ant movement system ---
	let currentTurn = 0;
	let isAnimating = false;
	const turnNumbers = Array.from(turns.keys()).sort((a, b) => a - b);
	const TURN_DURATION = 2000; // 2 seconds per turn
	const MOVE_DURATION = 1500; // 1.5 seconds for ant movement

	// Track ant positions and movements
	const antObjects = new Map<number, THREE.Mesh>();
	const antPositions = new Map<number, string>(); // antId -> roomId

	// Initialize ants at start position
	const startRoom = nodes.find(n => n.type === 'start');
	if (startRoom) {
		for (let i = 1; i <= parsed.ants.length; i++) {
			antPositions.set(i, startRoom.id as string);
		}
	}

	// Create ant objects in the scene
	const scene_ant = Graph.scene();
	for (let i = 1; i <= parsed.ants.length; i++) {
		const ant = new THREE.Mesh(
			new THREE.SphereGeometry(0.8),
			new THREE.MeshStandardMaterial({
				color: `hsl(${(i * 137.508) % 360}, 70%, 60%)` // Different color per ant
			})
		);

		// Position ant at start room
		if (startRoom) {
			ant.position.set(startRoom.x!, startRoom.y! + 3, startRoom.z!);
		}

		scene_ant.add(ant);
		antObjects.set(i, ant);
	}

	// Function to get room position by ID
	const getRoomPosition = (roomId: string) => {
		const room = nodes.find(n => n.id === roomId);
		return room ? { x: room.x!, y: room.y!, z: room.z! } : null;
	};

	// Function to animate ant movement
	const moveAnt = (antId: number, fromRoom: string, toRoom: string, duration: number) => {
		const ant = antObjects.get(antId);
		const fromPos = getRoomPosition(fromRoom);
		const toPos = getRoomPosition(toRoom);

		if (!ant || !fromPos || !toPos) return;

		const startTime = Date.now();
		const startPos = { ...fromPos, y: fromPos.y + 3 };
		const endPos = { ...toPos, y: toPos.y + 3 };

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Smooth easing function
			const easeProgress = 1 - Math.pow(1 - progress, 3);

			// Interpolate position with a slight arc for better visibility
			const x = startPos.x + (endPos.x - startPos.x) * easeProgress;
			const z = startPos.z + (endPos.z - startPos.z) * easeProgress;
			const y = startPos.y + (endPos.y - startPos.y) * easeProgress +
				Math.sin(easeProgress * Math.PI) * 5; // Arc height

			ant.position.set(x, y, z);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		animate();
	};

	// Function to execute a turn
	const executeTurn = async (turnIndex: number) => {
		if (isAnimating || turnIndex >= turnNumbers.length) return;

		isAnimating = true;
		const turnNumber = turnNumbers[turnIndex];
		const moves = parsed.moves.filter(m => m.turn === turnNumber);

		console.log(`Turn ${turnNumber}:`, moves);

		// Start all movements for this turn
		const movePromises = moves.map(move => {
			return new Promise<void>((resolve) => {
				const currentPos = antPositions.get(move.ant);
				if (currentPos) {
					moveAnt(move.ant, currentPos, move.room, MOVE_DURATION);
					antPositions.set(move.ant, move.room);
				}
				setTimeout(resolve, MOVE_DURATION);
			});
		});

		// Wait for all movements to complete
		await Promise.all(movePromises);

		// Update node display (show ants on nodes)
		nodes.forEach(node => {
			node.ants = [];
		});

		antPositions.forEach((roomId, antId) => {
			const node = nodes.find(n => n.id === roomId);
			if (node) {
				if (!node.ants) node.ants = [];
				node.ants.push(antId);
			}
		});

		Graph?.graphData({ nodes, links });

		isAnimating = false;
	};

	// Auto-play turns
	let autoPlay = true;
	const playNextTurn = async () => {
		if (!autoPlay || turnNumbers.length === 0) return;

		await executeTurn(currentTurn);
		currentTurn = (currentTurn + 1) % turnNumbers.length;

		// If we've completed all turns, pause for a moment before restarting
		if (currentTurn === 0) {
			setTimeout(() => {
				if (autoPlay) {
					// Reset all ants to start position
					const startRoom = nodes.find(n => n.type === 'start');
					if (startRoom) {
						antPositions.forEach((_, antId) => {
							antPositions.set(antId, startRoom.id as string);
							const ant = antObjects.get(antId);
							if (ant) {
								ant.position.set(startRoom.x!, startRoom.y! + 3, startRoom.z!);
							}
						});
					}
					setTimeout(playNextTurn, 1000);
				}
			}, 2000);
		} else {
			setTimeout(playNextTurn, TURN_DURATION - MOVE_DURATION);
		}
	};

	// Start the animation
	if (turnNumbers.length > 0) {
		setTimeout(playNextTurn, 1000);
	}

	// Add controls (optional - you can remove this if not needed)
	window.addEventListener('keydown', (e) => {
		if (e.key === ' ') {
			autoPlay = !autoPlay;
			if (autoPlay && !isAnimating) {
				playNextTurn();
			}
			console.log('Auto-play:', autoPlay ? 'ON' : 'OFF');
		}
	});
});
</script>

<template>
	<div id="3d-graph" ref="graphContainer" style="width: 100vh; height: 100vh; background: #000;"></div>
</template>
