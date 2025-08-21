<template>
	<div class="control-panel">
		<!-- Playback Controls -->
		<div class="control-section">
			<h3>Simulation Controls</h3>
			<div class="control-buttons">
				<button @click="play" :disabled="!canPlay" class="control-btn play-btn"
					:class="{ active: !simulationStore.isPaused && simulationStore.isAnimating }">
					▶️ Play
				</button>

				<button @click="pause" class="control-btn pause-btn" :class="{ active: simulationStore.isPaused }">
					⏸️ Pause
				</button>

				<button @click="stop" :disabled="!canStop" class="control-btn stop-btn">
					⏹️ Stop
				</button>

				<button @click="step" :disabled="!canStep" class="control-btn step-btn">
					⏭️ Step
				</button>
			</div>
		</div>

		<!-- Progress Controls -->
		<div class="control-section">
			<div class="progress-header">
				<span>Turn: {{ currentTurnDisplay }}</span>
				<span>{{ simulationStats.currentTurn }}/{{ simulationStats.totalTurns }}</span>
			</div>

			<div class="progress-container">
				<input type="range" :min="0" :max="simulationStore.turnNumbers.length"
					:value="simulationStore.currentTurn" @input="handleProgressChange" class="progress-slider"
					:disabled="simulationStore.isAnimating" />
				<div class="progress-track">
					<div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
				</div>
			</div>
		</div>

		<!-- Statistics -->
		<div class="control-section stats-section">
			<div class="stats-grid">
				<div class="stat-item">
					<span class="stat-label">Total Ants:</span>
					<span class="stat-value">{{ simulationStats.totalAnts }}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Moving Ants:</span>
					<span class="stat-value moving">{{ simulationStats.movingAnts }}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Rooms:</span>
					<span class="stat-value">{{ graphStore.totalRooms }}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Tunnels:</span>
					<span class="stat-value">{{ graphStore.totalConnections }}</span>
				</div>
			</div>
		</div>

		<!-- Animation Speed -->
		<div class="control-section">
			<label class="speed-label">
				Animation Speed: {{ uiStore.animationSpeed }}x
				<input type="range" :min="0.1" :max="3" :step="0.1" v-model="uiStore.animationSpeed"
					class="speed-slider" />
			</label>
		</div>

		<!-- Keyboard Shortcuts -->
		<div class="keyboard-hints">
			<div class="shortcuts-title">Keyboard Shortcuts:</div>
			<div class="shortcuts-grid">
				<span>Space</span><span>Play/Pause</span>
				<span>→</span><span>Step Forward</span>
				<span>←</span><span>Step Back</span>
				<span>R</span><span>Reset</span>
				<span>Home</span><span>Go to Start</span>
				<span>End</span><span>Go to End</span>
			</div>
		</div>

		<!-- Status Indicator -->
		<div class="status-indicator" :class="statusClass">
			<div class="status-dot"></div>
			<span>{{ statusText }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { type Ref, inject, computed } from 'vue';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSimulationControls } from '@/composables/useSimulationControls';
import type { SimulationControlService } from '@/services/SimulationControlService';

const simulationStore = useSimulationStore();
const graphStore = useGraphStore();
const uiStore = useUIStore();

const simulationControlService = inject<Ref<SimulationControlService | null>>('simulationControlService')!;

const {
	canPlay,
	canStep,
	canStop,
	currentTurnDisplay,
	progressPercentage,
	simulationStats,
	play,
	pause,
	stop,
	step,
	goToTurn,
} = useSimulationControls(simulationControlService);

const handleProgressChange = (e: Event) => {
	const target = e.target as HTMLInputElement;
	const turnIndex = parseInt(target.value);
	goToTurn(turnIndex);
};

const statusClass = computed(() => {
	if (simulationStore.isAnimating) return 'status-running';
	if (simulationStore.isPaused) return 'status-paused';
	if (simulationStore.isSimulationComplete) return 'status-complete';
	return 'status-ready';
});

const statusText = computed(() => {
	if (simulationStore.isAnimating) return 'Running';
	if (simulationStore.isPaused) return 'Paused';
	if (simulationStore.isSimulationComplete) return 'Complete';
	return 'Ready';
});
</script>

<style scoped>
.control-panel {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(0, 0, 0, 0.95);
	color: white;
	padding: 20px;
	border-radius: 15px;
	font-family: 'Courier New', monospace;
	border: 2px solid #00ffff;
	display: flex;
	flex-direction: column;
	gap: 15px;
	min-width: 450px;
	max-width: 600px;
	box-shadow: 0 10px 30px rgba(0, 255, 255, 0.3);
}

.control-section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.control-section h3 {
	margin: 0;
	color: #00ffff;
	font-size: 14px;
	text-align: center;
}

.control-buttons {
	display: flex;
	gap: 8px;
	justify-content: center;
}

.control-btn {
	background: #222;
	color: #00ffff;
	border: 1px solid #00ffff;
	padding: 8px 16px;
	border-radius: 5px;
	cursor: pointer;
	font-family: 'Courier New', monospace;
	font-size: 12px;
	font-weight: bold;
	transition: all 0.2s;
	min-width: 80px;
}

.control-btn:hover:not(:disabled) {
	background: #00ffff;
	color: black;
	box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.control-btn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.control-btn.active {
	background: #00ffff;
	color: black;
}

.progress-header {
	display: flex;
	justify-content: space-between;
	color: #00ffff;
	font-size: 12px;
	margin-bottom: 5px;
}

.progress-container {
	position: relative;
}

.progress-slider {
	width: 100%;
	height: 20px;
	background: transparent;
	outline: none;
	cursor: pointer;
	position: relative;
	z-index: 2;
	opacity: 0;
}

.progress-track {
	position: absolute;
	top: 50%;
	left: 0;
	right: 0;
	height: 8px;
	background: #333;
	border-radius: 4px;
	transform: translateY(-50%);
	border: 1px solid #555;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #00ffff, #0099cc);
	border-radius: 4px;
	transition: width 0.3s ease;
}

.stats-section {
	background: rgba(0, 255, 255, 0.1);
	padding: 10px;
	border-radius: 8px;
	border: 1px solid rgba(0, 255, 255, 0.3);
}

.stats-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.stat-item {
	display: flex;
	justify-content: space-between;
	font-size: 12px;
}

.stat-label {
	color: #aaa;
}

.stat-value {
	color: #00ffff;
	font-weight: bold;
}

.stat-value.moving {
	color: #ff6b6b;
	animation: pulse 1s infinite;
}

@keyframes pulse {

	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.6;
	}
}

.speed-label {
	display: flex;
	flex-direction: column;
	gap: 5px;
	font-size: 12px;
	color: #00ffff;
}

.speed-slider {
	background: #333;
	height: 6px;
	border-radius: 3px;
	outline: none;
	cursor: pointer;
}

.keyboard-hints {
	background: rgba(0, 0, 0, 0.5);
	padding: 10px;
	border-radius: 5px;
	border: 1px solid #333;
}

.shortcuts-title {
	color: #00ffff;
	font-size: 12px;
	margin-bottom: 8px;
	text-align: center;
}

.shortcuts-grid {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 4px 12px;
	font-size: 10px;
	color: #888;
}

.shortcuts-grid span:nth-child(odd) {
	color: #00ffff;
	font-weight: bold;
}

.status-indicator {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	padding: 5px 10px;
	border-radius: 15px;
	align-self: center;
}

.status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.status-ready .status-dot {
	background: #4caf50;
}

.status-running .status-dot {
	background: #ff9800;
	animation: pulse 1s infinite;
}

.status-paused .status-dot {
	background: #ffc107;
}

.status-complete .status-dot {
	background: #2196f3;
}
</style>
