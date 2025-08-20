import * as THREE from 'three';
import type { GraphNode, GraphLink } from '@/types';
import type { ForceGraph3DInstance } from '3d-force-graph';
import { useGraphStore } from '@/stores/useGraphStore';
import { useUIStore } from '@/stores/useUIStore';
import ForceGraph3D from '3d-force-graph';

export class ForceGraphService {
	private graph: ForceGraph3DInstance<GraphNode, any> | null = null;
	private graphStore = useGraphStore();
	private uiStore = useUIStore();
	private antObjects = new Map<number, THREE.Mesh>();
	private nodeObjects = new Map<string, THREE.Group>();
	private tubeObjects = new Map<string, { tube: THREE.Mesh, curve: THREE.CatmullRomCurve3 }>();

	initialize(container: HTMLElement | null): ForceGraph3DInstance<GraphNode, any> | null {
		if (!container) return null;
		this.graph = new ForceGraph3D(container);
		this.setupGraph();
		this.setupInteractions();
		return this.graph;
	}

	private setupGraph() {
		if (!this.graph) return;

		this.graph
			.d3Force('charge', null)
			.d3Force('center', null)
			.d3Force('link', null)
			.numDimensions(3)
			.enableNodeDrag(false)
			.enableNavigationControls(true)
			.nodeThreeObject(this.createNodeObject.bind(this))
			.linkThreeObject(this.createLinkObject.bind(this))
		// .linkPositionUpdate((obj, { start, end }) => {
		// 	this.updateTubeGeometry(obj, start, end)
		// });
	}

	private setupInteractions() {
		if (!this.graph) return;

		this.graph
			.onNodeHover((node, prevNode) => {
				if (node && node.id) {
					this.uiStore.showNodeTooltip(`Room: ${node.id}\nType: ${node.type || 'normal'}\nAnts: ${node.ants?.length || 0}`, node.x, node.y);
				} else {
					this.uiStore.hideTooltip();
				}
			})
			.onNodeClick((node) => {
				if (node && node.id) {
					this.focusOnNode(node.id as string);
				}
			})
	}

	private createNodeObject(node: GraphNode): THREE.Group {
		const group = new THREE.Group();

		const geometry = new THREE.SphereGeometry(node.type === 'start' || node.type === 'end' ? 3 : 2);
		const material = new THREE.MeshStandardMaterial({
			color: node.color || 'lightblue',
			emissive: new THREE.Color(node.color || 'lightblue').multiplyScalar(0.2)
		});
		const sphere = new THREE.Mesh(geometry, material);
		group.add(sphere);

		if (node.type === 'start' || node.type === 'end') {
			const glowGeometry = new THREE.SphereGeometry(4);
			const glowMaterial = new THREE.MeshBasicMaterial({
				color: node.color || 'lightblue',
				transparent: true,
				opacity: 0.2
			});
			const glow = new THREE.Mesh(glowGeometry, glowMaterial);
			group.add(glow);
		}

		this.nodeObjects.set(node.id as string, group);
		return group;
	}

	private createLinkObject(link: GraphLink): THREE.Mesh {
		const sourceNode = this.graphStore.nodes.find(n => n.id === link.source);
		const targetNode = this.graphStore.nodes.find(n => n.id === link.target);

		if (!sourceNode || !targetNode) {
			return new THREE.Mesh();
		}

		const start = new THREE.Vector3(sourceNode.x!, sourceNode.y!, sourceNode.z!);
		const end = new THREE.Vector3(targetNode.x!, targetNode.y!, targetNode.z!);

		const midPoint = new THREE.Vector3().addVectors(start, end);
		const distance = start.distanceTo(end);
		midPoint.y += distance * 0.1;

		const curve = new THREE.CatmullRomCurve3([start, midPoint, end]);
		const tubeGeometry = new THREE.TubeGeometry(curve, 20, 1.2, 8, false);
		const tubeMaterial = new THREE.MeshStandardMaterial({
			color: 0x00ffff,
			opacity: 0.3,
			transparent: true,
			side: THREE.DoubleSide,
			emissive: 0x002222
		});

		const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
		const linkId = `${link.source}-${link.target}`;
		this.tubeObjects.set(linkId, { tube, curve });

		return tube;
	}

	// private updateTubeGeometry();

	updateGraphData(nodes: GraphNode[], links: GraphLink[]) {
		if (!this.graph) return;
		this.graph.graphData({ nodes, links });
	}

	createAntMesh(antId: number, color?: string): THREE.Mesh {
		const ant = new THREE.Mesh(
			new THREE.SphereGeometry(0.6),
			new THREE.MeshStandardMaterial({
				color: color || `hsl(${(antId * 137.508) % 360}, 70%, 60%)`,
				emissive: `hsl(${(antId * 137.508) % 360}, 30%, 20%)`
			})
		);

		this.antObjects.set(antId, ant);
		this.graph?.scene().add(ant);
		return ant;
	}

	getAntMesh(antId: number): THREE.Mesh | undefined {
		return this.antObjects.get(antId);
	}

	getTubeCurve(linkId: string): THREE.CatmullRomCurve3 | undefined {
		return this.tubeObjects.get(linkId)?.curve;
	}

	focusOnNode(nodeId: string) {
		const node = this.graphStore.nodes.find(n => n.id === nodeId);
		if (!node || !this.graph) return;

		const position = new THREE.Vector3(node.x! - 50, node.y! + 30, node.z! + 50);
		const target = new THREE.Vector3(node.x!, node.y!, node.z!);

		this.setCameraPosition(position, target, 1500);
	}

	setCameraPosition(position: THREE.Vector3, target: THREE.Vector3, duration = 2000) {
		if (!this.graph) return;
		this.graph.cameraPosition(position, target, duration);
	}

	centerCamera() {
		if (!this.graph) return;

		const center = this.graphStore.graphCenter;
		const distance = Math.max(center.size * 1.5, 100);

		const position = new THREE.Vector3(
			center.x - distance * 0.7,
			center.y + distance * 0.5,
			center.z + distance
		);

		const target = new THREE.Vector3(center.x, center.y, center.z);

		this.setCameraPosition(position, target);
	}

	getScene(): THREE.Scene | undefined {
		return this.graph?.scene();
	}

	getCamera(): THREE.Camera | undefined {
		return this.graph?.camera();
	}

	getRenderer(): THREE.WebGLRenderer | undefined {
		return this.graph?.renderer();
	}

	dispose() {
		this.antObjects.clear();
		this.nodeObjects.clear();
		this.tubeObjects.clear();
		this.graph?.clear();
		this.graph = null;
	}
}
