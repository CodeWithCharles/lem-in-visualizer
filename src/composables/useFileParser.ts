import { readonly, ref } from 'vue';
import type { Room, Link, Move } from '@/types';
import type { ParsedData } from '@/types/parsedData';

export function useFileParser() {
	const isProcessing = ref(false);
	const parseError = ref<string>('');

	const parseAntFarmFile = async (content: string): Promise<ParsedData> => {
		isProcessing.value = true;
		parseError.value = '';

		try {
			const lines = content.split('\n').map(line => line.trim()).filter(Boolean);

			if (lines.length === 0) {
				throw new Error('File is empty');
			}

			// Parse number of ants (first line)
			const numberOfAnts = parseInt(lines[0]);
			if (isNaN(numberOfAnts) || numberOfAnts <= 0) {
				throw new Error('Invalid number of ants');
			}

			const rooms: Room[] = [];
			const links: Link[] = [];
			const moves: Move[] = [];
			let currentLineIndex = 1;

			// Parse rooms
			while (currentLineIndex < lines.length && lines[currentLineIndex].includes(' ')) {
				const line = lines[currentLineIndex];

				if (line.includes('-')) {
					// This is a tunnel, stop parsing rooms
					break;
				}

				const parts = line.split(' ');
				if (parts.length !== 4) {
					throw new Error(`Invalid room format at line ${currentLineIndex + 1}: ${line}`);
				}

				const [name, xStr, yStr, zStr] = parts;
				const x = parseFloat(xStr);
				const y = parseFloat(yStr);
				const z = parseFloat(zStr);

				if (isNaN(x) || isNaN(y) || isNaN(z)) {
					throw new Error(`Invalid coordinates at line ${currentLineIndex + 1}: ${line}`);
				}

				let type: 'start' | 'end' | 'normal' = 'normal';
				if (name === '##start') {
					type = 'start';
				} else if (name === '##end') {
					type = 'end';
				}

				rooms.push({ name, x, y, z, type });
				currentLineIndex++;
			}

			// Parse tunnels/links
			while (currentLineIndex < lines.length && lines[currentLineIndex].includes('-')) {
				const line = lines[currentLineIndex];
				const [from, to] = line.split('-');

				if (!from || !to) {
					throw new Error(`Invalid tunnel format at line ${currentLineIndex + 1}: ${line}`);
				}

				links.push({ from: from.trim(), to: to.trim() });
				currentLineIndex++;
			}

			// Parse moves (remaining lines)
			let turnNumber = 1;
			while (currentLineIndex < lines.length) {
				const line = lines[currentLineIndex];

				if (line.startsWith('L')) {
					// Parse ant moves for this turn
					const moveParts = line.split(' ').filter(part => part.startsWith('L'));

					moveParts.forEach(movePart => {
						const match = movePart.match(/L(\d+)-(.+)/);
						if (match) {
							const antId = parseInt(match[1]);
							const roomId = match[2];
							moves.push({ ant: antId, room: roomId, turn: turnNumber });
						}
					});

					turnNumber++;
				}

				currentLineIndex++;
			}

			// Validate parsed data
			if (rooms.length === 0) {
				throw new Error('No rooms found in file');
			}

			const startRooms = rooms.filter(r => r.type === 'start');
			const endRooms = rooms.filter(r => r.type === 'end');

			if (startRooms.length !== 1) {
				throw new Error(`Expected exactly 1 start room, found ${startRooms.length}`);
			}

			if (endRooms.length !== 1) {
				throw new Error(`Expected exactly 1 end room, found ${endRooms.length}`);
			}

			// Create turns map for easier access
			const turns = new Map<number, { [roomId: string]: number[] }>();
			moves.forEach(move => {
				if (!turns.has(move.turn)) {
					turns.set(move.turn, {});
				}
				const turnData = turns.get(move.turn)!;
				if (!turnData[move.room]) {
					turnData[move.room] = [];
				}
				turnData[move.room].push(move.ant);
			});

			return {
				rooms,
				links,
				numberOfAnts,
				moves,
				turns,
			};

		} catch (error) {
			parseError.value = error instanceof Error ? error.message : 'Unknown parsing error';
			throw error;
		} finally {
			isProcessing.value = false;
		}
	};

	return {
		parseAntFarmFile,
		isProcessing: readonly(isProcessing),
		parseError: readonly(parseError),
	};
}
