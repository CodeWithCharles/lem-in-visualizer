<template>
	<div class="file-upload-container">
		<div class="drop-zone" :class="{ 'drag-over': isDragOver, 'has-file': hasFile }" @drop="handleDrop"
			@dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @click="triggerFileInput">
			<input ref="fileInput" type="file" accept=".txt,.map" @change="handleFileChange" class="file-input" />

			<div v-if="!hasFile" class="upload-content">
				<div class="upload-icon">📁</div>
				<h3>Drop your ant farm file here</h3>
				<p>or click to browse</p>
				<div class="file-formats">
					Supported formats: .txt, .map
				</div>
			</div>

			<div v-else class="file-info">
				<div class="file-icon">✅</div>
				<div class="file-details">
					<h3>{{ fileName }}</h3>
					<p>{{ fileSize }} bytes</p>
					<div class="file-status">
						<span v-if="isProcessing" class="processing">Processing...</span>
						<span v-else-if="parseError" class="error">{{ parseError }}</span>
						<span v-else class="success">Ready to visualize</span>
					</div>
				</div>
				<button @click.stop="clearFile" class="clear-btn">×</button>
			</div>
		</div>
		<div v-if="hasFile && !parseError" class="parse-results">
			<div class="results-grid">
				<div class="result-item">
					<span class="label">Rooms:</span>
					<span class="value">{{ parseResults?.rooms || 0 }}</span>
				</div>
				<div class="result-item">
					<span class="label">Tunnels:</span>
					<span class="value">{{ parseResults?.tunnels || 0 }}</span>
				</div>
				<div class="result-item">
					<span class="label">Ants:</span>
					<span class="value">{{ parseResults?.ants || 0 }}</span>
				</div>
				<div class="result-item">
					<span class="label">Turns:</span>
					<span class="value">{{ parseResults?.turns || 0 }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {ref, computed} from "vue";
import { type ParsedData } from "@/types/parsedData";
import type { ParseResults } from "@/types";
import { useFileParser } from "@/composables/useFileParser";
// import { parseLemin } from "@/utils/parser";

const emit = defineEmits<{
	fileLoaded: [data: ParsedData];
	fileError: [error: string];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const selectedFile = ref<File | null>(null);
const isProcessing = ref(false);
const parseError = ref<string>('');
const parseResults = ref<ParseResults | null>(null);

const hasFile = computed(() => selectedFile.value !== null);
const fileName = computed(() => selectedFile.value?.name || '');
const fileSize = computed(() => selectedFile.value?.size || 0);

const fileParser = useFileParser();

const triggerFileInput = () => {
	if (hasFile.value) return;
	fileInput.value?.click();
};

const handleDragOver = (e: DragEvent) => {
	e.preventDefault();
	isDragOver.value = true;
};

const handleDragLeave = () => {
	isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
	e.preventDefault();
	isDragOver.value = false;

	const files = e.dataTransfer?.files;
	if (files && files.length > 0) {
		handleFile(files[0]);
	}
};

const handleFileChange = (e: Event) => {
	const target = e.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file) {
		handleFile(file);
	}
};

const handleFile = async (file: File) => {
	selectedFile.value = file;
	parseError.value = '';
	isProcessing.value = true;
	parseResults.value = null;

	try {
		const content = await readFileContent(file);
		const parsedData = await parseAntFarmData(content);

		parseResults.value = {
			rooms: parsedData.rooms.length,
			tunnels: parsedData.links.length,
			ants: parsedData.numberOfAnts,
			turns: new Set(parsedData.moves.map(m => m.turn)).size,
		};

		emit('fileLoaded', parsedData);
	} catch (error) {
		parseError.value = error instanceof Error ? error.message : 'Failed to parse file';
		emit('fileError', parseError.value);
	} finally {
		isProcessing.value = false;
	}
};

const readFileContent = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			resolve(e.target?.result as string);
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
};

const parseAntFarmData = async (content: string): Promise<ParsedData> => {
	return fileParser.parseAntFarmFile(content);
};

const clearFile = () => {
	selectedFile.value = null;
	parseError.value = '';
	parseResults.value = null;
	if (fileInput.value) {
		fileInput.value.value = '';
	}
};

</script>

<style scoped>
.file-upload-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.drop-zone {
  border: 2px dashed #00ffff;
  border-radius: 10px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.7);
  position: relative;
}

.drop-zone.drag-over {
  border-color: #66ff66;
  background: rgba(0, 255, 0, 0.1);
  transform: scale(1.02);
}

.drop-zone.has-file {
  cursor: default;
  border-style: solid;
  background: rgba(0, 255, 255, 0.1);
}

.file-input {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

.upload-content {
  color: #00ffff;
  font-family: 'Courier New', monospace;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.upload-content h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.upload-content p {
  margin: 0 0 15px 0;
  color: #aaa;
  font-size: 14px;
}

.file-formats {
  font-size: 12px;
  color: #666;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px 10px;
  border-radius: 5px;
  display: inline-block;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 15px;
  color: white;
  font-family: 'Courier New', monospace;
}

.file-icon {
  font-size: 24px;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-details h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #00ffff;
}

.file-details p {
  margin: 0 0 5px 0;
  color: #aaa;
  font-size: 12px;
}

.file-status {
  font-size: 12px;
}

.file-status .processing {
  color: #ffa500;
}

.file-status .error {
  color: #ff4444;
}

.file-status .success {
  color: #44ff44;
}

.clear-btn {
  background: #ff4444;
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #ff6666;
}

.parse-results {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 15px;
  font-family: 'Courier New', monospace;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 14px;
}

.result-item .label {
  color: #aaa;
}

.result-item .value {
  color: #00ffff;
  font-weight: bold;
}
</style>
