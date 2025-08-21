import { useSimulationStore } from "@/stores/useSimulationStore";
import { useGraphStore } from "@/stores/useGraphStore";
import { AnimationService } from "@/services/AnimationService";
import { type ParsedData } from "@/types/parsedData";
import type { Move, SimStats } from '@/types';
import * as THREE from 'three';
import { ForceGraphService } from "@/services/ForceGraphService";

export class SimulationControlService {
	private simulationStore = useSimulationStore();
	private graphStore = useGraphStore();
	private animationService: AnimationService;
	private forceGraphService: ForceGraphService;
	private parsedData: ParsedData | null = null;

	private readonly TURN_DURATION = 2000;
	private readonly MOVE_DURATION = 1500;

	constructor(animationService: AnimationService, forceGraphService: ForceGraphService) {
		this.animationService = animationService;
		this.forceGraphService = forceGraphService;
	}

	setParsedData(data: ParsedData) {
		this.parsedData = data;
		this.simulationStore.turnNumbers = Array.from(this.graphStore.turns.keys()).sort((a, b) => a - b);

		this.initializeAnts();
	}

	private initializeAnts() {
		if (!this.parsedData || !this.graphStore.startNode) return;
		const startRoomId = this.graphStore.startNode.id as string;

		const antIds = new Set<number>();
		this.parsedData.moves.forEach(move => antIds.add(move.ant));

		antIds.forEach(antId => {
			this.simulationStore.moveAnt(antId, startRoomId);
			this.forceGraphService.createAntMesh(antId);
		});

		this.updateVisualAntPositions();
	}

	async play() {
		this.simulationStore.isPaused = false;
		this.simulationStore.isStepMode = false;

		if (!this.simulationStore.isAnimating) {
			await this.playNextTurn();
		}
	}

	pause() {
		this.simulationStore.isPaused = true;
	}

	async stop() {
		await this.reset();
	}

	async stepForward() {
		if (this.simulationStore.isAnimating) return;

		this.simulationStore.isStepMode = true;
		this.simulationStore.isPaused = false;

		if (this.simulationStore.isSimulationComplete) {
			await this.reset();
			return;
		}

		await this.executeTurn(this.simulationStore.currentTurn);
	}

	async goToTurn(turnIndex: number) {
		if (this.simulationStore.isAnimating) return;

		await this.reset();

		if (turnIndex === 0) return;

		for (let i = 0; i < turnIndex && i < this.simulationStore.turnNumbers.length; i++) {
			const turnNumber = this.simulationStore.turnNumbers[i];
			const moves = this.getMoves(turnNumber);

			moves.forEach(move => {
				this.simulationStore.moveAnt(move.ant, move.room);
			});
		}

		this.simulationStore.setCurrentTurn(turnIndex);
		this.updateVisualAntPositions();
	}

	private async playNextTurn() {
		if (this.simulationStore.isPaused || this.simulationStore.isStepMode) return;

		if (this.simulationStore.isSimulationComplete) {
			setTimeout(async () => {
				if (!this.simulationStore.isPaused && !this.simulationStore.isStepMode) {
					await this.reset();
					setTimeout(() => this.playNextTurn(), 1000);
				}
			}, 2000);
			return;
		}

		await this.executeTurn(this.simulationStore.currentTurn);

		if (!this.simulationStore.isPaused && !this.simulationStore.isStepMode) {
			setTimeout(() => this.playNextTurn(), this.TURN_DURATION - this.MOVE_DURATION);
		}
	}

	private async executeTurn(turnIndex: number) {
		if (this.simulationStore.isAnimating || turnIndex >= this.simulationStore.turnNumbers.length) return;

		this.simulationStore.isAnimating = true;
		const turnNumber = this.simulationStore.turnNumbers[turnIndex];
		const moves = this.getMoves(turnNumber);

		moves.forEach(move => {
			this.simulationStore.addMovingAnt(move.ant);
			this.animationService.pulseAnt(move.ant);
		});

		const movePromises = moves.map(move => this.executeMove(move));

		await Promise.all(movePromises);

		this.updateNodeAntCounts();
		this.simulationStore.setCurrentTurn(turnIndex + 1);
		this.simulationStore.isAnimating = false;
	}

	private async executeMove(move: Move): Promise<void> {
		const currentPos = this.simulationStore.antPositions.get(move.ant);
		if (!currentPos) return;

		const fromPosition = this.graphStore.getRoomPosition(currentPos);
		const toPosition = this.graphStore.getRoomPosition(move.room);

		if (!fromPosition || !toPosition) return;

		const linkId = `${currentPos}-${move.room}`;

		await this.animationService.animateAntMovement(
			move.ant,
			new THREE.Vector3(fromPosition.x, fromPosition.y, fromPosition.z),
			new THREE.Vector3(toPosition.x, toPosition.y, toPosition.z),
			linkId,
			this.MOVE_DURATION
		);

		this.simulationStore.moveAnt(move.ant, move.room);
		this.simulationStore.removeMovingAnt(move.ant);
	}

	private async reset() {
		this.animationService.cancelAllAnimations();
		this.simulationStore.reset();

		if (!this.graphStore.startNode) return;

		const startRoomId = this.graphStore.startNode.id as string;
		this.simulationStore.antPositions.forEach((_, antId) => {
			this.simulationStore.moveAnt(antId, startRoomId);
		});

		this.updateVisualAntPositions();
		this.updateNodeAntCounts();
	}

	private updateVisualAntPositions() {
		const roomAntCount = new Map<string, number>();

		this.simulationStore.antPositions.forEach((roomId, antId) => {
			const position = this.graphStore.getRoomPosition(roomId);
			if (position) {
				const antsInRoom = roomAntCount.get(roomId) || 0;
				const angle = (antsInRoom * Math.PI * 2) / 8;
				const radius = 3 + Math.floor(antsInRoom / 8) * 2;

				this.animationService.positionAntAtRoom(
					antId,
					new THREE.Vector3(position.x, position.y, position.z),
					{ angle, radius }
				);

				roomAntCount.set(roomId, antsInRoom + 1);
			}
		});
	}

	private updateNodeAntCounts() {
		this.graphStore.clearAllNodeAnts();

		const roomAnts = new Map<string, number[]>();
		this.simulationStore.antPositions.forEach((roomId, antId) => {
			if (!roomAnts.has(roomId)) {
				roomAnts.set(roomId, []);
			}
			roomAnts.get(roomId)!.push(antId);
		});
	}

	private getMoves(turnNumber: number): Move[] {
		if (!this.parsedData) return [];
		return this.parsedData.moves.filter(m => m.turn === turnNumber);
	}

	getStats(): SimStats {
		const simStats: SimStats = {
			totalTurns: this.simulationStore.turnNumbers.length,
			currentTurn: this.simulationStore.currentTurn,
			totalAnts: this.simulationStore.totalAnts,
			movingAnts: this.simulationStore.movingAnts.size,
			isComplete: this.simulationStore.isSimulationComplete
		};
		return simStats;
	}
}
