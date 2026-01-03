
import { Stone, Point, BoardSize } from '../types';

export const createEmptyBoard = (size: BoardSize): Stone[][] => {
  return Array.from({ length: size }, () => Array(size).fill(Stone.NONE));
};

export const getNeighbors = (x: number, y: number, size: number): Point[] => {
  const neighbors: Point[] = [];
  if (x > 0) neighbors.push({ x: x - 1, y });
  if (x < size - 1) neighbors.push({ x: x + 1, y });
  if (y > 0) neighbors.push({ x, y: y - 1 });
  if (y < size - 1) neighbors.push({ x, y: y + 1 });
  return neighbors;
};

export const getGroup = (board: Stone[][], x: number, y: number): { stones: Point[], liberties: Point[] } => {
  const size = board.length;
  const stoneType = board[y][x];
  const stones: Point[] = [];
  const libertiesSet = new Set<string>();
  const visited = new Set<string>();
  const stack: Point[] = [{ x, y }];

  while (stack.length > 0) {
    const p = stack.pop()!;
    const key = `${p.x},${p.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (board[p.y][p.x] === stoneType) {
      stones.push(p);
      const neighbors = getNeighbors(p.x, p.y, size);
      for (const n of neighbors) {
        if (board[n.y][n.x] === Stone.NONE) {
          libertiesSet.add(`${n.x},${n.y}`);
        } else if (board[n.y][n.x] === stoneType) {
          stack.push(n);
        }
      }
    }
  }

  const liberties = Array.from(libertiesSet).map(s => {
    const [nx, ny] = s.split(',').map(Number);
    return { x: nx, y: ny };
  });

  return { stones, liberties };
};

export const checkMove = (board: Stone[][], x: number, y: number, player: Stone): { valid: boolean, captures: Point[] } => {
  const size = board.length;
  if (board[y][x] !== Stone.NONE) return { valid: false, captures: [] };

  // Temporary placement
  const nextBoard = board.map(row => [...row]);
  nextBoard[y][x] = player;

  const opponent = player === Stone.BLACK ? Stone.WHITE : Stone.BLACK;
  const neighbors = getNeighbors(x, y, size);
  const totalCaptures: Point[] = [];

  // 1. Check if it captures opponent
  for (const n of neighbors) {
    if (nextBoard[n.y][n.x] === opponent) {
      const group = getGroup(nextBoard, n.x, n.y);
      if (group.liberties.length === 0) {
        totalCaptures.push(...group.stones);
      }
    }
  }

  // 2. Check for suicide (no liberties and no captures)
  const playerGroup = getGroup(nextBoard, x, y);
  if (playerGroup.liberties.length === 0 && totalCaptures.length === 0) {
    return { valid: false, captures: [] };
  }

  return { valid: true, captures: totalCaptures };
};

export const boardToCoordinates = (x: number, y: number, size: number): string => {
  const letters = "ABCDEFGHJKLMNOPQRST"; // I is usually skipped in Go
  return `${letters[x]}${size - y}`;
};

export const coordinatesToBoard = (coord: string, size: number): Point | null => {
  const letters = "ABCDEFGHJKLMNOPQRST";
  const match = coord.toUpperCase().match(/([A-T])(\d+)/);
  if (!match) return null;
  const x = letters.indexOf(match[1]);
  const y = size - parseInt(match[2]);
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return { x, y };
};
