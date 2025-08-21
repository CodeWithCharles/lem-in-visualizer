import * as THREE from 'three';
import { ForceGraphService } from './ForceGraphService';
// import { useUIStore } from '@/stores/useUIStore';

export class AnimationService {
	private forceGraphService: ForceGraphService;
	// private uiStore = useUIStore();
	private activeAnimations = new Map<number, { cancel: () => void}>();

	constructor(forceGraphService: ForceGraphService) {
		this.forceGraphService = forceGraphService;
	}

	animateAntMovement(
		antId: number,
		fromPos: THREE.Vector3,
		toPos: THREE.Vector3,
		linkId: string,
		duration: number
	): Promise<void> {
		return new Promise((resolve) => {
			const ant = this.forceGraphService.getAntMesh(antId);
			if (!ant) return resolve();

			const startTime = Date.now();
			const curve = this.forceGraphService.getTubeCurve(linkId);
			let animationId: number;

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const easeProgress = 1 - Math.pow(1 - progress, 3);

				if (curve) {
					const point = curve.getPoint(easeProgress);
					const tubeRadius = 1.2;
					const randomAngle = (antId * 0.5) % (Math.PI * 2);
					const offsetRadius = tubeRadius * 0.3;

					point.x += Math.cos(randomAngle + progress * Math.PI * 2) * offsetRadius;
					point.z += Math.sin(randomAngle + progress * Math.PI * 2) * offsetRadius;
					ant.position.copy(point);
				} else {
					const x = fromPos.x + (toPos.x - fromPos.x) * easeProgress;
					const z = fromPos.z + (toPos.z - fromPos.z) * easeProgress;
					const y = fromPos.y + (toPos.y - fromPos.y) * easeProgress +
						Math.sin(easeProgress * Math.PI) * 5;

					ant.position.set(x, y, z);
				}

				if (progress < 1) {
					animationId = requestAnimationFrame(animate);
				} else {
					this.activeAnimations.delete(antId);
					resolve();
				}
			};

			this.activeAnimations.set(antId, {
				cancel: () => {
					if (animationId) cancelAnimationFrame(animationId);
					this.activeAnimations.delete(antId);
					resolve();
				}
			});

			animationId = requestAnimationFrame(animate);
		});
	}

	positionAntAtRoom(antId: number, position: THREE.Vector3, offset?: { angle: number, radius: number }) {
		const ant = this.forceGraphService.getAntMesh(antId);
		if (!ant) return;

		if (offset) {
			ant.position.set(
				position.x + Math.cos(offset.angle) * offset.radius,
				position.y + 2,
				position.z + Math.sin(offset.angle) * offset.radius
			);
		} else {
			ant.position.copy(position);
			ant.position.y += 2;
		}
	}

	cancelAntAnimation(antId: number) {
		const animation = this.activeAnimations.get(antId);
		if (animation) {
			animation.cancel();
		}
	}

	cancelAllAnimations() {
		this.activeAnimations.forEach(animation => animation.cancel());
		this.activeAnimations.clear();
	}

	pulseAnt(antId: number) {
		const ant = this.forceGraphService.getAntMesh(antId);
		if (!ant) return;

		const originalScale = ant.scale.x;
		const startTime = Date.now();
		const duration = 500;

		const pulse = () => {
			const elapsed = Date.now() - startTime;
			const progress = elapsed / duration;

			if (progress < 1) {
				const scale = originalScale * Math.sin(progress * Math.PI * 4) * 0.3;
				ant.scale.setScalar(scale);
				requestAnimationFrame(pulse);
			} else {
				ant.scale.setScalar(originalScale);
			}
		};

		pulse();
	}
}
