<template>
	<div ref="graphContainer" class="graph-container" @mousemove="updateTooltipPosition">
		<!-- Tooltip -->
		<div v-show="showTooltip" class="tooltip" :style="tooltipStyle">
			<pre>{{ tooltipContent }}</pre>
		</div>

		<!-- Loading indicator -->
		<div v-if="!isInitialized" class="loading">
			<div class="loading-spinner"></div>
			<p>Loading 3D Graph...</p>
		</div>

		<!-- Camera controls help -->
		<div class="camera-help">
			<p>🖱️ Drag to rotate • 🖱️ Right-click drag to pan • 🎯 Scroll to zoom</p>
		</div>

		<!-- Graph controls -->
		<div class="graph-controls">
			<button @click="resetCamera" class="control-btn">
				🎯 Reset View
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide, nextTick } from 'vue';
import { useGraphVisualization } from '@/composables/useGraphVisualization';
import { useTooltip } from '@/composables/useTooltip';

const graphContainer = ref<HTMLElement | null>(null);

const {
	forceGraphService,
	animationService,
	simulationControlService,
	isInitialized,
	initializeGraph,
	handleResize,
	resetCamera,
} = useGraphVisualization(graphContainer);

const {
	tooltipStyle,
	tooltipContent,
	showTooltip,
	updateTooltipPosition,
} = useTooltip();

// Provide services to child components
provide('forceGraphService', forceGraphService);
provide('animationService', animationService);
provide('simulationControlService', simulationControlService);

onMounted(async () => {
	await nextTick();
	initializeGraph();
});

// Expose methods for parent components
defineExpose({
	resetCamera,
	handleResize,
	simulationControlService,
});
</script>

<style scoped>
.graph-container {
	width: 100%;
	height: 100vh;
	background: linear-gradient(45deg, #000000, #001122);
	position: relative;
	overflow: hidden;
}

.loading {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	color: #00ffff;
	font-family: 'Courier New', monospace;
}

.loading-spinner {
	width: 50px;
	height: 50px;
	border: 3px solid #333;
	border-top: 3px solid #00ffff;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin: 0 auto 20px;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}

	100% {
		transform: rotate(360deg);
	}
}

.tooltip {
	position: fixed;
	background: rgba(0, 0, 0, 0.9);
	color: #00ffff;
	padding: 8px 12px;
	border-radius: 6px;
	font-family: 'Courier New', monospace;
	font-size: 12px;
	border: 1px solid #00ffff;
	pointer-events: none;
	z-index: 1000;
	max-width: 200px;
	white-space: pre-wrap;
}

.camera-help {
	position: absolute;
	top: 20px;
	left: 20px;
	color: rgba(255, 255, 255, 0.7);
	font-family: 'Courier New', monospace;
	font-size: 12px;
	background: rgba(0, 0, 0, 0.5);
	padding: 10px;
	border-radius: 5px;
}

.graph-controls {
	position: absolute;
	top: 20px;
	right: 20px;
	display: flex;
	gap: 10px;
}

.control-btn {
	background: rgba(0, 255, 255, 0.2);
	border: 1px solid #00ffff;
	color: #00ffff;
	padding: 8px 12px;
	border-radius: 5px;
	cursor: pointer;
	font-family: 'Courier New', monospace;
	font-size: 12px;
	transition: all 0.2s;
}

.control-btn:hover {
	background: rgba(0, 255, 255, 0.4);
}
</style>
