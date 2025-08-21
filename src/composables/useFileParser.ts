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
			const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

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
			let nextRoomType: 'start' | 'end' | 'normal' = 'normal';

			// Parse rooms and tunnels
			while (currentLineIndex < lines.length) {
				const line = lines[currentLineIndex];

				// Handle special room markers
				if (line === '##start') {
					nextRoomType = 'start';
					currentLineIndex++;
					continue;
				}
				if (line === '##end') {
					nextRoomType = 'end';
					currentLineIndex++;
					continue;
				}

				// Skip other comments
				if (line.startsWith('#')) {
					currentLineIndex++;
					continue;
				}

				// Check if this line starts moves section
				if (line.startsWith('L')) {
					break;
				}

				// Check if this is a tunnel (contains '-' and doesn't have spaces after the dash)
				if (line.includes('-')) {
					const parts = line.split('-');
					if (parts.length === 2 && !parts[0].includes(' ') && !parts[1].includes(' ')) {
						// This is a tunnel
						const [from, to] = parts.map(part => part.trim());
						if (!from || !to) {
							throw new Error(`Invalid tunnel format at line ${currentLineIndex + 1}: ${line}`);
						}
						links.push({ from, to });
						currentLineIndex++;
						continue;
					}
				}

				// This should be a room
				const parts = line.split(' ');
				if (parts.length === 3) {
					const [name, xStr, yStr] = parts;
					const x = parseFloat(xStr);
					const y = parseFloat(yStr);

					if (isNaN(x) || isNaN(y)) {
						throw new Error(`Invalid coordinates at line ${currentLineIndex + 1}: ${line}`);
					}

					// For lem-in, we use y as z coordinate and set y to 0 for 3D visualization
					rooms.push({
						name,
						x,
						y: 0, // Set y to 0 for 3D visualization
						z: y,  // Use original y as z coordinate
						type: nextRoomType
					});

					// Reset room type after processing
					nextRoomType = 'normal';
					currentLineIndex++;
					continue;
				}

				// If we get here, the line format is unrecognized
				throw new Error(`Unrecognized line format at line ${currentLineIndex + 1}: ${line}`);
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
						} else {
							throw new Error(`Invalid move format: ${movePart}`);
						}
					});

					turnNumber++;
				} else if (line.startsWith('#')) {
					// Skip comments in moves section
				} else if (line.trim()) {
					// Non-empty line that's not a move or comment
					throw new Error(`Unexpected line in moves section at line ${currentLineIndex + 1}: ${line}`);
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

			// Validate that all rooms referenced in links exist
			const roomNames = new Set(rooms.map(r => r.name));
			for (const link of links) {
				if (!roomNames.has(link.from)) {
					throw new Error(`Link references unknown room: ${link.from}`);
				}
				if (!roomNames.has(link.to)) {
					throw new Error(`Link references unknown room: ${link.to}`);
				}
			}

			// Validate that all rooms referenced in moves exist
			for (const move of moves) {
				if (!roomNames.has(move.room)) {
					throw new Error(`Move references unknown room: ${move.room}`);
				}
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
