import { defineStore } from "pinia";
import { readonly, computed, ref } from "vue";

export const useSimulationStore = defineStore('simulation', () => {
	const currentTurn = ref<number>(0);
	const isAnimating = ref<boolean>(false);
	const isPaused = ref<boolean>(false);
	const isStepMode = ref<boolean>(false);
	const antPositions = ref<Map<number, string>>(new Map());
	const movingAnts = ref<Set<number>>(new Set());
	const turnNumbers = ref<number[]>([])

	const isSimulationComplete = computed(() =>
		currentTurn.value >= turnNumbers.value.length
	);

	const totalAnts = computed(() => antPositions.value.size);

	const setCurrentTurn = (turn: number) => {
		if (turn < 0 || turn > turnNumbers.value.length) return;
		currentTurn.value = turn;
	};

	const moveAnt = (antId: number, toRoom: string) => {
		antPositions.value.set(antId, toRoom);
		antPositions.value = new Map(antPositions.value);
	};

	const addMovingAnt = (antId: number) => {
		movingAnts.value.add(antId);
		movingAnts.value = new Set(movingAnts.value);
	};

	const removeMovingAnt = (antId: number) => {
		movingAnts.value.delete(antId);
		movingAnts.value = new Set(movingAnts.value);
	};

	const setTurnNumbers = (turns: number[]) => {
		turnNumbers.value = [...turns];
	};

	const reset = () => {
		currentTurn.value = 0;
		isPaused.value = false;
		isStepMode.value = false;
		isAnimating.value = false;
		movingAnts.value.clear();
		movingAnts.value = new Set();
		antPositions.value.clear();
		antPositions.value = new Map();
		turnNumbers.value = [];
	};

	return {
		currentTurn: readonly(currentTurn),
		isAnimating,
		isPaused,
		isStepMode,
		antPositions: readonly(antPositions),
		movingAnts: readonly(movingAnts),
		turnNumbers,

		// Computed
		isSimulationComplete,
		totalAnts,

		// Actions
		setCurrentTurn,
		setTurnNumbers,
		moveAnt,
		addMovingAnt,
		removeMovingAnt,
		reset,
	};
})

