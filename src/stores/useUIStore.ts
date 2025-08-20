import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";

export const useUIStore = defineStore('ui', () => {

	/* --------------------------------- States --------------------------------- */
	const showTooltip = ref<boolean>(false);
	const tooltipContent = ref<string>('');
	const tooltipPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });
	const selectedNode = ref<string | null>(null);
	const hoveredNode = ref<string | null>(null);
	const showCounters = ref<boolean>(true);
	const showControls = ref<boolean>(true);
	const showProgressBar = ref<boolean>(true);
	/* --------------------------- Control panel state -------------------------- */
	const controlPanelVisible = ref<boolean>(true);
	const counterDisplayVisible = ref<boolean>(true);

	/* --------------------------- Camera / view state -------------------------- */
	const cameraPosition = ref<{ x: number; y: number; z: number } | null>(null);
	const cameraTarget = ref<{ x: number; y: number; z: number } | null>(null);
	/* -------------------------- Animation preferences ------------------------- */
	const animationSpeed = ref<number>(1);
	const showTrails = ref<boolean>(false);
	const autoRestart = ref<boolean>(true);

	/* --------------------------- Computed / Getters --------------------------- */
	const isTooltipVisible = computed(() =>
		showTooltip.value && tooltipContent.value.length > 0
	);

	const hasNodeSelected = computed(() =>
		selectedNode.value !== null
	);

	const allUIVisible = computed(() =>
		showCounters.value && showControls.value && showProgressBar.value
	);

	/* --------------------------------- Actions -------------------------------- */
	const showNodeTooltip = (content: string,
		x?: number,
		y?: number) => {
		tooltipContent.value = content;
		showTooltip.value = true;

		if (x !== undefined && y !== undefined) {
			updateTooltipPosition(x, y);
		}
	};

	const hideTooltip = () => {
		showTooltip.value = false;
		tooltipContent.value = '';
	};

	const updateTooltipPosition = (x: number, y: number) => {
		tooltipPosition.value = { x: x + 10, y: y - 10 };
	};

	const setSelectedNode = (nodeId: string | null) => {
		selectedNode.value = nodeId;
	};

	const setHoveredNode = (nodeId: string | null) => {
		hoveredNode.value = nodeId;
	};

	const toggleCounters = () => {
		showCounters.value = !showCounters.value;
	};

	const toggleControls = () => {
		showControls.value = !showControls.value;
	};

	const toggleProgressBar = () => {
		showProgressBar.value = !showProgressBar.value;
	};

	const hideAllUI = () => {
		showCounters.value = false;
		showControls.value = false;
		showProgressBar.value = false;
		controlPanelVisible.value = false;
		counterDisplayVisible.value = false;
	};

	const showAllUI = () => {
		showCounters.value = true;
		showControls.value = true;
		showProgressBar.value = true;
		controlPanelVisible.value = true;
		counterDisplayVisible.value = true;
	};

	const setCameraPosition = (position: { x: number; y: number; z: number }, target?: { x: number; y: number; z: number }) => {
		cameraPosition.value = { ...position };
		if (target) {
			cameraTarget.value = { ...target };
		}
	};

	const setAnimationSpeed = (speed: number) => {
		if (speed <= 0 || speed > 5) return;
		animationSpeed.value = speed;
	};

	const reset = () => {
		showTooltip.value = false;
		tooltipContent.value = '';
		tooltipPosition.value = { x: 0, y: 0 };
		selectedNode.value = null;
		hoveredNode.value = null;
		showCounters.value = true;
		showControls.value = true;
		showProgressBar.value = true;
		controlPanelVisible.value = true;
		counterDisplayVisible.value = true;
		cameraPosition.value = null;
		cameraTarget.value = null;
		animationSpeed.value = 1;
		showTrails.value = false;
		autoRestart.value = true;
	};

	return {
		// State (direct access for simple values, readonly for objects)
		showTooltip,
		tooltipContent: readonly(tooltipContent),
		tooltipPosition: readonly(tooltipPosition),
		selectedNode,
		hoveredNode,
		showCounters,
		showControls,
		showProgressBar,
		controlPanelVisible,
		counterDisplayVisible,
		cameraPosition: readonly(cameraPosition),
		cameraTarget: readonly(cameraTarget),
		animationSpeed,
		showTrails,
		autoRestart,

		// Computed
		isTooltipVisible,
		hasNodeSelected,
		allUIVisible,

		// Actions
		showNodeTooltip,
		hideTooltip,
		updateTooltipPosition,
		setSelectedNode,
		setHoveredNode,
		toggleCounters,
		toggleControls,
		toggleProgressBar,
		hideAllUI,
		showAllUI,
		setCameraPosition,
		setAnimationSpeed,
		reset,
	};

});
