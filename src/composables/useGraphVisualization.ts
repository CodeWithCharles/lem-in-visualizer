import { type Ref, ref, computed, onMounted, onUnmounted, watch, readonly } from 'vue';
import { useGraphStore } from '@/stores/useGraphStore';
import { ForceGraphService } from '@/services/ForceGraphService';
import { AnimationService } from '@/services/AnimationService';
import { SimulationControlService } from '@/services/SimulationControlService';
import type { ForceGraph3DInstance } from '3d-force-graph';

export function useGraphVisualization(container: Ref<HTMLElement | null>) {
	const graphStore = useGraphStore();
	const forceGraphService = ref<ForceGraphService | null>(null);
	const animationService = ref<AnimationService | null>(null);
	const simulationControlService = ref<SimulationControlService | null>(null);
	const forceGraphInstance = ref<ForceGraph3DInstance<any, any> | null>(null);

	const isInitialized = computed(() => forceGraphService.value !== null);

	const initializeGraph = () => {
		if (!container.value || forceGraphService.value) return;

		// Initialize services - create actual class instances
		const forceGraphServiceInstance = new ForceGraphService();
		forceGraphService.value = forceGraphServiceInstance;

		if (!forceGraphServiceInstance) return;
		forceGraphInstance.value = forceGraphServiceInstance.initialize(container.value);

		// Pass the actual class instances, not the reactive refs
		const animationServiceInstance = new AnimationService(forceGraphServiceInstance);
		animationService.value = animationServiceInstance;

		const simulationControlServiceInstance = new SimulationControlService(
			animationServiceInstance,
			forceGraphServiceInstance
		);
		simulationControlService.value = simulationControlServiceInstance;

		setupGraphData();
		setupCamera();
	};

	const setupGraphData = () => {
		if (!forceGraphService.value || graphStore.nodes.length === 0) return;

		// Create mutable copies of the readonly arrays
		const mutableNodes = [...graphStore.nodes].map(node => ({
			...node,
			ants: node.ants ? [...node.ants] : undefined // Make ants array mutable if it exists
		}));
		const mutableLinks = [...graphStore.links];

		forceGraphService.value.updateGraphData(mutableNodes, mutableLinks);
	};

	const setupCamera = () => {
		if (!forceGraphService.value) return;

		// Wait for graph to settle
		setTimeout(() => {
			forceGraphService.value?.centerCamera();
		}, 500);
	};

	const handleResize = () => {
		if (!forceGraphInstance.value || !container.value) return;

		const { clientWidth, clientHeight } = container.value;
		forceGraphInstance.value
			.width(clientWidth)
			.height(clientHeight);
	};

	const focusOnNode = (nodeId: string) => {
		forceGraphService.value?.focusOnNode(nodeId);
	};

	const resetCamera = () => {
		forceGraphService.value?.centerCamera();
	};

	// Watch for graph data changes
	watch(() => [graphStore.nodes, graphStore.links], () => {
		setupGraphData();
	}, { deep: true });

	onMounted(() => {
		window.addEventListener('resize', handleResize);
	});

	onUnmounted(() => {
		window.removeEventListener('resize', handleResize);
		forceGraphService.value?.dispose();
	});

	return {
		forceGraphService: readonly(forceGraphService),
		animationService: readonly(animationService),
		simulationControlService: readonly(simulationControlService),
		forceGraphInstance: readonly(forceGraphInstance),
		isInitialized,
		initializeGraph,
		handleResize,
		focusOnNode,
		resetCamera,
	};
}
