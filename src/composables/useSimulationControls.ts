import { type Ref, computed, onMounted, onUnmounted } from 'vue';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { useUIStore } from '@/stores/useUIStore';
import { SimulationControlService } from '@/services/SimulationControlService';

export function useSimulationControls(controlService: Ref<SimulationControlService | null>) {
	const simulationStore = useSimulationStore();
	const uiStore = useUIStore();

	const canPlay = computed(() =>
		controlService.value && !simulationStore.isAnimating && (simulationStore.isPaused || !simulationStore.isSimulationComplete)
	);

	const canStep = computed(() =>
		controlService.value && !simulationStore.isAnimating
	);

	const canStop = computed(() =>
		controlService.value && (simulationStore.currentTurn > 0 || simulationStore.isAnimating)
	);

	const progressPercentage = computed(() => {
		if (simulationStore.turnNumbers.length === 0) return 0;
		return (simulationStore.currentTurn / simulationStore.turnNumbers.length) * 100;
	});

	const currentTurnDisplay = computed(() => {
		if (simulationStore.currentTurn === 0) return 'Start';
		if (simulationStore.currentTurn >= simulationStore.turnNumbers.length) return 'Complete';
		return simulationStore.turnNumbers[simulationStore.currentTurn - 1] || 0;
	});

	const simulationStats = computed(() => {
		return controlService.value?.getStats() || {
			totalTurns: 0,
			currentTurn: 0,
			totalAnts: 0,
			movingAnts: 0,
			isComplete: false
		};
	});

	const handleKeyboard = (e: KeyboardEvent) => {
		if (!controlService.value) return;

		switch (e.key) {
			case ' ':
				e.preventDefault();
				if (simulationStore.isPaused || !simulationStore.isAnimating) {
					controlService.value.play();
				} else {
					controlService.value.pause();
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				controlService.value.stepForward();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (simulationStore.currentTurn > 0) {
					controlService.value.goToTurn(simulationStore.currentTurn - 1);
				}
				break;
			case 'r':
			case 'R':
				e.preventDefault();
				controlService.value.stop();
				break;
			case 'Home':
				e.preventDefault();
				controlService.value.goToTurn(0);
				break;
			case 'End':
				e.preventDefault();
				controlService.value.goToTurn(simulationStore.turnNumbers.length);
				break;
		}
	};

	const play = () => controlService.value?.play();
	const pause = () => controlService.value?.pause();
	const stop = () => controlService.value?.stop();
	const step = () => controlService.value?.stepForward();
	const goToTurn = (turnIndex: number) => controlService.value?.goToTurn(turnIndex);

	onMounted(() => {
		document.addEventListener('keydown', handleKeyboard);
	});

	onUnmounted(() => {
		document.removeEventListener('keydown', handleKeyboard);
	});

	return {
		// Computed state
		canPlay,
		canStep,
		canStop,
		progressPercentage,
		currentTurnDisplay,
		simulationStats,

		// Control actions
		play,
		pause,
		stop,
		step,
		goToTurn,
	};
}
