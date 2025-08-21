import type { ParsedData } from '@/types/parsedData';

export class DataExportService {
	static exportToJSON(data: ParsedData, filename = 'ant-farm-data.json') {
		const dataStr = JSON.stringify(data, (key, value) => {
			// Convert Map to Object for JSON serialization
			if (value instanceof Map) {
				return Object.fromEntries(value);
			}
			return value;
		}, 2);

		this.downloadFile(dataStr, filename, 'application/json');
	}

	static exportToCSV(data: ParsedData, filename = 'ant-farm-moves.csv') {
		const headers = ['Turn', 'Ant', 'Room'];
		const rows = [headers.join(',')];

		data.moves.forEach(move => {
			rows.push(`${move.turn},${move.ant},${move.room}`);
		});

		const csvContent = rows.join('\n');
		this.downloadFile(csvContent, filename, 'text/csv');
	}

	static exportStatistics(data: ParsedData, filename = 'ant-farm-stats.json') {
		const stats = {
			totalRooms: data.rooms.length,
			totalTunnels: data.links.length,
			totalAnts: data.numberOfAnts,
			totalTurns: new Set(data.moves.map(m => m.turn)).size,
			totalMoves: data.moves.length,
			roomTypes: {
				start: data.rooms.filter(r => r.type === 'start').length,
				end: data.rooms.filter(r => r.type === 'end').length,
				normal: data.rooms.filter(r => r.type === 'normal').length,
			},
			antMovementStats: this.calculateMovementStats(data),
		};

		const statsStr = JSON.stringify(stats, null, 2);
		this.downloadFile(statsStr, filename, 'application/json');
	}

	private static calculateMovementStats(data: ParsedData) {
		const antPaths = new Map<number, string[]>();

		// Build path for each ant
		data.moves.forEach(move => {
			if (!antPaths.has(move.ant)) {
				antPaths.set(move.ant, []);
			}
			antPaths.get(move.ant)!.push(move.room);
		});

		const pathLengths = Array.from(antPaths.values()).map(path => path.length);

		return {
			averagePathLength: pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length,
			shortestPath: Math.min(...pathLengths),
			longestPath: Math.max(...pathLengths),
			totalMovements: pathLengths.reduce((a, b) => a + b, 0),
		};
	}

	private static downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}
