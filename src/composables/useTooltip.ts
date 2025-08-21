import { computed } from 'vue';
import { useUIStore } from '@/stores/useUIStore';

export function useTooltip() {
	const uiStore = useUIStore();

	const tooltipStyle = computed(() => ({
		display: uiStore.showTooltip ? 'block' : 'none',
		left: `${uiStore.tooltipPosition.x + 10}px`,
		top: `${uiStore.tooltipPosition.y + 10}px`,
	}));

	const updateTooltipPosition = (e: MouseEvent) => {
		uiStore.updateTooltipPosition(e.clientX, e.clientY);
	};

	return {
		tooltipStyle,
		tooltipContent: computed(() => uiStore.tooltipContent),
		showTooltip: computed(() => uiStore.showTooltip),
		updateTooltipPosition,
	};
}
