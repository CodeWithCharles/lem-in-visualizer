<template>
	<div class="main-app">
		<!-- File Upload Screen -->
		<div v-if="!graphData" class="upload-screen">
			<div class="app-header">
				<h1>🐜 Ant Farm Visualizer</h1>
				<p>Visualize ant colony pathfinding in 3D space</p>
			</div>

			<FileUpload @file-loaded="handleFileLoaded" @file-error="handleFileError" />

			<div v-if="errorMessage" class="error-message">
				<div class="error-icon">⚠️</div>
				<div class="error-text">{{ errorMessage }}</div>
			</div>
		</div>

		<!-- Main Visualization -->
		<div v-else class="visualization-screen">
			<GraphVisualization ref="graphVisualization" @graph-ready="handleGraphReady" />

			<SimulationControls v-if="isGraphReady" />

			<!-- Info Panel -->
			<div class="info-panel">
				<div class="panel-section">
					<h4>Graph Info</h4>
					<div class="info-grid">
						<span>Rooms:</span><span>{{ graphStore.totalRooms }}</span>
						<span>Tunnels:</span><span>{{ graphStore.totalConnections }}</span>
						<span>Start:</span><span>{{ graphStore.startNode?.id || 'None' }}</span>
						<span>End:</span><span>{{ graphStore.endNode?.id || 'None' }}</span>
					</div>
				</div>

				<div class="panel-section">
					<h4>Simulation</h4>
					<div class="info-grid">
						<span>Ants:</span><span>{{ simulationStore.totalAnts }}</span>
						<span>Status:</span><span :class="statusClass">{{ simulationStatus }}</span>
					</div>
				</div>

				<div class="panel-actions">
					<button @click="resetVisualization" class="panel-btn">
						🔄 New File
					</button>
					<button @click="exportData" class="panel-btn" :disabled="!canExport">
						💾 Export
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGraphStore } from '@/stores/useGraphStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { type ParsedData } from '@/types/parsedData';
import GraphVisualization from '@/components/GraphVisualization.vue';
import SimulationControls from '@/components/SimulationControls.vue';
import FileUpload from '@/components/FileUpload.vue';

const graphStore = useGraphStore();
const simulationStore = useSimulationStore();

const graphVisualization = ref<InstanceType<typeof GraphVisualization> | null>(null);
const graphData = ref<ParsedData | null>(null);
const errorMessage = ref<string>('');
const isGraphReady = ref<boolean>(false);

const simulationStatus = computed(() => {
	if (simulationStore.isAnimating) return 'Running';
	if (simulationStore.isPaused) return 'Paused';
	if (simulationStore.isSimulationComplete) return 'Complete';
	return 'Ready';
});

const statusClass = computed(() => ({
	'status-running': simulationStore.isAnimating,
	'status-paused': simulationStore.isPaused,
	'status-complete': simulationStore.isSimulationComplete,
	'status-ready': !simulationStore.isAnimating && !simulationStore.isPaused && !simulationStore.isSimulationComplete,
}));

const canExport = computed(() => graphData.value !== null);

const handleFileLoaded = async (data: ParsedData) => {
	try {
		graphData.value = data;
		errorMessage.value = '';

		// Process the data into graph format
		const nodes = data.rooms.map(room => ({
			id: room.id,
			x: room.x,
			y: room.y,
			z: room.z,
			type: room.type,
			color: room.type === 'start' ? '#4CAF50' : room.type === 'end' ? '#F44336' : '#2196F3',
			ants: [],
		}));

		const links = data.links.map(link => ({
			source: link.from,
			target: link.to,
		}));

		// Update stores
		graphStore.setGraphData(nodes, links, data.turns || new Map());

		// Initialize simulation with parsed data
		await nextTick();
		if (graphVisualization.value?.simulationControlService) {
			graphVisualization.value.simulationControlService.setParsedData(data);
		}

	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : 'Failed to process file data';
	}
};

const handleFileError = (error: string) => {
	errorMessage.value = error;
};

const handleGraphReady = () => {
	isGraphReady.value = true;
};

const resetVisualization = () => {
	graphStore.reset();
	simulationStore.reset();
	graphData.value = null;
	errorMessage.value = '';
	isGraphReady.value = false;
};

const exportData = () => {
	if (!graphData.value) return;

	const dataStr = JSON.stringify(graphData.value, null, 2);
	const dataBlob = new Blob([dataStr], { type: 'application/json' });
	const url = URL.createObjectURL(dataBlob);

	const link = document.createElement('a');
	link.href = url;
	link.download = 'ant-farm-data.json';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

onMounted(() => {
	// Initialize any global settings
	document.title = 'Ant Farm Visualizer';
});
</script>

<style scoped>
.main-app {
	width: 100vw;
	height: 100vh;
	background: linear-gradient(135deg, #000000, #001122, #000000);
	color: white;
	font-family: 'Courier New', monospace;
	overflow: hidden;
}

.upload-screen {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	padding: 20px;
	background: radial-gradient(circle at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
}

.app-header {
	text-align: center;
	margin-bottom: 40px;
}

.app-header h1 {
	font-size: 48px;
	margin: 0 0 20px 0;
	background: linear-gradient(45deg, #00ffff, #0099cc);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
}

.app-header p {
	font-size: 18px;
	color: #aaa;
	margin: 0;
}

.error-message {
	margin-top: 20px;
	padding: 15px 20px;
	background: rgba(255, 68, 68, 0.1);
	border: 1px solid #ff4444;
	border-radius: 8px;
	display: flex;
	align-items: center;
	gap: 10px;
	max-width: 500px;
}

.error-icon {
	font-size: 20px;
}

.error-text {
	color: #ff6666;
	font-size: 14px;
}

.visualization-screen {
	position: relative;
	width: 100%;
	height: 100%;
}

.info-panel {
	position: fixed;
	top: 20px;
	left: 20px;
	background: rgba(0, 0, 0, 0.9);
	border: 1px solid #00ffff;
	border-radius: 10px;
	padding: 15px;
	min-width: 200px;
	font-size: 12px;
}

.panel-section {
	margin-bottom: 15px;
}

.panel-section:last-child {
	margin-bottom: 0;
}

.panel-section h4 {
	margin: 0 0 8px 0;
	color: #00ffff;
	font-size: 14px;
	border-bottom: 1px solid #333;
	padding-bottom: 4px;
}

.info-grid {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 4px 10px;
	font-size: 11px;
}

.info-grid span:nth-child(odd) {
	color: #aaa;
}

.info-grid span:nth-child(even) {
	color: #00ffff;
	font-weight: bold;
	text-align: right;
}

.status-running {
	color: #ff9800 !important;
}

.status-paused {
	color: #ffc107 !important;
}

.status-complete {
	color: #4caf50 !important;
}

.status-ready {
	color: #00ffff !important;
}

.panel-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.panel-btn {
	background: rgba(0, 255, 255, 0.2);
	border: 1px solid #00ffff;
	color: #00ffff;
	padding: 6px 12px;
	border-radius: 4px;
	cursor: pointer;
	font-family: 'Courier New', monospace;
	font-size: 10px;
	transition: all 0.2s;
	text-align: center;
}

.panel-btn:hover:not(:disabled) {
	background: rgba(0, 255, 255, 0.4);
}

.panel-btn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

/* Global scrollbar styling */
:global(::-webkit-scrollbar) {
	width: 8px;
}

:global(::-webkit-scrollbar-track) {
	background: #222;
}

:global(::-webkit-scrollbar-thumb) {
	background: #00ffff;
	border-radius: 4px;
}

:global(::-webkit-scrollbar-thumb:hover) {
	background: #0099cc;
}
</style>
