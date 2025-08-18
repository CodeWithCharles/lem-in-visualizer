<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { parsedDataTo3DForceGraph } from './utils/converter';
import { parseLemin } from './utils/parser';
import type { GraphNode } from '@/types';
import { ParsedData } from './types/parsedData';

const SCALE = 10; // Increased scale for better visibility
let autoPlay = false;

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

	// --- Node rendering with ants and hover labels ---
	Graph.nodeThreeObject(node => {
		const group = new THREE.Group();

		// Base node sphere - made larger for better visibility
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(2), // Increased size
			new THREE.MeshStandardMaterial({ color: node.color })
		);
		group.add(sphere);

		// Only render ant spheres above node if it's NOT the start room
		// For start room, ants are shown as individual ant objects in the scene
		if (node.ants && node.ants.length > 0 && node.type !== 'start') {
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

	// --- Add hover tooltip functionality ---
	const tooltip = document.createElement('div');
	tooltip.style.cssText = `
		position: absolute;
		background: rgba(0, 0, 0, 0.9);
		color: white;
		padding: 8px 12px;
		border-radius: 5px;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		pointer-events: none;
		z-index: 1001;
		border: 1px solid #00ffff;
		display: none;
	`;
	document.body.appendChild(tooltip);

	Graph
		.onNodeHover((node, prevNode) => {
			// Only show tooltip for actual room nodes, not ant objects
			if (node && node.id) {
				const nodeType = node.type === 'start' ? ' (START)' : node.type === 'end' ? ' (END)' : '';
				tooltip.innerHTML = `Room: ${node.id}${nodeType}`;
				tooltip.style.display = 'block';
			} else {
				tooltip.style.display = 'none';
			}
		})
		.onNodeClick((node) => {
			if (node && node.id) {
				console.log('Clicked node:', node.id);
			}
		});

	// Update tooltip position on mouse move
	document.addEventListener('mousemove', (e) => {
		tooltip.style.left = (e.clientX + 10) + 'px';
		tooltip.style.top = (e.clientY - 10) + 'px';
	});

	// --- Create tube-like links with proper bidirectional handling ---
	const tubeObjects = new Map<string, { tube: THREE.Mesh, curve: THREE.LineCurve3 }>();

	Graph
		.linkColor(() => 'transparent') // Hide default links
		.linkWidth(0)
		.linkOpacity(0)
		.linkDirectionalParticles(0)
		.linkThreeObject(link => {
			const sourceNode = nodes.find(n => n.id === link.source);
			const targetNode = nodes.find(n => n.id === link.target);

			if (!sourceNode || !targetNode) return new THREE.Object3D();

			// Create tube geometry
			const start = new THREE.Vector3(sourceNode.x!, sourceNode.y!, sourceNode.z!);
			const end = new THREE.Vector3(targetNode.x!, targetNode.y!, targetNode.z!);

			// Create a path for the tube
			const curve = new THREE.LineCurve3(start, end);
			const tubeGeometry = new THREE.TubeGeometry(curve, 20, 1.2, 8, false);

			// Create semi-transparent tube material
			const tubeMaterial = new THREE.MeshStandardMaterial({
				color: 0x00ffff,
				opacity: 0.3,
				transparent: true,
				side: THREE.DoubleSide,
				emissive: 0x002222
			});

			const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

			// Store tube for ant movement calculations (both directions with same curve)
			const linkKey1 = `${link.source}-${link.target}`;
			const linkKey2 = `${link.target}-${link.source}`;

			tubeObjects.set(linkKey1, { tube, curve });
			tubeObjects.set(linkKey2, { tube, curve: new THREE.LineCurve3(end, start) }); // Reversed curve

			return tube;
		});

	// --- Set initial graph data ---
	Graph.graphData({ nodes, links });

	// --- Position camera for better view (rotated 180°) ---
	setTimeout(() => {
		if (Graph) {
			Graph.cameraPosition(
				{ x: 0, y: 0, z: -100 }, // Camera position (flipped z)
				{ x: 0, y: 0, z: 0 },    // Look at center
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

	// --- Turn-based ant movement system with comprehensive controls ---
	let currentTurn = 0; // 0 = default state, 1 = first turn executed, etc.
	let isAnimating = false;
	let isPaused = false;
	let isStopped = false;
	let isStepMode = false;
	const turnNumbers = Array.from(turns.keys()).sort((a, b) => a - b);
	const TURN_DURATION = 2000; // 2 seconds per turn
	const MOVE_DURATION = 1500; // 1.5 seconds for ant movement

	// Track ant positions and movements
	const antObjects = new Map<number, THREE.Mesh>();
	const antPositions = new Map<number, string>(); // antId -> roomId
	const movingAnts = new Set<number>(); // Track which ants are currently moving

	// Counter and control elements
	const createCounterDisplay = () => {
		const counterDiv = document.createElement('div');
		counterDiv.id = 'ant-counters';
		counterDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      z-index: 1000;
      border: 2px solid #00ffff;
    `;
		document.body.appendChild(counterDiv);
		return counterDiv;
	};

	const createControlPanel = () => {
		const controlDiv = document.createElement('div');
		controlDiv.id = 'control-panel';
		controlDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 15px;
      font-family: 'Courier New', monospace;
      z-index: 1000;
      border: 2px solid #00ffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      min-width: 400px;
    `;

		const buttonStyle = `
      background: #00ffff;
      color: black;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      transition: all 0.2s;
    `;

		const sliderStyle = `
      width: 300px;
      height: 8px;
      border-radius: 4px;
      background: #333;
      outline: none;
      cursor: pointer;
    `;

		controlDiv.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="play-btn" style="${buttonStyle}">▶️ Play</button>
        <button id="pause-btn" style="${buttonStyle}">⏸️ Pause</button>
        <button id="stop-btn" style="${buttonStyle}">⏹️ Stop</button>
        <button id="step-btn" style="${buttonStyle}">⏭️ Step</button>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
        <input type="range" id="progress-slider" min="0" max="${turnNumbers.length}" value="0" style="${sliderStyle}">
        <div style="color: #00ffff; font-size: 14px;">Progress: <span id="progress-text">0 / ${turnNumbers.length}</span></div>
      </div>
      <div style="color: #888; font-size: 12px; text-align: center;">
        Space: Play/Pause • Arrow Keys: Step • R: Reset
      </div>
    `;

		document.body.appendChild(controlDiv);
		return controlDiv;
	};

	const counterDisplay = createCounterDisplay();
	const controlPanel = createControlPanel();

	const updateCounters = () => {
		const startRoomId = nodes.find(n => n.type === 'start')?.id;
		const endRoomId = nodes.find(n => n.type === 'end')?.id;

		let atStart = 0;
		let traveling = movingAnts.size;
		let atEnd = 0;

		antPositions.forEach((roomId, antId) => {
			if (!movingAnts.has(antId)) {
				if (roomId === startRoomId) atStart++;
				else if (roomId === endRoomId) atEnd++;
			}
		});

		// Display turn number correctly: 0 for default state, actual turn number for executed turns
		const displayTurn = currentTurn === 0 ? 'Start' : turnNumbers[currentTurn - 1] || 0;

		counterDisplay.innerHTML = `
      <div style="margin-bottom: 8px; color: #00ff00;">🟢 At Start: ${atStart}</div>
      <div style="margin-bottom: 8px; color: #ffff00;">🔄 Traveling: ${traveling}</div>
      <div style="color: #ff0000;">🏁 At End: ${atEnd}</div>
      <div style="margin-top: 10px; color: #00ffff;">Turn: ${displayTurn}</div>
    `;

		// Update progress bar: 0 for default state, 1 for first turn executed, etc.
		const progressSlider = document.getElementById('progress-slider') as HTMLInputElement;
		const progressText = document.getElementById('progress-text') as HTMLElement;
		if (progressSlider && progressText) {
			progressSlider.value = currentTurn.toString();
			progressText.textContent = `${currentTurn} / ${turnNumbers.length}`;
		}
	};

	// Control functions
	const resetSimulation = () => {
		isStopped = true;
		isPaused = false;
		isStepMode = false;
		currentTurn = 0; // Reset to default state
		movingAnts.clear();

		const startRoom = nodes.find(n => n.type === 'start');
		if (startRoom) {
			antPositions.forEach((_, antId) => {
				antPositions.set(antId, startRoom.id as string);
				const ant = antObjects.get(antId);
				if (ant) {
					ant.position.set(startRoom.x!, startRoom.y! + 2, startRoom.z!);
				}
			});
		}

		// Reset node display
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

		updateCounters();
	};

	const play = () => {
		isStopped = false;
		isPaused = false;
		isStepMode = false;
		if (!isAnimating) {
			playNextTurn();
		}
	};

	const pause = () => {
		isPaused = true;
	};

	const stop = () => {
		resetSimulation();
	};

	const stepForward = async () => {
		if (isAnimating) return;
		isStepMode = true;
		isPaused = false;
		isStopped = false;

		// Check if we've completed all turns
		if (currentTurn >= turnNumbers.length) {
			resetSimulation();
			return;
		}

		// Execute the next turn (currentTurn is 0-indexed for turnNumbers array)
		await executeTurn(currentTurn);
		currentTurn++; // Increment after executing

		// If we've completed all turns, don't reset automatically in step mode
		// User can manually reset or continue stepping will reset
	};

	const goToTurn = async (turnIndex: number) => {
		if (isAnimating) return;

		resetSimulation();

		// If turnIndex is 0, we're already at default state
		if (turnIndex === 0) {
			return;
		}

		// Execute turns up to the target (turnIndex represents completed turns)
		for (let i = 0; i < turnIndex && i < turnNumbers.length; i++) {
			const turnNumber = turnNumbers[i];
			const moves = parsed.moves.filter(m => m.turn === turnNumber);

			// Apply moves instantly without animation
			moves.forEach(move => {
				antPositions.set(move.ant, move.room);
			});
		}

		currentTurn = turnIndex;

		// Update node display
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

		// Update ant positions visually
		antPositions.forEach((roomId, antId) => {
			const ant = antObjects.get(antId);
			const room = getRoomPosition(roomId);
			if (ant && room) {
				ant.position.set(room.x, room.y + 2, room.z);
			}
		});

		Graph?.graphData({ nodes, links });
		updateCounters();
	};

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
			new THREE.SphereGeometry(0.6), // Slightly smaller to fit in tubes
			new THREE.MeshStandardMaterial({
				color: `hsl(${(i * 137.508) % 360}, 70%, 60%)`, // Different color per ant
				emissive: `hsl(${(i * 137.508) % 360}, 30%, 20%)` // Slight glow
			})
		);

		// Position ant at start room with slight offset to avoid overlap
		if (startRoom) {
			const angle = (i / parsed.ants.length) * Math.PI * 2;
			const radius = 1.5; // Small radius around the start room
			ant.position.set(
				startRoom.x! + Math.cos(angle) * radius,
				startRoom.y! + 2,
				startRoom.z! + Math.sin(angle) * radius
			);
		}

		scene_ant.add(ant);
		antObjects.set(i, ant);
	}

	// Function to get room position by ID
	const getRoomPosition = (roomId: string) => {
		const room = nodes.find(n => n.id === roomId);
		return room ? { x: room.x!, y: room.y!, z: room.z! } : null;
	};

	// Function to animate ant movement inside tubes
	const moveAnt = (antId: number, fromRoom: string, toRoom: string, duration: number) => {
		const ant = antObjects.get(antId);
		const fromPos = getRoomPosition(fromRoom);
		const toPos = getRoomPosition(toRoom);

		if (!ant || !fromPos || !toPos) return;

		const startTime = Date.now();

		// Get the correct directional curve
		const linkKey = `${fromRoom}-${toRoom}`;
		const tubeData = tubeObjects.get(linkKey);

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Smooth easing function
			const easeProgress = 1 - Math.pow(1 - progress, 3);

			if (tubeData) {
				// Move ant through the tube using the correct directional curve
				const point = tubeData.curve.getPoint(easeProgress);

				// Add slight random offset within tube radius for variety
				const tubeRadius = 1.2;
				const randomAngle = (antId * 0.5) % (Math.PI * 2); // Consistent per ant
				const offsetRadius = tubeRadius * 0.3;

				point.x += Math.cos(randomAngle + progress * Math.PI * 2) * offsetRadius;
				point.z += Math.sin(randomAngle + progress * Math.PI * 2) * offsetRadius;

				ant.position.copy(point);
			} else {
				// Fallback: direct path with arc
				const startPos = { ...fromPos, y: fromPos.y + 3 };
				const endPos = { ...toPos, y: toPos.y + 3 };

				const x = startPos.x + (endPos.x - startPos.x) * easeProgress;
				const z = startPos.z + (endPos.z - startPos.z) * easeProgress;
				const y = startPos.y + (endPos.y - startPos.y) * easeProgress +
					Math.sin(easeProgress * Math.PI) * 5; // Arc height

				ant.position.set(x, y, z);
			}

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

		// Mark ants as moving and update counters
		moves.forEach(move => movingAnts.add(move.ant));
		updateCounters();

		// Start all movements for this turn
		const movePromises = moves.map(move => {
			return new Promise<void>((resolve) => {
				const currentPos = antPositions.get(move.ant);
				if (currentPos) {
					moveAnt(move.ant, currentPos, move.room, MOVE_DURATION);

					// Update position after movement completes
					setTimeout(() => {
						antPositions.set(move.ant, move.room);
						movingAnts.delete(move.ant);
						resolve();
					}, MOVE_DURATION);
				} else {
					resolve();
				}
			});
		});

		// Wait for all movements to complete
		await Promise.all(movePromises);

		// Update node display (show ants on nodes)
		nodes.forEach(node => {
			node.ants = [];
		});

		antPositions.forEach((roomId, antId) => {
			if (!movingAnts.has(antId)) {
				const node = nodes.find(n => n.id === roomId);
				if (node) {
					if (!node.ants) node.ants = [];
					node.ants.push(antId);
				}
			}
		});

		Graph?.graphData({ nodes, links });
		updateCounters();

		isAnimating = false;
	};

	// Auto-play turns
	const playNextTurn = async () => {
		if (isPaused || isStopped || isStepMode || turnNumbers.length === 0) return;

		// Check if we've completed all turns
		if (currentTurn >= turnNumbers.length) {
			// Pause for a moment before restarting
			setTimeout(() => {
				if (!isPaused && !isStopped && !isStepMode) {
					resetSimulation();
					setTimeout(() => {
						if (!isPaused && !isStopped && !isStepMode) {
							playNextTurn();
						}
					}, 1000);
				}
			}, 2000);
			return;
		}

		await executeTurn(currentTurn);
		currentTurn++;

		if (!isPaused && !isStopped && !isStepMode) {
			setTimeout(playNextTurn, TURN_DURATION - MOVE_DURATION);
		}
	};

	// Event listeners for controls
	const setupControlListeners = () => {
		const playBtn = document.getElementById('play-btn');
		const pauseBtn = document.getElementById('pause-btn');
		const stopBtn = document.getElementById('stop-btn');
		const stepBtn = document.getElementById('step-btn');
		const progressSlider = document.getElementById('progress-slider') as HTMLInputElement;

		playBtn?.addEventListener('click', play);
		pauseBtn?.addEventListener('click', pause);
		stopBtn?.addEventListener('click', stop);
		stepBtn?.addEventListener('click', stepForward);

		progressSlider?.addEventListener('input', (e) => {
			const target = e.target as HTMLInputElement;
			const turnIndex = parseInt(target.value);
			goToTurn(turnIndex);
		});

		// Keyboard controls
		document.addEventListener('keydown', (e) => {
			switch (e.key) {
				case ' ':
					e.preventDefault();
					if (isPaused || isStopped) {
						play();
					} else {
						pause();
					}
					break;
				case 'ArrowRight':
					e.preventDefault();
					stepForward();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					if (currentTurn > 0) {
						goToTurn(currentTurn - 1);
					}
					break;
				case 'r':
				case 'R':
					e.preventDefault();
					stop();
					break;
			}
		});
	};

	setupControlListeners();

	// Initialize display
	// Reset to ensure we start in default state
	resetSimulation();

	// Start the animation if there are turns
	if (turnNumbers.length > 0) {
		setTimeout(() => {
			if (!isPaused && !isStopped && !isStepMode) {
				playNextTurn();
			}
		}, 1000);
	}

	// Add controls (optional auto-play toggle)
	window.addEventListener('keydown', (e) => {
		if (e.key === ' ' && e.ctrlKey) {
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
	<div id="3d-graph" ref="graphContainer" style="width: 100%; height: 100vh; background: #000;"></div>
</template>
